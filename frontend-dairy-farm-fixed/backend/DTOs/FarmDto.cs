namespace DairyFarm.Api.DTOs;

/// <summary>
/// Farm, as stored in `dairy_farm`.farms.
/// </summary>
public class FarmDto
{
    public ulong FarmId { get; set; }

    public ulong CompanyId { get; set; }

    /// <summary>Column is `name` (varchar(150)).</summary>
    public string Name { get; set; } = null!;

    public string? Location { get; set; }

    public string? Contact { get; set; }

    /// <summary>ACTIVE or INACTIVE.</summary>
    public string Status { get; set; } = null!;
}
