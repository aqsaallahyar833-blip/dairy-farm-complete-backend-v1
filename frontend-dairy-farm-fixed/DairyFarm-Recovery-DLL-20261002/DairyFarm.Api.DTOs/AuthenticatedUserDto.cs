using System.Collections.Generic;

namespace DairyFarm.Api.DTOs;

public class AuthenticatedUserDto
{
	public ulong UserId { get; set; }

	public string Name { get; set; } = null;

	public string? Email { get; set; }

	public string? Phone { get; set; }

	public ulong FarmId { get; set; }

	public string? FarmName { get; set; }

	public string Status { get; set; } = null;

	public List<string> Roles { get; set; } = new List<string>();
}
