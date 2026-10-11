using System;

namespace DairyFarm.Api.DTOs;

public class LoginResponseDto
{
	public string Token { get; set; } = null;

	public string TokenType { get; set; } = "Bearer";

	public int ExpiresInSeconds { get; set; }

	public DateTime ExpiresAtUtc { get; set; }

	public AuthenticatedUserDto User { get; set; } = null;
}
