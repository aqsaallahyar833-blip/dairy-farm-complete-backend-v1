using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

public class StatusChangeRequest
{
	[Required]
	[RegularExpression("^(ACTIVE|LACTATING|DRY|PREGNANT|OPEN|SICK|QUARANTINE|SOLD|DEAD|CALF|HEIFER|BULL)$", ErrorMessage = "status is not a valid animal status.")]
	public string Status { get; set; } = null;

	[StringLength(500)]
	public string? Reason { get; set; }
}
