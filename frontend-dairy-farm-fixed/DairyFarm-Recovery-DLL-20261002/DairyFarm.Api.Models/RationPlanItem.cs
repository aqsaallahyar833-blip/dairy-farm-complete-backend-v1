using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("ration_plan_items")]
public class RationPlanItem
{
	[Key]
	[Column("ration_plan_item_id")]
	public ulong RationPlanItemId { get; set; }

	[Column("ration_plan_id")]
	public ulong RationPlanId { get; set; }

	[Column("feed_item_id")]
	public ulong FeedItemId { get; set; }

	[Column("quantity_per_day")]
	public decimal QuantityPerDay { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public RationPlan? RationPlan { get; set; }

	public FeedItem? FeedItem { get; set; }
}
