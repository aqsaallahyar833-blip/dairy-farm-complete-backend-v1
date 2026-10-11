using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("medicines")]
public class Medicine
{
	[Key]
	[Column("medicine_id")]
	public ulong MedicineId { get; set; }

	[Column("name")]
	[StringLength(150)]
	public string Name { get; set; } = string.Empty;

	[Column("code")]
	[StringLength(50)]
	public string? Code { get; set; }

	[Column("manufacturer")]
	[StringLength(150)]
	public string? Manufacturer { get; set; }

	[Column("active_ingredient")]
	[StringLength(150)]
	public string? ActiveIngredient { get; set; }

	[Column("strength")]
	[StringLength(100)]
	public string? Strength { get; set; }

	[Column("medicine_type")]
	[StringLength(50)]
	public string? MedicineType { get; set; }

	[Column("default_dosage")]
	[StringLength(100)]
	public string? DefaultDosage { get; set; }

	[Column("administration_route")]
	[StringLength(50)]
	public string? AdministrationRoute { get; set; }

	[Column("withdrawal_milk_hours")]
	public int WithdrawalMilkHours { get; set; }

	[Column("withdrawal_meat_days")]
	public int WithdrawalMeatDays { get; set; }

	[Column("description")]
	public string? Description { get; set; }

	[Column("is_active")]
	public bool IsActive { get; set; } = true;

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}
