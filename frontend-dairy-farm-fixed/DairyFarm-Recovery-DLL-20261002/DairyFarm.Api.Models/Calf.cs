using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("calves")]
public class Calf
{
	[Key]
	[Column("calf_id")]
	public ulong CalfId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("calving_id")]
	public ulong? CalvingId { get; set; }

	[Column("calf_animal_id")]
	public ulong? CalfAnimalId { get; set; }

	[Column("dam_id")]
	public ulong? DamId { get; set; }

	[Column("sire_id")]
	public ulong? SireId { get; set; }

	[Column("calf_number")]
	[StringLength(50)]
	public string? CalfNumber { get; set; }

	[Column("birth_date")]
	public DateTime BirthDate { get; set; }

	[Column("sex")]
	[StringLength(10)]
	public string Sex { get; set; } = "FEMALE";

	[Column("birth_weight_kg")]
	public decimal? BirthWeightKg { get; set; }

	[Column("colostrum_received")]
	public bool ColostrumReceived { get; set; }

	[Column("colostrum_time_hours")]
	public decimal? ColostrumTimeHours { get; set; }

	[Column("health_status")]
	[StringLength(30)]
	public string? HealthStatus { get; set; }

	[Column("outcome")]
	[StringLength(20)]
	public string Outcome { get; set; } = "ALIVE";

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Calving? Calving { get; set; }

	public Animal? CalfAnimal { get; set; }

	public Animal? Dam { get; set; }

	public Animal? Sire { get; set; }
}
