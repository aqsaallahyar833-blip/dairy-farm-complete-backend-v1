using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("roles")]
public class Role
{
	[Key]
	[Column("role_id")]
	public ulong RoleId { get; set; }

	[Column("name")]
	[StringLength(50)]
	public string Name { get; set; } = string.Empty;

	[Column("description")]
	[StringLength(255)]
	public string? Description { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public ICollection<User> Users { get; set; } = new List<User>();

	public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
}
