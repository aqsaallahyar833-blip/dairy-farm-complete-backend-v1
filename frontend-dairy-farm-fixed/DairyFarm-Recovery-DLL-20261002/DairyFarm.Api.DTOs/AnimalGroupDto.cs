namespace DairyFarm.Api.DTOs;

public class AnimalGroupDto
{
	public ulong GroupId { get; set; }

	public ulong FarmId { get; set; }

	public string? FarmName { get; set; }

	public string Name { get; set; } = null;

	public string AnimalType { get; set; } = null;

	public string Status { get; set; } = null;

	public ulong? ShedId { get; set; }

	public ShedDto? Shed { get; set; }

	public int AnimalCount { get; set; }
}
