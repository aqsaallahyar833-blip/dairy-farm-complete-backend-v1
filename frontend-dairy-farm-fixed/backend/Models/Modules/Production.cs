using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;
/// <summary>
/// Maps `animals`. Note uq_animals_farm_code(farm_id, animal_code): an animal
/// code is unique WITHIN A FARM, not globally.
/// </summary>
[Table("animals")]
public class Animal
{
    [Key, Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("shed_id")] public ulong? ShedId { get; set; }
    [Column("group_id")] public ulong? GroupId { get; set; }
    [Column("dam_id")] public ulong? DamId { get; set; }
    [Column("sire_id")] public ulong? SireId { get; set; }
    [Column("breed_id")] public ulong? BreedId { get; set; }
    [Column("animal_code"), StringLength(50)] public string AnimalCode { get; set; } = string.Empty;
    [Column("name"), StringLength(150)] public string? Name { get; set; }
    [Column("tag_number"), StringLength(50)] public string? TagNumber { get; set; }
    [Column("rfid_number"), StringLength(50)] public string? RfidNumber { get; set; }
    [Column("qr_token"), StringLength(64)] public string? QrToken { get; set; }
    [Column("sex"), StringLength(10)] public string Sex { get; set; } = "FEMALE";
    [Column("date_of_birth")] public DateTime? DateOfBirth { get; set; }
    [Column("color"), StringLength(100)] public string? Color { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("lactation_number")] public int? LactationNumber { get; set; }
    [Column("source"), StringLength(100)] public string? Source { get; set; }
    [Column("acquisition_date")] public DateTime? AcquisitionDate { get; set; }
    [Column("purchase_price")] public decimal? PurchasePrice { get; set; }
    [Column("photo_url"), StringLength(500)] public string? PhotoUrl { get; set; }
    [Column("death_date")] public DateTime? DeathDate { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Shed? Shed { get; set; }
    public AnimalGroup? Group { get; set; }
    public Breed? Breed { get; set; }
    public Animal? Dam { get; set; }
    public Animal? Sire { get; set; }
    public ICollection<AnimalPhoto> Photos { get; set; } = new List<AnimalPhoto>();
    public ICollection<AnimalStatusHistory> StatusHistory { get; set; } = new List<AnimalStatusHistory>();
    public ICollection<Lactation> Lactations { get; set; } = new List<Lactation>();
    public ICollection<MilkRecord> MilkRecords { get; set; } = new List<MilkRecord>();
}

/// <summary>Maps `animal_status_history` - append-only audit of status changes.</summary>
[Table("animal_status_history")]
public class AnimalStatusHistory
{
    [Key, Column("status_history_id")] public ulong StatusHistoryId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("old_status"), StringLength(20)] public string? OldStatus { get; set; }
    [Column("new_status"), StringLength(20)] public string NewStatus { get; set; } = string.Empty;
    [Column("effective_date")] public DateTime EffectiveDate { get; set; }
    [Column("reason"), StringLength(500)] public string? Reason { get; set; }
    [Column("changed_by")] public ulong? ChangedBy { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public Animal? Animal { get; set; }
}

/// <summary>Maps `animal_photos` - binary image storage for an animal.</summary>
[Table("animal_photos")]
public class AnimalPhoto
{
    [Key, Column("photo_id")] public ulong PhotoId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("file_name"), StringLength(255)] public string FileName { get; set; } = string.Empty;
    [Column("content_type"), StringLength(100)] public string ContentType { get; set; } = string.Empty;
    [Column("file_size")] public ulong FileSize { get; set; }
    [Column("image_data")] public byte[] ImageData { get; set; } = Array.Empty<byte>();
    [Column("is_primary")] public bool IsPrimary { get; set; }
    [Column("uploaded_by")] public ulong? UploadedBy { get; set; }
    [Column("uploaded_at")] public DateTime UploadedAt { get; set; }

    public Animal? Animal { get; set; }
}

/// <summary>
/// Maps `animal_code_sequences` - per-farm counter used to allocate the next
/// animal code. PK is farm_id.
/// </summary>
[Table("animal_code_sequences")]
public class AnimalCodeSequence
{
    [Key, Column("farm_id")] public ulong FarmId { get; set; }
    [Column("prefix"), StringLength(20)] public string Prefix { get; set; } = "AN-";
    [Column("next_number")] public ulong NextNumber { get; set; } = 1;
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
}

