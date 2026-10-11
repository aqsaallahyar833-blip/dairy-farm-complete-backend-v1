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

	private readonly FarmScopeGuard _farmScope;

	public AnimalsController(AnimalRepository repository, ILogger<AnimalsController> logger, FarmScopeGuard farmScope)
	{
		_repository = repository;
		_logger = logger;
		_farmScope = farmScope;
	}

	[HttpGet]
	[ProducesResponseType(typeof(List<AnimalDto>), 200)]
	public async Task<ActionResult<IEnumerable<AnimalDto>>> GetAnimals([FromQuery] ulong? farmId, [FromQuery] string? status, [FromQuery] string? sex, [FromQuery] ulong? breedId, [FromQuery] ulong? groupId, [FromQuery] string? search, CancellationToken ct)
	{
		// A supplied farmId is authorized BEFORE it becomes a repository filter.
		if (farmId.HasValue)
		{
			var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId.Value, ct);
			if (denied is not null) return (ActionResult<IEnumerable<AnimalDto>>)(ActionResult)denied;
		}
		else if (!CurrentUser.TryGetUserId(User, out _))
		{
			// Defence in depth; the class already carries [Authorize].
			return (ActionResult<IEnumerable<AnimalDto>>)Unauthorized(Result.Fail("Authentication is required."));
		}

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
			AnimalDetailDto? animal = await _repository.GetByCodeAsync(animalCode, farmId);
			if (animal == null)
			{
				_logger.LogInformation("No animal with code {Code}", animalCode);
				return NotFound(Result.Fail("Animal not found."));
			}
			// Authorize the animal's PERSISTED farm, not the query parameter.
			var deniedByCode = await this.EnsureFarmAccessAsync(_farmScope, animal.FarmId);
			if (deniedByCode is not null) return (ActionResult<AnimalDetailDto>)(ActionResult)deniedByCode;
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
			AnimalDetailDto? animal = await _repository.GetByIdAsync((ulong)id);
			if (animal != null)
			{
				var deniedId = await this.EnsureFarmAccessAsync(_farmScope, animal.FarmId);
				if (deniedId is not null) return (ActionResult<IEnumerable<AnimalIdentifierDto>>)(ActionResult)deniedId;
			}
			else
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
			AnimalDetailDto? animal = await _repository.GetByIdAsync((ulong)id);
			if (animal != null)
			{
				var deniedHist = await this.EnsureFarmAccessAsync(_farmScope, animal.FarmId);
				if (deniedHist is not null) return (ActionResult<IEnumerable<AnimalStatusHistoryDto>>)(ActionResult)deniedHist;
			}
			else
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
			AnimalDetailDto? animal = await _repository.GetByIdAsync((ulong)id);
			if (animal == null)
			{
				_logger.LogInformation("No animal with id {Id}", id);
				return NotFound(Result.Fail("Animal not found."));
			}
			// Authorize the animal's PERSISTED farm before disclosing it.
			var deniedById = await this.EnsureFarmAccessAsync(_farmScope, animal.FarmId, ct);
			if (deniedById is not null) return (ActionResult<AnimalDetailDto>)(ActionResult)deniedById;
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
