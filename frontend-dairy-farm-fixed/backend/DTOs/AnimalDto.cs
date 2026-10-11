namespace DairyFarm.Api.DTOs;

/// <summary>
/// Animal summary DTO for list views. Returned by GET /api/animals.
///
/// RECONCILED against the canonical `dairy farm 1` schema:
///   * tag_number / rfid_number are real COLUMNS on `animals`, not rows in an
///     animal_identifications table (that table does not exist).
///   * birth date is `date_of_birth`, acquired date is `acquisition_date`.
///   * the profile image is the `photo_url` column.
///   * `status` is returned exactly as stored (UPPERCASE) so the database stays
///     the single source of truth; title-casing is a frontend concern.
/// </summary>
public class AnimalDto
{
    public ulong AnimalId { get; set; }

    /// <summary>Animal code, unique WITHIN a farm, e.g. "AN-001".</summary>
    public string AnimalCode { get; set; } = null!;

    /// <summary>From `animals`.tag_number. Null when not set. Never invented.</summary>
    public string? TagNumber { get; set; }

    public string? Name { get; set; }

    public ulong? BreedId { get; set; }

    public string? BreedName { get; set; }

    /// <summary>From `animals`.date_of_birth.</summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Database enum, UPPERCASE, exactly as stored:
    /// ACTIVE, LACTATING, DRY, PREGNANT, OPEN, SICK, QUARANTINE, SOLD, DEAD,
    /// CALF, HEIFER, BULL
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>Database enum: MALE or FEMALE.</summary>
    public string Sex { get; set; } = null!;

    public ulong FarmId { get; set; }

    public string? FarmName { get; set; }

    public ulong? GroupId { get; set; }

    public string? GroupName { get; set; }

    /// <summary>Profile image URL, from `animals.photo_url`.</summary>
    public string? Photo { get; set; }

    public string? Notes { get; set; }

    /// <summary>From `animals.acquisition_date` (when the animal entered the farm).</summary>
    public DateTime? PurchaseDate { get; set; }

    public decimal? PurchasePrice { get; set; }

    /// <summary>Derived from date_of_birth. Null when date_of_birth is null.</summary>
    public int? AgeInMonths { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

