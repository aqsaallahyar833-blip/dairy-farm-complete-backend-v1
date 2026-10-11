using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/animals/qr")]
[Produces("application/json", new string[] { })]
public class AnimalQrController : ControllerBase
{
	private readonly AnimalQrService _qr;

	private readonly AnimalRepository _read;

	private readonly ILogger<AnimalQrController> _logger;

	public AnimalQrController(AnimalQrService qr, AnimalRepository read, ILogger<AnimalQrController> logger)
	{
		_qr = qr;
		_read = read;
		_logger = logger;
	}

	[HttpGet("{token}")]
	[AllowAnonymous]
	[ProducesResponseType(typeof(AnimalDetailDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Resolve(string token, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(token))
		{
			return BadRequest(Result.Fail("token is required."));
		}
		Animal animal = await _qr.ResolveAsync(token, ct);
		if (animal == null)
		{
			_logger.LogInformation("No animal resolved for a scanned QR token.");
			return NotFound(Result.Fail("No animal matches this QR code."));
		}
		return Ok(Result.Ok(AnimalDetailMapper.Map(animal), "Animal found."));
	}

	[HttpPost("/api/animals/{id:long}/qr")]
	[Authorize]
	[ProducesResponseType(200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ApiResponse<object>>> EnsureToken(long id, CancellationToken ct)
	{
		QrTokenResult result = await _qr.EnsureTokenAsync((ulong)id, ct);
		if (!result.Success)
		{
			return StatusCode(result.StatusCode ?? 404, Result.Fail(result.Error ?? "Failed."));
		}
		return Ok(Result.Ok(new
		{
			animalId = result.AnimalId,
			token = result.Token,
			lookupUrl = "/api/animals/qr/" + result.Token
		}, "QR token ready."));
	}

	[HttpPost("/api/animals/{id:long}/qr/rotate")]
	[Authorize]
	[ProducesResponseType(200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ApiResponse<object>>> Rotate(long id, CancellationToken ct)
	{
		if (await _read.GetByIdAsync((ulong)id) == null)
		{
			return NotFound(Result.Fail("Animal not found."));
		}
		if (!(await _qr.RotateAsync((ulong)id, ct)))
		{
			return Ok(Result.Ok(new
			{
				animalId = id,
				token = (await _qr.EnsureTokenAsync((ulong)id, ct)).Token
			}, "QR token created."));
		}
		QrTokenResult fresh = await _qr.EnsureTokenAsync((ulong)id, ct);
		return Ok(Result.Ok(new
		{
			animalId = id,
			token = fresh.Token,
			lookupUrl = "/api/animals/qr/" + fresh.Token
		}, "QR token rotated."));
	}
}
