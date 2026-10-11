namespace DairyFarm.Api.Infrastructure;

public static class Result
{
	public static ApiResponse<T> Ok<T>(T data, string message = "Operation successful.")
	{
		return new ApiResponse<T>(Success: true, message, data);
	}

	public static ApiResponse<object> Fail(string message, object? error = null)
	{
		return new ApiResponse<object>(Success: false, message, null, error);
	}
}
