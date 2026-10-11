using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

public class LoginRequest
{
	[Required(ErrorMessage = "username is required.")]
	public string Username { get; set; } = null;

	[Required(ErrorMessage = "password is required.")]
	public string Password { get; set; } = null;
}
