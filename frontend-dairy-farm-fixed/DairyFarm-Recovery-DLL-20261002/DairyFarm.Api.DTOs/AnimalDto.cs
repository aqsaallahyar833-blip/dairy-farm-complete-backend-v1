using System;

namespace DairyFarm.Api.DTOs;

public class AnimalDto
{
	public ulong AnimalId { get; set; }

	public string AnimalCode { get; set; } = null;

	public string? TagNumber { get; set; }

	public string? Name { get; set; }

	public ulong? BreedId { get; set; }

	public string? BreedName { get; set; }

	public DateTime? DateOfBirth { get; set; }

	public string Status { get; set; } = null;

	public string Sex { get; set; } = null;

	public ulong FarmId { get; set; }

	public string? FarmName { get; set; }

	public ulong? GroupId { get; set; }

	public string? GroupName { get; set; }

	public string? Photo { get; set; }

	public string? Notes { get; set; }

	public DateTime? PurchaseDate { get; set; }

	public decimal? PurchasePrice { get; set; }

	public int? AgeInMonths { get; set; }

	public DateTime CreatedAt { get; set; }

	public DateTime UpdatedAt { get; set; }
}
