using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("finance_categories")]
public class FinanceCategory
{
	[Key]
	[Column("category_id")]
	public ulong CategoryId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("category_type")]
	[StringLength(20)]
	public string CategoryType { get; set; } = "EXPENSE";

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

	public ICollection<FinanceTransaction> Transactions { get; set; } = new List<FinanceTransaction>();
}
