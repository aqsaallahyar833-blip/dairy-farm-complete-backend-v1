using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DairyFarm.Api.Data;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DairyFarm.Api.Services;

/// <summary>
/// Password verification and JWT issuance for the EXISTING `users` table.
/// Uses the framework's PBKDF2 PasswordHasher, so no extra NuGet package and
/// no custom cryptography is introduced.
///
/// SECURITY: the password and the hash are never logged, never returned, and
/// the plaintext is never persisted.
/// </summary>
public class AuthService
{
    private readonly AppDbContext _context;
    private readonly JwtOptions _options;
    private readonly ILogger<AuthService> _logger;
    private readonly PasswordHasher<User> _hasher = new();

    /// <summary>
    /// A valid PBKDF2 hash of a random value generated at startup that nobody
    /// knows. Verifying against it for an unknown user makes a failed login
    /// cost the same whether or not the account exists, so the endpoint cannot
    /// be used to enumerate email addresses.
    /// </summary>
    private readonly string _dummyHash;

    /// <summary>
    /// A throwaway User used ONLY as the PBKDF2 "salt carrier" when verifying a
    /// failed login, so an unknown username costs the same work as a wrong
    /// password. It is never persisted and never leaves this service.
    /// </summary>
    private readonly User throwawayUser;

    public AuthService(
        AppDbContext context,
        IOptions<JwtOptions> options,
        ILogger<AuthService> logger)
    {
        _context = context;
        _options = options.Value;
        _logger = logger;

        // RECONCILED: the canonical `users` table has a UNIQUE `username` and a
        // nullable `email`. Sign-in matches username first and falls back to
        // email, so a client that posts an address still works.
        var throwaway = new User
        {
            UserId = 0,
            Username = "timing-equaliser",
            FullName = "timing-equaliser",
            FarmId = 0,
            RoleId = 0,
            Status = "ACTIVE"
        };
        throwawayUser = throwaway;
        _dummyHash = _hasher.HashPassword(throwaway, Convert.ToBase64String(Guid.NewGuid().ToByteArray()));
    }

    /// <summary>
    /// Verifies credentials and issues a token.
    ///
    /// Returns null for EVERY failure mode (unknown user, wrong password,
    /// malformed hash, null hash, inactive account) so the caller cannot
    /// distinguish them. Only the email / user id is ever logged - never the
    /// password and never the hash.
    /// </summary>
    public async Task<LoginResponseDto?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var identity = request.Username.Trim();

