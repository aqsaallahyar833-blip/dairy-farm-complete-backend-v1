using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("feed_transactions")]
public class FeedTransaction
{
	[Key]
	[Column("feed_transaction_id")]
	public ulong FeedTransactionId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("feed_item_id")]
	public ulong FeedItemId { get; set; }

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

	public FeedItem? FeedItem { get; set; }

	public Supplier? Supplier { get; set; }
}
