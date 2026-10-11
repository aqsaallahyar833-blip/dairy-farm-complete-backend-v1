using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DairyFarm.Api.Infrastructure;

public sealed class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
	private readonly AppDbContext _db;

	public ApiKeyAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, TimeProvider timeProvider, AppDbContext db)
		: base(options, logger, encoder)
	{
		_db = db;
	}

	protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
	{
		if (!Request.Headers.TryGetValue("X-API-Key", out var values))
		{
			return AuthenticateResult.NoResult();
		}
		string raw = values.FirstOrDefault();
		if (string.IsNullOrWhiteSpace(raw))
		{
			return AuthenticateResult.Fail("API key is empty.");
		}
		string hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
		ApiKey key = await _db.ApiKeys.AsNoTracking().FirstOrDefaultAsync((ApiKey x) => x.KeyHash == hash && x.RevokedAt == null);
		if (key == null || (key.ExpiresAt.HasValue && key.ExpiresAt.Value <= DateTime.UtcNow))
		{
			return AuthenticateResult.Fail("Invalid or expired API key.");
		}
		List<Claim> claims = new List<Claim>
		{
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", key.UserId?.ToString() ?? "0"),
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", "api-key:" + key.Name),
			new Claim("farm_id", key.FarmId.ToString()),
			new Claim("api_key_id", key.ApiKeyId.ToString()),
			new Claim("scope", key.Scopes ?? string.Empty)
		};
		ClaimsIdentity identity = new ClaimsIdentity(claims, Scheme.Name);
		return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
	}
}
