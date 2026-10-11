using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DairyFarm.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using System.Text.Encodings.Web;

namespace DairyFarm.Api.Infrastructure;

public sealed class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AppDbContext _db;

    // RECONCILED: ISystemClock is obsolete in .NET 10; the framework now injects
    // TimeProvider. This is a constructor-signature change only - the
    // authentication semantics (SHA-256 key hash lookup, expiry, revocation)
    // are untouched.
    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        TimeProvider timeProvider,
        AppDbContext db)
        : base(options, logger, encoder) => _db = db;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-API-Key", out StringValues values))
            return AuthenticateResult.NoResult();
        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw)) return AuthenticateResult.Fail("API key is empty.");

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
        var key = await _db.ApiKeys.AsNoTracking().FirstOrDefaultAsync(x => x.KeyHash == hash && x.RevokedAt == null);
        if (key == null || (key.ExpiresAt.HasValue && key.ExpiresAt.Value <= DateTime.UtcNow))
            return AuthenticateResult.Fail("Invalid or expired API key.");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, key.UserId?.ToString() ?? "0"),
            new(ClaimTypes.Name, $"api-key:{key.Name}"),
            // RECONCILED: api_keys scopes by farm (farm_id); there is no
            // company_id column.
            new("farm_id", key.FarmId.ToString()),
            new("api_key_id", key.ApiKeyId.ToString()),
            new("scope", key.Scopes ?? string.Empty)
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}
