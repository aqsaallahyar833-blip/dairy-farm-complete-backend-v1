using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("calvings")]
public class Calving
{
	[Key]
	[Column("calving_id")]
	public ulong CalvingId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("pregnancy_id")]
	public ulong? PregnancyId { get; set; }

	[Column("calving_date")]
	public DateTime CalvingDate { get; set; }

	[Column("calving_type")]
	[StringLength(20)]
	public string CalvingType { get; set; } = "NORMAL";

	[Column("calf_count")]
	public int CalfCount { get; set; } = 1;

	[Column("live_calf_count")]
	public int? LiveCalfCount { get; set; }

	[Column("dead_calf_count")]
	public int? DeadCalfCount { get; set; }

	[Column("calving_status")]
	[StringLength(20)]
	public string CalvingStatus { get; set; } = "COMPLETED";

	[Column("veterinarian_name")]
	[StringLength(150)]
	public string? VeterinarianName { get; set; }

	[Column("colostrum_given")]
	public bool ColostrumGiven { get; set; }

	[Column("colostrum_time_hours")]
	public decimal? ColostrumTimeHours { get; set; }

	[Column("complications")]
	public string? Complications { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public Pregnancy? Pregnancy { get; set; }

	public ICollection<Calf> Calves { get; set; } = new List<Calf>();
}
