using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("feed_consumptions")]
public class FeedConsumption
{
	[Key]
	[Column("feed_consumption_id")]
	public ulong FeedConsumptionId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("feed_item_id")]
	public ulong FeedItemId { get; set; }

	[Column("consumption_date")]
	public DateTime ConsumptionDate { get; set; }

	[Column("animal_id")]
	public ulong? AnimalId { get; set; }

	[Column("group_id")]
	public ulong? GroupId { get; set; }

	[Column("ration_plan_id")]
	public ulong? RationPlanId { get; set; }

	[Column("quantity")]
	public decimal Quantity { get; set; }

	[Column("unit")]
	[StringLength(20)]
	public string? Unit { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("recorded_by")]
	public ulong? RecordedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public Farm? Farm { get; set; }

	public FeedItem? FeedItem { get; set; }

	public Animal? Animal { get; set; }

	public AnimalGroup? Group { get; set; }

	public RationPlan? RationPlan { get; set; }
}
