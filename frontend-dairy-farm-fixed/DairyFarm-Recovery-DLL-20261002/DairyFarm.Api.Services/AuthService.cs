using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DairyFarm.Api.Services;

public class AuthService
{
	public enum PasswordChangeOutcome
	{
		Changed,
		Rejected,
		NotFound
	}

	private readonly AppDbContext _context;

	private readonly JwtOptions _options;

	private readonly ILogger<AuthService> _logger;

	private readonly PasswordHasher<User> _hasher = new PasswordHasher<User>();

	private readonly string _dummyHash;

	private readonly User throwawayUser;

	public AuthService(AppDbContext context, IOptions<JwtOptions> options, ILogger<AuthService> logger)
	{
		_context = context;
		_options = options.Value;
		_logger = logger;
		User user = (throwawayUser = new User
		{
			UserId = 0uL,
			Username = "timing-equaliser",
			FullName = "timing-equaliser",
			FarmId = 0uL,
			RoleId = 0uL,
			Status = "ACTIVE"
		});
		_dummyHash = _hasher.HashPassword(user, Convert.ToBase64String(Guid.NewGuid().ToByteArray()));
	}

	public async Task<LoginResponseDto?> LoginAsync(LoginRequest request, CancellationToken ct = default(CancellationToken))
	{
		string identity = request.Username.Trim();
		User user = await _context.Users.AsNoTracking().Include((User u) => u.Role).Include((User u) => u.Farm)
			.FirstOrDefaultAsync((User u) => u.Username == identity || u.Email == identity, ct);
		if (user == null)
		{
			VerifyHash(_dummyHash, throwawayUser, request.Password);
			_logger.LogWarning("Login rejected: no user matches the supplied username.");
			return null;
		}
		if (string.IsNullOrEmpty(user.PasswordHash))
		{
			VerifyHash(_dummyHash, user, request.Password);
			_logger.LogWarning("Login rejected for user {UserId}: password_hash is NULL.", user.UserId);
			return null;
		}
		PasswordVerificationResult verification = VerifyHash(user.PasswordHash, user, request.Password);
		if (verification == PasswordVerificationResult.Failed)
		{
			_logger.LogWarning("Login rejected for user {UserId}: incorrect password.", user.UserId);
			return null;
		}
		if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
		{
			_logger.LogWarning("Login rejected for user {UserId}: account status is {Status}.", user.UserId, user.Status);
			return null;
		}
		if (verification == PasswordVerificationResult.SuccessRehashNeeded)
		{
			user.PasswordHash = _hasher.HashPassword(user, request.Password);
			await _context.SaveChangesAsync(ct);
			_logger.LogInformation("Rehashed password for user {UserId} using the current algorithm.", user.UserId);
		}
		AuthenticatedUserDto dto = ToUserDto(user);
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

	public async Task<AuthenticatedUserDto?> GetUserAsync(ulong userId, CancellationToken ct = default(CancellationToken))
	{
		User user = await _context.Users.AsNoTracking().Include((User u) => u.Role).Include((User u) => u.Farm)
			.FirstOrDefaultAsync((User u) => u.UserId == userId, ct);
		return (user == null) ? null : ToUserDto(user);
	}

	public async Task<PasswordChangeOutcome> ChangePasswordAsync(ulong userId, string? currentPassword, string? newPassword, CancellationToken ct = default(CancellationToken))
	{
		User user = await _context.Users.FirstOrDefaultAsync((User u) => u.UserId == userId, ct);
		if (user == null)
		{
			VerifyHash(_dummyHash, throwawayUser, currentPassword);
			return PasswordChangeOutcome.NotFound;
		}
		if (string.IsNullOrEmpty(user.PasswordHash))
		{
			VerifyHash(_dummyHash, user, currentPassword);
			return PasswordChangeOutcome.Rejected;
		}
		if (VerifyHash(user.PasswordHash, user, currentPassword) == PasswordVerificationResult.Failed)
		{
			_logger.LogWarning("Password change rejected for user {UserId}: current password did not verify.", userId);
			return PasswordChangeOutcome.Rejected;
		}
		if (string.Equals(currentPassword, newPassword, StringComparison.Ordinal))
		{
			_logger.LogWarning("Password change rejected for user {UserId}: new password matches the current one.", userId);
			return PasswordChangeOutcome.Rejected;
		}
		user.PasswordHash = _hasher.HashPassword(user, newPassword ?? string.Empty);
		user.UpdatedAt = DateTime.UtcNow;
		await _context.SaveChangesAsync(ct);
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
			return PasswordVerificationResult.Failed;
		}
	}

	private (string Token, DateTime ExpiresAt) IssueToken(User user, AuthenticatedUserDto dto)
	{
		List<Claim> list = new List<Claim>
		{
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", user.UserId.ToString()),
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", user.Username),
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", user.Email ?? string.Empty),
			new Claim("farm_id", user.FarmId.ToString()),
			new Claim("role_id", user.RoleId.ToString()),
			new Claim("sub", user.UserId.ToString()),
			new Claim("jti", Guid.NewGuid().ToString())
		};
		foreach (string role in dto.Roles)
		{
			list.Add(new Claim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", role));
		}
		SymmetricSecurityKey key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
		DateTime dateTime = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes);
		JwtSecurityToken token = new JwtSecurityToken(_options.Issuer, _options.Audience, list, DateTime.UtcNow, dateTime, new SigningCredentials(key, "HS256"));
		return (Token: new JwtSecurityTokenHandler().WriteToken(token), ExpiresAt: dateTime);
	}

	private static AuthenticatedUserDto ToUserDto(User user)
	{
		AuthenticatedUserDto authenticatedUserDto = new AuthenticatedUserDto
		{
			UserId = user.UserId,
			Name = user.FullName,
			Email = user.Email,
			Phone = user.Phone,
			FarmId = user.FarmId,
			FarmName = user.Farm?.Name,
			Status = user.Status
		};
		string text = user.Role?.Name;
		if (text != null && text.Length > 0)
		{
			authenticatedUserDto.Roles.Add(text);
		}
		return authenticatedUserDto;
	}
}
