using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("role_permissions")]
public class RolePermission
{
	[Column("role_id")]
	public ulong RoleId { get; set; }

	[Column("permission_id")]
	public ulong PermissionId { get; set; }

	public Role? Role { get; set; }

	public Permission? Permission { get; set; }
}
