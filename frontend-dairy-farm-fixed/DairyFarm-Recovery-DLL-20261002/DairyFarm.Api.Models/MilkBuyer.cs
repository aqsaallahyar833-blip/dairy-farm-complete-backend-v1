using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("milk_buyers")]
public class MilkBuyer
{
	[Key]
	[Column("buyer_id")]
	public ulong BuyerId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("contact_person")]
	[StringLength(150)]
	public string? ContactPerson { get; set; }

	[Column("phone")]
	[StringLength(50)]
	public string? Phone { get; set; }

	[Column("email")]
	[StringLength(150)]
	public string? Email { get; set; }

	[Column("address")]
	[StringLength(255)]
	public string? Address { get; set; }

	[Column("buyer_type")]
	[StringLength(30)]
	public string BuyerType { get; set; } = "LOCAL_SHOP";

	[Column("daily_quantity_liters")]
	public decimal? DailyQuantityLiters { get; set; }

	[Column("rate_per_liter")]
	public decimal? RatePerLiter { get; set; }

	[Column("credit_period_days")]
	public int? CreditPeriodDays { get; set; }

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

	public ICollection<MilkSale> MilkSales { get; set; } = new List<MilkSale>();
}
