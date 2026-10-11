namespace DairyFarm.Api.Services;

public record PhotoUploadResult(bool Success, string? Error, int? StatusCode = null, ulong? PhotoId = null, string? ContentType = null, int? FileSize = null);
