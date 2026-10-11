using System.Security.Cryptography;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public record QrTokenResult(
    bool Success,
    string? Error,
    int? StatusCode = null,
    string? Token = null,
    ulong? AnimalId = null);

/// <summary>
/// Server-side QR identity for animals.
///
/// RECONCILED against the canonical schema: the QR token lives in the
/// `animals`.`qr_token` column, which carries a UNIQUE index
/// (uq_animals_qr_token). There is no `animal_identifications` table in this
/// schema and none is invented - the ear tag and RFID number are likewise plain
/// columns (`tag_number`, `rfid_number`).
///
/// WHY NOT THE ANIMAL CODE: codes come from a sequential per-farm counter
/// (AN-002, AN-003, ...), so they are trivially guessable and would let anyone
/// enumerate the herd. The token here is 32 CSPRNG bytes rendered URL-safe,
/// giving 256 bits of entropy.
///
/// UNICITY: uq_animals_qr_token makes duplicates impossible at the database
/// level, so a collision check is kept only to regenerate rather than fail with
/// a constraint violation.
/// </summary>
public class AnimalQrService
{
    /// <summary>Retained for API compatibility: the identifier kind.</summary>
    public const string QrType = "QR";

    private readonly AppDbContext _context;
    private readonly ILogger<AnimalQrService> _logger;

    public AnimalQrService(AppDbContext context, ILogger<AnimalQrService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Returns the animal's QR token, creating one if it has none.</summary>
    public async Task<QrTokenResult> EnsureTokenAsync(ulong animalId, CancellationToken ct)
    {
        var animal = await _context.Animals
            .FirstOrDefaultAsync(a => a.AnimalId == animalId, ct);

        if (animal is null)
        {
            return new QrTokenResult(false, "Animal not found.", 404);
        }

        if (!string.IsNullOrWhiteSpace(animal.QrToken))
        {
            return new QrTokenResult(true, null, 200, animal.QrToken, animalId);
        }

        animal.QrToken = await GenerateUniqueTokenAsync(ct);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Issued a QR token for animal {AnimalId}.", animalId);

        return new QrTokenResult(true, null, 200, animal.QrToken, animalId);
    }

    /// <summary>
    /// Resolves a scanned QR token to a real animal, or null when the token is
    /// unknown. uq_animals_qr_token guarantees at most one match, so no ambiguity
    /// handling is required.
    /// </summary>
    public async Task<Models.Animal?> ResolveAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var candidate = token.Trim();

        return await _context.Animals
            .AsNoTracking()
            .Include(a => a.Breed)
            .Include(a => a.Farm)
            .Include(a => a.Group).ThenInclude(g => g!.Shed)
            .Include(a => a.Dam)
            .Include(a => a.Sire)
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.QrToken == candidate, ct);
    }

    /// <summary>
    /// Issues a new token for an animal that already has one. False when the
    /// animal does not exist or has no token to rotate.
    /// </summary>
    public async Task<bool> RotateAsync(ulong animalId, CancellationToken ct)
    {
        var animal = await _context.Animals
            .FirstOrDefaultAsync(a => a.AnimalId == animalId, ct);

        if (animal is null || string.IsNullOrWhiteSpace(animal.QrToken))
        {
            return false;
        }

        animal.QrToken = await GenerateUniqueTokenAsync(ct);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Rotated the QR token for animal {AnimalId}.", animalId);
        return true;
    }

    private async Task<string> GenerateUniqueTokenAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var token = GenerateToken();

            var clash = await _context.Animals
                .AsNoTracking()
                .AnyAsync(a => a.QrToken == token, ct);

            if (!clash)
            {
                return token;
            }

            _logger.LogWarning("QR token collision on attempt {Attempt}; regenerating.", attempt + 1);
        }

        throw new InvalidOperationException("Unable to generate a unique QR token after 5 attempts.");
    }

    /// <summary>
    /// 32 CSPRNG bytes as unpadded Base64url (43 chars), which fits the
    /// `qr_token` varchar(64) column and is safe in a URL path segment.
    /// </summary>
    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);

        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}