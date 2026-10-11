namespace DairyFarm.Api.Services;

public record QrTokenResult(bool Success, string? Error, int? StatusCode = null, string? Token = null, ulong? AnimalId = null);