/// <summary>Maps `lactations` - one lactation cycle per animal.</summary>
[Table("lactations")]
public class Lactation
{
    [Key, Column("lactation_id")] public ulong LactationId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("lactation_number")] public int LactationNumber { get; set; }
    [Column("start_date")] public DateTime? StartDate { get; set; }
    [Column("dry_off_date")] public DateTime? DryOffDate { get; set; }
    [Column("peak_milk_liters")] public decimal? PeakMilkLiters { get; set; }
    [Column("peak_date")] public DateTime? PeakDate { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Animal? Animal { get; set; }
    public ICollection<MilkRecord> MilkRecords { get; set; } = new List<MilkRecord>();
}

/// <summary>
/// Maps `milk_records`. ONE ROW PER SESSION.
/// UNIQUE uq_milk_animal_date_session(animal_id, record_date, session).
/// </summary>
[Table("milk_records")]
public class MilkRecord
{
    [Key, Column("milk_record_id")] public ulong MilkRecordId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("lactation_id")] public ulong? LactationId { get; set; }
    [Column("record_date")] public DateTime RecordDate { get; set; }
    [Column("session"), StringLength(10)] public string Session { get; set; } = "MORNING";
    [Column("milk_liters")] public decimal MilkLiters { get; set; }
    [Column("fat_percent")] public decimal? FatPercent { get; set; }
    [Column("protein_percent")] public decimal? ProteinPercent { get; set; }
    [Column("snf_percent")] public decimal? SnfPercent { get; set; }
    [Column("scc")] public decimal? Scc { get; set; }
    [Column("is_rejected")] public bool IsRejected { get; set; }
    [Column("rejection_reason"), StringLength(255)] public string? RejectionReason { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public Lactation? Lactation { get; set; }
}

/// <summary>Maps `milk_buyers` - the customers who buy milk.</summary>
[Table("milk_buyers")]
public class MilkBuyer
{
    [Key, Column("buyer_id")] public ulong BuyerId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("contact_person"), StringLength(150)] public string? ContactPerson { get; set; }
    [Column("phone"), StringLength(50)] public string? Phone { get; set; }
    [Column("email"), StringLength(150)] public string? Email { get; set; }
    [Column("address"), StringLength(255)] public string? Address { get; set; }
    [Column("buyer_type"), StringLength(30)] public string BuyerType { get; set; } = "LOCAL_SHOP";
    [Column("daily_quantity_liters")] public decimal? DailyQuantityLiters { get; set; }
    [Column("rate_per_liter")] public decimal? RatePerLiter { get; set; }
    [Column("credit_period_days")] public int? CreditPeriodDays { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<MilkSale> MilkSales { get; set; } = new List<MilkSale>();
}

/// <summary>Maps `milk_sales` - milk sold to a buyer on a given date.</summary>
[Table("milk_sales")]
public class MilkSale
{
    [Key, Column("milk_sale_id")] public ulong MilkSaleId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("buyer_id")] public ulong BuyerId { get; set; }
    [Column("sale_date")] public DateTime SaleDate { get; set; }
    [Column("milk_quantity_liters")] public decimal MilkQuantityLiters { get; set; }
    [Column("price_per_liter")] public decimal PricePerLiter { get; set; }
    [Column("total_amount")] public decimal TotalAmount { get; set; }
    [Column("payment_method"), StringLength(20)] public string PaymentMethod { get; set; } = "CASH";
    [Column("payment_status"), StringLength(20)] public string PaymentStatus { get; set; } = "PAID";
    [Column("amount_paid")] public decimal AmountPaid { get; set; }
    [Column("amount_due")] public decimal AmountDue { get; set; }
    [Column("reference_number"), StringLength(100)] public string? ReferenceNumber { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public MilkBuyer? Buyer { get; set; }
}

