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

	public AnimalGroupsController(AnimalGroupRepository repository, ILogger<AnimalGroupsController> logger)
	{
		_repository = repository;
		_logger = logger;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<AnimalGroupDto>), 200)]
	public async Task<ActionResult<IEnumerable<AnimalGroupDto>>> GetGroups([FromQuery] ulong? farmId, [FromQuery] bool activeOnly = false)
	{
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
			AnimalGroupDto group = await _repository.GetByIdAsync((ulong)id);
			return (group == null) ? ((ActionResult<AnimalGroupDto>)NotFound(Result.Fail("Animal group not found."))) : ((ActionResult<AnimalGroupDto>)Ok(group));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve animal group {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve animal group."));
		}
	}
}
