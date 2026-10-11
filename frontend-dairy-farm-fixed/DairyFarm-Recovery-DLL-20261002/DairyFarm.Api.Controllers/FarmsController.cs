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

	public FarmsController(FarmRepository repository, ILogger<FarmsController> logger)
	{
		_repository = repository;
		_logger = logger;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<FarmDto>), 200)]
	public async Task<ActionResult<IEnumerable<FarmDto>>> GetFarms()
	{
		try
		{
			return Ok(await _repository.GetAllAsync());
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
		try
		{
			FarmDto farm = await _repository.GetByIdAsync((ulong)id);
			return (farm == null) ? ((ActionResult<FarmDto>)NotFound(Result.Fail("Farm not found."))) : ((ActionResult<FarmDto>)Ok(farm));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve farm {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve farm."));
		}
	}
}
