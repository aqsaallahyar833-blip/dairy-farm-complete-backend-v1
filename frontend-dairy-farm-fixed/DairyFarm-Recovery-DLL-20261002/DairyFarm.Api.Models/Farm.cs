using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("farms")]
public class Farm
{
	[Key]
	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("company_id")]
	public ulong CompanyId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("code")]
	[StringLength(50)]
	public string? Code { get; set; }

	[Column("location")]
	[StringLength(255)]
	public string? Location { get; set; }

	[Column("contact")]
	[StringLength(255)]
	public string? Contact { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Company? Company { get; set; }

	public ICollection<Shed> Sheds { get; set; } = new List<Shed>();

	public ICollection<AnimalGroup> Groups { get; set; } = new List<AnimalGroup>();

	public ICollection<Animal> Animals { get; set; } = new List<Animal>();

	public FarmSetting? Settings { get; set; }
}
