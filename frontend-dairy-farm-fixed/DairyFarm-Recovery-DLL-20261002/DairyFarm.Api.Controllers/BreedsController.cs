using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/breeds")]
[Produces("application/json", new string[] { })]
public class BreedsController : ControllerBase
{
	private readonly BreedRepository _repository;

	private readonly ILogger<BreedsController> _logger;

	public BreedsController(BreedRepository repository, ILogger<BreedsController> logger)
	{
		_repository = repository;
		_logger = logger;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<BreedDto>), 200)]
	public async Task<ActionResult<IEnumerable<BreedDto>>> GetBreeds([FromQuery] bool activeOnly = false)
	{
		try
		{
			return Ok(await _repository.GetAllAsync(activeOnly));
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Failed to list breeds");
			return StatusCode(500, Result.Fail("Failed to retrieve breeds."));
		}
	}

	[HttpGet("by-name/{name}")]
	[ProducesResponseType(typeof(BreedDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<BreedDto>> GetBreedByName(string name)
	{
		try
		{
			BreedDto breed = await _repository.GetByNameAsync(name);
			return (breed == null) ? ((ActionResult<BreedDto>)NotFound(Result.Fail("Breed not found."))) : ((ActionResult<BreedDto>)Ok(breed));
		}
		catch (Exception ex)
		{
			Exception ex2 = ex;
			_logger.LogError(ex2, "Failed to retrieve breed by name");
			return StatusCode(500, Result.Fail("Failed to retrieve breed."));
		}
	}

	[HttpGet("{id:long}")]
	[ProducesResponseType(typeof(BreedDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<BreedDto>> GetBreed(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			BreedDto breed = await _repository.GetByIdAsync((ulong)id);
			return (breed == null) ? ((ActionResult<BreedDto>)NotFound(Result.Fail("Breed not found."))) : ((ActionResult<BreedDto>)Ok(breed));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve breed {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve breed."));
		}
	}
}
