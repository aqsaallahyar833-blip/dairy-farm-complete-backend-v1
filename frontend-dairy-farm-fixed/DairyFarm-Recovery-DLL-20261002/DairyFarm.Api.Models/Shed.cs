using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("sheds")]
public class Shed
{
	[Key]
	[Column("shed_id")]
	public ulong ShedId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("capacity")]
	public uint? Capacity { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public ICollection<AnimalGroup> Groups { get; set; } = new List<AnimalGroup>();
}
