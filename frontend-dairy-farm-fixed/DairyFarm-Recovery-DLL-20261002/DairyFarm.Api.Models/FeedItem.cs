using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("feed_items")]
public class FeedItem
{
	[Key]
	[Column("feed_item_id")]
	public ulong FeedItemId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("category")]
	[StringLength(50)]
	public string? Category { get; set; }

	[Column("unit")]
	[StringLength(20)]
	public string Unit { get; set; } = "KG";

	[Column("description")]
	public string? Description { get; set; }

	[Column("dry_matter_percent")]
	public decimal? DryMatterPercent { get; set; }

	[Column("crude_protein_percent")]
	public decimal? CrudeProteinPercent { get; set; }

	[Column("me_mj_per_kg")]
	public decimal? MeMjPerKg { get; set; }

	[Column("price_per_unit")]
	public decimal? PricePerUnit { get; set; }

	[Column("minimum_stock")]
	public decimal? MinimumStock { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public ICollection<FeedTransaction> Transactions { get; set; } = new List<FeedTransaction>();

	public ICollection<FeedConsumption> Consumptions { get; set; } = new List<FeedConsumption>();

	public ICollection<RationPlanItem> RationPlanItems { get; set; } = new List<RationPlanItem>();
}
