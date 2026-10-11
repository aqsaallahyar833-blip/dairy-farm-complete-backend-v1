using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_mortalities")]
public class AnimalMortality
{
	[Key]
	[Column("mortality_id")]
	public ulong MortalityId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("mortality_date")]
	public DateTime MortalityDate { get; set; }

	[Column("cause")]
	[StringLength(255)]
	public string? Cause { get; set; }

	[Column("reason")]
	[StringLength(255)]
	public string? Reason { get; set; }

	[Column("location")]
	[StringLength(150)]
	public string? Location { get; set; }

	[Column("veterinarian_name")]
	[StringLength(150)]
	public string? VeterinarianName { get; set; }

	[Column("post_mortem_done")]
	public bool PostMortemDone { get; set; }

	[Column("post_mortem_notes")]
	public string? PostMortemNotes { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("recorded_by")]
	public ulong? RecordedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }
}
