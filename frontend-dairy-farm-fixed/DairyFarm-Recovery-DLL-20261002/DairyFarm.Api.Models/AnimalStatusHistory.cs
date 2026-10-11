using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_status_history")]
public class AnimalStatusHistory
{
	[Key]
	[Column("status_history_id")]
	public ulong StatusHistoryId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("old_status")]
	[StringLength(20)]
	public string? OldStatus { get; set; }

	[Column("new_status")]
	[StringLength(20)]
	public string NewStatus { get; set; } = string.Empty;

	[Column("effective_date")]
	public DateTime EffectiveDate { get; set; }

	[Column("reason")]
	[StringLength(500)]
	public string? Reason { get; set; }

	[Column("changed_by")]
	public ulong? ChangedBy { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public Animal? Animal { get; set; }
}
