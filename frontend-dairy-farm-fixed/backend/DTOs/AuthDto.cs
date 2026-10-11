using System.ComponentModel.DataAnnotations;

namespace DairyFarm.Api.DTOs;

/// <summary>
/// POST /api/auth/login body.
///
/// RECONCILED: the canonical `users` table has a UNIQUE `username` column and a
/// nullable `email`. Login matches on username, and falls back to email so an
/// existing client that posts an address still works.
/// </summary>
public class LoginRequest
{
    [Required(ErrorMessage = "username is required.")]
    public string Username { get; set; } = null!;

    [Required(ErrorMessage = "password is required.")]
    public string Password { get; set; } = null!;
}

/// <summary>
/// POST /api/auth/change-password body.
///
/// Both fields are required: knowing one alone is never enough, so a stolen
/// bearer token cannot be used to take the account over.
/// </summary>
public class ChangePasswordRequest
{
    [Required(ErrorMessage = "currentPassword is required.")]
    public string CurrentPassword { get; set; } = null!;

    [Required(ErrorMessage = "newPassword is required.")]
    [MinLength(12, ErrorMessage = "newPassword must be at least 12 characters.")]
    public string NewPassword { get; set; } = null!;
}

/// <summary>
/// Authenticated identity. Deliberately contains NO password_hash and no
/// password material of any kind.
/// </summary>
public class AuthenticatedUserDto
{
    public ulong UserId { get; set; }

    /// <summary>From `users`.full_name.</summary>
    public string Name { get; set; } = null!;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    /// <summary>Home farm, from `users`.farm_id.</summary>
    public ulong FarmId { get; set; }

    public string? FarmName { get; set; }

    public string Status { get; set; } = null!;

    /// <summary>
    /// Role name from users.role_id -> roles. `users` carries a SINGLE role
    /// foreign key (there is no user_roles table), so this list holds at most
    /// one entry; it stays a list so the response contract does not change.
    /// </summary>
    public List<string> Roles { get; set; } = new();
}

/// <summary>POST /api/auth/login response.</summary>
public class LoginResponseDto
{
    public string Token { get; set; } = null!;

    public string TokenType { get; set; } = "Bearer";

    public int ExpiresInSeconds { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    public AuthenticatedUserDto User { get; set; } = null!;
}

