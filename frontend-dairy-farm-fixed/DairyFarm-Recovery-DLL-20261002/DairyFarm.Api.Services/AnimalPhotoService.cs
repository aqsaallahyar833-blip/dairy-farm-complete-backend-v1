using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class AnimalPhotoService
{
	public const int MaxBytes = 2097152;

	private static readonly string[] AllowedContentTypes = new string[3] { "image/jpeg", "image/png", "image/webp" };

	private readonly AppDbContext _context;

	private readonly ILogger<AnimalPhotoService> _logger;

	private const int StatusCodes400 = 400;

	public AnimalPhotoService(AppDbContext context, ILogger<AnimalPhotoService> logger)
	{
		_context = context;
		_logger = logger;
	}

	public static string? DetectImageType(ReadOnlySpan<byte> header)
	{
		if (header.Length >= 3 && header[0] == byte.MaxValue && header[1] == 216 && header[2] == byte.MaxValue)
		{
			return "image/jpeg";
		}
		if (header.Length >= 8 && header[0] == 137 && header[1] == 80 && header[2] == 78 && header[3] == 71 && header[4] == 13 && header[5] == 10 && header[6] == 26 && header[7] == 10)
		{
			return "image/png";
		}
		if (header.Length >= 12 && header[0] == 82 && header[1] == 73 && header[2] == 70 && header[3] == 70 && header[8] == 87 && header[9] == 69 && header[10] == 66 && header[11] == 80)
		{
			return "image/webp";
		}
		return null;
	}

	public static bool IsAllowedContentType(string? contentType)
	{
		return contentType != null && AllowedContentTypes.Contains(contentType.Trim().ToLowerInvariant(), StringComparer.Ordinal);
	}

	public static PhotoUploadResult Validate(byte[] bytes, string? declaredContentType)
	{
		if (bytes.Length == 0)
		{
			return new PhotoUploadResult(Success: false, "The uploaded file is empty.", 400);
		}
		if (bytes.Length > 2097152)
		{
			return new PhotoUploadResult(Success: false, $"The image is {(double)bytes.Length / 1024.0 / 1024.0:F2} MB. The maximum is 2 MB. " + "Compress the image and try again.", 413);
		}
		string text = DetectImageType(bytes);
		if (text == null)
		{
			return new PhotoUploadResult(Success: false, "The uploaded content is not a recognised JPEG, PNG or WebP image.", 400);
		}
		if (IsAllowedContentType(declaredContentType) && !string.Equals(declaredContentType.Trim(), text, StringComparison.OrdinalIgnoreCase))
		{
			return new PhotoUploadResult(Success: false, $"The file declares '{declaredContentType}' but its content is '{text}'.", 400);
		}
		string contentType = text;
		int? fileSize = bytes.Length;
		return new PhotoUploadResult(Success: true, null, null, null, contentType, fileSize);
	}

	public async Task<bool> AnimalExistsAsync(ulong animalId, CancellationToken ct)
	{
		return await _context.Animals.AsNoTracking().AnyAsync((Animal a) => a.AnimalId == animalId, ct);
	}

	public async Task<StoredPhoto?> GetPrimaryAsync(ulong animalId, CancellationToken ct)
	{
		AnimalPhoto photo = await (from p in _context.AnimalPhotos.AsNoTracking()
			where p.AnimalId == animalId
			orderby p.IsPrimary descending, p.UploadedAt descending, p.PhotoId descending
			select p).FirstOrDefaultAsync(ct);
		return (photo == null) ? null : new StoredPhoto(photo.AnimalId, photo.ImageData, photo.ContentType, photo.PhotoId);
	}

	public async Task<PhotoUploadResult> SaveAsync(ulong animalId, byte[] bytes, string? declaredContentType, bool makePrimary, ulong? uploadedBy, CancellationToken ct)
	{
		if (!(await AnimalExistsAsync(animalId, ct)))
		{
			return new PhotoUploadResult(Success: false, "Animal not found.", 404);
		}
		PhotoUploadResult validation = Validate(bytes, declaredContentType);
		if (!validation.Success)
		{
			return validation;
		}
		if (makePrimary)
		{
			foreach (AnimalPhoto row in await _context.AnimalPhotos.Where((AnimalPhoto p) => p.AnimalId == animalId && p.IsPrimary).ToListAsync(ct))
			{
				row.IsPrimary = false;
			}
		}
		bool hasAny = await _context.AnimalPhotos.AnyAsync((AnimalPhoto p) => p.AnimalId == animalId, ct);
		AnimalPhoto photo = new AnimalPhoto
		{
			AnimalId = animalId,
			ImageData = bytes,
			ContentType = validation.ContentType,
			FileSize = (uint)bytes.Length,
			IsPrimary = (makePrimary || !hasAny),
			UploadedBy = uploadedBy,
			UploadedAt = DateTime.UtcNow
		};
		_context.AnimalPhotos.Add(photo);
		await _context.SaveChangesAsync(ct);
		_logger.LogInformation("Stored photo {PhotoId} for animal {AnimalId} ({ContentType}, {Bytes} bytes) uploaded by user {UserId}.", photo.PhotoId, animalId, photo.ContentType, photo.FileSize, uploadedBy);
		return new PhotoUploadResult(Success: true, null, 200, photo.PhotoId, photo.ContentType, (int)photo.FileSize);
	}

	public async Task<bool> DeleteAsync(ulong animalId, ulong photoId, CancellationToken ct)
	{
		AnimalPhoto photo = await _context.AnimalPhotos.FirstOrDefaultAsync((AnimalPhoto p) => p.PhotoId == photoId && p.AnimalId == animalId, ct);
		if (photo == null)
		{
			return false;
		}
		_context.AnimalPhotos.Remove(photo);
		await _context.SaveChangesAsync(ct);
		return true;
	}
}
