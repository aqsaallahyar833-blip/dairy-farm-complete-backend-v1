namespace DairyFarm.Api.Infrastructure;

/// <summary>
/// Uniform response envelope, matching the convention already used by the
/// existing dairy_farm API so both backends return a familiar shape.
/// </summary>
public record ApiResponse<T>(bool Success, string Message, T? Data = default, object? Error = null);

public static class Result
{
    public static ApiResponse<T> Ok<T>(T data, string message = "Operation successful.")
        => new(true, message, data);

    public static ApiResponse<object> Fail(string message, object? error = null)
        => new(false, message, null, error);
}
