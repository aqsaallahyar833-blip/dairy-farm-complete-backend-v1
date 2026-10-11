using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("companies")]
public class Company
{
	[Key]
	[Column("company_id")]
	public ulong CompanyId { get; set; }

	[Column("name")]
	[StringLength(200)]
	public string Name { get; set; } = string.Empty;

	[Column("contact")]
	[StringLength(255)]
	public string? Contact { get; set; }

	[Column("address")]
	[StringLength(500)]
	public string? Address { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public ICollection<Farm> Farms { get; set; } = new List<Farm>();
}
