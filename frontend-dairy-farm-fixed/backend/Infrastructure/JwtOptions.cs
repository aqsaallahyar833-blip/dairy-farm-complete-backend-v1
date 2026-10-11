namespace DairyFarm.Api.Infrastructure;

/// <summary>
/// JWT bearer configuration. Bound from the "Jwt" configuration section, which
/// is supplied by environment variables or user-secrets. NEVER a real value in
/// appsettings.json - see backend/.env.example.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>HMAC-SHA256 signing key. Must be at least 32 bytes.</summary>
    public string Key { get; set; } = null!;

    public string Issuer { get; set; } = null!;

    public string Audience { get; set; } = null!;

    public int ExpiryMinutes { get; set; } = 60;

    /// <summary>
    /// Throws with an actionable message when configuration is missing. This is
    /// called at startup so a misconfigured deployment fails fast instead of
    /// silently accepting unsigned tokens.
    /// </summary>
    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Key))
        {
            throw new InvalidOperationException(
                "Jwt:Key is not set. Provide it via the Jwt__Key environment " +
                "variable or user-secrets. Never commit a real signing key.");
        }

        // A 32-character minimum, matching HMAC-SHA256's 256-bit key size.
        if (System.Text.Encoding.UTF8.GetByteCount(Key) < 32)
        {
            throw new InvalidOperationException(
                "Jwt:Key must be at least 32 bytes for HMAC-SHA256. " +
                "Generate one with:  openssl rand -base64 48");
        }

        if (string.IsNullOrWhiteSpace(Issuer))
        {
            throw new InvalidOperationException("Jwt:Issuer is not set.");
        }

        if (string.IsNullOrWhiteSpace(Audience))
        {
            throw new InvalidOperationException("Jwt:Audience is not set.");
        }

        if (ExpiryMinutes <= 0)
        {
            throw new InvalidOperationException("Jwt:ExpiryMinutes must be greater than zero.");
        }
    }
}
