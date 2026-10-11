using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("permissions")]
public class Permission
{
	[Key]
	[Column("permission_id")]
	public ulong PermissionId { get; set; }

	[Column("name")]
	[StringLength(100)]
	public string Name { get; set; } = string.Empty;

	[Column("module")]
	[StringLength(50)]
	public string Module { get; set; } = string.Empty;

	[Column("description")]
	[StringLength(255)]
	public string? Description { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public ICollection<RolePermission> Roles { get; set; } = new List<RolePermission>();
}