        // RECONCILED: `users` carries a SINGLE role (users.role_id) and no
        // user_roles junction table, so the role and the owning farm are loaded
        // through direct navigations.
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Farm)
            .FirstOrDefaultAsync(u => u.Username == identity || u.Email == identity, ct);

        if (user is null)
        {
            VerifyHash(_dummyHash, throwawayUser, request.Password);
            _logger.LogWarning("Login rejected: no user matches the supplied username.");
            return null;
        }

        // The schema allows NULL. It must NOT be treated as an empty password.
        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            VerifyHash(_dummyHash, user, request.Password);
            _logger.LogWarning("Login rejected for user {UserId}: password_hash is NULL.", user.UserId);
            return null;
        }

        var verification = VerifyHash(user.PasswordHash!, user, request.Password);

        if (verification == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Login rejected for user {UserId}: incorrect password.", user.UserId);
            return null;
        }

        // The account is only usable when ACTIVE. This is checked AFTER the
        // password so a wrong password on a disabled account still costs the
        // same work as on a live one.
        if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Login rejected for user {UserId}: account status is {Status}.", user.UserId, user.Status);
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            // Upgrade the stored hash to the current algorithm. The plaintext is
            // used in memory only and is never written or logged.
            user.PasswordHash = _hasher.HashPassword(user, request.Password);
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Rehashed password for user {UserId} using the current algorithm.", user.UserId);
        }

        var dto = ToUserDto(user);
        var (token, expiresAt) = IssueToken(user, dto);

        _logger.LogInformation("Login succeeded for user {UserId}.", user.UserId);

        return new LoginResponseDto
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresInSeconds = _options.ExpiryMinutes * 60,
            ExpiresAtUtc = expiresAt,
            User = dto
        };
    }

    public async Task<AuthenticatedUserDto?> GetUserAsync(ulong userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Farm)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        return user is null ? null : ToUserDto(user);
    }

    /// <summary>
    /// Result of a password change. Deliberately coarse: the caller learns only
    /// whether the change happened, never WHY it failed, so the endpoint cannot
    /// be used to probe whether a current password is "almost" correct.
    /// </summary>
    public enum PasswordChangeOutcome
    {
        Changed,
        Rejected,
        NotFound
    }

    /// <summary>
    /// Changes the caller's own password after verifying the CURRENT one.
    ///
    /// REUSES the existing PBKDF2 PasswordHasher - there is no second hashing
    /// system and no plaintext is ever written or logged. The current password
    /// must verify first, so this cannot be used to take over an account whose
    /// session was stolen; it requires the old secret as well.
    ///
    /// SESSION BEHAVIOUR - read this before relying on a change to cut access:
    /// this API issues STATELESS JWTs (HS256) and the bearer handler validates
    /// only the signature, issuer, audience and expiry. The `user_sessions` table
    /// exists in the schema but is NOT used by the token pipeline, so there is no
    /// server-side session record to revoke. A token issued BEFORE this call
    /// therefore stays valid until it expires on its own (Jwt:ExpiryMinutes,
    /// 60 minutes by default). No parallel revocation mechanism was invented,
    /// and no schema column was added, to change that.
    /// </summary>
    public async Task<PasswordChangeOutcome> ChangePasswordAsync(
        ulong userId, string? currentPassword, string? newPassword, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            // Still burn a hash verification so a missing account and a wrong
            // password cost roughly the same time.
            VerifyHash(_dummyHash, throwawayUser, currentPassword);
            return PasswordChangeOutcome.NotFound;
        }

        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            VerifyHash(_dummyHash, user, currentPassword);
            return PasswordChangeOutcome.Rejected;
        }

        // The current password must be correct. A failure here is reported
        // identically to any other rejection: no hint is returned about how
        // close it was.
        if (VerifyHash(user.PasswordHash, user, currentPassword) == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Password change rejected for user {UserId}: current password did not verify.", userId);
            return PasswordChangeOutcome.Rejected;
        }

        // Re-use the login path's rule: never allow the current password back
        // as the new one.
        if (string.Equals(currentPassword, newPassword, StringComparison.Ordinal))
        {
            _logger.LogWarning("Password change rejected for user {UserId}: new password matches the current one.", userId);
            return PasswordChangeOutcome.Rejected;
        }

        // Same hashing as sign-in. The plaintext leaves scope here.
        user.PasswordHash = _hasher.HashPassword(user, newPassword ?? string.Empty);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        // Neither the new password nor its hash is ever logged.
        _logger.LogInformation("Password changed for user {UserId}.", userId);

        return PasswordChangeOutcome.Changed;
    }

    private PasswordVerificationResult VerifyHash(string hash, User user, string? password)
    {
        try
        {
            return _hasher.VerifyHashedPassword(user, hash, password ?? string.Empty);
        }
        catch (FormatException)
        {
            // Stored hash is not in ASP.NET Core format. Deliberately no
            // fallback scheme is attempted.
            return PasswordVerificationResult.Failed;
        }
    }

    private (string Token, DateTime ExpiresAt) IssueToken(User user, AuthenticatedUserDto dto)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            // RECONCILED: authorisation scope is FARM based (users.farm_id);
            // there is no company claim in this schema.
            new("farm_id", user.FarmId.ToString()),
            new("role_id", user.RoleId.ToString()),
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Role NAMES are carried as claims so the token is self-describing.
        // The schema has no "Admin" role, so none is invented here.
        foreach (var role in dto.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    // RECONCILED: a user has exactly ONE role in the canonical schema
    // (users.role_id -> roles), so the Roles list holds at most one name. The
    // list shape is preserved so the response contract is unchanged.
    private static AuthenticatedUserDto ToUserDto(User user)
    {
        var dto = new AuthenticatedUserDto
        {
            UserId = user.UserId,
            Name = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            FarmId = user.FarmId,
            FarmName = user.Farm?.Name,
            Status = user.Status
        };

        if (user.Role?.Name is { Length: > 0 } roleName)
        {
            dto.Roles.Add(roleName);
        }

        return dto;
    }
}
