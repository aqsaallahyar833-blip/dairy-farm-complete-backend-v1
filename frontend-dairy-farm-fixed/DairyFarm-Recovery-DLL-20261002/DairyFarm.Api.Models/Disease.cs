using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("diseases")]
public class Disease
{
	[Key]
	[Column("disease_id")]
	public ulong DiseaseId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("code")]
	[StringLength(50)]
	public string? Code { get; set; }

	[Column("description")]
	public string? Description { get; set; }

	[Column("is_active")]
	public bool IsActive { get; set; } = true;

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public ICollection<HealthRecord> HealthRecords { get; set; } = new List<HealthRecord>();
}
