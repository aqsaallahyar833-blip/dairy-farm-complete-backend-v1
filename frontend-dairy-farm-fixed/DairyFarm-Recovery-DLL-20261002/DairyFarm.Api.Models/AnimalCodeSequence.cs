using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_code_sequences")]
public class AnimalCodeSequence
{
	[Key]
	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("prefix")]
	[StringLength(20)]
	public string Prefix { get; set; } = "AN-";

	[Column("next_number")]
	public ulong NextNumber { get; set; } = 1uL;

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }
}
