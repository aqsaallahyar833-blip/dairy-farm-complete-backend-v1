using System;
using System.Collections.Generic;
using System.Threading;
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
[Route("api/animals")]
[Produces("application/json", new string[] { })]
public class AnimalsController : ControllerBase
{
	private readonly AnimalRepository _repository;

	private readonly ILogger<AnimalsController> _logger;

	public AnimalsController(AnimalRepository repository, ILogger<AnimalsController> logger)
	{
		_repository = repository;
		_logger = logger;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<AnimalDto>), 200)]
	public async Task<ActionResult<IEnumerable<AnimalDto>>> GetAnimals([FromQuery] ulong? farmId, [FromQuery] string? status, [FromQuery] string? sex, [FromQuery] ulong? breedId, [FromQuery] ulong? groupId, [FromQuery] string? search, CancellationToken ct)
	{
		try
		{
			List<AnimalDto> animals = await _repository.GetAllAsync(farmId, status, sex, breedId, groupId, search);
			_logger.LogInformation("Returned {Count} animal(s)", animals.Count);
			return Ok(animals);
		}
		catch (OperationCanceledException)
		{
			throw;
		}
		catch (Exception ex2)
		{
			Exception ex3 = ex2;
			_logger.LogError(ex3, "Failed to list animals");
			return StatusCode(500, Result.Fail("Failed to retrieve animals."));
		}
	}

	[HttpGet("by-code/{animalCode}")]
	[ProducesResponseType(typeof(AnimalDetailDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<AnimalDetailDto>> GetAnimalByCode(string animalCode, [FromQuery] ulong? farmId)
	{
		if (string.IsNullOrWhiteSpace(animalCode))
		{
			return BadRequest(Result.Fail("animalCode is required."));
		}
		try
		{
			AnimalDetailDto animal = await _repository.GetByCodeAsync(animalCode, farmId);
			if (animal == null)
			{
				_logger.LogInformation("No animal with code {Code}", animalCode);
				return NotFound(Result.Fail("Animal not found."));
			}
			return Ok(animal);
		}
		catch (OperationCanceledException)
		{
			throw;
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve animal by code");
			return StatusCode(500, Result.Fail("Failed to retrieve animal."));
		}
	}

	[HttpGet("{id:long}/identifications")]
	[ProducesResponseType(typeof(List<AnimalIdentifierDto>), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<IEnumerable<AnimalIdentifierDto>>> GetIdentifications(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			if (await _repository.GetByIdAsync((ulong)id) == null)
			{
				return NotFound(Result.Fail("Animal not found."));
			}
			return Ok(await _repository.GetIdentificationsAsync((ulong)id));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve identifications for animal {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve identifications."));
		}
	}

	[HttpGet("{id:long}/status-history")]
	[ProducesResponseType(typeof(List<AnimalStatusHistoryDto>), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<IEnumerable<AnimalStatusHistoryDto>>> GetStatusHistory(long id)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			if (await _repository.GetByIdAsync((ulong)id) == null)
			{
				return NotFound(Result.Fail("Animal not found."));
			}
			return Ok(await _repository.GetStatusHistoryAsync((ulong)id));
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve status history for animal {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve status history."));
		}
	}

	[HttpGet("{id:long}", Name = "GetAnimalById")]
	[ProducesResponseType(typeof(AnimalDetailDto), 200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<AnimalDetailDto>> GetAnimal(long id, CancellationToken ct)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		try
		{
			AnimalDetailDto animal = await _repository.GetByIdAsync((ulong)id);
			if (animal == null)
			{
				_logger.LogInformation("No animal with id {Id}", id);
				return NotFound(Result.Fail("Animal not found."));
			}
			return Ok(animal);
		}
		catch (OperationCanceledException)
		{
			throw;
		}
		catch (Exception exception)
		{
			_logger.LogError(exception, "Failed to retrieve animal {Id}", id);
			return StatusCode(500, Result.Fail("Failed to retrieve animal."));
		}
	}
}
