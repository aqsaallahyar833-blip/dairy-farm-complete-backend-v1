using System.Data;
using System.Data.Common;
using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public enum AnimalWriteOutcome
{
    Created,
    Updated,
    AnimalNotFound,
    ValidationFailed,
    DuplicateCode,
    StatusChangeNotPermitted,
    SameStatus
}

public record AnimalWriteResult(
    AnimalWriteOutcome Outcome,
    AnimalDetailDto? Animal = null,
    string? Message = null,
    IReadOnlyList<string>? Errors = null);

/// <summary>
/// Creates and updates animals in `dairy_farm`.
///
/// DESIGN RULE: the DATABASE remains authoritative. This service validates the
/// things it can answer clearly and cheaply, and deliberately lets the schema
/// and its triggers remain the final authority for everything they already
/// enforce (enum domains, FK integrity, UNIQUE(farm_id, animal_code),
/// purchase_price >= 0, self-parent and dam==sire rejection). Database
/// constraint violations are translated into clean 400/409 responses rather
/// than surfacing as 500s.
///
/// There is intentionally NO hard delete. `trg_animals_no_delete` blocks it at
/// the database, and retirement is a status change through
/// PATCH /api/animals/{id}/status.
/// </summary>
public class AnimalWriteService
{
    private readonly AppDbContext _context;
    private readonly AnimalCodeGenerator _codes;
    private readonly ILogger<AnimalWriteService> _logger;

    public AnimalWriteService(
        AppDbContext context,
        AnimalCodeGenerator codes,
        ILogger<AnimalWriteService> logger)
    {
        _context = context;
        _codes = codes;
        _logger = logger;
    }

