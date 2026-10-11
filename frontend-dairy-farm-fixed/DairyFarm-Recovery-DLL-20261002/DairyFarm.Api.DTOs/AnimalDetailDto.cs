using System.Collections.Generic;

namespace DairyFarm.Api.DTOs;

public class AnimalDetailDto : AnimalDto
{
	public ulong? DamId { get; set; }

	public string? DamAnimalCode { get; set; }

	public ulong? SireId { get; set; }

	public string? SireAnimalCode { get; set; }

	public ShedDto? Shed { get; set; }

	public List<AnimalStatusHistoryDto> StatusHistory { get; set; } = new List<AnimalStatusHistoryDto>();

	public string? RfidNumber { get; set; }
}
