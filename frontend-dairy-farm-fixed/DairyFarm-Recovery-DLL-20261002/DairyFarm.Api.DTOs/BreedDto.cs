namespace DairyFarm.Api.DTOs;

public class BreedDto
{
	public ulong BreedId { get; set; }

	public string Name { get; set; } = null;

	public string? Description { get; set; }

	public bool Active { get; set; }
}
