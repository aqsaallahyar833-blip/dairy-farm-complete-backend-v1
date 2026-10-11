using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("system_settings")]
public class SystemSetting
{
	[Key]
	[Column("system_setting_id")]
	public ulong SystemSettingId { get; set; }

	[Column("setting_key")]
	[StringLength(100)]
	public string SettingKey { get; set; } = string.Empty;

	[Column("setting_value")]
	public string SettingValue { get; set; } = string.Empty;

	[Column("description")]
	[StringLength(255)]
	public string? Description { get; set; }

	[Column("data_type")]
	[StringLength(20)]
	public string DataType { get; set; } = "string";

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }
}
