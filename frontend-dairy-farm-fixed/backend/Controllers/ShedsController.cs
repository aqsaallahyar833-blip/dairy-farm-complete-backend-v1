using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/sheds")]
[Produces("application/json", new string[] { })]
public class ShedsController : ControllerBase
{
	private readonly ShedRepository _repository;

	private readonly ILogger<ShedsController> _logger;

	private readonly FarmScopeGuard _farmScope;

	public ShedsController(ShedRepository repository, ILogger<ShedsController> logger, FarmScopeGuard farmScope)
	{
		_repository = repository;
		_logger = logger;
		_farmScope = farmScope;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<ShedDto>), 200)]
	public async Task<ActionResult<IEnumerable<ShedDto>>> GetSheds([FromQuery] ulong? farmId)
	{
		// A supplied farmId is authorized BEFORE it is used as a filter.
		if (farmId.HasValue)
		{
			var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId.Value);
			if (denied is not null) return (ActionResult<IEnumerable<ShedDto>>)(ActionResult)denied;
		}
		else if (!CurrentUser.TryGetUserId(User, out _))
		{
			// Defence in depth; the class already carries [Authorize].
			return (ActionResult<IEnumerable<ShedDto>>)Unauthorized(Result.Fail("Authentication is required."));
		}

		try
		{
			return Ok(await _repository.GetAllAsync(farmId));
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Failed to list sheds");
			return StatusCode(500, Result.Fail("Failed to retrieve sheds."));
		}
	}

	[HttpGet("{id:long}")]
	[ProducesResponseType(typeof(ShedDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ShedDto>> GetShed(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			ShedDto? shed = await _repository.GetByIdAsync((ulong)id);
			// Authorize against the shed's PERSISTED farm, never a query string.
			if (shed != null)
			{
				var denied = await this.EnsureFarmAccessAsync(_farmScope, shed.FarmId);
				if (denied is not null) return (ActionResult<ShedDto>)(ActionResult)denied;
			}
			return (shed == null) ? ((ActionResult<ShedDto>)NotFound(Result.Fail("Shed not found."))) : ((ActionResult<ShedDto>)Ok(shed));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve shed {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve shed."));
		}
	}
}
