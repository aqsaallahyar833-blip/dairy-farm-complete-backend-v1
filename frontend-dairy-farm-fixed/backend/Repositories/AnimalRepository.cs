using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

/// <summary>
/// Data access for Animal queries against `dairy_farm`.
///
/// All filtering is pushed into SQL (IQueryable) so nothing is loaded that the
/// caller did not ask for.
///
/// The entity -> DTO projection lives in Services.AnimalDetailMapper so the
/// Phase 1 read path and the Phase 2A write path cannot drift apart.
/// </summary>
public class AnimalRepository
{
    private readonly AppDbContext _context;

    public AnimalRepository(AppDbContext context) => _context = context;

    /// <summary>Animals matching the supplied filters.</summary>
    public async Task<List<AnimalDto>> GetAllAsync(
        ulong? farmId = null,
        string? status = null,
        string? sex = null,
        ulong? breedId = null,
        ulong? groupId = null,
        string? search = null)
    {
        var query = BuildBaseQuery();

        if (farmId.HasValue)
        {
            query = query.Where(a => a.FarmId == farmId.Value);
        }

        // Status and sex are database ENUMs stored UPPERCASE. Accept any casing
        // from the caller and normalise, so a filter never silently matches
        // nothing because of letter case.
        var normalisedStatus = status?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(normalisedStatus))
        {
            query = query.Where(a => a.Status == normalisedStatus);
        }

        var normalisedSex = sex?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(normalisedSex))
        {
            query = query.Where(a => a.Sex == normalisedSex);
        }

        if (breedId.HasValue)
        {
            query = query.Where(a => a.BreedId == breedId.Value);
        }

        if (groupId.HasValue)
        {
            query = query.Where(a => a.GroupId == groupId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            // RECONCILED: the identification columns (tag_number, rfid_number)
            // live directly on `animals`. There is no animal_identifications
            // table, so the search matches the columns instead of a collection.
            query = query.Where(a =>
                a.AnimalCode.Contains(term) ||
                (a.Name != null && a.Name.Contains(term)) ||
                (a.TagNumber != null && a.TagNumber.Contains(term)) ||
                (a.RfidNumber != null && a.RfidNumber.Contains(term)));
        }

        var animals = await query
            .OrderBy(a => a.AnimalCode)
            .ToListAsync();

        return animals.Select(Services.AnimalDetailMapper.MapToList).ToList();
    }

    /// <summary>Single animal by primary key, with relationships.</summary>
    public async Task<AnimalDetailDto?> GetByIdAsync(ulong animalId)
    {
        var animal = await BuildDetailQuery()
            .FirstOrDefaultAsync(a => a.AnimalId == animalId);

        return animal is null ? null : Services.AnimalDetailMapper.Map(animal);
    }

    /// <summary>
    /// Single animal by animal code. The schema guarantees uniqueness only per
    /// farm (UNIQUE (farm_id, animal_code)), so the first match is returned and
    /// the caller should pass farmId when more than one farm is in use.
    /// </summary>
    public async Task<AnimalDetailDto?> GetByCodeAsync(string animalCode, ulong? farmId = null)
    {
        var trimmed = animalCode.Trim();

        var query = BuildDetailQuery().Where(a => a.AnimalCode == trimmed);
        if (farmId.HasValue)
        {
            query = query.Where(a => a.FarmId == farmId.Value);
        }

        var animal = await query.FirstOrDefaultAsync();
        return animal is null ? null : Services.AnimalDetailMapper.Map(animal);
    }

    /// <summary>
    /// Identifiers (ear tag, RFID, QR) for one animal.
    ///
    /// RECONCILED: the canonical schema has no `animal_identifications` table.
    /// These values are plain columns on `animals` (tag_number, rfid_number,
    /// qr_token), so they are projected from the animal row. Rows whose value is
    /// empty are omitted rather than returned as nulls.
    /// </summary>
    public async Task<List<AnimalIdentifierDto>> GetIdentificationsAsync(ulong animalId)
    {
        var animal = await _context.Animals
            .AsNoTracking()
            .Where(a => a.AnimalId == animalId)
            .Select(a => new { a.TagNumber, a.RfidNumber, a.QrToken })
            .FirstOrDefaultAsync();

        if (animal is null)
        {
            return new List<AnimalIdentifierDto>();
        }

        var result = new List<AnimalIdentifierDto>(3);

        if (!string.IsNullOrWhiteSpace(animal.TagNumber))
        {
            result.Add(new AnimalIdentifierDto
            {
                Type = "EAR_TAG",
                Value = animal.TagNumber,
                IsPrimary = true
            });
        }

        if (!string.IsNullOrWhiteSpace(animal.RfidNumber))
        {
            result.Add(new AnimalIdentifierDto
            {
                Type = "RFID",
                Value = animal.RfidNumber,
                IsPrimary = false
            });
        }

        if (!string.IsNullOrWhiteSpace(animal.QrToken))
        {
            result.Add(new AnimalIdentifierDto
            {
                Type = "QR",
                Value = animal.QrToken,
                IsPrimary = false
            });
        }

        return result;
    }


    /// <summary>
    /// Status change history for one animal, most recent first.
    ///
    /// RECONCILED: the entity exposes CreatedAt / StatusHistoryId / ChangedBy
    /// (there is no ChangedAt, Id or UserId on AnimalStatusHistory).
    /// </summary>
    public async Task<List<AnimalStatusHistoryDto>> GetStatusHistoryAsync(ulong animalId)
    {
        return await _context.AnimalStatusHistories
            .AsNoTracking()
            .Where(h => h.AnimalId == animalId)
            .OrderByDescending(h => h.CreatedAt)
            .ThenByDescending(h => h.StatusHistoryId)
            .Select(h => new AnimalStatusHistoryDto
            {
                StatusHistoryId = h.StatusHistoryId,
                OldStatus = h.OldStatus,
                NewStatus = h.NewStatus,
                Reason = h.Reason,
                ChangedAt = h.CreatedAt,
                UserId = h.ChangedBy
            })
            .ToListAsync();
    }

    private IQueryable<Models.Animal> BuildBaseQuery() =>
        _context.Animals
            .AsNoTracking()
            .Include(a => a.Breed)
            .Include(a => a.Farm)
            .Include(a => a.Group)
            .AsQueryable();

    // RECONCILED: the detail projection reads animal.Group.Shed, so the shed and
    // its farm are eagerly loaded here. The former
    // .Include(a => a.Identifications) was removed because there is no
    // animal_identifications table in the canonical schema.
    private IQueryable<Models.Animal> BuildDetailQuery() =>
        BuildBaseQuery()
            .Include(a => a.Dam)
            .Include(a => a.Sire)
            .Include(a => a.StatusHistory)
            .Include(a => a.Group).ThenInclude(g => g!.Shed).ThenInclude(s => s!.Farm)
            .AsQueryable();
}
