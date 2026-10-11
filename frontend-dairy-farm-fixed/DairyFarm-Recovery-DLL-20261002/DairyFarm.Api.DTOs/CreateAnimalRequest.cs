using System;
using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

public class CreateAnimalRequest
{
	[Required]
	[Range(1.0, 9.223372036854776E+18)]
	public long FarmId { get; set; }

	[StringLength(50)]
	public string? AnimalCode { get; set; }

	[StringLength(150)]
	public string? Name { get; set; }

	public long? BreedId { get; set; }

	[Required]
	[RegularExpression("^(MALE|FEMALE)$", ErrorMessage = "sex must be MALE or FEMALE.")]
	public string Sex { get; set; } = null;

	public DateTime? DateOfBirth { get; set; }

	[RegularExpression("^(ACTIVE|LACTATING|DRY|PREGNANT|OPEN|SICK|QUARANTINE|SOLD|DEAD|CALF|HEIFER|BULL)$", ErrorMessage = "status is not a valid animal status.")]
	public string? Status { get; set; }

	public long? GroupId { get; set; }

	public long? DamId { get; set; }

	public long? SireId { get; set; }

	public DateTime? PurchaseDate { get; set; }

	[Range(0.0, double.MaxValue, ErrorMessage = "purchasePrice must be zero or greater.")]
	public decimal? PurchasePrice { get; set; }

	public string? Notes { get; set; }

	[StringLength(50)]
	public string? EarTag { get; set; }

	[StringLength(50)]
	public string? Rfid { get; set; }
}
