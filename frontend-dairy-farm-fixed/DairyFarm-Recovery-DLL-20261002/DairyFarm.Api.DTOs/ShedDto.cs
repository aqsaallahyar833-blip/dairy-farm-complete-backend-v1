namespace DairyFarm.Api.DTOs;

public class ShedDto
{
	public ulong ShedId { get; set; }

	public string ShedName { get; set; } = null;

	public ulong FarmId { get; set; }

	public string? FarmName { get; set; }

	public uint? Capacity { get; set; }

	public string? Notes { get; set; }

	public int GroupCount { get; set; }
}
