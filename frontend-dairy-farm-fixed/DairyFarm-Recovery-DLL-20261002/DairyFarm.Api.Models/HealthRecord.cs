using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("health_records")]
public class HealthRecord
{
	[Key]
	[Column("health_record_id")]
	public ulong HealthRecordId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("disease_id")]
	public ulong? DiseaseId { get; set; }

	[Column("record_date")]
	public DateTime RecordDate { get; set; }

	[Column("record_type")]
	[StringLength(30)]
	public string RecordType { get; set; } = "ILLNESS";

	[Column("symptoms")]
	public string? Symptoms { get; set; }

	[Column("diagnosis")]
	[StringLength(255)]
	public string? Diagnosis { get; set; }

	[Column("treatment")]
	public string? Treatment { get; set; }

	[Column("medication")]
	[StringLength(255)]
	public string? Medication { get; set; }

	[Column("dosage")]
	[StringLength(100)]
	public string? Dosage { get; set; }

	[Column("veterinarian_name")]
	[StringLength(150)]
	public string? VeterinarianName { get; set; }

	[Column("follow_up_date")]
	public DateTime? FollowUpDate { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "OPEN";

	[Column("recovery_date")]
	public DateTime? RecoveryDate { get; set; }

	[Column("is_withdrawal")]
	public bool IsWithdrawal { get; set; }

	[Column("withdrawal_end_date")]
	public DateTime? WithdrawalEndDate { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public Disease? Disease { get; set; }

	public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}
