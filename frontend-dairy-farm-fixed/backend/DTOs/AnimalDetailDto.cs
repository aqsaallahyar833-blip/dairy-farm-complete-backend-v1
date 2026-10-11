namespace DairyFarm.Api.DTOs;

/// <summary>
/// Full animal detail, including joined relationships. Returned by
/// GET /api/animals/{id} and GET /api/animals/by-code/{code}.
///
/// RECONCILED against the canonical schema: shed is reached through
/// animals.group_id -> animal_groups.shed_id (animals has no shed_id of its
/// own), and the ear tag / RFID are plain columns on `animals` rather than rows
/// in a separate identifications table.
/// </summary>
public class AnimalDetailDto : AnimalDto
{
    public ulong? DamId { get; set; }

    public string? DamAnimalCode { get; set; }

    public ulong? SireId { get; set; }

    public string? SireAnimalCode { get; set; }

    /// <summary>Present when the animal's group is assigned to a shed.</summary>
    public ShedDto? Shed { get; set; }

    /// <summary>Most recent first.</summary>
    public List<AnimalStatusHistoryDto> StatusHistory { get; set; } = new();

    /// <summary>RFID from `animals`.rfid_number.</summary>
    public string? RfidNumber { get; set; }
}

/// <summary>
/// Shed, as stored in the canonical `sheds` table.
/// </summary>
public class ShedDto
{
    public ulong ShedId { get; set; }

    /// <summary>Column is `name` (varchar(150)).</summary>
    public string ShedName { get; set; } = null!;

    public ulong FarmId { get; set; }

    /// <summary>Null only if the owning farm row is missing.</summary>
    public string? FarmName { get; set; }

    public uint? Capacity { get; set; }

    public string? Notes { get; set; }

    /// <summary>Number of animal groups assigned to this shed.</summary>
    public int GroupCount { get; set; }
}

/// <summary>
/// One row of `animal_status_history`, the append-only audit of status changes.
///
/// `ChangedAt` is the API property name and maps to the entity's CreatedAt
/// (the moment the history row was written). `UserId` maps to ChangedBy.
/// </summary>
public class AnimalStatusHistoryDto
{
    public ulong StatusHistoryId { get; set; }

    /// <summary>Column is `old_status`; null for the initial status set on insert.</summary>
    public string? OldStatus { get; set; }

    /// <summary>Column is `new_status`.</summary>
    public string NewStatus { get; set; } = null!;

    public string? Reason { get; set; }

    /// <summary>From `animal_status_history`.created_at.</summary>
    public DateTime ChangedAt { get; set; }

    /// <summary>From `animal_status_history`.changed_by.</summary>
    public ulong? UserId { get; set; }
}

/// <summary>
/// One of an animal's identifiers, derived from the real columns on `animals`.
///
/// RECONCILED: there is no animal_identifications table in the canonical
/// schema. The identification data lives in the tag_number, rfid_number and
/// qr_token columns, so the read-only /api/animals/{id}/identifications route
/// projects those columns into this shape instead of querying a table that does
/// not exist. The endpoint and its route are preserved; only the source changed.
/// </summary>
public class AnimalIdentifierDto
{
    /// <summary>EAR_TAG, RFID or QR.</summary>
    public string Type { get; set; } = null!;

    /// <summary>The stored identifier value. Null when the column is empty.</summary>
    public string? Value { get; set; }

    /// <summary>True for a primary ear tag; false for RFID and QR rows.</summary>
    public bool IsPrimary { get; set; }
}

