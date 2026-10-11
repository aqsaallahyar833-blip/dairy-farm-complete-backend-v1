using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace DairyFarm.Api.Controllers;

/// <summary>Breeds lookup. Read-only.</summary>
[ApiController]
[Route("api/breeds")]
[Produces("application/json")]
public class BreedsController : ControllerBase
{
    private readonly BreedRepository _repository;
    private readonly ILogger<BreedsController> _logger;

    public BreedsController(BreedRepository repository, ILogger<BreedsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>GET /api/breeds?activeOnly=true</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<BreedDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<BreedDto>>> GetBreeds([FromQuery] bool activeOnly = false)
    {
        try
        {
            return Ok(await _repository.GetAllAsync(activeOnly));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list breeds");
            return StatusCode(StatusCodes.Status500InternalServerError, Result.Fail("Failed to retrieve breeds."));
        }
    }

    /// <summary>GET /api/breeds/by-name/{name} - resolves the name the Animals filter sends.</summary>
    [HttpGet("by-name/{name}")]
    [ProducesResponseType(typeof(BreedDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BreedDto>> GetBreedByName(string name)
    {
        try
        {
            var breed = await _repository.GetByNameAsync(name);
            return breed is null ? NotFound(Result.Fail("Breed not found.")) : Ok(breed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve breed by name");
            return StatusCode(StatusCodes.Status500InternalServerError, Result.Fail("Failed to retrieve breed."));
        }
    }

    /// <summary>GET /api/breeds/{id}</summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(BreedDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BreedDto>> GetBreed(long id)
    {
        if (id <= 0)
        {
            return BadRequest(Result.Fail("id must be a positive number."));
        }

        try
        {
            var breed = await _repository.GetByIdAsync((ulong)id);
            return breed is null ? NotFound(Result.Fail("Breed not found.")) : Ok(breed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve breed {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, Result.Fail("Failed to retrieve breed."));
        }
    }
}
