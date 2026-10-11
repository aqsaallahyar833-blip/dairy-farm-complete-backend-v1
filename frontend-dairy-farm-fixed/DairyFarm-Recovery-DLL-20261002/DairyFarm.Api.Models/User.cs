using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("users")]
public class User
{
	[Key]
	[Column("user_id")]
	public ulong UserId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("role_id")]
	public ulong RoleId { get; set; }

	[Column("username")]
	[StringLength(100)]
	public string Username { get; set; } = string.Empty;

	[Column("password_hash")]
	[StringLength(255)]
	public string PasswordHash { get; set; } = string.Empty;

	[Column("full_name")]
	[StringLength(150)]
	public string FullName { get; set; } = string.Empty;

	[Column("email")]
	[StringLength(150)]
	public string? Email { get; set; }

	[Column("phone")]
	[StringLength(50)]
	public string? Phone { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("last_login_at")]
	public DateTime? LastLoginAt { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Role? Role { get; set; }

	public ICollection<FarmUserAccess> FarmAccess { get; set; } = new List<FarmUserAccess>();

	public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
}
