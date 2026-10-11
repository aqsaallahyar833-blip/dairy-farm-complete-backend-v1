using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

// ===========================================================================
// CORE ENTITIES - mapped 1:1 to the VERIFIED `dairy farm 1` canonical schema.
//
// Every property carries an explicit [Column] matching the real MySQL column
// name, and the C# type matches the real MySQL type and nullability, so schema
// drift fails loudly at runtime instead of silently.
//
// Hierarchy enforced by the database:
//     companies -> farms -> sheds -> animal_groups -> animals
// ===========================================================================

/// <summary>Maps `companies` - the top of the farm-isolation hierarchy.</summary>
[Table("companies")]
public class Company
{
    [Key, Column("company_id")] public ulong CompanyId { get; set; }
    [Column("name"), StringLength(200)] public string Name { get; set; } = string.Empty;
    [Column("contact"), StringLength(255)] public string? Contact { get; set; }
    [Column("address"), StringLength(500)] public string? Address { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<Farm> Farms { get; set; } = new List<Farm>();
}

/// <summary>Maps `farms`. Owns sheds, groups, animals and all operational data.</summary>
[Table("farms")]
public class Farm
{
    [Key, Column("farm_id")] public ulong FarmId { get; set; }
    [Column("company_id")] public ulong CompanyId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    /// <summary>Unique installation-wide (uq_farms_code). Nullable in MySQL.</summary>
    [Column("code"), StringLength(50)] public string? Code { get; set; }
    [Column("location"), StringLength(255)] public string? Location { get; set; }
    [Column("contact"), StringLength(255)] public string? Contact { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Company? Company { get; set; }
    public ICollection<Shed> Sheds { get; set; } = new List<Shed>();
    public ICollection<AnimalGroup> Groups { get; set; } = new List<AnimalGroup>();
    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
    public FarmSetting? Settings { get; set; }
}

/// <summary>Maps `sheds`. Unique name per farm (uq_sheds_farm_name).</summary>
[Table("sheds")]
public class Shed
{
    [Key, Column("shed_id")] public ulong ShedId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("capacity")] public uint? Capacity { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<AnimalGroup> Groups { get; set; } = new List<AnimalGroup>();
}

/// <summary>
/// Maps `animal_groups` (the canonical table). The previous model wrongly
/// pointed at a non-existent `groups` table.
/// </summary>
[Table("animal_groups")]
public class AnimalGroup
{
    [Key, Column("group_id")] public ulong GroupId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("shed_id")] public ulong? ShedId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("animal_type"), StringLength(50)] public string AnimalType { get; set; } = "COW";
    [Column("description")] public string? Description { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Shed? Shed { get; set; }
    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
}

/// <summary>Maps `breeds` - lookup list for the animal breed dropdown.</summary>
[Table("breeds")]
public class Breed
{
    [Key, Column("breed_id")] public ulong BreedId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("description"), StringLength(500)] public string? Description { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
}
