using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

/// <summary>Read-only access to `dairy_farm`.breeds.</summary>
public class BreedRepository
{
    private readonly AppDbContext _context;

    public BreedRepository(AppDbContext context) => _context = context;

    public async Task<List<BreedDto>> GetAllAsync(bool activeOnly = false)
    {
        var query = _context.Breeds.AsNoTracking();
        if (activeOnly)
        {
            // RECONCILED: breeds carry a `status` string column, not a boolean
            // `active` flag.
            query = query.Where(b => b.Status == "ACTIVE");
        }

        return await query
            .OrderBy(b => b.Name)
            .Select(b => new BreedDto
            {
                BreedId = b.BreedId,
                Name = b.Name,
                Description = b.Description,
                Active = b.Status == "ACTIVE"
            })
            .ToListAsync();
    }

    public Task<BreedDto?> GetByIdAsync(ulong breedId) =>
        _context.Breeds
            .AsNoTracking()
            .Where(b => b.BreedId == breedId)
            .Select(b => new BreedDto
            {
                BreedId = b.BreedId,
                Name = b.Name,
                Description = b.Description,
                Active = b.Status == "ACTIVE"
            })
            .FirstOrDefaultAsync();

    /// <summary>
    /// Lookup by name. The Animals UI filter sends a breed NAME, not an id.
    /// The column is utf8mb4_unicode_ci, so the comparison is case-insensitive.
    /// </summary>
    public Task<BreedDto?> GetByNameAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Task.FromResult<BreedDto?>(null);
        }

        var trimmed = name.Trim();
        return _context.Breeds
            .AsNoTracking()
            .Where(b => b.Name == trimmed)
            .Select(b => new BreedDto
            {
                BreedId = b.BreedId,
                Name = b.Name,
                Description = b.Description,
                Active = b.Status == "ACTIVE"
            })
            .FirstOrDefaultAsync();
    }
}
