using System;

namespace DairyFarm.Api.DTOs;

public class AnimalStatusHistoryDto
{
	public ulong StatusHistoryId { get; set; }

	public string? OldStatus { get; set; }

	public string NewStatus { get; set; } = null;

	public string? Reason { get; set; }

	public DateTime ChangedAt { get; set; }

	public ulong? UserId { get; set; }
}
