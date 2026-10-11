using System.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace DairyFarm.Api.Infrastructure;

/// <summary>
/// Credentials-safe MySQL connectivity probe.
///
/// SECURITY CONTRACT - this type must never return, log or echo:
///   - the connection string
///   - the username
///   - the password
/// It returns only: connected?, schema name, server version, latency, and on
/// failure the exception TYPE NAME (messages are excluded because some provider
/// messages can echo connection details).
/// </summary>
public class DatabaseHealth
{
    private readonly IConfiguration _config;
    private readonly ILogger<DatabaseHealth> _logger;

    public DatabaseHealth(IConfiguration config, ILogger<DatabaseHealth> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<DatabaseStatus> CheckAsync(CancellationToken ct = default)
    {
        var configured = _config.GetConnectionString(ConnectionStringNormalizer.ConnectionName);

        if (string.IsNullOrWhiteSpace(configured))
        {
            return new DatabaseStatus(false, "(not configured)", "unknown", 0, "ConnectionStringMissing");
        }

        var database = ConnectionStringNormalizer.DatabaseNameOf(configured);
        var sw = Stopwatch.StartNew();

        try
        {
            await using var connection = new MySqlConnection(configured);
            await connection.OpenAsync(ct);

            var serverVersion = connection.ServerVersion.ToString();
            sw.Stop();

            _logger.LogInformation("MySQL connectivity OK. Schema={Schema}, ServerVersion={Version}, LatencyMs={Latency}",
                database, serverVersion, sw.ElapsedMilliseconds);

            return new DatabaseStatus(true, database, serverVersion, sw.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            sw.Stop();

            // Log the type only. The message is intentionally not logged.
            _logger.LogError("MySQL connectivity FAILED. Schema={Schema}, ErrorType={ErrorType}, LatencyMs={Latency}",
                database, ex.GetType().Name, sw.ElapsedMilliseconds);

            return new DatabaseStatus(false, database, "unknown", sw.ElapsedMilliseconds, ex.GetType().Name);
        }
    }
}

public record DatabaseStatus(
    bool Connected,
    string Database,
    string ServerVersion,
    long LatencyMs,
    string? Error);
