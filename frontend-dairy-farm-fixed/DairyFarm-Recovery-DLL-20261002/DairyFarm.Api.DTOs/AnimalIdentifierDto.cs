namespace DairyFarm.Api.DTOs;

public class AnimalIdentifierDto
{
	public string Type { get; set; } = null;

	public string? Value { get; set; }

	public bool IsPrimary { get; set; }
}
