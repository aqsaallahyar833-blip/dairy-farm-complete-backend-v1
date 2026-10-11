using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("milk_sales")]
public class MilkSale
{
	[Key]
	[Column("milk_sale_id")]
	public ulong MilkSaleId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("buyer_id")]
	public ulong BuyerId { get; set; }

	[Column("sale_date")]
	public DateTime SaleDate { get; set; }

	[Column("milk_quantity_liters")]
	public decimal MilkQuantityLiters { get; set; }

	[Column("price_per_liter")]
	public decimal PricePerLiter { get; set; }

	[Column("total_amount")]
	public decimal TotalAmount { get; set; }

	[Column("payment_method")]
	[StringLength(20)]
	public string PaymentMethod { get; set; } = "CASH";

	[Column("payment_status")]
	[StringLength(20)]
	public string PaymentStatus { get; set; } = "PAID";

	[Column("amount_paid")]
	public decimal AmountPaid { get; set; }

	[Column("amount_due")]
	public decimal AmountDue { get; set; }

	[Column("reference_number")]
	[StringLength(100)]
	public string? ReferenceNumber { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public MilkBuyer? Buyer { get; set; }
}
