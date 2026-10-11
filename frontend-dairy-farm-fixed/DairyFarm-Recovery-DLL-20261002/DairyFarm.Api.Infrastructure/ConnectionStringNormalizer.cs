using System;
using MySqlConnector;

namespace DairyFarm.Api.Infrastructure;

public static class ConnectionStringNormalizer
{
	public const string ConnectionName = "DairyFarm";

	public static string EnsureSslMode(string connectionString)
	{
		if (string.IsNullOrWhiteSpace(connectionString))
		{
			return connectionString;
		}
		if (connectionString.Contains("SslMode", StringComparison.OrdinalIgnoreCase))
		{
			return connectionString;
		}
		string text = connectionString.Trim();
		string text2 = (text.EndsWith(';') ? string.Empty : ";");
		return text + text2 + "SslMode=None;";
	}

	public static string DatabaseNameOf(string connectionString)
	{
		try
		{
			string database = new MySqlConnectionStringBuilder(connectionString).Database;
			return string.IsNullOrWhiteSpace(database) ? "(none)" : database;
		}
		catch
		{
			return "(unparseable)";
		}
	}
}
