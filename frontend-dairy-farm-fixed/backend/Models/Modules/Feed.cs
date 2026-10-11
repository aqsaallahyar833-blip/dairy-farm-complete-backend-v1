using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;
/// <summary>Maps `suppliers` - vendors for feed, medicines and livestock.</summary>
[Table("suppliers")]
public class Supplier
{
    [Key, Column("supplier_id")] public ulong SupplierId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(200)] public string Name { get; set; } = string.Empty;
    [Column("contact_person"), StringLength(150)] public string? ContactPerson { get; set; }
    [Column("phone"), StringLength(50)] public string? Phone { get; set; }
    [Column("email"), StringLength(150)] public string? Email { get; set; }
    [Column("address"), StringLength(500)] public string? Address { get; set; }
    [Column("supplier_type"), StringLength(30)] public string? SupplierType { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<FeedTransaction> FeedTransactions { get; set; } = new List<FeedTransaction>();
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}

/// <summary>
/// Maps `feed_items` - the feed master list. UNIQUE name per farm
/// (uq_feed_items_farm_name). minimum_stock is the low-stock alert threshold,
/// NOT a computed balance.
/// </summary>
[Table("feed_items")]
public class FeedItem
{
    [Key, Column("feed_item_id")] public ulong FeedItemId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("category"), StringLength(50)] public string? Category { get; set; }
    [Column("unit"), StringLength(20)] public string Unit { get; set; } = "KG";
    [Column("description")] public string? Description { get; set; }
    [Column("dry_matter_percent")] public decimal? DryMatterPercent { get; set; }
    [Column("crude_protein_percent")] public decimal? CrudeProteinPercent { get; set; }
    [Column("me_mj_per_kg")] public decimal? MeMjPerKg { get; set; }
    [Column("price_per_unit")] public decimal? PricePerUnit { get; set; }
    [Column("minimum_stock")] public decimal? MinimumStock { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<FeedTransaction> Transactions { get; set; } = new List<FeedTransaction>();
    public ICollection<FeedConsumption> Consumptions { get; set; } = new List<FeedConsumption>();
    public ICollection<RationPlanItem> RationPlanItems { get; set; } = new List<RationPlanItem>();
}

/// <summary>
/// Maps `feed_transactions` - the signed feed stock ledger.
/// quantity is signed: positive = in, negative = out.
/// </summary>
[Table("feed_transactions")]
public class FeedTransaction
{
    [Key, Column("feed_transaction_id")] public ulong FeedTransactionId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("feed_item_id")] public ulong FeedItemId { get; set; }
    [Column("transaction_date")] public DateTime TransactionDate { get; set; }
    [Column("transaction_type"), StringLength(20)] public string TransactionType { get; set; } = "PURCHASE";
    [Column("quantity")] public decimal Quantity { get; set; }
    [Column("unit_cost")] public decimal? UnitCost { get; set; }
    [Column("total_cost")] public decimal? TotalCost { get; set; }
    [Column("supplier_id")] public ulong? SupplierId { get; set; }
    [Column("supplier_name"), StringLength(200)] public string? SupplierName { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public FeedItem? FeedItem { get; set; }
    public Supplier? Supplier { get; set; }
}
/// <summary>Maps `ration_plans` - a named feed plan for an animal or a group.</summary>
[Table("ration_plans")]
public class RationPlan
{
    [Key, Column("ration_plan_id")] public ulong RationPlanId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("description")] public string? Description { get; set; }
    [Column("animal_id")] public ulong? AnimalId { get; set; }
    [Column("group_id")] public ulong? GroupId { get; set; }
    [Column("start_date")] public DateTime? StartDate { get; set; }
    [Column("end_date")] public DateTime? EndDate { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
    public ICollection<RationPlanItem> Items { get; set; } = new List<RationPlanItem>();
    public ICollection<FeedConsumption> Consumptions { get; set; } = new List<FeedConsumption>();
}

/// <summary>
/// Maps `ration_plan_items` - the feed lines of a ration plan.
/// UNIQUE (ration_plan_id, feed_item_id) = uq_ration_item.
/// </summary>
[Table("ration_plan_items")]
public class RationPlanItem
{
    [Key, Column("ration_plan_item_id")] public ulong RationPlanItemId { get; set; }
    [Column("ration_plan_id")] public ulong RationPlanId { get; set; }
    [Column("feed_item_id")] public ulong FeedItemId { get; set; }
    [Column("quantity_per_day")] public decimal QuantityPerDay { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public RationPlan? RationPlan { get; set; }
    public FeedItem? FeedItem { get; set; }
}

/// <summary>
/// Maps `feed_consumptions` - feed actually given. animal_id XOR group_id
/// identifies whether the consumption was per-animal or per-group.
/// </summary>
[Table("feed_consumptions")]
public class FeedConsumption
{
    [Key, Column("feed_consumption_id")] public ulong FeedConsumptionId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("feed_item_id")] public ulong FeedItemId { get; set; }
    [Column("consumption_date")] public DateTime ConsumptionDate { get; set; }
    [Column("animal_id")] public ulong? AnimalId { get; set; }
    [Column("group_id")] public ulong? GroupId { get; set; }
    [Column("ration_plan_id")] public ulong? RationPlanId { get; set; }
    [Column("quantity")] public decimal Quantity { get; set; }
    [Column("unit"), StringLength(20)] public string? Unit { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("recorded_by")] public ulong? RecordedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public Farm? Farm { get; set; }
    public FeedItem? FeedItem { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
    public RationPlan? RationPlan { get; set; }
}
/// <summary>
/// Maps `inventory_items` - non-feed stock master (medicines, spares, tools).
/// UNIQUE name per farm (uq_inventory_farm_name).
/// </summary>
[Table("inventory_items")]
public class InventoryItem
{
    [Key, Column("inventory_item_id")] public ulong InventoryItemId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("category"), StringLength(50)] public string? Category { get; set; }
    [Column("unit"), StringLength(20)] public string Unit { get; set; } = "PCS";
    [Column("minimum_stock")] public decimal? MinimumStock { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}

/// <summary>
/// Maps `inventory_transactions` - the signed non-feed stock ledger.
/// quantity is signed: positive = in, negative = out.
/// </summary>
[Table("inventory_transactions")]
public class InventoryTransaction
{
    [Key, Column("inventory_transaction_id")] public ulong InventoryTransactionId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("inventory_item_id")] public ulong InventoryItemId { get; set; }
    [Column("transaction_date")] public DateTime TransactionDate { get; set; }
    [Column("transaction_type"), StringLength(20)] public string TransactionType { get; set; } = "PURCHASE";
    [Column("quantity")] public decimal Quantity { get; set; }
    [Column("unit_cost")] public decimal? UnitCost { get; set; }
    [Column("total_cost")] public decimal? TotalCost { get; set; }
    [Column("supplier_id")] public ulong? SupplierId { get; set; }
    [Column("supplier_name"), StringLength(200)] public string? SupplierName { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public InventoryItem? InventoryItem { get; set; }
    public Supplier? Supplier { get; set; }
}