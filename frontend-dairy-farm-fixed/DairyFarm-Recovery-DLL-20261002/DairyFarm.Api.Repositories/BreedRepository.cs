using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

public class BreedRepository
{
	private readonly AppDbContext _context;

	public BreedRepository(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<BreedDto>> GetAllAsync(bool activeOnly = false)
	{
		IQueryable<Breed> query = _context.Breeds.AsNoTracking();
		if (activeOnly)
		{
			query = query.Where((Breed b) => b.Status == "ACTIVE");
		}
		return await (from b in query
			orderby b.Name
			select new BreedDto
			{
				BreedId = b.BreedId,
				Name = b.Name,
				Description = b.Description,
				Active = (b.Status == "ACTIVE")
			}).ToListAsync();
	}

	public Task<BreedDto?> GetByIdAsync(ulong breedId)
	{
		return (from b in _context.Breeds.AsNoTracking()
			where b.BreedId == breedId
			select new BreedDto
			{
				BreedId = b.BreedId,
				Name = b.Name,
				Description = b.Description,
				Active = (b.Status == "ACTIVE")
			}).FirstOrDefaultAsync();
	}

	public Task<BreedDto?> GetByNameAsync(string name)
	{
		if (string.IsNullOrWhiteSpace(name))
		{
			return Task.FromResult<BreedDto>(null);
		}
		string trimmed = name.Trim();
		return (from b in _context.Breeds.AsNoTracking()
			where b.Name == trimmed
			select new BreedDto
			{
				BreedId = b.BreedId,
				Name = b.Name,
				Description = b.Description,
				Active = (b.Status == "ACTIVE")
			}).FirstOrDefaultAsync();
	}
}
