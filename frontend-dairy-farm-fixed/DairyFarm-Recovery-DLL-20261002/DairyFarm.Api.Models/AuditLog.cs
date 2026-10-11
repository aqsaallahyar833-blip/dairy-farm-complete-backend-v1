using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("audit_logs")]
public class AuditLog
{
	[Key]
	[Column("audit_log_id")]
	public ulong AuditLogId { get; set; }

	[Column("farm_id")]
	public ulong? FarmId { get; set; }

	[Column("user_id")]
	public ulong? UserId { get; set; }

	[Column("action")]
	[StringLength(30)]
	public string Action { get; set; } = string.Empty;

	[Column("module")]
	[StringLength(50)]
	public string Module { get; set; } = string.Empty;

	[Column("entity_type")]
	[StringLength(50)]
	public string? EntityType { get; set; }

	[Column("entity_id")]
	public ulong? EntityId { get; set; }

	[Column("old_values")]
	public string? OldValues { get; set; }

	[Column("new_values")]
	public string? NewValues { get; set; }

	[Column("ip_address")]
	[StringLength(64)]
	public string? IpAddress { get; set; }

	[Column("user_agent")]
	[StringLength(255)]
	public string? UserAgent { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public User? User { get; set; }
}
