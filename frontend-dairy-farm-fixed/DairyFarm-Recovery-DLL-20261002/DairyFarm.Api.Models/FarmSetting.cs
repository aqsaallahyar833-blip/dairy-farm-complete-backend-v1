using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("farm_settings")]
public class FarmSetting
{
	[Key]
	[Column("farm_setting_id")]
	public ulong FarmSettingId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("farm_name")]
	[StringLength(150)]
	public string? FarmName { get; set; }

	[Column("farm_logo_url")]
	[StringLength(500)]
	public string? FarmLogoUrl { get; set; }

	[Column("currency")]
	[StringLength(10)]
	public string Currency { get; set; } = "PKR";

	[Column("timezone")]
	[StringLength(50)]
	public string Timezone { get; set; } = "Asia/Karachi";

	[Column("milk_unit")]
	[StringLength(10)]
	public string MilkUnit { get; set; } = "LITER";

	[Column("date_format")]
	[StringLength(20)]
	public string DateFormat { get; set; } = "yyyy-MM-dd";

	[Column("low_stock_alert_enabled")]
	public bool LowStockAlertEnabled { get; set; } = true;

	[Column("vaccination_alert_enabled")]
	public bool VaccinationAlertEnabled { get; set; } = true;

	[Column("health_follow_up_alert_enabled")]
	public bool HealthFollowUpAlertEnabled { get; set; } = true;

	[Column("pregnancy_alert_enabled")]
	public bool PregnancyAlertEnabled { get; set; } = true;

	[Column("task_alert_enabled")]
	public bool TaskAlertEnabled { get; set; } = true;

	[Column("milk_drop_alert_enabled")]
	public bool MilkDropAlertEnabled { get; set; } = true;

	[Column("milk_drop_threshold_percent")]
	public decimal MilkDropThresholdPercent { get; set; } = 20.00m;

	[Column("audit_logging_enabled")]
	public bool AuditLoggingEnabled { get; set; } = true;

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }
}
