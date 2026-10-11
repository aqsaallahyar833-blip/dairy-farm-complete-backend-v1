using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("pregnancies")]
public class Pregnancy
{
	[Key]
	[Column("pregnancy_id")]
	public ulong PregnancyId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("breeding_event_id")]
	public ulong? BreedingEventId { get; set; }

	[Column("conception_date")]
	public DateTime? ConceptionDate { get; set; }

	[Column("confirmation_date")]
	public DateTime? ConfirmationDate { get; set; }

	[Column("expected_calving_date")]
	public DateTime? ExpectedCalvingDate { get; set; }

	[Column("actual_calving_date")]
	public DateTime? ActualCalvingDate { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "CONFIRMED";

	[Column("calf_count")]
	public int? CalfCount { get; set; }

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

	public BreedingEvent? BreedingEvent { get; set; }

	public ICollection<Calving> Calvings { get; set; } = new List<Calving>();
}
