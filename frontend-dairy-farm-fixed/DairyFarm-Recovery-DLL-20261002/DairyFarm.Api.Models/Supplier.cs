using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("suppliers")]
public class Supplier
{
	[Key]
	[Column("supplier_id")]
	public ulong SupplierId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(200)]
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
	[StringLength(500)]
	public string? Address { get; set; }

	[Column("supplier_type")]
	[StringLength(30)]
	public string? SupplierType { get; set; }

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

	public ICollection<FeedTransaction> FeedTransactions { get; set; } = new List<FeedTransaction>();

	public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}
