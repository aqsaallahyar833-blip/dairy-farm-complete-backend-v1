using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

/// <summary>
/// Read-only access to `dairy_farm`.sheds.
/// The table currently contains 0 rows, so the list endpoint correctly returns
/// an empty array rather than null.
/// </summary>
public class ShedRepository
{
    private readonly AppDbContext _context;

    public ShedRepository(AppDbContext context) => _context = context;

    public async Task<List<ShedDto>> GetAllAsync(ulong? farmId = null)
    {
        var query = _context.Sheds
            .AsNoTracking()
            .Include(s => s.Farm)
            .Include(s => s.Groups)
            .AsQueryable();

        if (farmId.HasValue)
        {
            query = query.Where(s => s.FarmId == farmId.Value);
        }

        var sheds = await query.OrderBy(s => s.Name).ToListAsync();
        return sheds.Select(Map).ToList();
    }

    public async Task<ShedDto?> GetByIdAsync(ulong shedId)
    {
        var shed = await _context.Sheds
            .AsNoTracking()
            .Include(s => s.Farm)
            .Include(s => s.Groups)
            .FirstOrDefaultAsync(s => s.ShedId == shedId);

        return shed is null ? null : Map(shed);
    }

    // s.Groups MUST be loaded by the calling query, otherwise GroupCount
    // silently returns 0.
    private static ShedDto Map(Models.Shed s) => new()
    {
        ShedId = s.ShedId,
        ShedName = s.Name,
        FarmId = s.FarmId,
        FarmName = s.Farm?.Name,
        Capacity = s.Capacity,
        Notes = s.Notes,
        GroupCount = s.Groups.Count
    };
}
