using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

/// <summary>Read-only access to `dairy_farm`.farms.</summary>
public class FarmRepository
{
    private readonly AppDbContext _context;

    public FarmRepository(AppDbContext context) => _context = context;

    public async Task<List<FarmDto>> GetAllAsync()
    {
        return await _context.Farms
            .AsNoTracking()
            .OrderBy(f => f.Name)
            .Select(f => new FarmDto
            {
                FarmId = f.FarmId,
                CompanyId = f.CompanyId,
                Name = f.Name,
                Location = f.Location,
                Contact = f.Contact,
                Status = f.Status
            })
            .ToListAsync();
    }

    public Task<FarmDto?> GetByIdAsync(ulong farmId) =>
        _context.Farms
            .AsNoTracking()
            .Where(f => f.FarmId == farmId)
            .Select(f => new FarmDto
            {
                FarmId = f.FarmId,
                CompanyId = f.CompanyId,
                Name = f.Name,
                Location = f.Location,
                Contact = f.Contact,
                Status = f.Status
            })
            .FirstOrDefaultAsync();
}
