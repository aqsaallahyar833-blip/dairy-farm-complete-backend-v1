using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("notifications")]
public class Notification
{
	[Key]
	[Column("notification_id")]
	public ulong NotificationId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("user_id")]
	public ulong? UserId { get; set; }

	[Column("alert_id")]
	public ulong? AlertId { get; set; }

	[Column("title")]
	[StringLength(200)]
	public string Title { get; set; } = string.Empty;

	[Column("message")]
	public string Message { get; set; } = string.Empty;

	[Column("notification_type")]
	[StringLength(50)]
	public string? NotificationType { get; set; }

	[Column("reference_type")]
	[StringLength(100)]
	public string? ReferenceType { get; set; }

	[Column("reference_id")]
	public ulong? ReferenceId { get; set; }

	[Column("is_read")]
	public bool IsRead { get; set; }

	[Column("read_at")]
	public DateTime? ReadAt { get; set; }

	[Column("is_done")]
	public bool IsDone { get; set; }

	[Column("done_at")]
	public DateTime? DoneAt { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public Farm? Farm { get; set; }

	public User? User { get; set; }

	public Alert? Alert { get; set; }
}
