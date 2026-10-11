using DairyFarm.Api.DTOs;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

/// <summary>
/// Animals WRITE endpoints. All require a valid JWT bearer token.
///
/// The Phase 1 read endpoints live in the same route family and remain public.
///
/// THERE IS NO DELETE ENDPOINT, BY DESIGN.
///   `trg_animals_no_delete` already rejects every DELETE at the database with
///   SIGNAL 45000 'Animals cannot be deleted. Change animal status instead.'
///   Retirement is a status change through PATCH /api/animals/{id}/status, so a
///   sold or dead animal stays in the database and remains historically
///   available.
/// </summary>
[ApiController]
[Route("api/animals")]
[Authorize]
[Produces("application/json")]
public class AnimalsWriteController : ControllerBase
{
    private readonly AnimalWriteService _write;
    private readonly AnimalStatusService _status;
    private readonly AnimalPhotoService _photos;
    private readonly AnimalRepository _read;
    private readonly ILogger<AnimalsWriteController> _logger;
    private readonly FarmScopeGuard _farmScope;

    public AnimalsWriteController(
        AnimalWriteService write,
        AnimalStatusService status,
        AnimalPhotoService photos,
        AnimalRepository read,
        ILogger<AnimalsWriteController> logger,
        FarmScopeGuard farmScope)
    {
        _write = write;
        _status = status;
        _photos = photos;
        _read = read;
        _logger = logger;
        _farmScope = farmScope;
    }

    /// <summary>
    /// Authorizes the PERSISTED farm of an existing animal before any operation
    /// that reads or mutates it. Ownership always comes from the stored row,
    /// never from a client-supplied value.
    /// </summary>
    private async Task<bool> AuthorizePersistedAnimalAsync(long id, CancellationToken ct)
    {
        if (id <= 0) return true; // let the endpoint's own 400 handle it

        var animal = await _read.GetByIdAsync((ulong)id);
        if (animal is null) return true; // let the endpoint's own 404 handle it

        var denied = await this.EnsureFarmAccessAsync(_farmScope, animal.FarmId, ct);
        return denied is null;
    }

