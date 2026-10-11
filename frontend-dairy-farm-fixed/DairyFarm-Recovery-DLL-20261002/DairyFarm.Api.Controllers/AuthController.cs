using System;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json", new string[] { })]
public class AuthController : ControllerBase
{
	private readonly AuthService _auth;

	private readonly ILogger<AuthController> _logger;

	public AuthController(AuthService auth, ILogger<AuthController> logger)
	{
		_auth = auth;
		_logger = logger;
	}

	[HttpPost("login")]
	[AllowAnonymous]
	[ProducesResponseType(typeof(LoginResponseDto), 200)]
	[ProducesResponseType(400)]
	[ProducesResponseType(401)]
	public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginRequest request, CancellationToken ct)
	{
		try
		{
			LoginResponseDto result = await _auth.LoginAsync(request, ct);
			if (result == null)
			{
				return Unauthorized(Result.Fail("Invalid email or password."));
			}
			return Ok(Result.Ok(result, "Login successful."));
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Login failed unexpectedly");
			return StatusCode(500, Result.Fail("Login failed."));
		}
	}

	[HttpGet("me")]
	[Authorize]
	[ProducesResponseType(typeof(AuthenticatedUserDto), 200)]
	[ProducesResponseType(401)]
	public async Task<ActionResult<ApiResponse<AuthenticatedUserDto>>> Me(CancellationToken ct)
	{
		if (!CurrentUser.TryGetUserId(User, out var userId))
		{
			_logger.LogWarning("Authenticated request without a resolvable user id claim.");
			return Unauthorized(Result.Fail("Token does not identify a user."));
		}
		AuthenticatedUserDto user = await _auth.GetUserAsync(userId, ct);
		if (user == null)
		{
			return Unauthorized(Result.Fail("User no longer exists."));
		}
		if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
		{
			return Unauthorized(Result.Fail("Account is not active."));
		}
		return Ok(Result.Ok(user));
	}

	[HttpPost("change-password")]
	[Authorize]
	[ProducesResponseType(200)]
	[ProducesResponseType(400)]
	[ProducesResponseType(401)]
	public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
	{
		if (!CurrentUser.TryGetUserId(User, out var userId))
		{
			return Unauthorized(Result.Fail("Token does not identify a user."));
		}
		AuthService.PasswordChangeOutcome outcome;
		try
		{
			outcome = await _auth.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, ct);
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Password change failed unexpectedly");
			return StatusCode(500, Result.Fail("Password could not be changed."));
		}
		if (outcome != AuthService.PasswordChangeOutcome.Changed)
		{
			return BadRequest(Result.Fail("Password could not be changed."));
		}
		return Ok(Result.Ok(new
		{
			changed = true
		}, "Password changed."));
	}
}
