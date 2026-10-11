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
[Route("api/animal-groups")]
[Produces("application/json", new string[] { })]
public class AnimalGroupsController : ControllerBase
{
	private readonly AnimalGroupRepository _repository;

	private readonly ILogger<AnimalGroupsController> _logger;

	private readonly FarmScopeGuard _farmScope;

	public AnimalGroupsController(AnimalGroupRepository repository, ILogger<AnimalGroupsController> logger, FarmScopeGuard farmScope)
	{
		_repository = repository;
		_logger = logger;
		_farmScope = farmScope;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<AnimalGroupDto>), 200)]
	public async Task<ActionResult<IEnumerable<AnimalGroupDto>>> GetGroups([FromQuery] ulong? farmId, [FromQuery] bool activeOnly = false)
	{
		// A supplied farmId is authorized BEFORE it is used as a filter.
		if (farmId.HasValue)
		{
			var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId.Value);
			if (denied is not null) return (ActionResult<IEnumerable<AnimalGroupDto>>)(ActionResult)denied;
		}
		else if (!CurrentUser.TryGetUserId(User, out _))
		{
			// Defence in depth; the class already carries [Authorize].
			return (ActionResult<IEnumerable<AnimalGroupDto>>)Unauthorized(Result.Fail("Authentication is required."));
		}

		try
		{
			return Ok(await _repository.GetAllAsync(farmId, activeOnly));
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Failed to list animal groups");
			return StatusCode(500, Result.Fail("Failed to retrieve animal groups."));
		}
	}

	[HttpGet("{id:long}")]
	[ProducesResponseType(typeof(AnimalGroupDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<AnimalGroupDto>> GetGroup(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			AnimalGroupDto? group = await _repository.GetByIdAsync((ulong)id);
			// Authorize against the group's PERSISTED farm, never a query string.
			if (group != null)
			{
				var denied = await this.EnsureFarmAccessAsync(_farmScope, group.FarmId);
				if (denied is not null) return (ActionResult<AnimalGroupDto>)(ActionResult)denied;
			}
			return (group == null) ? ((ActionResult<AnimalGroupDto>)NotFound(Result.Fail("Animal group not found."))) : ((ActionResult<AnimalGroupDto>)Ok(group));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve animal group {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve animal group."));
		}
	}
}
