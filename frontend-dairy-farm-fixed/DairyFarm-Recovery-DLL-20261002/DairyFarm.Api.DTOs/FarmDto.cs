namespace DairyFarm.Api.DTOs;

public class FarmDto
{
	public ulong FarmId { get; set; }

	public ulong CompanyId { get; set; }

	public string Name { get; set; } = null;

	public string? Location { get; set; }

	public string? Contact { get; set; }

	public string Status { get; set; } = null;
}
