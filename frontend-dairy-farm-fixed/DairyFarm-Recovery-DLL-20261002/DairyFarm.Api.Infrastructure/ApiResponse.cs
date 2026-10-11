namespace DairyFarm.Api.Infrastructure;

public record ApiResponse<T>(bool Success, string Message, T? Data = default(T?), object? Error = null);
