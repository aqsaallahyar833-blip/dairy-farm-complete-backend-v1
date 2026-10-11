using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;
/// <summary>
/// Maps `animal_purchases`. landed_cost is computed by the service on save as
/// purchase_price + transport_cost + veterinary_cost.
/// </summary>
[Table("animal_purchases")]
public class AnimalPurchase
{
    [Key, Column("purchase_id")] public ulong PurchaseId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("supplier_id")] public ulong? SupplierId { get; set; }
    [Column("purchase_date")] public DateTime PurchaseDate { get; set; }
    [Column("purchase_price")] public decimal PurchasePrice { get; set; }
    [Column("transport_cost")] public decimal TransportCost { get; set; }
    [Column("veterinary_cost")] public decimal VeterinaryCost { get; set; }
    [Column("inspection_status"), StringLength(30)] public string? InspectionStatus { get; set; }
    [Column("health_status"), StringLength(30)] public string? HealthStatus { get; set; }
    [Column("previous_farm"), StringLength(200)] public string? PreviousFarm { get; set; }
    [Column("landed_cost")] public decimal? LandedCost { get; set; }
    [Column("payment_method"), StringLength(20)] public string? PaymentMethod { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("quarantine_until")] public DateTime? QuarantineUntil { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public Supplier? Supplier { get; set; }
}

/// <summary>
/// Maps `animal_sales`. cost_basis and profit_loss are computed by the service
/// on save.
/// </summary>
[Table("animal_sales")]
public class AnimalSale
{
    [Key, Column("sale_id")] public ulong SaleId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("buyer_id")] public ulong? BuyerId { get; set; }
    [Column("sale_date")] public DateTime SaleDate { get; set; }
    [Column("buyer_name"), StringLength(150)] public string? BuyerName { get; set; }
    [Column("buyer_contact"), StringLength(100)] public string? BuyerContact { get; set; }
    [Column("sale_price")] public decimal SalePrice { get; set; }
    [Column("weight_kg")] public decimal? WeightKg { get; set; }
    [Column("cost_basis")] public decimal? CostBasis { get; set; }
    [Column("profit_loss")] public decimal? ProfitLoss { get; set; }
    [Column("reason"), StringLength(255)] public string? Reason { get; set; }
    [Column("payment_method"), StringLength(20)] public string? PaymentMethod { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public MilkBuyer? Buyer { get; set; }
}

/// <summary>
/// Maps `animal_mortalities`. Recording a death sets animals.status = 'DEAD';
/// it never deletes the animal, so the full history stays queryable.
/// </summary>
[Table("animal_mortalities")]
public class AnimalMortality
{
    [Key, Column("mortality_id")] public ulong MortalityId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("mortality_date")] public DateTime MortalityDate { get; set; }
    [Column("cause"), StringLength(255)] public string? Cause { get; set; }
    [Column("reason"), StringLength(255)] public string? Reason { get; set; }
    [Column("location"), StringLength(150)] public string? Location { get; set; }
    [Column("veterinarian_name"), StringLength(150)] public string? VeterinarianName { get; set; }
    [Column("post_mortem_done")] public bool PostMortemDone { get; set; }
    [Column("post_mortem_notes")] public string? PostMortemNotes { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("recorded_by")] public ulong? RecordedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
}
/// <summary>
/// Maps `finance_categories` - reusable income/expense categories.
/// UNIQUE name per farm (uq_fin_cat_farm_name).
/// </summary>
[Table("finance_categories")]
public class FinanceCategory
{
    [Key, Column("category_id")] public ulong CategoryId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("category_type"), StringLength(20)] public string CategoryType { get; set; } = "EXPENSE";
    [Column("description")] public string? Description { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<FinanceTransaction> Transactions { get; set; } = new List<FinanceTransaction>();
}

