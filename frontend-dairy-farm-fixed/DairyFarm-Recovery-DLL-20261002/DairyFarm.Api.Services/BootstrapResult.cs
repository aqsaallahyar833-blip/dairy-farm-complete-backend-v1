namespace DairyFarm.Api.Services;

public record BootstrapResult(bool Success, string Message, ulong? UserId = null, ulong? CompanyId = null, ulong? FarmId = null, bool AlreadyInitialized = false);
