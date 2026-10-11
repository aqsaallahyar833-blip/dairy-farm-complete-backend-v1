using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("user_sessions")]
public class UserSession
{
	[Key]
	[Column("session_id")]
	public ulong SessionId { get; set; }

	[Column("user_id")]
	public ulong UserId { get; set; }

	[Column("session_token")]
	[StringLength(128)]
	public string SessionToken { get; set; } = string.Empty;

	[Column("expires_at")]
	public DateTime ExpiresAt { get; set; }

	[Column("revoked_at")]
	public DateTime? RevokedAt { get; set; }

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
