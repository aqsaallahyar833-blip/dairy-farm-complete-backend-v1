using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

public class ShedRepository
{
	private readonly AppDbContext _context;

	public ShedRepository(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<ShedDto>> GetAllAsync(ulong? farmId = null)
	{
		IQueryable<Shed> query = _context.Sheds.AsNoTracking().Include((Shed s) => s.Farm).Include((Shed s) => s.Groups)
			.AsQueryable();
		if (farmId.HasValue)
		{
			query = query.Where((Shed s) => s.FarmId == ((ulong?)farmId).Value);
		}
		return (await query.OrderBy((Shed s) => s.Name).ToListAsync()).Select(Map).ToList();
	}

	public async Task<ShedDto?> GetByIdAsync(ulong shedId)
	{
		Shed shed = await _context.Sheds.AsNoTracking().Include((Shed s) => s.Farm).Include((Shed s) => s.Groups)
			.FirstOrDefaultAsync((Shed s) => s.ShedId == shedId);
		return (shed == null) ? null : Map(shed);
	}

	private static ShedDto Map(Shed s)
	{
		return new ShedDto
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
}
