using System.IO;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/animals")]
[Authorize]
[Produces("application/json", new string[] { })]
public class AnimalsWriteController : ControllerBase
{
	private readonly AnimalWriteService _write;

	private readonly AnimalStatusService _status;

	private readonly AnimalPhotoService _photos;

	private readonly AnimalRepository _read;

	private readonly ILogger<AnimalsWriteController> _logger;

	public AnimalsWriteController(AnimalWriteService write, AnimalStatusService status, AnimalPhotoService photos, AnimalRepository read, ILogger<AnimalsWriteController> logger)
	{
		_write = write;
		_status = status;
		_photos = photos;
		_read = read;
		_logger = logger;
	}

	[HttpPost]
	[ProducesResponseType(typeof(AnimalDetailDto), 201)]
	[ProducesResponseType(400)]
	[ProducesResponseType(401)]
	[ProducesResponseType(409)]
	public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Create([FromBody] CreateAnimalRequest request, CancellationToken ct)
	{
		if (!CurrentUser.TryGetUserId(User, out var userId))
		{
			return Unauthorized(Result.Fail("Token does not identify a user."));
		}
		AnimalWriteResult result = await _write.CreateAsync(request, userId, ct);
		AnimalWriteOutcome outcome = result.Outcome;
		if (1 == 0)
		{
		}
		ActionResult<ApiResponse<AnimalDetailDto>> result2 = outcome switch
		{
			AnimalWriteOutcome.Created => (ActionResult<ApiResponse<AnimalDetailDto>>)CreatedAtRoute("GetAnimalById", new
			{
				id = result.Animal.AnimalId
			}, Result.Ok(result.Animal, "Animal created with code '" + result.Animal.AnimalCode + "'.")), 
			AnimalWriteOutcome.DuplicateCode => Conflict(Result.Fail(result.Message ?? "Duplicate animal code.")), 
			_ => BadRequest(Result.Fail("Validation failed.", result.Errors)), 
		};
		if (1 == 0)
		{
		}
		return result2;
	}

	[HttpPut("{id:long}")]
	[ProducesResponseType(typeof(AnimalDetailDto), 200)]
	[ProducesResponseType(400)]
	[ProducesResponseType(404)]
	[ProducesResponseType(409)]
	public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Update(long id, [FromBody] UpdateAnimalRequest request, CancellationToken ct)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		AnimalWriteResult result = await _write.UpdateAsync((ulong)id, request, ct);
		AnimalWriteOutcome outcome = result.Outcome;
		if (1 == 0)
		{
		}
		ActionResult<ApiResponse<AnimalDetailDto>> result2 = outcome switch
		{
			AnimalWriteOutcome.AnimalNotFound => (ActionResult<ApiResponse<AnimalDetailDto>>)NotFound(Result.Fail("Animal not found.")), 
			AnimalWriteOutcome.ValidationFailed => BadRequest(Result.Fail("Validation failed.", result.Errors)), 
			AnimalWriteOutcome.DuplicateCode => Conflict(Result.Fail(result.Message ?? "Duplicate animal code.")), 
			AnimalWriteOutcome.StatusChangeNotPermitted => BadRequest(Result.Fail(result.Message)), 
			_ => Ok(Result.Ok(result.Animal, "Animal updated.")), 
		};
		if (1 == 0)
		{
		}
		return result2;
	}

	[HttpPatch("{id:long}/status")]
	[ProducesResponseType(typeof(AnimalDetailDto), 200)]
	[ProducesResponseType(400)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> ChangeStatus(long id, [FromBody] StatusChangeRequest request, CancellationToken ct)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		if (!CurrentUser.TryGetUserId(User, out var userId))
		{
			return Unauthorized(Result.Fail("Token does not identify a user."));
		}
		return await _status.ChangeStatusAsync((ulong)id, request.Status, request.Reason, userId, ct) switch
		{
			StatusChangeOutcome.AnimalNotFound => (ActionResult<ApiResponse<AnimalDetailDto>>)NotFound(Result.Fail("Animal not found.")), 
			StatusChangeOutcome.SameStatus => BadRequest(Result.Fail("The animal is already " + request.Status.Trim().ToUpperInvariant() + ". No change was made.")), 
			_ => Ok(Result.Ok(await _read.GetByIdAsync((ulong)id), "Animal status updated.")), 
		};
	}

	[HttpPost("{id:long}/photo")]
	[RequestSizeLimit(8388608L)]
	[ProducesResponseType(200)]
	[ProducesResponseType(400)]
	[ProducesResponseType(401)]
	[ProducesResponseType(404)]
	[ProducesResponseType(413)]
	public async Task<IActionResult> UploadPhoto(long id, IFormFile? file, [FromQuery] bool makePrimary = true, CancellationToken ct = default(CancellationToken))
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		if (!CurrentUser.TryGetUserId(User, out var userId))
		{
			return Unauthorized(Result.Fail("Token does not identify a user."));
		}
		if (file == null || file.Length == 0)
		{
			return BadRequest(Result.Fail("No image file was supplied. Send multipart/form-data with a 'file' field."));
		}
		if (file.Length > 2097152)
		{
			return StatusCode(413, Result.Fail($"The image is {(double)file.Length / 1024.0 / 1024.0:F2} MB. The maximum is 2 MB. " + "Compress the image and try again."));
		}
		byte[] bytes;
		using (MemoryStream buffer = new MemoryStream())
		{
			await file.CopyToAsync(buffer, ct);
			bytes = buffer.ToArray();
		}
		PhotoUploadResult result = await _photos.SaveAsync((ulong)id, bytes, file.ContentType, makePrimary, userId, ct);
		if (!result.Success)
		{
			int status = result.StatusCode ?? 400;
			return StatusCode(status, Result.Fail(result.Error ?? "Photo rejected."));
		}
		return Ok(Result.Ok(new
		{
			photoId = result.PhotoId,
			animalId = id,
			fileType = result.ContentType,
			fileSize = result.FileSize,
			url = $"/api/animals/{id}/photo"
		}, "Photo uploaded."));
	}

	[HttpGet("{id:long}/photo")]
	[AllowAnonymous]
	[ProducesResponseType(200)]
	[ProducesResponseType(404)]
	public async Task<IActionResult> GetPhoto(long id, CancellationToken ct)
	{
		if (id <= 0)
		{
			return BadRequest(Result.Fail("id must be a positive number."));
		}
		StoredPhoto photo = await _photos.GetPrimaryAsync((ulong)id, ct);
		if ((object)photo == null)
		{
			return NotFound(Result.Fail("No photo has been uploaded for this animal."));
		}
		return File(photo.Bytes, photo.ContentType);
	}

	[HttpDelete("{id:long}/photo/{photoId:long}")]
	[ProducesResponseType(200)]
	[ProducesResponseType(404)]
	public async Task<ActionResult<ApiResponse<object>>> DeletePhoto(long id, long photoId, CancellationToken ct)
	{
		return (await _photos.DeleteAsync((ulong)id, (ulong)photoId, ct)) ? ((ActionResult<ApiResponse<object>>)Ok(Result.Ok(new
		{
			photoId = photoId,
			removed = true
		}, "Photo deleted."))) : ((ActionResult<ApiResponse<object>>)NotFound(Result.Fail("Photo not found for this animal.")));
	}
}
