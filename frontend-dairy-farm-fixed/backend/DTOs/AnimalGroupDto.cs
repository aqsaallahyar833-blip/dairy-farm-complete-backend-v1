namespace DairyFarm.Api.DTOs;

/// <summary>
/// Animal group, as stored in `dairy_farm`.animal_groups.
/// A group optionally sits inside a shed (animal_groups.shed_id).
/// </summary>
public class AnimalGroupDto
{
    public ulong GroupId { get; set; }

    public ulong FarmId { get; set; }

    public string? FarmName { get; set; }

    /// <summary>Column is `name` (varchar(100)).</summary>
    public string Name { get; set; } = null!;

    /// <summary>COW, BULL, HEIFER, CALF or OTHER.</summary>
    public string AnimalType { get; set; } = null!;

    /// <summary>ACTIVE or INACTIVE.</summary>
    public string Status { get; set; } = null!;

    public ulong? ShedId { get; set; }

    /// <summary>Null when the group is not assigned to a shed.</summary>
    public ShedDto? Shed { get; set; }

    /// <summary>Number of animals currently in this group.</summary>
    public int AnimalCount { get; set; }
}
