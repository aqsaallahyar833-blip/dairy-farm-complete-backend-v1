using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_purchases")]
public class AnimalPurchase
{
	[Key]
	[Column("purchase_id")]
	public ulong PurchaseId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("supplier_id")]
	public ulong? SupplierId { get; set; }

	[Column("purchase_date")]
	public DateTime PurchaseDate { get; set; }

	[Column("purchase_price")]
	public decimal PurchasePrice { get; set; }

	[Column("transport_cost")]
	public decimal TransportCost { get; set; }

	[Column("veterinary_cost")]
	public decimal VeterinaryCost { get; set; }

	[Column("inspection_status")]
	[StringLength(30)]
	public string? InspectionStatus { get; set; }

	[Column("health_status")]
	[StringLength(30)]
	public string? HealthStatus { get; set; }

	[Column("previous_farm")]
	[StringLength(200)]
	public string? PreviousFarm { get; set; }

	[Column("landed_cost")]
	public decimal? LandedCost { get; set; }

	[Column("payment_method")]
	[StringLength(20)]
	public string? PaymentMethod { get; set; }

	[Column("reference_number")]
	[StringLength(100)]
	public string? ReferenceNumber { get; set; }

	[Column("quarantine_until")]
	public DateTime? QuarantineUntil { get; set; }

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

	public Supplier? Supplier { get; set; }
}
