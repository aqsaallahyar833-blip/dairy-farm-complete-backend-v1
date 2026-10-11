using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("finance_transactions")]
public class FinanceTransaction
{
	[Key]
	[Column("finance_transaction_id")]
	public ulong FinanceTransactionId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("category_id")]
	public ulong CategoryId { get; set; }

	[Column("supplier_id")]
	public ulong? SupplierId { get; set; }

	[Column("buyer_id")]
	public ulong? BuyerId { get; set; }

	[Column("transaction_date")]
	public DateTime TransactionDate { get; set; }

	[Column("transaction_type")]
	[StringLength(20)]
	public string TransactionType { get; set; } = "EXPENSE";

	[Column("amount")]
	public decimal Amount { get; set; }

	[Column("payment_method")]
	[StringLength(20)]
	public string? PaymentMethod { get; set; }

	[Column("reference_number")]
	[StringLength(100)]
	public string? ReferenceNumber { get; set; }

	[Column("description")]
	[StringLength(255)]
	public string? Description { get; set; }

	[Column("receipt_url")]
	[StringLength(500)]
	public string? ReceiptUrl { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public FinanceCategory? Category { get; set; }

	public Supplier? Supplier { get; set; }

	public MilkBuyer? Buyer { get; set; }
}