    /// <summary>
    /// Creates an animal.
    ///
    /// CONNECTION HANDLING: the AFTER INSERT status-history trigger attributes
    /// its row using the session variable @app_user_id, so the whole insert
    /// runs on ONE explicitly opened connection inside ONE transaction with
    /// that variable set. The variable is cleared before the connection returns
    /// to the pool so the next request cannot inherit the previous user's id.
    ///
    /// The code generator shares this same scoped DbContext, so its
    /// SELECT ... FOR UPDATE locks the very connection the insert will use.
    /// </summary>
    public async Task<AnimalWriteResult> CreateAsync(CreateAnimalRequest request, ulong userId, CancellationToken ct)
    {
        // Program.cs enables EnableRetryOnFailure, which installs
        // MySqlRetryingExecutionStrategy. That strategy REJECTS user-initiated
        // transactions unless the whole transaction is submitted through it, so
        // the transaction body below is wrapped in ExecuteAsync. A failed
        // attempt rolls back, so re-running it cannot duplicate the animal.
        var strategy = _context.Database.CreateExecutionStrategy();
        var connection = _context.Database.GetDbConnection();
        var openedHere = false;

        try
        {
            return await strategy.ExecuteAsync(async () =>
            {
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync(ct);
                    openedHere = true;
                }

                await using var transaction = await _context.Database.BeginTransactionAsync(ct);

                await ExecuteAsync(connection, transaction, ct,
                    "SET @app_user_id = @userId", ("@userId", userId));

                var result = await CreateCoreAsync(request, ct);

                if (result.Outcome != AnimalWriteOutcome.Created)
                {
                    await transaction.RollbackAsync(ct);
                    return result;
                }

                await transaction.CommitAsync(ct);
                return result;
            });
        }
        catch
        {
            _context.ChangeTracker.Clear();
            throw;
        }
        finally
        {
            // Clear the session variable before the physical connection returns
            // to the pool, so the next request cannot inherit this user's id.
            try
            {
                if (connection.State == ConnectionState.Open)
                {
                    await ExecuteAsync(connection, null, CancellationToken.None, "SET @app_user_id = NULL");
                }
            }
            catch (DbException ex)
            {
                _logger.LogWarning(ex, "Could not clear @app_user_id before returning the connection to the pool.");
            }

            if (openedHere && connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }

            _context.ChangeTracker.Clear();
        }
    }

    private async Task<AnimalWriteResult> CreateCoreAsync(CreateAnimalRequest request, CancellationToken ct)
    {
        var errors = await ValidateCreateAsync(request, ct);
        if (errors.Count > 0)
        {
            return new AnimalWriteResult(AnimalWriteOutcome.ValidationFailed, Errors: errors);
        }

        var farmId = (ulong)request.FarmId;

        // Explicitly supplied codes are honoured; otherwise the next sequence
        // value is allocated under a row lock. Never a hard-coded literal.
        string animalCode;
        if (!string.IsNullOrWhiteSpace(request.AnimalCode))
        {
            animalCode = request.AnimalCode.Trim();

            if (await _context.Animals.AnyAsync(a => a.FarmId == farmId && a.AnimalCode == animalCode, ct))
            {
                return new AnimalWriteResult(
                    AnimalWriteOutcome.DuplicateCode,
                    Message: $"Animal code '{animalCode}' is already used on this farm.");
            }
        }
        else
        {
            animalCode = await _codes.NextCodeAsync(farmId, ct);
        }

        var animal = new Animal
        {
            FarmId = farmId,
            AnimalCode = animalCode,
            Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim(),
            BreedId = request.BreedId.HasValue ? (ulong)request.BreedId.Value : null,
            Sex = request.Sex.Trim().ToUpperInvariant(),
            DateOfBirth = request.DateOfBirth,
            // The database column is NOT NULL with default 'ACTIVE'. The value
            // is set explicitly rather than left null: a null would be sent as
            // SQL NULL and rejected, and the model does not know about the
            // column default because this DbContext never creates the schema.
            Status = string.IsNullOrWhiteSpace(request.Status)
                ? "ACTIVE"
                : request.Status.Trim().ToUpperInvariant(),
            GroupId = request.GroupId.HasValue ? (ulong)request.GroupId.Value : null,
            DamId = request.DamId.HasValue ? (ulong)request.DamId.Value : null,
            SireId = request.SireId.HasValue ? (ulong)request.SireId.Value : null,
            AcquisitionDate = request.PurchaseDate,
            PurchasePrice = request.PurchasePrice,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes,

            // animals.photo_url is varchar(500) and holds a reference only.
            // Image bytes are NEVER written here - they go to animal_photos
            // via the photo endpoints.
            PhotoUrl = null
        };

        _context.Animals.Add(animal);
        await _context.SaveChangesAsync(ct);

        // Ear tag / RFID live in animal_identifications - there are no such
        // columns on `animals`.
        await UpsertIdentificationsAsync(animal.AnimalId, request.EarTag, request.Rfid, null, ct);

        _logger.LogInformation("Created animal {AnimalId} with code {AnimalCode}.", animal.AnimalId, animalCode);

        var created = await LoadDetailAsync(animal.AnimalId, ct);
        return new AnimalWriteResult(AnimalWriteOutcome.Created, created);
    }

    /// <summary>Partial update. Never changes status.</summary>
    public async Task<AnimalWriteResult> UpdateAsync(ulong animalId, UpdateAnimalRequest request, CancellationToken ct)
    {
        var animal = await _context.Animals.FirstOrDefaultAsync(a => a.AnimalId == animalId, ct);
        if (animal is null)
        {
            return new AnimalWriteResult(AnimalWriteOutcome.AnimalNotFound);
        }

        // A caller sending its whole animal object must not lose a status
        // change silently. Refuse loudly and point at the right endpoint.
        if (!string.IsNullOrWhiteSpace(request.Status)
            && !string.Equals(request.Status.Trim(), animal.Status, StringComparison.OrdinalIgnoreCase))
        {
            return new AnimalWriteResult(
                AnimalWriteOutcome.StatusChangeNotPermitted,
                Message:
                    "Status cannot be changed with PUT. Use PATCH /api/animals/{id}/status " +
                    "so the change is recorded in animal status history.");
        }

        var errors = new List<string>();

        if (request.BreedId.HasValue
            && !await _context.Breeds.AnyAsync(b => b.BreedId == (ulong)request.BreedId.Value, ct))
        {
            errors.Add($"Breed {request.BreedId} does not exist.");
        }

        if (request.GroupId.HasValue
            && !await _context.AnimalGroups.AnyAsync(g => g.GroupId == (ulong)request.GroupId.Value, ct))
        {
            errors.Add($"Animal group {request.GroupId} does not exist.");
        }

        if (request.DamId.HasValue && !await _context.Animals.AnyAsync(a => a.AnimalId == (ulong)request.DamId.Value, ct))
        {
            errors.Add($"Dam animal {request.DamId} does not exist.");
        }

        if (request.SireId.HasValue && !await _context.Animals.AnyAsync(a => a.AnimalId == (ulong)request.SireId.Value, ct))
        {
            errors.Add($"Sire animal {request.SireId} does not exist.");
        }

        // The triggers also reject these, but catching them here produces a
        // precise 400 instead of a generic constraint-violation message.
        if (request.DamId.HasValue && (ulong)request.DamId.Value == animalId)
        {
            errors.Add("An animal cannot be its own dam.");
        }

        if (request.SireId.HasValue && (ulong)request.SireId.Value == animalId)
        {
            errors.Add("An animal cannot be its own sire.");
        }

        if (request.DamId.HasValue && request.SireId.HasValue && request.DamId == request.SireId)
        {
            errors.Add("Dam and sire cannot be the same animal.");
        }

        if (!string.IsNullOrWhiteSpace(request.AnimalCode))
        {
            var code = request.AnimalCode.Trim();
            if (!string.Equals(code, animal.AnimalCode, StringComparison.Ordinal)
                && await _context.Animals.AnyAsync(
                    a => a.FarmId == animal.FarmId && a.AnimalCode == code && a.AnimalId != animalId, ct))
            {
                return new AnimalWriteResult(
                    AnimalWriteOutcome.DuplicateCode,
                    Message: $"Animal code '{code}' is already used on this farm.");
            }
        }

        if (errors.Count > 0)
        {
            return new AnimalWriteResult(AnimalWriteOutcome.ValidationFailed, Errors: errors);
        }

        if (request.Name is not null) animal.Name = Trim(request.Name);
        if (!string.IsNullOrWhiteSpace(request.AnimalCode)) animal.AnimalCode = request.AnimalCode.Trim();
        if (request.BreedId.HasValue) animal.BreedId = (ulong)request.BreedId.Value;
        if (request.DateOfBirth.HasValue) animal.DateOfBirth = request.DateOfBirth;
        if (request.GroupId.HasValue) animal.GroupId = (ulong)request.GroupId.Value;
        if (request.DamId.HasValue) animal.DamId = (ulong)request.DamId.Value;
        if (request.SireId.HasValue) animal.SireId = (ulong)request.SireId.Value;
        if (request.PurchaseDate.HasValue) animal.AcquisitionDate = request.PurchaseDate;
        if (request.PurchasePrice.HasValue) animal.PurchasePrice = request.PurchasePrice;
        if (request.Notes is not null) animal.Notes = Trim(request.Notes);

        // Only touch the row when something actually differs, so a no-op PUT
        // does not move updated_at and manufacture a false "changed" signal.
        await _context.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(request.EarTag) || !string.IsNullOrWhiteSpace(request.Rfid))
        {
            await UpsertIdentificationsAsync(animalId, request.EarTag, request.Rfid, null, ct);
        }

        _logger.LogInformation("Updated animal {AnimalId}.", animalId);

        var updated = await LoadDetailAsync(animalId, ct);
        return new AnimalWriteResult(AnimalWriteOutcome.Updated, updated);
    }

    private async Task<List<string>> ValidateCreateAsync(CreateAnimalRequest request, CancellationToken ct)
    {
        var errors = new List<string>();
        var farmId = (ulong)request.FarmId;

        if (!await _context.Farms.AnyAsync(f => f.FarmId == farmId, ct))
        {
            errors.Add($"Farm {request.FarmId} does not exist.");
        }

        if (request.BreedId.HasValue
            && !await _context.Breeds.AnyAsync(b => b.BreedId == (ulong)request.BreedId.Value, ct))
        {
            errors.Add($"Breed {request.BreedId} does not exist.");
        }

        if (request.GroupId.HasValue
            && !await _context.AnimalGroups.AnyAsync(g => g.GroupId == (ulong)request.GroupId.Value, ct))
        {
            errors.Add($"Animal group {request.GroupId} does not exist.");
        }

        if (request.DamId.HasValue && !await _context.Animals.AnyAsync(a => a.AnimalId == (ulong)request.DamId.Value, ct))
        {
            errors.Add($"Dam animal {request.DamId} does not exist.");
        }

        if (request.SireId.HasValue && !await _context.Animals.AnyAsync(a => a.AnimalId == (ulong)request.SireId.Value, ct))
        {
            errors.Add($"Sire animal {request.SireId} does not exist.");
        }

        if (request.DamId.HasValue && request.SireId.HasValue && request.DamId == request.SireId)
        {
            errors.Add("Dam and sire cannot be the same animal.");
        }

        if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateTime.UtcNow)
        {
            errors.Add("dateOfBirth cannot be in the future.");
        }

        if (request.PurchaseDate.HasValue && request.PurchaseDate.Value > DateTime.UtcNow)
        {
            errors.Add("purchaseDate cannot be in the future.");
        }

        if (request.DateOfBirth.HasValue && request.PurchaseDate.HasValue
            && request.PurchaseDate.Value < request.DateOfBirth.Value)
        {
            errors.Add("purchaseDate cannot be earlier than dateOfBirth.");
        }

        // Dam and sire must exist AND be the right sex for the role.
        if (request.DamId.HasValue)
        {
            var damSex = await _context.Animals
                .Where(a => a.AnimalId == (ulong)request.DamId.Value)
                .Select(a => a.Sex)
                .FirstOrDefaultAsync(ct);

            if (damSex is not null && !string.Equals(damSex, "FEMALE", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add("The dam must be a FEMALE animal.");
            }
        }

        if (request.SireId.HasValue)
        {
            var sireSex = await _context.Animals
                .Where(a => a.AnimalId == (ulong)request.SireId.Value)
                .Select(a => a.Sex)
                .FirstOrDefaultAsync(ct);

            if (sireSex is not null && !string.Equals(sireSex, "MALE", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add("The sire must be a MALE animal.");
            }
        }

        errors.AddRange(await ValidateIdentificationAsync(null, request.EarTag, request.Rfid, ct));

        return errors;
    }

    /// <summary>
    /// Application-level duplicate protection for identification values.
    ///
    /// WHY THIS IS NEEDED: `animal_identifications` has only a NON-unique index
    /// on (type, value). The database will happily accept the same RFID on two
    /// different animals, which would make a scan ambiguous. Because the table
    /// currently holds 0 rows, a UNIQUE constraint could safely be added - but
    /// that is a schema change and is reported separately for approval rather
    /// than applied silently. Until then this check is the enforcement point.
    ///
    /// Reassigning a value to the same animal is allowed.
    /// </summary>
    public async Task<List<string>> ValidateIdentificationAsync(
        ulong? animalId, string? earTag, string? rfid, CancellationToken ct)
    {
        var errors = new List<string>();

        var candidates = new (string Type, string? Value)[]
        {
            ("EAR_TAG", earTag),
            ("RFID", rfid)
        };

        foreach (var (type, value) in candidates)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var candidate = value.Trim();

            if (candidate.Length > 150)
            {
                errors.Add($"{type} must be 150 characters or fewer.");
                continue;
            }

            // RECONCILED: the identifier values are plain columns on `animals`
            // (tag_number / rfid_number) and carry NON-unique indexes in this
            // schema, so the database will accept the same value on two
            // different animals. This check is the enforcement point.
            var owner = type == "EAR_TAG"
                ? await _context.Animals.AsNoTracking()
                    .Where(a => a.TagNumber == candidate)
                    .Select(a => (ulong?)a.AnimalId)
                    .FirstOrDefaultAsync(ct)
                : await _context.Animals.AsNoTracking()
                    .Where(a => a.RfidNumber == candidate)
                    .Select(a => (ulong?)a.AnimalId)
                    .FirstOrDefaultAsync(ct);

            if (owner is not null && (animalId is null || owner != animalId.Value))
            {
                errors.Add($"{type} '{candidate}' is already assigned to another animal.");
            }
        }

        return errors;
    }

    /// <summary>
    /// Writes the ear tag and RFID onto the animal row.
    ///
    /// RECONCILED against the canonical schema: there is no
    /// `animal_identifications` table. `tag_number` and `rfid_number` are
    /// columns on `animals` (both varchar(50)), so writing an identifier is a
    /// column assignment on the animal, not a new row. `makePrimary` has no
    /// column to write and is accepted only to preserve the existing call
    /// signature; it is intentionally ignored.
    /// </summary>
    private async Task UpsertIdentificationsAsync(
        ulong animalId, string? earTag, string? rfid, bool? makePrimary, CancellationToken ct)
    {
        var animal = await _context.Animals
            .FirstOrDefaultAsync(a => a.AnimalId == animalId, ct);

        if (animal is null)
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(earTag))
        {
            animal.TagNumber = earTag.Trim();
        }

        if (!string.IsNullOrWhiteSpace(rfid))
        {
            animal.RfidNumber = rfid.Trim();
        }

        await _context.SaveChangesAsync(ct);
    }

    private async Task<AnimalDetailDto?> LoadDetailAsync(ulong animalId, CancellationToken ct)
    {
        _context.ChangeTracker.Clear();

        var animal = await _context.Animals
            .AsNoTracking()
            .Include(a => a.Breed)
            .Include(a => a.Farm)
            .Include(a => a.Group).ThenInclude(g => g!.Shed)
            .Include(a => a.Dam)
            .Include(a => a.Sire)
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.AnimalId == animalId, ct);

        return animal is null ? null : AnimalDetailMapper.Map(animal);
    }

    private static string? Trim(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static async Task ExecuteAsync(
        DbConnection connection,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? efTransaction,
        CancellationToken ct,
        string sql,
        params (string Name, object? Value)[] parameters)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = efTransaction?.GetDbTransaction();

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        await command.ExecuteNonQueryAsync(ct);
    }
}
