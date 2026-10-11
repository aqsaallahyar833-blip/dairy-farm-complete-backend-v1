using System;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace DairyFarm.Api.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
	private readonly DatabaseHealth _databaseHealth;

	public HealthController(DatabaseHealth databaseHealth)
	{
		_databaseHealth = databaseHealth;
	}

	[HttpGet("/health")]
	[ApiExplorerSettings(IgnoreApi = true)]
	public IActionResult GetHealth()
	{
		return Ok(new
		{
			status = "Healthy",
			service = "Dairy Farm API",
			utc = DateTime.UtcNow
		});
	}

	[HttpGet("/api/health")]
	public async Task<IActionResult> GetApiHealth(CancellationToken ct)
	{
		DatabaseStatus status = await _databaseHealth.CheckAsync(ct);
		var payload = new
		{
			status = "Healthy",
			service = "Dairy Farm API",
			database = status,
			phase = "Phase 1 - foundation only (no module endpoints yet)",
			utc = DateTime.UtcNow
		};
		if (!status.Connected)
		{
			return StatusCode(503, Result.Fail("Database connectivity check failed.", payload));
		}
		return Ok(Result.Ok(payload));
	}
}
