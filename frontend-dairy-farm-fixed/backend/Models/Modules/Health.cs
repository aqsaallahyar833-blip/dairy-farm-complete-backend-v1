using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

// ===========================================================================
// HEALTH MODULE - mapped to the verified `dairy farm 1` tables:
//   diseases, medicines, health_records, treatments, vaccination_records
//
// `diseases` and `medicines` are MASTER lookup lists. `health_records` is the
// clinical event; `treatments` is the prescribed course and carries the
// derived milk/meat withdrawal dates.
// ===========================================================================

/// <summary>Maps `diseases` - master list. UNIQUE name (uq_diseases_name).</summary>
[Table("diseases")]
public class Disease
{
    [Key, Column("disease_id")] public ulong DiseaseId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("code"), StringLength(50)] public string? Code { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("is_active")] public bool IsActive { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<HealthRecord> HealthRecords { get; set; } = new List<HealthRecord>();
}

/// <summary>
/// Maps `medicines` - master list. UNIQUE name (uq_medicines_name).
/// withdrawal_milk_hours / withdrawal_meat_days drive the milk hold.
/// </summary>
[Table("medicines")]
public class Medicine
{
    [Key, Column("medicine_id")] public ulong MedicineId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("code"), StringLength(50)] public string? Code { get; set; }
    [Column("manufacturer"), StringLength(150)] public string? Manufacturer { get; set; }
    [Column("active_ingredient"), StringLength(150)] public string? ActiveIngredient { get; set; }
    [Column("strength"), StringLength(100)] public string? Strength { get; set; }
    [Column("medicine_type"), StringLength(50)] public string? MedicineType { get; set; }
    [Column("default_dosage"), StringLength(100)] public string? DefaultDosage { get; set; }
    [Column("administration_route"), StringLength(50)] public string? AdministrationRoute { get; set; }
    [Column("withdrawal_milk_hours")] public int WithdrawalMilkHours { get; set; }
    [Column("withdrawal_meat_days")] public int WithdrawalMeatDays { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("is_active")] public bool IsActive { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}

/// <summary>Maps `health_records` - a clinical event for an animal.</summary>
[Table("health_records")]
public class HealthRecord
{
    [Key, Column("health_record_id")] public ulong HealthRecordId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("disease_id")] public ulong? DiseaseId { get; set; }
    [Column("record_date")] public DateTime RecordDate { get; set; }
    /// <summary>enum('ILLNESS','INJURY','CHECKUP','VACCINATION','DEWORMING','TREATMENT','OTHER')</summary>
    [Column("record_type"), StringLength(30)] public string RecordType { get; set; } = "ILLNESS";
    [Column("symptoms")] public string? Symptoms { get; set; }
    [Column("diagnosis"), StringLength(255)] public string? Diagnosis { get; set; }
    [Column("treatment")] public string? Treatment { get; set; }
    [Column("medication"), StringLength(255)] public string? Medication { get; set; }
    [Column("dosage"), StringLength(100)] public string? Dosage { get; set; }
    [Column("veterinarian_name"), StringLength(150)] public string? VeterinarianName { get; set; }
    [Column("follow_up_date")] public DateTime? FollowUpDate { get; set; }
    /// <summary>enum('OPEN','IN_TREATMENT','RECOVERED','CLOSED')</summary>
    [Column("status"), StringLength(20)] public string Status { get; set; } = "OPEN";
    [Column("recovery_date")] public DateTime? RecoveryDate { get; set; }
    /// <summary>Milk-withdrawal in force for this animal.</summary>
    [Column("is_withdrawal")] public bool IsWithdrawal { get; set; }
    [Column("withdrawal_end_date")] public DateTime? WithdrawalEndDate { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public Disease? Disease { get; set; }
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();
}


/// <summary>
/// Maps `treatments` - a prescribed course for an animal. The withdrawal dates
/// are derived from the medicine and stored so the milk hold is queryable
/// without a runtime join.
/// </summary>
[Table("treatments")]
public class Treatment
{
    [Key, Column("treatment_id")] public ulong TreatmentId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("health_record_id")] public ulong? HealthRecordId { get; set; }
    [Column("disease_id")] public ulong? DiseaseId { get; set; }
    [Column("medicine_id")] public ulong? MedicineId { get; set; }
    [Column("treatment_date")] public DateTime TreatmentDate { get; set; }
    [Column("start_date")] public DateTime? StartDate { get; set; }
    [Column("end_date")] public DateTime? EndDate { get; set; }
    [Column("dosage"), StringLength(100)] public string? Dosage { get; set; }
    [Column("administration_route"), StringLength(50)] public string? AdministrationRoute { get; set; }
    [Column("frequency"), StringLength(50)] public string? Frequency { get; set; }
    [Column("duration_days")] public int? DurationDays { get; set; }
    [Column("veterinarian_name"), StringLength(150)] public string? VeterinarianName { get; set; }
    /// <summary>enum('ONGOING','COMPLETED','STOPPED')</summary>
    [Column("treatment_status"), StringLength(20)] public string TreatmentStatus { get; set; } = "ONGOING";
    /// <summary>Derived from medicines.withdrawal_milk_hours.</summary>
    [Column("withdrawal_milk_until")] public DateTime? WithdrawalMilkUntil { get; set; }
    /// <summary>Derived from medicines.withdrawal_meat_days.</summary>
    [Column("withdrawal_meat_until")] public DateTime? WithdrawalMeatUntil { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public HealthRecord? HealthRecord { get; set; }
    public Disease? Disease { get; set; }
    public Medicine? Medicine { get; set; }
}

/// <summary>
/// Maps `vaccination_records`. animal_id is NULL for a whole-group/herd
/// vaccination, in which case group_id is set instead.
/// </summary>
[Table("vaccination_records")]
public class VaccinationRecord
{
    [Key, Column("vaccination_id")] public ulong VaccinationId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    /// <summary>NULL = whole group / herd vaccination.</summary>
    [Column("animal_id")] public ulong? AnimalId { get; set; }
    [Column("group_id")] public ulong? GroupId { get; set; }
    [Column("vaccine_name"), StringLength(150)] public string VaccineName { get; set; } = string.Empty;
    [Column("vaccination_date")] public DateTime VaccinationDate { get; set; }
    [Column("next_due_date")] public DateTime? NextDueDate { get; set; }
    [Column("batch_number"), StringLength(100)] public string? BatchNumber { get; set; }
    [Column("manufacturer"), StringLength(150)] public string? Manufacturer { get; set; }
    [Column("veterinarian_name"), StringLength(150)] public string? VeterinarianName { get; set; }
    /// <summary>enum('SCHEDULED','COMPLETED','MISSED','CANCELLED')</summary>
    [Column("status"), StringLength(20)] public string Status { get; set; } = "COMPLETED";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
}
