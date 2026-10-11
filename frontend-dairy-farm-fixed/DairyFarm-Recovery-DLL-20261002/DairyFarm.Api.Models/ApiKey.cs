using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("api_keys")]
public class ApiKey
{
	[Key]
	[Column("api_key_id")]
	public ulong ApiKeyId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("user_id")]
	public ulong? UserId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("key_prefix")]
	[StringLength(16)]
	public string KeyPrefix { get; set; } = string.Empty;

	[Column("key_hash")]
	[StringLength(64)]
	public string KeyHash { get; set; } = string.Empty;

	[Column("scopes")]
	[StringLength(500)]
	public string? Scopes { get; set; }

	[Column("expires_at")]
	public DateTime? ExpiresAt { get; set; }

	[Column("revoked_at")]
	public DateTime? RevokedAt { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public Farm? Farm { get; set; }

	public User? User { get; set; }
}