/// <summary>
/// Maps `finance_transactions` - THE single authoritative finance ledger.
/// Income and expense are distinguished by transaction_type only; there is no
/// separate income or expense table, so a balance query is a single SUM and
/// can never disagree with itself.
/// </summary>
[Table("finance_transactions")]
public class FinanceTransaction
{
    [Key, Column("finance_transaction_id")] public ulong FinanceTransactionId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("category_id")] public ulong CategoryId { get; set; }
    [Column("supplier_id")] public ulong? SupplierId { get; set; }
    [Column("buyer_id")] public ulong? BuyerId { get; set; }
    [Column("transaction_date")] public DateTime TransactionDate { get; set; }
    [Column("transaction_type"), StringLength(20)] public string TransactionType { get; set; } = "EXPENSE";
    [Column("amount")] public decimal Amount { get; set; }
    [Column("payment_method"), StringLength(20)] public string? PaymentMethod { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("description"), StringLength(255)] public string? Description { get; set; }
    [Column("receipt_url"), StringLength(500)] public string? ReceiptUrl { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public FinanceCategory? Category { get; set; }
    public Supplier? Supplier { get; set; }
    public MilkBuyer? Buyer { get; set; }
}

/// <summary>Maps `tasks` - a scheduled unit of work, optionally per animal.</summary>
[Table("tasks")]
public class TaskItem
{
    [Key, Column("task_id")] public ulong TaskId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong? AnimalId { get; set; }
    [Column("group_id")] public ulong? GroupId { get; set; }
    [Column("assigned_to")] public ulong? AssignedTo { get; set; }
    [Column("title"), StringLength(200)] public string Title { get; set; } = string.Empty;
    [Column("description")] public string? Description { get; set; }
    [Column("task_type"), StringLength(30)] public string TaskType { get; set; } = "OTHER";
    [Column("priority"), StringLength(10)] public string Priority { get; set; } = "MEDIUM";
    [Column("due_date")] public DateTime DueDate { get; set; }
    [Column("due_time")] public TimeSpan? DueTime { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "PENDING";
    [Column("completed_at")] public DateTime? CompletedAt { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
    public User? AssignedUser { get; set; }
}
/// <summary>
/// Maps `alerts` - the EVENT source raised by a domain rule (vaccination due,
/// low stock, calving due, milk drop). Notifications are the per-user
/// delivery records for these events.
/// </summary>
[Table("alerts")]
public class Alert
{
    [Key, Column("alert_id")] public ulong AlertId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong? AnimalId { get; set; }
    [Column("alert_type"), StringLength(30)] public string AlertType { get; set; } = "OTHER";
    [Column("title"), StringLength(200)] public string Title { get; set; } = string.Empty;
    [Column("message")] public string Message { get; set; } = string.Empty;
    [Column("severity"), StringLength(10)] public string Severity { get; set; } = "INFO";
    [Column("reference_type"), StringLength(100)] public string? ReferenceType { get; set; }
    [Column("reference_id")] public ulong? ReferenceId { get; set; }
    [Column("is_read")] public bool IsRead { get; set; }
    [Column("is_resolved")] public bool IsResolved { get; set; }
    [Column("expires_at")] public DateTime? ExpiresAt { get; set; }
    [Column("resolved_at")] public DateTime? ResolvedAt { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

/// <summary>
/// Maps `notifications` - the per-user delivery record for an alert.
/// user_id NULL means broadcast to all farm users. reference_type/reference_id
/// give the click-through target for the related module record.
/// </summary>
[Table("notifications")]
public class Notification
{
    [Key, Column("notification_id")] public ulong NotificationId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("user_id")] public ulong? UserId { get; set; }
    [Column("alert_id")] public ulong? AlertId { get; set; }
    [Column("title"), StringLength(200)] public string Title { get; set; } = string.Empty;
    [Column("message")] public string Message { get; set; } = string.Empty;
    [Column("notification_type"), StringLength(50)] public string? NotificationType { get; set; }
    [Column("reference_type"), StringLength(100)] public string? ReferenceType { get; set; }
    [Column("reference_id")] public ulong? ReferenceId { get; set; }
    [Column("is_read")] public bool IsRead { get; set; }
    [Column("read_at")] public DateTime? ReadAt { get; set; }
    [Column("is_done")] public bool IsDone { get; set; }
    [Column("done_at")] public DateTime? DoneAt { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public Farm? Farm { get; set; }
    public User? User { get; set; }
    public Alert? Alert { get; set; }
}

/// <summary>
/// Maps `attachments` - generic file store for receipts, vet certificates and
/// purchase documents, keyed by (entity_type, entity_id).
/// </summary>
[Table("attachments")]
public class Attachment
{
    [Key, Column("attachment_id")] public ulong AttachmentId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("entity_type"), StringLength(100)] public string EntityType { get; set; } = string.Empty;
    [Column("entity_id")] public ulong EntityId { get; set; }
    [Column("file_name"), StringLength(255)] public string FileName { get; set; } = string.Empty;
    [Column("content_type"), StringLength(100)] public string ContentType { get; set; } = string.Empty;
    [Column("file_size")] public ulong FileSize { get; set; }
    [Column("storage_path"), StringLength(500)] public string StoragePath { get; set; } = string.Empty;
    [Column("uploaded_by")] public ulong? UploadedBy { get; set; }
    [Column("uploaded_at")] public DateTime UploadedAt { get; set; }

    public Farm? Farm { get; set; }
    public User? UploadedByUser { get; set; }
}
/// <summary>
/// Maps `audit_logs`. old_values/new_values hold JSON snapshots so a diff can
/// always be replayed. The FK on user_id is ON DELETE SET NULL: removing a
/// user must never erase the evidence of what they did.
/// </summary>
[Table("audit_logs")]
public class AuditLog
{
    [Key, Column("audit_log_id")] public ulong AuditLogId { get; set; }
    [Column("farm_id")] public ulong? FarmId { get; set; }
    [Column("user_id")] public ulong? UserId { get; set; }
    [Column("action"), StringLength(30)] public string Action { get; set; } = string.Empty;
    [Column("module"), StringLength(50)] public string Module { get; set; } = string.Empty;
    [Column("entity_type"), StringLength(50)] public string? EntityType { get; set; }
    [Column("entity_id")] public ulong? EntityId { get; set; }
    [Column("old_values")] public string? OldValues { get; set; }
    [Column("new_values")] public string? NewValues { get; set; }
    [Column("ip_address"), StringLength(64)] public string? IpAddress { get; set; }
    [Column("user_agent"), StringLength(255)] public string? UserAgent { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}

/// <summary>
/// Maps `system_settings` - installation-wide configuration, keyed by a unique
/// setting_key (uq_system_settings_key). Per-farm values belong in
/// farm_settings instead.
/// </summary>
[Table("system_settings")]
public class SystemSetting
{
    [Key, Column("system_setting_id")] public ulong SystemSettingId { get; set; }
    [Column("setting_key"), StringLength(100)] public string SettingKey { get; set; } = string.Empty;
    [Column("setting_value")] public string SettingValue { get; set; } = string.Empty;
    [Column("description"), StringLength(255)] public string? Description { get; set; }
    [Column("data_type"), StringLength(20)] public string DataType { get; set; } = "string";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Maps `farm_settings` - per-farm configuration. One row per farm
/// (uq_farm_settings_farm), so this is the scope for currency, timezone and the
/// per-farm alert toggles.
/// </summary>
[Table("farm_settings")]
public class FarmSetting
{
    [Key, Column("farm_setting_id")] public ulong FarmSettingId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("farm_name"), StringLength(150)] public string? FarmName { get; set; }
    [Column("farm_logo_url"), StringLength(500)] public string? FarmLogoUrl { get; set; }
    [Column("currency"), StringLength(10)] public string Currency { get; set; } = "PKR";
    [Column("timezone"), StringLength(50)] public string Timezone { get; set; } = "Asia/Karachi";
    [Column("milk_unit"), StringLength(10)] public string MilkUnit { get; set; } = "LITER";
    [Column("date_format"), StringLength(20)] public string DateFormat { get; set; } = "yyyy-MM-dd";
    [Column("low_stock_alert_enabled")] public bool LowStockAlertEnabled { get; set; } = true;
    [Column("vaccination_alert_enabled")] public bool VaccinationAlertEnabled { get; set; } = true;
    [Column("health_follow_up_alert_enabled")] public bool HealthFollowUpAlertEnabled { get; set; } = true;
    [Column("pregnancy_alert_enabled")] public bool PregnancyAlertEnabled { get; set; } = true;
    [Column("task_alert_enabled")] public bool TaskAlertEnabled { get; set; } = true;
    [Column("milk_drop_alert_enabled")] public bool MilkDropAlertEnabled { get; set; } = true;
    [Column("milk_drop_threshold_percent")] public decimal MilkDropThresholdPercent { get; set; } = 20.00m;
    [Column("audit_logging_enabled")] public bool AuditLoggingEnabled { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
}