using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

/// <summary>Read-only access to `dairy_farm`.animal_groups.</summary>
public class AnimalGroupRepository
{
    private readonly AppDbContext _context;

    public AnimalGroupRepository(AppDbContext context) => _context = context;

    public async Task<List<AnimalGroupDto>> GetAllAsync(ulong? farmId = null, bool activeOnly = false)
    {
        // NOTE: Shed.Groups is deliberately NOT included here. Doing
        // Include(Shed).ThenInclude(s => s.Groups) creates the cycle
        // AnimalGroup -> Shed -> Groups -> AnimalGroup, which EF Core rejects
        // outright in a no-tracking query ("Include path 'Shed->Groups' results
        // in a cycle"). The nested shed therefore leaves GroupCount at 0; the
        // standalone /api/sheds endpoint reports the real count.
        var query = _context.AnimalGroups
            .AsNoTracking()
            .Include(g => g.Farm)
            .Include(g => g.Shed)
            .Include(g => g.Animals)
            .AsQueryable();

        if (farmId.HasValue)
        {
            query = query.Where(g => g.FarmId == farmId.Value);
        }

        if (activeOnly)
        {
            query = query.Where(g => g.Status == "ACTIVE");
        }

        var groups = await query.OrderBy(g => g.Name).ToListAsync();

        return groups.Select(Map).ToList();
    }

    public async Task<AnimalGroupDto?> GetByIdAsync(ulong groupId)
    {
        var group = await _context.AnimalGroups
            .AsNoTracking()
            .Include(g => g.Farm)
            .Include(g => g.Shed)
            .Include(g => g.Animals)
            .FirstOrDefaultAsync(g => g.GroupId == groupId);

        return group is null ? null : Map(group);
    }

    // NOTE: g.Animals and shed.Groups MUST be loaded by the calling query.
    // On an uninitialised collection .Count silently returns 0, which would
    // make this endpoint report wrong numbers.
    private static AnimalGroupDto Map(Models.AnimalGroup g)
    {
        var dto = new AnimalGroupDto
        {
            GroupId = g.GroupId,
            FarmId = g.FarmId,
            FarmName = g.Farm?.Name,
            Name = g.Name,
            AnimalType = g.AnimalType,
            Status = g.Status,
            ShedId = g.ShedId,
            AnimalCount = g.Animals.Count
        };

        if (g.Shed is { } shed)
        {
            dto.Shed = new ShedDto
            {
                ShedId = shed.ShedId,
                ShedName = shed.Name,
                FarmId = shed.FarmId,
                Capacity = shed.Capacity,
                Notes = shed.Notes,
                // GroupCount intentionally left at 0 here - see the note on the
                // Include chain in GetAllAsync. GET /api/sheds/{id} reports it.
                GroupCount = 0
            };
        }

        return dto;
    }
}
