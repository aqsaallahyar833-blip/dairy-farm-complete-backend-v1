using System;
using System.Text;

namespace DairyFarm.Api.Infrastructure;

public class JwtOptions
{
	public const string SectionName = "Jwt";

	public string Key { get; set; } = null;

	public string Issuer { get; set; } = null;

	public string Audience { get; set; } = null;

	public int ExpiryMinutes { get; set; } = 60;

	public void Validate()
	{
		if (string.IsNullOrWhiteSpace(Key))
		{
			throw new InvalidOperationException("Jwt:Key is not set. Provide it via the Jwt__Key environment variable or user-secrets. Never commit a real signing key.");
		}
		if (Encoding.UTF8.GetByteCount(Key) < 32)
		{
			throw new InvalidOperationException("Jwt:Key must be at least 32 bytes for HMAC-SHA256. Generate one with:  openssl rand -base64 48");
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
