using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

/// <summary>Maps `roles`. Name is case-insensitively UNIQUE (uq_roles_name).</summary>
[Table("roles")]
public class Role
{
    [Key, Column("role_id")] public ulong RoleId { get; set; }
    [Column("name"), StringLength(50)] public string Name { get; set; } = string.Empty;
    [Column("description"), StringLength(255)] public string? Description { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
}

/// <summary>Maps `permissions`. Name is UNIQUE (uq_permissions_name), e.g. 'animals.view'.</summary>
[Table("permissions")]
public class Permission
{
    [Key, Column("permission_id")] public ulong PermissionId { get; set; }
    [Column("name"), StringLength(100)] public string Name { get; set; } = string.Empty;
    [Column("module"), StringLength(50)] public string Module { get; set; } = string.Empty;
    [Column("description"), StringLength(255)] public string? Description { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public ICollection<RolePermission> Roles { get; set; } = new List<RolePermission>();
}

/// <summary>Maps `role_permissions`. Composite PK (role_id, permission_id).</summary>
[Table("role_permissions")]
public class RolePermission
{
    [Column("role_id")] public ulong RoleId { get; set; }
    [Column("permission_id")] public ulong PermissionId { get; set; }

    public Role? Role { get; set; }
    public Permission? Permission { get; set; }
}

/// <summary>
/// Maps `users`. Passwords are stored only as an ASP.NET Core PasswordHasher
/// (PBKDF2) hash; the plaintext is never persisted or logged.
/// </summary>
[Table("users")]
public class User
{
    [Key, Column("user_id")] public ulong UserId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("role_id")] public ulong RoleId { get; set; }
    [Column("username"), StringLength(100)] public string Username { get; set; } = string.Empty;
    [Column("password_hash"), StringLength(255)] public string PasswordHash { get; set; } = string.Empty;
    [Column("full_name"), StringLength(150)] public string FullName { get; set; } = string.Empty;
    [Column("email"), StringLength(150)] public string? Email { get; set; }
    [Column("phone"), StringLength(50)] public string? Phone { get; set; }
    [Column("status"), StringLength(20)] public string Status { get; set; } = "ACTIVE";
    [Column("last_login_at")] public DateTime? LastLoginAt { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public Farm? Farm { get; set; }
    public Role? Role { get; set; }
    public ICollection<FarmUserAccess> FarmAccess { get; set; } = new List<FarmUserAccess>();
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
}

/// <summary>Maps `farm_user_access`. Composite PK (user_id, farm_id).</summary>
[Table("farm_user_access")]
public class FarmUserAccess
{
    [Column("user_id")] public ulong UserId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("access_level"), StringLength(20)] public string AccessLevel { get; set; } = "READ";
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
    public Farm? Farm { get; set; }
}

/// <summary>
/// Maps `user_sessions`. session_token is UNIQUE (uq_sessions_token) and is
/// never exposed in API responses.
/// </summary>
[Table("user_sessions")]
public class UserSession
{
    [Key, Column("session_id")] public ulong SessionId { get; set; }
    [Column("user_id")] public ulong UserId { get; set; }
    [Column("session_token"), StringLength(128)] public string SessionToken { get; set; } = string.Empty;
    [Column("expires_at")] public DateTime ExpiresAt { get; set; }
    [Column("revoked_at")] public DateTime? RevokedAt { get; set; }
    [Column("ip_address"), StringLength(64)] public string? IpAddress { get; set; }
    [Column("user_agent"), StringLength(255)] public string? UserAgent { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}

/// <summary>
/// Maps `api_keys`. Only the SHA-256 `key_hash` is stored; the raw key is
/// shown once at creation and never persisted in plaintext.
/// </summary>
[Table("api_keys")]
public class ApiKey
{
    [Key, Column("api_key_id")] public ulong ApiKeyId { get; set; }
    [Column("farm_id")] public ulong FarmId { get; set; }
    [Column("user_id")] public ulong? UserId { get; set; }
    [Column("name"), StringLength(150)] public string Name { get; set; } = string.Empty;
    [Column("key_prefix"), StringLength(16)] public string KeyPrefix { get; set; } = string.Empty;
    [Column("key_hash"), StringLength(64)] public string KeyHash { get; set; } = string.Empty;
    [Column("scopes"), StringLength(500)] public string? Scopes { get; set; }
    [Column("expires_at")] public DateTime? ExpiresAt { get; set; }
    [Column("revoked_at")] public DateTime? RevokedAt { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }

    public Farm? Farm { get; set; }
    public User? User { get; set; }
}