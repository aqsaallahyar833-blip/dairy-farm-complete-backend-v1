using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public record PhotoUploadResult(
    bool Success,
    string? Error,
    int? StatusCode = null,
    ulong? PhotoId = null,
    string? ContentType = null,
    int? FileSize = null);

public record StoredPhoto(ulong AnimalId, byte[] Bytes, string ContentType, ulong PhotoId);

/// <summary>
/// Animal photo storage backed by the Phase 2A `animal_photos` table
/// (LONGBLOB in MySQL).
///
/// WHY NOT `animals.photo`: that column is varchar(500). A base64 data URL is
/// ~4/3 the size of the raw bytes, so even a modest 1200px JPEG (150-400 KB)
/// is hundreds of times too large. `animals.photo` is RETAINED untouched for
/// backward compatibility but is never written with image data.
///
/// SERVER-SIDE ENFORCEMENT: the browser is not trusted. Both the declared
/// content type and the ACTUAL leading bytes (magic number) are checked, and
/// the size limit is applied to the received stream. A file renamed to .png
/// still has to be a real PNG.
/// </summary>
public class AnimalPhotoService
{
    /// <summary>Hard server-side cap. The browser allows 5 MB; the server does not.</summary>
    public const int MaxBytes = 2 * 1024 * 1024;

    private static readonly string[] AllowedContentTypes =
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly AppDbContext _context;
    private readonly ILogger<AnimalPhotoService> _logger;

    public AnimalPhotoService(AppDbContext context, ILogger<AnimalPhotoService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Sniffs the real image type from the file's magic bytes.
    /// Returns null when the content is not one of the allowed image formats.
    /// </summary>
    public static string? DetectImageType(ReadOnlySpan<byte> header)
    {
        // JPEG: FF D8 FF
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "image/jpeg";
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (header.Length >= 8
            && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
            && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            return "image/png";
        }

        // WebP: "RIFF" .... "WEBP"
        if (header.Length >= 12
            && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            return "image/webp";
        }

        return null;
    }

    public static bool IsAllowedContentType(string? contentType) =>
        contentType is not null
        && AllowedContentTypes.Contains(contentType.Trim().ToLowerInvariant(), StringComparer.Ordinal);

    /// <summary>
    /// Validate bytes that have already been read into memory.
    ///
    /// <paramref name="declaredContentType"/> MUST be the type the client
    /// actually declared (e.g. the multipart part's Content-Type). Passing the
    /// sniffed type here instead would make the mismatch check compare a value
    /// against itself and never fire.
    /// </summary>
    public static PhotoUploadResult Validate(byte[] bytes, string? declaredContentType)
    {
        if (bytes.Length == 0)
        {
            return new PhotoUploadResult(false, "The uploaded file is empty.", StatusCodes400);
        }

        if (bytes.Length > MaxBytes)
        {
            return new PhotoUploadResult(
                false,
                $"The image is {bytes.Length / 1024.0 / 1024.0:F2} MB. The maximum is 2 MB. " +
                "Compress the image and try again.",
                413);
        }

        var actual = DetectImageType(bytes);

        if (actual is null)
        {
            return new PhotoUploadResult(
                false,
                "The uploaded content is not a recognised JPEG, PNG or WebP image.",
                StatusCodes400);
        }

        // The declared type is cross-checked but the sniffed type is what is
        // stored, so a mislabelled upload can never be served as the wrong type.
        if (IsAllowedContentType(declaredContentType)
            && !string.Equals(declaredContentType!.Trim(), actual, StringComparison.OrdinalIgnoreCase))
        {
            return new PhotoUploadResult(
                false,
                $"The file declares '{declaredContentType}' but its content is '{actual}'.",
                StatusCodes400);
        }

        return new PhotoUploadResult(true, null, ContentType: actual, FileSize: bytes.Length);
    }

    private const int StatusCodes400 = 400;

    public async Task<bool> AnimalExistsAsync(ulong animalId, CancellationToken ct) =>
        await _context.Animals.AsNoTracking().AnyAsync(a => a.AnimalId == animalId, ct);

    public async Task<StoredPhoto?> GetPrimaryAsync(ulong animalId, CancellationToken ct)
    {
        var photo = await _context.AnimalPhotos
            .AsNoTracking()
            .Where(p => p.AnimalId == animalId)
            .OrderByDescending(p => p.IsPrimary)
            .ThenByDescending(p => p.UploadedAt)
            .ThenByDescending(p => p.PhotoId)
            .FirstOrDefaultAsync(ct);

        return photo is null
            ? null
            : new StoredPhoto(photo.AnimalId, photo.ImageData, photo.ContentType, photo.PhotoId);
    }

    public async Task<PhotoUploadResult> SaveAsync(
        ulong animalId,
        byte[] bytes,
        string? declaredContentType,
        bool makePrimary,
        ulong? uploadedBy,
        CancellationToken ct)
    {
        if (!await AnimalExistsAsync(animalId, ct))
        {
            return new PhotoUploadResult(false, "Animal not found.", 404);
        }

        // The client-declared type is cross-checked against the sniffed one here.
        // The SNIFFED type is what gets stored, so a mislabelled upload can
        // never be served back under the wrong Content-Type.
        var validation = Validate(bytes, declaredContentType);
        if (!validation.Success)
        {
            return validation;
        }

        // Only one primary per animal.
        if (makePrimary)
        {
            var existing = await _context.AnimalPhotos
                .Where(p => p.AnimalId == animalId && p.IsPrimary)
                .ToListAsync(ct);

            foreach (var row in existing)
            {
                row.IsPrimary = false;
            }
        }

        var hasAny = await _context.AnimalPhotos
            .AnyAsync(p => p.AnimalId == animalId, ct);

        var photo = new AnimalPhoto
        {
            AnimalId = animalId,
            ImageData = bytes,
            ContentType = validation.ContentType!,
            FileSize = (uint)bytes.Length,
            IsPrimary = makePrimary || !hasAny,
            UploadedBy = uploadedBy,
            UploadedAt = DateTime.UtcNow
        };

        _context.AnimalPhotos.Add(photo);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Stored photo {PhotoId} for animal {AnimalId} ({ContentType}, {Bytes} bytes) uploaded by user {UserId}.",
            photo.PhotoId, animalId, photo.ContentType, photo.FileSize, uploadedBy);

        return new PhotoUploadResult(true, null, 200, photo.PhotoId, photo.ContentType, (int)photo.FileSize);
    }

    public async Task<bool> DeleteAsync(ulong animalId, ulong photoId, CancellationToken ct)
    {
        var photo = await _context.AnimalPhotos
            .FirstOrDefaultAsync(p => p.PhotoId == photoId && p.AnimalId == animalId, ct);

        if (photo is null)
        {
            return false;
        }

        _context.AnimalPhotos.Remove(photo);
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
