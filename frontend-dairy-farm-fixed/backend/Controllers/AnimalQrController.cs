using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DairyFarm.Api.Controllers;

/// <summary>
/// QR endpoints backed by `animal_identifications` (type = 'QR') and the real
/// `dairy_farm` database.
///
/// This replaces the fabricated QR implementation that read from
/// server/data/mysql_animals.json, where tokens were deterministic SHA-256
/// hashes of the animal code - guessable and not backed by any database row.
/// </summary>
[ApiController]
[Route("api/animals/qr")]
[Produces("application/json")]
public class AnimalQrController : ControllerBase
{
    private readonly AnimalQrService _qr;
    private readonly AnimalRepository _read;
    private readonly ILogger<AnimalQrController> _logger;

    public AnimalQrController(
        AnimalQrService qr,
        AnimalRepository read,
        ILogger<AnimalQrController> logger)
    {
        _qr = qr;
        _read = read;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/animals/qr/{token} - resolve a scanned QR token to a real animal.
    ///
    /// Public, because a QR code is scanned with an ordinary phone camera and
    /// the resulting page must load before anyone has signed in. The response
    /// is a real database animal; no fabricated record is ever returned.
    ///
    /// Declared before the numeric routes below so a token can never be parsed
    /// as an id.
    /// </summary>
    [HttpGet("{token}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AnimalDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Resolve(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(Result.Fail("token is required."));
        }

        var animal = await _qr.ResolveAsync(token, ct);

        if (animal is null)
        {
            _logger.LogInformation("No animal resolved for a scanned QR token.");
            return NotFound(Result.Fail("No animal matches this QR code."));
        }

        return Ok(Result.Ok(AnimalDetailMapper.Map(animal), "Animal found."));
    }

    /// <summary>
    /// POST /api/animals/{id}/qr - issue the animal's QR token, creating one on
    /// first request. Requires authentication.
    /// </summary>
    [HttpPost("/api/animals/{id:long}/qr")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> EnsureToken(long id, CancellationToken ct)
    {
        var result = await _qr.EnsureTokenAsync((ulong)id, ct);

        if (!result.Success)
        {
            return StatusCode(result.StatusCode ?? StatusCodes.Status404NotFound,
                Result.Fail(result.Error ?? "Failed."));
        }

        return Ok(Result.Ok(new
        {
            animalId = result.AnimalId,
            token = result.Token,
            lookupUrl = $"/api/animals/qr/{result.Token}"
        }, "QR token ready."));
    }

    /// <summary>
    /// POST /api/animals/{id}/qr/rotate - invalidate the current token and issue
    /// a new one. Use when a printed tag is lost or replaced.
    /// </summary>
    [HttpPost("/api/animals/{id:long}/qr/rotate")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> Rotate(long id, CancellationToken ct)
    {
        var animal = await _read.GetByIdAsync((ulong)id);
        if (animal is null)
        {
            return NotFound(Result.Fail("Animal not found."));
        }

        if (!await _qr.RotateAsync((ulong)id, ct))
        {
            // No token yet - just issue one.
            var created = await _qr.EnsureTokenAsync((ulong)id, ct);
            return Ok(Result.Ok(new { animalId = id, token = created.Token }, "QR token created."));
        }

        var fresh = await _qr.EnsureTokenAsync((ulong)id, ct);

        return Ok(Result.Ok(new
        {
            animalId = id,
            token = fresh.Token,
            lookupUrl = $"/api/animals/qr/{fresh.Token}"
        }, "QR token rotated."));
    }
}
