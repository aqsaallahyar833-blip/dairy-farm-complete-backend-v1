using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

public class ChangePasswordRequest
{
	[Required(ErrorMessage = "currentPassword is required.")]
	public string CurrentPassword { get; set; } = null;

	[Required(ErrorMessage = "newPassword is required.")]
	[MinLength(12, ErrorMessage = "newPassword must be at least 12 characters.")]
	public string NewPassword { get; set; } = null;
}
