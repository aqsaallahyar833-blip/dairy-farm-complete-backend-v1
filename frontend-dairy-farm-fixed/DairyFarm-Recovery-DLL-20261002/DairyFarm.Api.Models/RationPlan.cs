using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("ration_plans")]
public class RationPlan
{
	[Key]
	[Column("ration_plan_id")]
	public ulong RationPlanId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("description")]
	public string? Description { get; set; }

	[Column("animal_id")]
	public ulong? AnimalId { get; set; }

	[Column("group_id")]
	public ulong? GroupId { get; set; }

	[Column("start_date")]
	public DateTime? StartDate { get; set; }

	[Column("end_date")]
	public DateTime? EndDate { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public AnimalGroup? Group { get; set; }

	public ICollection<RationPlanItem> Items { get; set; } = new List<RationPlanItem>();

	public ICollection<FeedConsumption> Consumptions { get; set; } = new List<FeedConsumption>();
}
