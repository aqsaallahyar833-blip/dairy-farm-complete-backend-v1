using System;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class AnimalQrService
{
	public const string QrType = "QR";

	private readonly AppDbContext _context;

	private readonly ILogger<AnimalQrService> _logger;

	public AnimalQrService(AppDbContext context, ILogger<AnimalQrService> logger)
	{
		_context = context;
		_logger = logger;
	}

	public async Task<QrTokenResult> EnsureTokenAsync(ulong animalId, CancellationToken ct)
	{
		Animal animal = await _context.Animals.FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId, ct);
		if (animal == null)
		{
			return new QrTokenResult(Success: false, "Animal not found.", 404);
		}
		if (!string.IsNullOrWhiteSpace(animal.QrToken))
		{
			return new QrTokenResult(Success: true, null, 200, animal.QrToken, animalId);
		}
		Animal animal2 = animal;
		animal2.QrToken = await GenerateUniqueTokenAsync(ct);
		await _context.SaveChangesAsync(ct);
		_logger.LogInformation("Issued a QR token for animal {AnimalId}.", animalId);
		return new QrTokenResult(Success: true, null, 200, animal.QrToken, animalId);
	}

	public async Task<Animal?> ResolveAsync(string token, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(token))
		{
			return null;
		}
		string candidate = token.Trim();
		return await _context.Animals.AsNoTracking().Include((Animal a) => a.Breed).Include((Animal a) => a.Farm)
			.Include((Animal a) => a.Group)
			.ThenInclude((AnimalGroup g) => g.Shed)
			.Include((Animal a) => a.Dam)
			.Include((Animal a) => a.Sire)
			.Include((Animal a) => a.StatusHistory)
			.FirstOrDefaultAsync((Animal a) => a.QrToken == candidate, ct);
	}

	public async Task<bool> RotateAsync(ulong animalId, CancellationToken ct)
	{
		Animal animal = await _context.Animals.FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId, ct);
		if (animal == null || string.IsNullOrWhiteSpace(animal.QrToken))
		{
			return false;
		}
		Animal animal2 = animal;
		animal2.QrToken = await GenerateUniqueTokenAsync(ct);
		await _context.SaveChangesAsync(ct);
		_logger.LogInformation("Rotated the QR token for animal {AnimalId}.", animalId);
		return true;
	}

	private async Task<string> GenerateUniqueTokenAsync(CancellationToken ct)
	{
		for (int attempt = 0; attempt < 5; attempt++)
		{
			string token = GenerateToken();
			if (!(await _context.Animals.AsNoTracking().AnyAsync((Animal a) => a.QrToken == token, ct)))
			{
				return token;
			}
			_logger.LogWarning("QR token collision on attempt {Attempt}; regenerating.", attempt + 1);
		}
		throw new InvalidOperationException("Unable to generate a unique QR token after 5 attempts.");
	}

	private static string GenerateToken()
	{
		Span<byte> span = stackalloc byte[32];
		RandomNumberGenerator.Fill(span);
		return Convert.ToBase64String(span).Replace('+', '-').Replace('/', '_')
			.TrimEnd('=');
	}
}
