using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

public class FarmRepository
{
	private readonly AppDbContext _context;

	public FarmRepository(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<FarmDto>> GetAllAsync()
	{
		return await (from f in _context.Farms.AsNoTracking()
			orderby f.Name
			select new FarmDto
			{
				FarmId = f.FarmId,
				CompanyId = f.CompanyId,
				Name = f.Name,
				Location = f.Location,
				Contact = f.Contact,
				Status = f.Status
			}).ToListAsync();
	}

	public Task<FarmDto?> GetByIdAsync(ulong farmId)
	{
		return (from f in _context.Farms.AsNoTracking()
			where f.FarmId == farmId
			select new FarmDto
			{
				FarmId = f.FarmId,
				CompanyId = f.CompanyId,
				Name = f.Name,
				Location = f.Location,
				Contact = f.Contact,
				Status = f.Status
			}).FirstOrDefaultAsync();
	}
}
