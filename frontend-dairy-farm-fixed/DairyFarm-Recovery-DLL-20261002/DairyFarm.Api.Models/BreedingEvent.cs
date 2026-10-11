using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("breeding_events")]
public class BreedingEvent
{
	[Key]
	[Column("breeding_event_id")]
	public ulong BreedingEventId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("service_animal_id")]
	public ulong? ServiceAnimalId { get; set; }

	[Column("event_type")]
	[StringLength(30)]
	public string EventType { get; set; } = "HEAT";

	[Column("event_date")]
	public DateTime EventDate { get; set; }

	[Column("service_number")]
	public int? ServiceNumber { get; set; }

	[Column("technician_name")]
	[StringLength(150)]
	public string? TechnicianName { get; set; }

	[Column("semen_bull")]
	[StringLength(150)]
	public string? SemenBull { get; set; }

	[Column("semen_batch")]
	[StringLength(100)]
	public string? SemenBatch { get; set; }

	[Column("pregnancy_result")]
	[StringLength(30)]
	public string? PregnancyResult { get; set; }

	[Column("expected_calving_date")]
	public DateTime? ExpectedCalvingDate { get; set; }

	[Column("calving_date")]
	public DateTime? CalvingDate { get; set; }

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

	public Animal? ServiceAnimal { get; set; }

	public ICollection<Pregnancy> Pregnancies { get; set; } = new List<Pregnancy>();
}
