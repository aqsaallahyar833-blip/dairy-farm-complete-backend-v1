using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

public class AnimalGroupRepository
{
	private readonly AppDbContext _context;

	public AnimalGroupRepository(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<AnimalGroupDto>> GetAllAsync(ulong? farmId = null, bool activeOnly = false)
	{
		IQueryable<AnimalGroup> query = _context.AnimalGroups.AsNoTracking().Include((AnimalGroup g) => g.Farm).Include((AnimalGroup g) => g.Shed)
			.Include((AnimalGroup g) => g.Animals)
			.AsQueryable();
		if (farmId.HasValue)
		{
			query = query.Where((AnimalGroup g) => g.FarmId == ((ulong?)farmId).Value);
		}
		if (activeOnly)
		{
			query = query.Where((AnimalGroup g) => g.Status == "ACTIVE");
		}
		return (await query.OrderBy((AnimalGroup g) => g.Name).ToListAsync()).Select(Map).ToList();
	}

	public async Task<AnimalGroupDto?> GetByIdAsync(ulong groupId)
	{
		AnimalGroup group = await _context.AnimalGroups.AsNoTracking().Include((AnimalGroup g) => g.Farm).Include((AnimalGroup g) => g.Shed)
			.Include((AnimalGroup g) => g.Animals)
			.FirstOrDefaultAsync((AnimalGroup g) => g.GroupId == groupId);
		return (group == null) ? null : Map(group);
	}

	private static AnimalGroupDto Map(AnimalGroup g)
	{
		AnimalGroupDto animalGroupDto = new AnimalGroupDto
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
		Shed shed = g.Shed;
		if (shed != null)
		{
			animalGroupDto.Shed = new ShedDto
			{
				ShedId = shed.ShedId,
				ShedName = shed.Name,
				FarmId = shed.FarmId,
				Capacity = shed.Capacity,
				Notes = shed.Notes,
				GroupCount = 0
			};
		}
		return animalGroupDto;
	}
}
