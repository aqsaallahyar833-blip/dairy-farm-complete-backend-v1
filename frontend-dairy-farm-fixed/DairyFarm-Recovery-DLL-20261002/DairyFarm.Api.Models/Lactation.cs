using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("lactations")]
public class Lactation
{
	[Key]
	[Column("lactation_id")]
	public ulong LactationId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("lactation_number")]
	public int LactationNumber { get; set; }

	[Column("start_date")]
	public DateTime? StartDate { get; set; }

	[Column("dry_off_date")]
	public DateTime? DryOffDate { get; set; }

	[Column("peak_milk_liters")]
	public decimal? PeakMilkLiters { get; set; }

	[Column("peak_date")]
	public DateTime? PeakDate { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Animal? Animal { get; set; }

	public ICollection<MilkRecord> MilkRecords { get; set; } = new List<MilkRecord>();
}
