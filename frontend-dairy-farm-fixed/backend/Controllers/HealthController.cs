using DairyFarm.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using DairyFarm.Api.Models;

namespace DairyFarm.Api.Controllers;

/// <summary>
/// Foundation health endpoints. Deliberately the only controller in Phase 1.
/// Module endpoints (animals, milk, health, feed, finance) arrive in later
/// phases and are not stubbed here.
/// </summary>
[ApiController]
public class HealthController : ControllerBase
{
    private readonly DatabaseHealth _databaseHealth;

    public HealthController(DatabaseHealth databaseHealth) => _databaseHealth = databaseHealth;

    /// <summary>GET /health - liveness only. Does not touch the database.</summary>
    [HttpGet("/health")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult GetHealth() => Ok(new
    {
        status = "Healthy",
        service = "Dairy Farm API",
        utc = DateTime.UtcNow
    });

    /// <summary>GET /api/health - readiness including a credentials-safe database probe.</summary>
    [HttpGet("/api/health")]
    public async Task<IActionResult> GetApiHealth(CancellationToken ct)
    {
        var status = await _databaseHealth.CheckAsync(ct);

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
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                Result.Fail("Database connectivity check failed.", payload));
        }

        return Ok(Result.Ok(payload));
    }
}