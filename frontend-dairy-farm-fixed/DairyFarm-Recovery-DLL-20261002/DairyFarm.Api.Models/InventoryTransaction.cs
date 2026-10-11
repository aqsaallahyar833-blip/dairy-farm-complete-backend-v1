using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("inventory_transactions")]
public class InventoryTransaction
{
	[Key]
	[Column("inventory_transaction_id")]
	public ulong InventoryTransactionId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("inventory_item_id")]
	public ulong InventoryItemId { get; set; }

	[Column("transaction_date")]
	public DateTime TransactionDate { get; set; }

	[Column("transaction_type")]
	[StringLength(20)]
	public string TransactionType { get; set; } = "PURCHASE";

	[Column("quantity")]
	public decimal Quantity { get; set; }

	[Column("unit_cost")]
	public decimal? UnitCost { get; set; }

	[Column("total_cost")]
	public decimal? TotalCost { get; set; }

	[Column("supplier_id")]
	public ulong? SupplierId { get; set; }

	[Column("supplier_name")]
	[StringLength(200)]
	public string? SupplierName { get; set; }

	[Column("reference_number")]
	[StringLength(100)]
	public string? ReferenceNumber { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public InventoryItem? InventoryItem { get; set; }

	public Supplier? Supplier { get; set; }
}
