namespace DairyFarm.Api.DTOs;

/// <summary>
/// Breed, as stored in `dairy_farm`.breeds.
/// The column is `name` (varchar(100), unique).
/// </summary>
public class BreedDto
{
    public ulong BreedId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public bool Active { get; set; }
}
