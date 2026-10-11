using System;
using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

public class UpdateAnimalRequest
{
	[StringLength(150)]
	public string? Name { get; set; }

	public long? BreedId { get; set; }

	[StringLength(50)]
	public string? AnimalCode { get; set; }

	public DateTime? DateOfBirth { get; set; }

	public long? GroupId { get; set; }

	public long? DamId { get; set; }

	public long? SireId { get; set; }

	public DateTime? PurchaseDate { get; set; }

	[Range(0.0, double.MaxValue, ErrorMessage = "purchasePrice must be zero or greater.")]
	public decimal? PurchasePrice { get; set; }

	public string? Notes { get; set; }

	public string? Status { get; set; }

	[StringLength(50)]
	public string? EarTag { get; set; }

	[StringLength(50)]
	public string? Rfid { get; set; }
}
