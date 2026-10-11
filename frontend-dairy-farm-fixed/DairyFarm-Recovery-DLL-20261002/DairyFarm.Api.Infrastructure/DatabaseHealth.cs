using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace DairyFarm.Api.Infrastructure;

public class DatabaseHealth
{
	private readonly IConfiguration _config;

	private readonly ILogger<DatabaseHealth> _logger;

	public DatabaseHealth(IConfiguration config, ILogger<DatabaseHealth> logger)
	{
		_config = config;
		_logger = logger;
	}

	public async Task<DatabaseStatus> CheckAsync(CancellationToken ct = default(CancellationToken))
	{
		string configured = _config.GetConnectionString("DairyFarm");
		if (string.IsNullOrWhiteSpace(configured))
		{
			return new DatabaseStatus(Connected: false, "(not configured)", "unknown", 0L, "ConnectionStringMissing");
		}
		string database = ConnectionStringNormalizer.DatabaseNameOf(configured);
		Stopwatch sw = Stopwatch.StartNew();
		try
		{
			DatabaseStatus result;
			await using (MySqlConnection connection = new MySqlConnection(configured))
			{
				await connection.OpenAsync(ct);
				string serverVersion = connection.ServerVersion.ToString();
				sw.Stop();
				_logger.LogInformation("MySQL connectivity OK. Schema={Schema}, ServerVersion={Version}, LatencyMs={Latency}", database, serverVersion, sw.ElapsedMilliseconds);
				result = new DatabaseStatus(Connected: true, database, serverVersion, sw.ElapsedMilliseconds, null);
			}
			return result;
		}
		catch (Exception ex)
		{
			sw.Stop();
			_logger.LogError("MySQL connectivity FAILED. Schema={Schema}, ErrorType={ErrorType}, LatencyMs={Latency}", database, ex.GetType().Name, sw.ElapsedMilliseconds);
			return new DatabaseStatus(Connected: false, database, "unknown", sw.ElapsedMilliseconds, ex.GetType().Name);
		}
	}
}
