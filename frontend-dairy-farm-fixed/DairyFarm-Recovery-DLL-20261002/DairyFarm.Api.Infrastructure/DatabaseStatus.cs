namespace DairyFarm.Api.Infrastructure;

public record DatabaseStatus(bool Connected, string Database, string ServerVersion, long LatencyMs, string? Error);
