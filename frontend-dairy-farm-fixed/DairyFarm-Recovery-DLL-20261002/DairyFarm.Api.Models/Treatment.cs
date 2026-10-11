using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("treatments")]
public class Treatment
{
	[Key]
	[Column("treatment_id")]
	public ulong TreatmentId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("health_record_id")]
	public ulong? HealthRecordId { get; set; }

	[Column("disease_id")]
	public ulong? DiseaseId { get; set; }

	[Column("medicine_id")]
	public ulong? MedicineId { get; set; }

	[Column("treatment_date")]
	public DateTime TreatmentDate { get; set; }

	[Column("start_date")]
	public DateTime? StartDate { get; set; }

	[Column("end_date")]
	public DateTime? EndDate { get; set; }

	[Column("dosage")]
	[StringLength(100)]
	public string? Dosage { get; set; }

	[Column("administration_route")]
	[StringLength(50)]
	public string? AdministrationRoute { get; set; }

	[Column("frequency")]
	[StringLength(50)]
	public string? Frequency { get; set; }

	[Column("duration_days")]
	public int? DurationDays { get; set; }

	[Column("veterinarian_name")]
	[StringLength(150)]
	public string? VeterinarianName { get; set; }

	[Column("treatment_status")]
	[StringLength(20)]
	public string TreatmentStatus { get; set; } = "ONGOING";

	[Column("withdrawal_milk_until")]
	public DateTime? WithdrawalMilkUntil { get; set; }

	[Column("withdrawal_meat_until")]
	public DateTime? WithdrawalMeatUntil { get; set; }

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

	public HealthRecord? HealthRecord { get; set; }

	public Disease? Disease { get; set; }

	public Medicine? Medicine { get; set; }
}
