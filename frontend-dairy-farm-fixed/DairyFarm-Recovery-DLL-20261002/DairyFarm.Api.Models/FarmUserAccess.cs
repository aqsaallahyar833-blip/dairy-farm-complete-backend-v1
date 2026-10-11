using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("farm_user_access")]
public class FarmUserAccess
{
	[Column("user_id")]
	public ulong UserId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("access_level")]
	[StringLength(20)]
	public string AccessLevel { get; set; } = "READ";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	public User? User { get; set; }

	public Farm? Farm { get; set; }
}
