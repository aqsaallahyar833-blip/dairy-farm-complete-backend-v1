using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

/// <summary>
/// POST /api/animals request.
///
/// RECONCILED against the canonical schema: ear tag, RFID and the acquired
/// date are real COLUMNS on `animals` (tag_number, rfid_number,
/// acquisition_date). There is no animal_identifications table, so nothing is
/// written to a side table. Frontend-only concepts that have no database
/// equivalent are deliberately not invented.
/// </summary>
public class CreateAnimalRequest
{
    /// <summary>
    /// Target farm. Required: farm_id is NOT NULL and the caller must have
    /// access to it.
    /// </summary>
    [Required]
    [Range(1, long.MaxValue)]
    public long FarmId { get; set; }

    /// <summary>
    /// Human-readable code. Optional - when omitted the server allocates the
    /// next code from `animal_code_sequences`. Must be unique WITHIN the farm
    /// (uq_animals_farm_code).
    /// </summary>
    [StringLength(50)]
    public string? AnimalCode { get; set; }

    [StringLength(150)]
    public string? Name { get; set; }

    public long? BreedId { get; set; }

    /// <summary>Database enum: MALE | FEMALE.</summary>
    [Required]
    [RegularExpression("^(MALE|FEMALE)$", ErrorMessage = "sex must be MALE or FEMALE.")]
    public string Sex { get; set; } = null!;

    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Database enum: ACTIVE, LACTATING, DRY, PREGNANT, OPEN, SICK,
    /// QUARANTINE, SOLD, DEAD, CALF, HEIFER, BULL. Optional; defaults to ACTIVE.
    /// </summary>
    [RegularExpression(
        "^(ACTIVE|LACTATING|DRY|PREGNANT|OPEN|SICK|QUARANTINE|SOLD|DEAD|CALF|HEIFER|BULL)$",
        ErrorMessage = "status is not a valid animal status.")]
    public string? Status { get; set; }

    public long? GroupId { get; set; }

    public long? DamId { get; set; }

    public long? SireId { get; set; }

    /// <summary>When the animal entered the farm (animals.acquisition_date).</summary>
    public DateTime? PurchaseDate { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "purchasePrice must be zero or greater.")]
    public decimal? PurchasePrice { get; set; }

    public string? Notes { get; set; }

    /// <summary>Written to `animals`.tag_number.</summary>
    [StringLength(50)]
    public string? EarTag { get; set; }

    /// <summary>Written to `animals`.rfid_number.</summary>
    [StringLength(50)]
    public string? Rfid { get; set; }
}

/// <summary>
/// PUT /api/animals/{id} request.
///
/// Every field is optional (partial update). `Status` is intentionally
/// ABSENT: lifecycle changes must go through PATCH /api/animals/{id}/status so
/// the status-history audit row is always written.
/// </summary>
public class UpdateAnimalRequest
{
    [StringLength(150)]
    public string? Name { get; set; }

    public long? BreedId { get; set; }

    [StringLength(50)]
    public string? AnimalCode { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public long? GroupId { get; set; }

    public long? DamId { get; set; }

    public long? SireId { get; set; }

    public DateTime? PurchaseDate { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "purchasePrice must be zero or greater.")]
    public decimal? PurchasePrice { get; set; }

    public string? Notes { get; set; }

    /// <summary>
    /// Accepted ONLY to be rejected. The controller returns 400 if this is
    /// supplied and differs from the current status, pointing the caller at
    /// PATCH /api/animals/{id}/status.
    /// </summary>
    public string? Status { get; set; }

    [StringLength(50)]
    public string? EarTag { get; set; }

    [StringLength(50)]
    public string? Rfid { get; set; }
}

/// <summary>PATCH /api/animals/{id}/status request.</summary>
public class StatusChangeRequest
{
    /// <summary>
    /// Target status. Must be one of the real database enum values.
    /// </summary>
    [Required]
    [RegularExpression(
        "^(ACTIVE|LACTATING|DRY|PREGNANT|OPEN|SICK|QUARANTINE|SOLD|DEAD|CALF|HEIFER|BULL)$",
        ErrorMessage = "status is not a valid animal status.")]
    public string Status { get; set; } = null!;

    /// <summary>Why the status changed. Stored on the history row.</summary>
    [StringLength(500)]
    public string? Reason { get; set; }
}

