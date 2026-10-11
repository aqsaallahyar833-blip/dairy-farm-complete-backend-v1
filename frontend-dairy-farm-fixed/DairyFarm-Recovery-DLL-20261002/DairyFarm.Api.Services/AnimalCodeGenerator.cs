using System;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class AnimalCodeGenerator
{
	private readonly AppDbContext _context;

	private readonly ILogger<AnimalCodeGenerator> _logger;

	public AnimalCodeGenerator(AppDbContext context, ILogger<AnimalCodeGenerator> logger)
	{
		_context = context;
		_logger = logger;
	}

	public async Task<string> NextCodeAsync(ulong farmId, CancellationToken ct = default(CancellationToken))
	{
		AnimalCodeSequence sequence = await LockSequenceAsync(farmId, ct);
		string prefix = sequence.Prefix;
		ulong candidate = sequence.NextNumber;
		int guard = 0;
		for (; await CodeExistsAsync(farmId, prefix, candidate, ct); candidate++)
		{
			guard++;
			if (guard > 10000)
			{
				throw new InvalidOperationException("Could not find an unused animal code after 10000 attempts. The animal_code_sequences counter appears to be corrupt.");
			}
			_logger.LogWarning("Animal code {Prefix}{Number} already exists for farm {FarmId}; advancing the counter.", prefix, candidate, farmId);
		}
		sequence.NextNumber = candidate + 1;
		await _context.SaveChangesAsync(ct);
		return prefix + candidate.ToString("D3", CultureInfo.InvariantCulture);
	}

	private async Task<AnimalCodeSequence> LockSequenceAsync(ulong farmId, CancellationToken ct)
	{
		AnimalCodeSequence sequence = await _context.AnimalCodeSequences.FromSqlInterpolated($"SELECT * FROM animal_code_sequences WHERE farm_id = {farmId} FOR UPDATE").FirstOrDefaultAsync(ct);
		if (sequence == null)
		{
			sequence = new AnimalCodeSequence
			{
				FarmId = farmId,
				Prefix = "AN-",
				NextNumber = 1uL
			};
			_context.AnimalCodeSequences.Add(sequence);
			try
			{
				await _context.SaveChangesAsync(ct);
				_logger.LogInformation("Created animal code sequence for farm {FarmId} starting at 1.", farmId);
			}
			catch (DbUpdateException)
			{
				_context.Entry(sequence).State = EntityState.Detached;
				sequence = (await _context.AnimalCodeSequences.FromSqlInterpolated($"SELECT * FROM animal_code_sequences WHERE farm_id = {farmId} FOR UPDATE").FirstOrDefaultAsync(ct)) ?? throw new InvalidOperationException($"Unable to establish an animal code sequence for farm {farmId}.");
			}
		}
		return sequence;
	}

	private async Task<bool> CodeExistsAsync(ulong farmId, string prefix, ulong number, CancellationToken ct)
	{
		string code = prefix + number.ToString("D3", CultureInfo.InvariantCulture);
		return await _context.Animals.AsNoTracking().AnyAsync((Animal a) => a.FarmId == farmId && a.AnimalCode == code, ct);
	}
}
