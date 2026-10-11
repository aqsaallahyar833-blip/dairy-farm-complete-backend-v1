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
[Route("api/farms")]
[Produces("application/json", new string[] { })]
public class FarmsController : ControllerBase
{
	private readonly FarmRepository _repository;

	private readonly ILogger<FarmsController> _logger;

	private readonly FarmScopeGuard _farmScope;

	public FarmsController(FarmRepository repository, ILogger<FarmsController> logger, FarmScopeGuard farmScope)
	{
		_repository = repository;
		_logger = logger;
		_farmScope = farmScope;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<FarmDto>), 200)]
	public async Task<ActionResult<IEnumerable<FarmDto>>> GetFarms()
	{
		// This endpoint takes no farmId, so the repository would otherwise return
		// EVERY farm to any authenticated caller. The result is filtered down to
		// the farms this identity is actually authorised for (own farm plus any
		// farm_user_access grant). No default farm is ever assumed.
		if (!CurrentUser.TryGetUserId(User, out var callerId))
		{
			return (ActionResult<IEnumerable<FarmDto>>)Unauthorized(Result.Fail("Authentication is required."));
		}

		var allowed = await _farmScope.GetAuthorizedFarmIdsAsync(callerId);

		try
		{
			var all = await _repository.GetAllAsync();
			var scoped = new List<FarmDto>();
			foreach (var f in all)
			{
				if (allowed.Contains(f.FarmId))
				{
					scoped.Add(f);
				}
			}

			return Ok(scoped);
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Failed to list farms");
			return StatusCode(500, Result.Fail("Failed to retrieve farms."));
		}
	}

	[HttpGet("{id:long}")]
	[ProducesResponseType(typeof(FarmDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<FarmDto>> GetFarm(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}

		// The route id IS the farm's own persisted primary key, so it is the
		// authoritative farm identifier - there is no separate ownership lookup.
		// Authorise it before loading so an unauthorised farm yields 403 and
		// never reveals whether the record exists.
		var denied = await this.EnsureFarmAccessAsync(_farmScope, (ulong)id);
		if (denied is not null) return (ActionResult<FarmDto>)(ActionResult)denied;

		try
		{
			FarmDto? farm = await _repository.GetByIdAsync((ulong)id);
			return (farm == null) ? ((ActionResult<FarmDto>)NotFound(Result.Fail("Farm not found."))) : ((ActionResult<FarmDto>)Ok(farm));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve farm {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve farm."));
		}
	}
}