    /// <summary>
    /// POST /api/animals - create an animal.
    ///
    /// The animal_code is allocated from `animal_code_sequences` unless the
    /// caller supplies one. The AFTER INSERT status-history trigger writes the
    /// initial row, attributed to the authenticated user via @app_user_id.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AnimalDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Create(
        [FromBody] CreateAnimalRequest request,
        CancellationToken ct)
    {
        if (!CurrentUser.TryGetUserId(User, out var userId))
        {
            return Unauthorized(Result.Fail("Token does not identify a user."));
        }

        // The animal is created INTO request.FarmId, so that farm must be one
        // this identity may actually manage. No default-farm substitution.
        var deniedFarm = await this.EnsureFarmAccessAsync(_farmScope, (ulong)request.FarmId, ct);
        if (deniedFarm is not null) return (ActionResult<ApiResponse<AnimalDetailDto>>)(ActionResult)deniedFarm;

        // CreateAsync runs the whole insert on one connection inside one
        // transaction with @app_user_id set, so the AFTER INSERT
        // status-history trigger attributes the initial row to this user.
        var result = await _write.CreateAsync(request, userId, ct);

        return result.Outcome switch
        {
            AnimalWriteOutcome.Created => CreatedAtRoute(
                "GetAnimalById",
                new { id = result.Animal!.AnimalId },
                Result.Ok(result.Animal, $"Animal created with code '{result.Animal.AnimalCode}'.")),
            AnimalWriteOutcome.DuplicateCode => Conflict(Result.Fail(result.Message ?? "Duplicate animal code.")),
            _ => BadRequest(Result.Fail("Validation failed.", result.Errors))
        };
    }

    /// <summary>
    /// PUT /api/animals/{id} - partial update.
    ///
    /// The route takes the NUMERIC database primary key (animal_id), which is
    /// deliberately different from the frontend's `animal.animalId`, which holds
    /// the animal CODE. Status changes are rejected here.
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(AnimalDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> Update(
        long id,
        [FromBody] UpdateAnimalRequest request,
        CancellationToken ct)
    {
        if (id <= 0)
        {
            return BadRequest(Result.Fail("id must be a positive number."));
        }

        // Authorize the PERSISTED animal's farm before mutating it.
        if (!await AuthorizePersistedAnimalAsync(id, ct))
        {
            return (ActionResult<ApiResponse<AnimalDetailDto>>)(ActionResult)
                StatusCode(StatusCodes.Status403Forbidden,
                    Result.Fail("You are not authorised to access this farm."));
        }

        var result = await _write.UpdateAsync((ulong)id, request, ct);

        return result.Outcome switch
        {
            AnimalWriteOutcome.AnimalNotFound => NotFound(Result.Fail("Animal not found.")),
            AnimalWriteOutcome.ValidationFailed => BadRequest(Result.Fail("Validation failed.", result.Errors)),
            AnimalWriteOutcome.DuplicateCode => Conflict(Result.Fail(result.Message ?? "Duplicate animal code.")),
            AnimalWriteOutcome.StatusChangeNotPermitted => BadRequest(Result.Fail(result.Message!)),
            _ => Ok(Result.Ok(result.Animal, "Animal updated."))
        };
    }

    /// <summary>
    /// PATCH /api/animals/{id}/status - the lifecycle operation.
    ///
    /// The database trigger writes the history row (old status, new status,
    /// timestamp and user id); the application then fills in the reason the
    /// trigger leaves NULL, on the same connection and inside the same
    /// transaction.
    /// </summary>
    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(typeof(AnimalDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AnimalDetailDto>>> ChangeStatus(
        long id,
        [FromBody] StatusChangeRequest request,
        CancellationToken ct)
    {
        if (id <= 0)
        {
            return BadRequest(Result.Fail("id must be a positive number."));
        }

        if (!CurrentUser.TryGetUserId(User, out var userId))
        {
            return Unauthorized(Result.Fail("Token does not identify a user."));
        }

        // Authorize the PERSISTED animal's farm before the lifecycle change.
        if (!await AuthorizePersistedAnimalAsync(id, ct))
        {
            return (ActionResult<ApiResponse<AnimalDetailDto>>)(ActionResult)
                StatusCode(StatusCodes.Status403Forbidden,
                    Result.Fail("You are not authorised to access this farm."));
        }

        var outcome = await _status.ChangeStatusAsync((ulong)id, request.Status, request.Reason, userId, ct);

        switch (outcome)
        {
            case StatusChangeOutcome.AnimalNotFound:
                return NotFound(Result.Fail("Animal not found."));

            case StatusChangeOutcome.SameStatus:
                return BadRequest(Result.Fail(
                    $"The animal is already {request.Status.Trim().ToUpperInvariant()}. " +
                    "No change was made."));

            default:
                var animal = await _read.GetByIdAsync((ulong)id);
                return Ok(Result.Ok(animal, "Animal status updated."));
        }
    }

    /// <summary>
    /// POST /api/animals/{id}/photo - upload an image.
    ///
    /// The bytes go to `animal_photos` (LONGBLOB). `animals.photo` is never
    /// written with image data - it is varchar(500) and cannot hold one.
    /// </summary>
    [HttpPost("{id:long}/photo")]
    // Deliberately above MaxBytes so an oversized-but-plausible upload reaches
    // this handler and gets an explicit 413 with a readable message, rather than
    // being rejected by the server's request-size limit with a bare 400.
    [RequestSizeLimit(AnimalPhotoService.MaxBytes * 4)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    public async Task<IActionResult> UploadPhoto(
        long id,
        IFormFile? file,
        [FromQuery] bool makePrimary = true,
        CancellationToken ct = default)
    {
        if (id <= 0)
        {
            return BadRequest(Result.Fail("id must be a positive number."));
        }

        if (!CurrentUser.TryGetUserId(User, out var userId))
        {
            return Unauthorized(Result.Fail("Token does not identify a user."));
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(Result.Fail("No image file was supplied. Send multipart/form-data with a 'file' field."));
        }

        if (file.Length > AnimalPhotoService.MaxBytes)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge, Result.Fail(
                $"The image is {file.Length / 1024.0 / 1024.0:F2} MB. The maximum is 2 MB. " +
                "Compress the image and try again."));
        }

        // Authorize the PERSISTED animal's farm before storing an image against it.
        if (!await AuthorizePersistedAnimalAsync(id, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                Result.Fail("You are not authorised to access this farm."));
        }

        byte[] bytes;
        using (var buffer = new MemoryStream())
        {
            await file.CopyToAsync(buffer, ct);
            bytes = buffer.ToArray();
        }

        // The declared content type is only a hint; the real type is determined
        // from the file's magic bytes by AnimalPhotoService. Both are passed so
        // a PNG declared as image/jpeg is rejected rather than silently stored.
        var result = await _photos.SaveAsync((ulong)id, bytes, file.ContentType, makePrimary, userId, ct);

        if (!result.Success)
        {
            var status = result.StatusCode ?? StatusCodes.Status400BadRequest;
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

    /// <summary>
    /// GET /api/animals/{id}/photo - stream the stored image bytes.
    ///
    /// Returns the raw image, not a base64 string, so the payload stays small
    /// and the response can be cached and rendered directly by an img tag.
    /// </summary>
    [HttpGet("{id:long}/photo")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPhoto(long id, CancellationToken ct)
    {
        if (id <= 0)
        {
            return BadRequest(Result.Fail("id must be a positive number."));
        }

        var photo = await _photos.GetPrimaryAsync((ulong)id, ct);

        if (photo is null)
        {
            return NotFound(Result.Fail("No photo has been uploaded for this animal."));
        }

        return File(photo.Bytes, photo.ContentType);
    }

    /// <summary>DELETE /api/animals/{id}/photo - removes one photo (not the animal).</summary>
    [HttpDelete("{id:long}/photo/{photoId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> DeletePhoto(long id, long photoId, CancellationToken ct)
    {
        // Authorize the PERSISTED animal's farm before removing its photo.
        if (!await AuthorizePersistedAnimalAsync(id, ct))
        {
            return (ActionResult<ApiResponse<object>>)(ActionResult)
                StatusCode(StatusCodes.Status403Forbidden,
                    Result.Fail("You are not authorised to access this farm."));
        }

        var removed = await _photos.DeleteAsync((ulong)id, (ulong)photoId, ct);

        return removed
            ? Ok(Result.Ok(new { photoId, removed = true }, "Photo deleted."))
            : NotFound(Result.Fail("Photo not found for this animal."));
    }
}