/// <summary>
/// Maps `breeding_events`. Heat, AI, natural service and pregnancy checks all
/// share this ONE table - there is no competing "heat table".
/// </summary>
[Table("breeding_events")]
public class BreedingEvent
{
    [Key, Column("breeding_event_id")] public ulong BreedingEventId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("service_animal_id")] public ulong? ServiceAnimalId { get; set; }
    [Column("event_type"), StringLength(30)] public string EventType { get; set; } = "HEAT";
    [Column("event_date")] public DateTime EventDate { get; set; }
    [Column("service_number")] public int? ServiceNumber { get; set; }
    [Column("technician_name"), StringLength(150)] public string? TechnicianName { get; set; }
    [Column("semen_bull"), StringLength(150)] public string? SemenBull { get; set; }
    [Column("semen_batch"), StringLength(100)] public string? SemenBatch { get; set; }
    [Column("pregnancy_result"), StringLength(30)] public string? PregnancyResult { get; set; }
    [Column("expected_calving_date")] public DateTime? ExpectedCalvingDate { get; set; }
    [Column("calving_date")] public DateTime? CalvingDate { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public Animal? ServiceAnimal { get; set; }
    public ICollection<Pregnancy> Pregnancies { get; set; } = new List<Pregnancy>();
}

/// <summary>Maps `pregnancies` - a confirmed pregnancy with expected calving.</summary>
[Table("pregnancies")]
public class Pregnancy
{
    [Key, Column("pregnancy_id")] public ulong PregnancyId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("breeding_event_id")] public ulong? BreedingEventId { get; set; }
    [Column("conception_date")] public DateTime? ConceptionDate { get; set; }
    [Column("confirmation_date")] public DateTime? ConfirmationDate { get; set; }
    [Column("expected_calving_date")] public DateTime? ExpectedCalvingDate { get; set; }
    [Column("actual_calving_date")] public DateTime? ActualCalvingDate { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "CONFIRMED";
    [Column("calf_count")] public int? CalfCount { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public BreedingEvent? BreedingEvent { get; set; }
    public ICollection<Calving> Calvings { get; set; } = new List<Calving>();
}

/// <summary>Maps `calvings` - a calving event for the dam.</summary>
[Table("calvings")]
public class Calving
{
    [Key, Column("calving_id")] public ulong CalvingId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("animal_id")] public ulong AnimalId { get; set; }
    [Column("pregnancy_id")] public ulong? PregnancyId { get; set; }
    [Column("calving_date")] public DateTime CalvingDate { get; set; }
    [Column("calving_type"), StringLength(20)] public string CalvingType { get; set; } = "NORMAL";
    [Column("calf_count")] public int CalfCount { get; set; } = 1;
    [Column("live_calf_count")] public int? LiveCalfCount { get; set; }
    [Column("dead_calf_count")] public int? DeadCalfCount { get; set; }
    [Column("calving_status"), StringLength(20)] public string CalvingStatus { get; set; } = "COMPLETED";
    [Column("veterinarian_name"), StringLength(150)] public string? VeterinarianName { get; set; }
    [Column("colostrum_given")] public bool ColostrumGiven { get; set; }
    [Column("colostrum_time_hours")] public decimal? ColostrumTimeHours { get; set; }
    [Column("complications")] public string? Complications { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_by")] public ulong? CreatedBy { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public Pregnancy? Pregnancy { get; set; }
    public ICollection<Calf> Calves { get; set; } = new List<Calf>();
}

/// <summary>
/// Maps `calves` - one row per calf born. calf_animal_id links to the
/// auto-created `animals` row once the calf is registered.
/// </summary>
[Table("calves")]
public class Calf
{
    [Key, Column("calf_id")] public ulong CalfId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("calving_id")] public ulong? CalvingId { get; set; }
    [Column("calf_animal_id")] public ulong? CalfAnimalId { get; set; }
    [Column("dam_id")] public ulong? DamId { get; set; }
    [Column("sire_id")] public ulong? SireId { get; set; }
    [Column("calf_number"), StringLength(50)] public string? CalfNumber { get; set; }
    [Column("birth_date")] public DateTime BirthDate { get; set; }
    [Column("sex"), StringLength(10)] public string Sex { get; set; } = "FEMALE";
    [Column("birth_weight_kg")] public decimal? BirthWeightKg { get; set; }
    [Column("colostrum_received")] public bool ColostrumReceived { get; set; }
    [Column("colostrum_time_hours")] public decimal? ColostrumTimeHours { get; set; }
    [Column("health_status"), StringLength(30)] public string? HealthStatus { get; set; }
    [Column("outcome"), StringLength(20)] public string Outcome { get; set; } = "ALIVE";
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Calving? Calving { get; set; }
    public Animal? CalfAnimal { get; set; }
    public Animal? Dam { get; set; }
    public Animal? Sire { get; set; }
}
