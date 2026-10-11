using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("milk_records")]
public class MilkRecord
{
	[Key]
	[Column("milk_record_id")]
	public ulong MilkRecordId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("lactation_id")]
	public ulong? LactationId { get; set; }

	[Column("record_date")]
	public DateTime RecordDate { get; set; }

	[Column("session")]
	[StringLength(10)]
	public string Session { get; set; } = "MORNING";

	[Column("milk_liters")]
	public decimal MilkLiters { get; set; }

	[Column("fat_percent")]
	public decimal? FatPercent { get; set; }

	[Column("protein_percent")]
	public decimal? ProteinPercent { get; set; }

	[Column("snf_percent")]
	public decimal? SnfPercent { get; set; }

	[Column("scc")]
	public decimal? Scc { get; set; }

	[Column("is_rejected")]
	public bool IsRejected { get; set; }

	[Column("rejection_reason")]
	[StringLength(255)]
	public string? RejectionReason { get; set; }

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

	public Lactation? Lactation { get; set; }
}
