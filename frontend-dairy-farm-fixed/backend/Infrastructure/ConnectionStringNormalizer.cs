using MySqlConnector;

namespace DairyFarm.Api.Infrastructure;

/// <summary>
/// Normalises a caller-supplied MySQL connection string.
///
/// Purpose: the local MySQL 8.4 instance used in development does not present a
/// trusted certificate, and MySqlConnector defaults to SslMode=Preferred, which
/// makes the handshake fail with "SSL Authentication Error" on Windows when no
/// SSPI credentials are available. Defaulting to SslMode=None when the operator
/// has not chosen a mode removes that failure mode.
///
/// If the connection string ALREADY specifies SslMode it is left untouched, so
/// a non-local deployment can still require TLS by setting it explicitly.
///
/// The string is never logged and never echoed back to a client.
/// </summary>
public static class ConnectionStringNormalizer
{
    public const string ConnectionName = "DairyFarm";

    /// <summary>
    /// Appends SslMode=None only when no mode has been specified.
    /// Implemented with plain string handling to stay independent of the
    /// provider's property typing.
    /// </summary>
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

        var trimmed = connectionString.Trim();
        var separator = trimmed.EndsWith(';') ? string.Empty : ";";

        return $"{trimmed}{separator}SslMode=None;";
    }

    /// <summary>Extracts only the schema name. This is not a secret and is safe to display.</summary>
    public static string DatabaseNameOf(string connectionString)
    {
        try
        {
            var db = new MySqlConnectionStringBuilder(connectionString).Database;
            return string.IsNullOrWhiteSpace(db) ? "(none)" : db;
        }
        catch
        {
            return "(unparseable)";
        }
    }
}
