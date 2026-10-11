using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using DairyFarm.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Repositories;

public class AnimalRepository
{
	private readonly AppDbContext _context;

	public AnimalRepository(AppDbContext context)
	{
		_context = context;
	}

	public async Task<List<AnimalDto>> GetAllAsync(ulong? farmId = null, string? status = null, string? sex = null, ulong? breedId = null, ulong? groupId = null, string? search = null)
	{
		IQueryable<Animal> query = BuildBaseQuery();
		if (farmId.HasValue)
		{
			query = query.Where((Animal a) => a.FarmId == ((ulong?)farmId).Value);
		}
		string normalisedStatus = status?.Trim().ToUpperInvariant();
		if (!string.IsNullOrWhiteSpace(normalisedStatus))
		{
			query = query.Where((Animal a) => a.Status == normalisedStatus);
		}
		string normalisedSex = sex?.Trim().ToUpperInvariant();
		if (!string.IsNullOrWhiteSpace(normalisedSex))
		{
			query = query.Where((Animal a) => a.Sex == normalisedSex);
		}
		if (breedId.HasValue)
		{
			query = query.Where((Animal a) => a.BreedId == (ulong?)((ulong?)breedId).Value);
		}
		if (groupId.HasValue)
		{
			query = query.Where((Animal a) => a.GroupId == (ulong?)((ulong?)groupId).Value);
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			string term = search.Trim();
			query = query.Where((Animal a) => a.AnimalCode.Contains(term) || (a.Name != null && a.Name.Contains(term)) || (a.TagNumber != null && a.TagNumber.Contains(term)) || (a.RfidNumber != null && a.RfidNumber.Contains(term)));
		}
		return (await query.OrderBy((Animal a) => a.AnimalCode).ToListAsync()).Select(AnimalDetailMapper.MapToList).ToList();
	}

	public async Task<AnimalDetailDto?> GetByIdAsync(ulong animalId)
	{
		Animal animal = await BuildDetailQuery().FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId);
		return (animal == null) ? null : AnimalDetailMapper.Map(animal);
	}

	public async Task<AnimalDetailDto?> GetByCodeAsync(string animalCode, ulong? farmId = null)
	{
		string trimmed = animalCode.Trim();
		IQueryable<Animal> query = from a in BuildDetailQuery()
			where a.AnimalCode == trimmed
			select a;
		if (farmId.HasValue)
		{
			query = query.Where((Animal a) => a.FarmId == ((ulong?)farmId).Value);
		}
		Animal animal = await query.FirstOrDefaultAsync();
		return (animal == null) ? null : AnimalDetailMapper.Map(animal);
	}

	public async Task<List<AnimalIdentifierDto>> GetIdentificationsAsync(ulong animalId)
	{
		var animal = await (from a in _context.Animals.AsNoTracking()
			where a.AnimalId == animalId
			select new { a.TagNumber, a.RfidNumber, a.QrToken }).FirstOrDefaultAsync();
		if (animal == null)
		{
			return new List<AnimalIdentifierDto>();
		}
		List<AnimalIdentifierDto> result = new List<AnimalIdentifierDto>(3);
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

	public async Task<List<AnimalStatusHistoryDto>> GetStatusHistoryAsync(ulong animalId)
	{
		return await (from h in _context.AnimalStatusHistories.AsNoTracking()
			where h.AnimalId == animalId
			orderby h.CreatedAt descending, h.StatusHistoryId descending
			select new AnimalStatusHistoryDto
			{
				StatusHistoryId = h.StatusHistoryId,
				OldStatus = h.OldStatus,
				NewStatus = h.NewStatus,
				Reason = h.Reason,
				ChangedAt = h.CreatedAt,
				UserId = h.ChangedBy
			}).ToListAsync();
	}

	private IQueryable<Animal> BuildBaseQuery()
	{
		return _context.Animals.AsNoTracking().Include((Animal a) => a.Breed).Include((Animal a) => a.Farm)
			.Include((Animal a) => a.Group)
			.AsQueryable();
	}

	private IQueryable<Animal> BuildDetailQuery()
	{
		return BuildBaseQuery().Include((Animal a) => a.Dam).Include((Animal a) => a.Sire).Include((Animal a) => a.StatusHistory)
			.Include((Animal a) => a.Group)
			.ThenInclude((AnimalGroup g) => g.Shed)
			.ThenInclude((Shed s) => s.Farm)
			.AsQueryable();
	}
}
