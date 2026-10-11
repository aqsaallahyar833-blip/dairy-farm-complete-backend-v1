using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_sales")]
public class AnimalSale
{
	[Key]
	[Column("sale_id")]
	public ulong SaleId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("buyer_id")]
	public ulong? BuyerId { get; set; }

	[Column("sale_date")]
	public DateTime SaleDate { get; set; }

	[Column("buyer_name")]
	[StringLength(150)]
	public string? BuyerName { get; set; }

	[Column("buyer_contact")]
	[StringLength(100)]
	public string? BuyerContact { get; set; }

	[Column("sale_price")]
	public decimal SalePrice { get; set; }

	[Column("weight_kg")]
	public decimal? WeightKg { get; set; }

	[Column("cost_basis")]
	public decimal? CostBasis { get; set; }

	[Column("profit_loss")]
	public decimal? ProfitLoss { get; set; }

	[Column("reason")]
	[StringLength(255)]
	public string? Reason { get; set; }

	[Column("payment_method")]
	[StringLength(20)]
	public string? PaymentMethod { get; set; }

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

	public Animal? Animal { get; set; }

	public MilkBuyer? Buyer { get; set; }
}
