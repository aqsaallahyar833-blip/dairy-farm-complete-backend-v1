using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animals")]
public class Animal
{
	[Key]
	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("shed_id")]
	public ulong? ShedId { get; set; }

	[Column("group_id")]
	public ulong? GroupId { get; set; }

	[Column("dam_id")]
	public ulong? DamId { get; set; }

	[Column("sire_id")]
	public ulong? SireId { get; set; }

	[Column("breed_id")]
	public ulong? BreedId { get; set; }

	[Column("animal_code")]
	[StringLength(50)]
	public string AnimalCode { get; set; } = string.Empty;

	[Column("name")]
	[StringLength(150)]
	public string? Name { get; set; }

	[Column("tag_number")]
	[StringLength(50)]
	public string? TagNumber { get; set; }

	[Column("rfid_number")]
	[StringLength(50)]
	public string? RfidNumber { get; set; }

	[Column("qr_token")]
	[StringLength(64)]
	public string? QrToken { get; set; }

	[Column("sex")]
	[StringLength(10)]
	public string Sex { get; set; } = "FEMALE";

	[Column("date_of_birth")]
	public DateTime? DateOfBirth { get; set; }

	[Column("color")]
	[StringLength(100)]
	public string? Color { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "ACTIVE";

	[Column("lactation_number")]
	public int? LactationNumber { get; set; }

	[Column("source")]
	[StringLength(100)]
	public string? Source { get; set; }

	[Column("acquisition_date")]
	public DateTime? AcquisitionDate { get; set; }

	[Column("purchase_price")]
	public decimal? PurchasePrice { get; set; }

	[Column("photo_url")]
	[StringLength(500)]
	public string? PhotoUrl { get; set; }

	[Column("death_date")]
	public DateTime? DeathDate { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

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
