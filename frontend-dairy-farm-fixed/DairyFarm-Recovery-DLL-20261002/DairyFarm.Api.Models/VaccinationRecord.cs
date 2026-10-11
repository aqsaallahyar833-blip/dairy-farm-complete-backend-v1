using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("vaccination_records")]
public class VaccinationRecord
{
	[Key]
	[Column("vaccination_id")]
	public ulong VaccinationId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong? AnimalId { get; set; }

	[Column("group_id")]
	public ulong? GroupId { get; set; }

	[Column("vaccine_name")]
	[StringLength(150)]
	public string VaccineName { get; set; } = string.Empty;

	[Column("vaccination_date")]
	public DateTime VaccinationDate { get; set; }

	[Column("next_due_date")]
	public DateTime? NextDueDate { get; set; }

	[Column("batch_number")]
	[StringLength(100)]
	public string? BatchNumber { get; set; }

	[Column("manufacturer")]
	[StringLength(150)]
	public string? Manufacturer { get; set; }

	[Column("veterinarian_name")]
	[StringLength(150)]
	public string? VeterinarianName { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "COMPLETED";

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public AnimalGroup? Group { get; set; }
}
