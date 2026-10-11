using System.Globalization;
using System.Security.Claims;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DairyFarm.Api.Controllers;

/// <summary>
/// Authentication endpoints for the existing `users` / `roles` tables.
///
/// POST /api/auth/login is deliberately PUBLIC.
/// GET  /api/auth/me requires a valid bearer token.
///
/// The response never contains the password or the password hash.
/// </summary>
[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService auth, ILogger<AuthController> logger)
    {
        _auth = auth;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/auth/login
    /// Exchanges email + password for a short-lived JWT.
    /// Returns 401 for any failure, with an identical body for every cause.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _auth.LoginAsync(request, ct);

            if (result is null)
            {
                // Deliberately vague. Distinguishing "no such user" from
                // "wrong password" would let anyone enumerate accounts.
                return Unauthorized(Result.Fail("Invalid email or password."));
            }

            return Ok(Result.Ok(result, "Login successful."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed unexpectedly");
            return StatusCode(StatusCodes.Status500InternalServerError,
                Result.Fail("Login failed."));
        }
    }

    /// <summary>GET /api/auth/me - the currently authenticated user.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(AuthenticatedUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AuthenticatedUserDto>>> Me(CancellationToken ct)
    {
        if (!CurrentUser.TryGetUserId(User, out var userId))
        {
            // Reached only if a token authenticated but carried no usable
            // NameIdentifier claim, which the issuer never produces.
            _logger.LogWarning("Authenticated request without a resolvable user id claim.");
            return Unauthorized(Result.Fail("Token does not identify a user."));
        }

        var user = await _auth.GetUserAsync(userId, ct);
        if (user is null)
        {
            // The account was removed after the token was issued.
            return Unauthorized(Result.Fail("User no longer exists."));
        }

        if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(Result.Fail("Account is not active."));
        }

        return Ok(Result.Ok(user));
    }

    /// <summary>
    /// POST /api/auth/change-password
    ///
    /// Changes the AUTHENTICATED caller's own password. The current password must
    /// verify first, so a stolen bearer token alone cannot take the account over.
    ///
    /// Failures are deliberately indistinguishable: a wrong current password, a
    /// new password that matches the old one, and a missing account all return
    /// the same 400 body, so the endpoint cannot be used to probe how close a
    /// guess was.
    ///
    /// SESSION NOTE: this API issues stateless JWTs and the bearer handler checks
    /// only signature/issuer/audience/expiry, so a token issued BEFORE this call
    /// remains valid until it expires on its own (Jwt:ExpiryMinutes, 60 minutes
    /// by default). The `user_sessions` table is not part of the token pipeline.
    /// Changing the password therefore stops all FUTURE sign-ins with the old
    /// secret immediately, but does not retroactively kill an already-issued
    /// token.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        if (!CurrentUser.TryGetUserId(User, out var userId))
        {
            return Unauthorized(Result.Fail("Token does not identify a user."));
        }

        AuthService.PasswordChangeOutcome outcome;
        try
        {
            outcome = await _auth.ChangePasswordAsync(
                userId, request.CurrentPassword, request.NewPassword, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Password change failed unexpectedly");
            return StatusCode(StatusCodes.Status500InternalServerError,
                Result.Fail("Password could not be changed."));
        }

        if (outcome != AuthService.PasswordChangeOutcome.Changed)
        {
            // One generic message for every rejection reason.
            return BadRequest(Result.Fail("Password could not be changed."));
        }

        return Ok(Result.Ok(new { changed = true }, "Password changed."));
    }
}

/// <summary>
/// Reads the authenticated caller's user id from the JWT.
///
/// The id is used two ways:
///   1. as a claim for authorisation decisions, and
///   2. as the value written to the MySQL session variable @app_user_id so the
///      EXISTING status-history triggers attribute their rows (see
///      AnimalStatusService).
/// </summary>
public static class CurrentUser
{
    /// <summary>
    /// User id of the caller, or null when the request is anonymous.
    /// </summary>
    public static ulong? GetUserId(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var raw = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? principal.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return ulong.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
            ? id
            : null;
    }

    public static bool TryGetUserId(ClaimsPrincipal principal, out ulong userId)
    {
        var id = GetUserId(principal);
        userId = id ?? 0UL;
        return id.HasValue;
    }
}
