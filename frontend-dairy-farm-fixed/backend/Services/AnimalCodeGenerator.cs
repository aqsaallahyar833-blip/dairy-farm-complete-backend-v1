using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Services;

/// <summary>
/// Allocates the next human-readable animal code from `animal_code_sequences`.
///
/// WHY THIS EXISTS: `animals.animal_id` is a surrogate auto-increment key and
/// is NOT what the farm uses to identify an animal. The real identifier is
/// `animal_code` (e.g. "AN-001"), which the schema constrains only per farm
/// via UNIQUE (farm_id, animal_code). Codes therefore come from a per-farm
/// counter, never from a hard-coded literal.
///
/// CONCURRENCY: the caller must already hold a transaction on the context.
/// The row is read with SELECT ... FOR UPDATE so two simultaneous creates for
/// the same farm serialise instead of both taking the same number. The value is
/// incremented in the same transaction, so a rollback returns it to the pool.
///
/// The allocated code is additionally re-checked against existing animals
/// before being used, so a manually inserted or imported code can never be
/// silently reused and surface later as a 500 from the unique index.
/// </summary>
public class AnimalCodeGenerator
{
    private readonly AppDbContext _context;
    private readonly ILogger<AnimalCodeGenerator> _logger;

    public AnimalCodeGenerator(AppDbContext context, ILogger<AnimalCodeGenerator> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Reserves and returns the next unused code for <paramref name="farmId"/>.
    /// Must be called inside a transaction.
    /// </summary>
    public async Task<string> NextCodeAsync(ulong farmId, CancellationToken ct = default)
    {
        var sequence = await LockSequenceAsync(farmId, ct);

        var prefix = sequence.Prefix;
        var candidate = sequence.NextNumber;

        // Defensive skip: never hand out a code that already exists for this
        // farm, even if the counter drifted (e.g. a manual import).
        var guard = 0;
        while (await CodeExistsAsync(farmId, prefix, candidate, ct))
        {
            guard++;
            if (guard > 10_000)
            {
                throw new InvalidOperationException(
                    "Could not find an unused animal code after 10000 attempts. " +
                    "The animal_code_sequences counter appears to be corrupt.");
            }

            _logger.LogWarning(
                "Animal code {Prefix}{Number} already exists for farm {FarmId}; advancing the counter.",
                prefix, candidate, farmId);

            candidate++;
        }

        // Persist the advanced counter. The row is already locked for update,
        // so this cannot interleave with a competing allocation.
        sequence.NextNumber = candidate + 1;
        await _context.SaveChangesAsync(ct);

        return $"{prefix}{candidate.ToString("D3", System.Globalization.CultureInfo.InvariantCulture)}";
    }

    private async Task<AnimalCodeSequence> LockSequenceAsync(ulong farmId, CancellationToken ct)
    {
        var sequence = await _context.AnimalCodeSequences
            .FromSqlInterpolated(
                $"SELECT * FROM animal_code_sequences WHERE farm_id = {farmId} FOR UPDATE")
            .FirstOrDefaultAsync(ct);

        if (sequence is null)
        {
            // A farm with no counter row gets one. This is a configuration row
            // in a table that already stores exactly this, not animal data.
            sequence = new AnimalCodeSequence { FarmId = farmId, Prefix = "AN-", NextNumber = 1 };

            _context.AnimalCodeSequences.Add(sequence);
            try
            {
                await _context.SaveChangesAsync(ct);
                _logger.LogInformation(
                    "Created animal code sequence for farm {FarmId} starting at 1.", farmId);
            }
            catch (DbUpdateException)
            {
                // Another request inserted the same PK concurrently.
                _context.Entry(sequence).State = EntityState.Detached;
                sequence = await _context.AnimalCodeSequences
                    .FromSqlInterpolated(
                        $"SELECT * FROM animal_code_sequences WHERE farm_id = {farmId} FOR UPDATE")
                    .FirstOrDefaultAsync(ct)
                    ?? throw new InvalidOperationException(
                        $"Unable to establish an animal code sequence for farm {farmId}.");
            }
        }

        return sequence;
    }

    private async Task<bool> CodeExistsAsync(ulong farmId, string prefix, ulong number, CancellationToken ct)
    {
        var code = $"{prefix}{number.ToString("D3", System.Globalization.CultureInfo.InvariantCulture)}";

        return await _context.Animals
            .AsNoTracking()
            .AnyAsync(a => a.FarmId == farmId && a.AnimalCode == code, ct);
    }
}
