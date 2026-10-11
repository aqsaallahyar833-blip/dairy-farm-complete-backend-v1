using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("alerts")]
public class Alert
{
	[Key]
	[Column("alert_id")]
	public ulong AlertId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong? AnimalId { get; set; }

	[Column("alert_type")]
	[StringLength(30)]
	public string AlertType { get; set; } = "OTHER";

	[Column("title")]
	[StringLength(200)]
	public string Title { get; set; } = string.Empty;

	[Column("message")]
	public string Message { get; set; } = string.Empty;

	[Column("severity")]
	[StringLength(10)]
	public string Severity { get; set; } = "INFO";

	[Column("reference_type")]
	[StringLength(100)]
	public string? ReferenceType { get; set; }

	[Column("reference_id")]
	public ulong? ReferenceId { get; set; }

	[Column("is_read")]
	public bool IsRead { get; set; }

	[Column("is_resolved")]
	public bool IsResolved { get; set; }

	[Column("expires_at")]
	public DateTime? ExpiresAt { get; set; }

	[Column("resolved_at")]
	public DateTime? ResolvedAt { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
