using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_groups")]
public class AnimalGroup
{
	[Key]
	[Column("group_id")]
	public ulong GroupId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("shed_id")]
	public ulong? ShedId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("animal_type")]
	[StringLength(50)]
	public string AnimalType { get; set; } = "COW";

	[Column("description")]
	public string? Description { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Shed? Shed { get; set; }

	public ICollection<Animal> Animals { get; set; } = new List<Animal>();
}
