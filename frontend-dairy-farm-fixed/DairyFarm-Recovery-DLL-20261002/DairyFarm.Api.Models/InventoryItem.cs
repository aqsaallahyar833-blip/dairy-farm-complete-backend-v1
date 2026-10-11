using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("inventory_items")]
public class InventoryItem
{
	[Key]
	[Column("inventory_item_id")]
	public ulong InventoryItemId { get; set; }

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
	public string Unit { get; set; } = "PCS";

	[Column("minimum_stock")]
	public decimal? MinimumStock { get; set; }

	[Column("description")]
	public string? Description { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}
