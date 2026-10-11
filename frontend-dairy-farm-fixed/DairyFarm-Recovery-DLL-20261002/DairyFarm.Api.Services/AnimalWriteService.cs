using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class AnimalWriteService
{
	private readonly AppDbContext _context;

	private readonly AnimalCodeGenerator _codes;

	private readonly ILogger<AnimalWriteService> _logger;

	public AnimalWriteService(AppDbContext context, AnimalCodeGenerator codes, ILogger<AnimalWriteService> logger)
	{
		_context = context;
		_codes = codes;
		_logger = logger;
	}

	public async Task<AnimalWriteResult> CreateAsync(CreateAnimalRequest request, ulong userId, CancellationToken ct)
	{
		IExecutionStrategy strategy = _context.Database.CreateExecutionStrategy();
		DbConnection connection = _context.Database.GetDbConnection();
		bool openedHere = false;
		AnimalWriteResult result;
		try
		{
			result = await strategy.ExecuteAsync(async () =>
			{
				if (connection.State != ConnectionState.Open)
				{
					await connection.OpenAsync(ct);
					openedHere = true;
				}
				AnimalWriteResult result3;
				await using (IDbContextTransaction transaction = await _context.Database.BeginTransactionAsync(ct))
				{
					await ExecuteAsync(connection, transaction, ct, "SET @app_user_id = @userId", ("@userId", userId));
					AnimalWriteResult result2 = await CreateCoreAsync(request, ct);
					if (result2.Outcome != AnimalWriteOutcome.Created)
					{
						await transaction.RollbackAsync(ct);
						result3 = result2;
					}
					else
					{
						await transaction.CommitAsync(ct);
						result3 = result2;
					}
				}
				return result3;
			});
		}
		catch
		{
			_context.ChangeTracker.Clear();
			throw;
		}
		finally
		{
			try
			{
				if (connection.State == ConnectionState.Open)
				{
					await ExecuteAsync(connection, null, CancellationToken.None, "SET @app_user_id = NULL");
				}
			}
			catch (DbException ex)
			{
				DbException ex2 = ex;
				_logger.LogWarning(ex2, "Could not clear @app_user_id before returning the connection to the pool.");
			}
			if (openedHere && connection.State == ConnectionState.Open)
			{
				await connection.CloseAsync();
			}
			_context.ChangeTracker.Clear();
		}
		return result;
	}

	private async Task<AnimalWriteResult> CreateCoreAsync(CreateAnimalRequest request, CancellationToken ct)
	{
		List<string> errors = await ValidateCreateAsync(request, ct);
		if (errors.Count > 0)
		{
			return new AnimalWriteResult(AnimalWriteOutcome.ValidationFailed, null, null, errors);
		}
		ulong farmId = (ulong)request.FarmId;
		string animalCode;
		if (!string.IsNullOrWhiteSpace(request.AnimalCode))
		{
			animalCode = request.AnimalCode.Trim();
			if (await _context.Animals.AnyAsync((Animal a) => a.FarmId == farmId && a.AnimalCode == animalCode, ct))
			{
				return new AnimalWriteResult(AnimalWriteOutcome.DuplicateCode, null, "Animal code '" + animalCode + "' is already used on this farm.");
			}
		}
		else
		{
			animalCode = await _codes.NextCodeAsync(farmId, ct);
		}
		Animal animal = new Animal
		{
			FarmId = farmId,
			AnimalCode = animalCode,
			Name = (string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim()),
			BreedId = (request.BreedId.HasValue ? new ulong?((ulong)request.BreedId.Value) : ((ulong?)null)),
			Sex = request.Sex.Trim().ToUpperInvariant(),
			DateOfBirth = request.DateOfBirth,
			Status = (string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpperInvariant()),
			GroupId = (request.GroupId.HasValue ? new ulong?((ulong)request.GroupId.Value) : ((ulong?)null)),
			DamId = (request.DamId.HasValue ? new ulong?((ulong)request.DamId.Value) : ((ulong?)null)),
			SireId = (request.SireId.HasValue ? new ulong?((ulong)request.SireId.Value) : ((ulong?)null)),
			AcquisitionDate = request.PurchaseDate,
			PurchasePrice = request.PurchasePrice,
			Notes = (string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes),
			PhotoUrl = null
		};
		_context.Animals.Add(animal);
		await _context.SaveChangesAsync(ct);
		await UpsertIdentificationsAsync(animal.AnimalId, request.EarTag, request.Rfid, null, ct);
		_logger.LogInformation("Created animal {AnimalId} with code {AnimalCode}.", animal.AnimalId, animalCode);
		return new AnimalWriteResult(AnimalWriteOutcome.Created, await LoadDetailAsync(animal.AnimalId, ct));
	}

	public async Task<AnimalWriteResult> UpdateAsync(ulong animalId, UpdateAnimalRequest request, CancellationToken ct)
	{
		Animal animal = await _context.Animals.FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId, ct);
		if (animal == null)
		{
			return new AnimalWriteResult(AnimalWriteOutcome.AnimalNotFound);
		}
		if (!string.IsNullOrWhiteSpace(request.Status) && !string.Equals(request.Status.Trim(), animal.Status, StringComparison.OrdinalIgnoreCase))
		{
			return new AnimalWriteResult(AnimalWriteOutcome.StatusChangeNotPermitted, null, "Status cannot be changed with PUT. Use PATCH /api/animals/{id}/status so the change is recorded in animal status history.");
		}
		List<string> errors = new List<string>();
		bool hasValue = request.BreedId.HasValue;
		bool flag = hasValue;
		if (flag)
		{
			flag = !(await _context.Breeds.AnyAsync((Breed b) => b.BreedId == (ulong)request.BreedId.Value, ct));
		}
		if (flag)
		{
			errors.Add($"Breed {request.BreedId} does not exist.");
		}
		bool hasValue2 = request.GroupId.HasValue;
		bool flag2 = hasValue2;
		if (flag2)
		{
			flag2 = !(await _context.AnimalGroups.AnyAsync((AnimalGroup g) => g.GroupId == (ulong)request.GroupId.Value, ct));
		}
		if (flag2)
		{
			errors.Add($"Animal group {request.GroupId} does not exist.");
		}
		bool hasValue3 = request.DamId.HasValue;
		bool flag3 = hasValue3;
		if (flag3)
		{
			flag3 = !(await _context.Animals.AnyAsync((Animal a) => a.AnimalId == (ulong)request.DamId.Value, ct));
		}
		if (flag3)
		{
			errors.Add($"Dam animal {request.DamId} does not exist.");
		}
		bool hasValue4 = request.SireId.HasValue;
		bool flag4 = hasValue4;
		if (flag4)
		{
			flag4 = !(await _context.Animals.AnyAsync((Animal a) => a.AnimalId == (ulong)request.SireId.Value, ct));
		}
		if (flag4)
		{
			errors.Add($"Sire animal {request.SireId} does not exist.");
		}
		if (request.DamId.HasValue && request.DamId.Value == (long)animalId)
		{
			errors.Add("An animal cannot be its own dam.");
		}
		if (request.SireId.HasValue && request.SireId.Value == (long)animalId)
		{
			errors.Add("An animal cannot be its own sire.");
		}
		if (request.DamId.HasValue && request.SireId.HasValue && request.DamId == request.SireId)
		{
			errors.Add("Dam and sire cannot be the same animal.");
		}
		if (!string.IsNullOrWhiteSpace(request.AnimalCode))
		{
			string code = request.AnimalCode.Trim();
			bool flag5 = !string.Equals(code, animal.AnimalCode, StringComparison.Ordinal);
			bool flag6 = flag5;
			if (flag6)
			{
				flag6 = await _context.Animals.AnyAsync((Animal a) => a.FarmId == animal.FarmId && a.AnimalCode == code && a.AnimalId != animalId, ct);
			}
			if (flag6)
			{
				return new AnimalWriteResult(AnimalWriteOutcome.DuplicateCode, null, "Animal code '" + code + "' is already used on this farm.");
			}
		}
		if (errors.Count > 0)
		{
			return new AnimalWriteResult(AnimalWriteOutcome.ValidationFailed, null, null, errors);
		}
		if (request.Name != null)
		{
			animal.Name = Trim(request.Name);
		}
		if (!string.IsNullOrWhiteSpace(request.AnimalCode))
		{
			animal.AnimalCode = request.AnimalCode.Trim();
		}
		if (request.BreedId.HasValue)
		{
			animal.BreedId = (ulong)request.BreedId.Value;
		}
		if (request.DateOfBirth.HasValue)
		{
			animal.DateOfBirth = request.DateOfBirth;
		}
		if (request.GroupId.HasValue)
		{
			animal.GroupId = (ulong)request.GroupId.Value;
		}
		if (request.DamId.HasValue)
		{
			animal.DamId = (ulong)request.DamId.Value;
		}
		if (request.SireId.HasValue)
		{
			animal.SireId = (ulong)request.SireId.Value;
		}
		if (request.PurchaseDate.HasValue)
		{
			animal.AcquisitionDate = request.PurchaseDate;
		}
		if (request.PurchasePrice.HasValue)
		{
			animal.PurchasePrice = request.PurchasePrice;
		}
		if (request.Notes != null)
		{
			animal.Notes = Trim(request.Notes);
		}
		await _context.SaveChangesAsync(ct);
		if (!string.IsNullOrWhiteSpace(request.EarTag) || !string.IsNullOrWhiteSpace(request.Rfid))
		{
			await UpsertIdentificationsAsync(animalId, request.EarTag, request.Rfid, null, ct);
		}
		_logger.LogInformation("Updated animal {AnimalId}.", animalId);
		return new AnimalWriteResult(AnimalWriteOutcome.Updated, await LoadDetailAsync(animalId, ct));
	}

	private async Task<List<string>> ValidateCreateAsync(CreateAnimalRequest request, CancellationToken ct)
	{
		List<string> errors = new List<string>();
		ulong farmId = (ulong)request.FarmId;
		if (!(await _context.Farms.AnyAsync((Farm f) => f.FarmId == farmId, ct)))
		{
			errors.Add($"Farm {request.FarmId} does not exist.");
		}
		bool hasValue = request.BreedId.HasValue;
		bool flag = hasValue;
		if (flag)
		{
			flag = !(await _context.Breeds.AnyAsync((Breed b) => b.BreedId == (ulong)request.BreedId.Value, ct));
		}
		if (flag)
		{
			errors.Add($"Breed {request.BreedId} does not exist.");
		}
		bool hasValue2 = request.GroupId.HasValue;
		bool flag2 = hasValue2;
		if (flag2)
		{
			flag2 = !(await _context.AnimalGroups.AnyAsync((AnimalGroup g) => g.GroupId == (ulong)request.GroupId.Value, ct));
		}
		if (flag2)
		{
			errors.Add($"Animal group {request.GroupId} does not exist.");
		}
		bool hasValue3 = request.DamId.HasValue;
		bool flag3 = hasValue3;
		if (flag3)
		{
			flag3 = !(await _context.Animals.AnyAsync((Animal a) => a.AnimalId == (ulong)request.DamId.Value, ct));
		}
		if (flag3)
		{
			errors.Add($"Dam animal {request.DamId} does not exist.");
		}
		bool hasValue4 = request.SireId.HasValue;
		bool flag4 = hasValue4;
		if (flag4)
		{
			flag4 = !(await _context.Animals.AnyAsync((Animal a) => a.AnimalId == (ulong)request.SireId.Value, ct));
		}
		if (flag4)
		{
			errors.Add($"Sire animal {request.SireId} does not exist.");
		}
		if (request.DamId.HasValue && request.SireId.HasValue && request.DamId == request.SireId)
		{
			errors.Add("Dam and sire cannot be the same animal.");
		}
		if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateTime.UtcNow)
		{
			errors.Add("dateOfBirth cannot be in the future.");
		}
		if (request.PurchaseDate.HasValue && request.PurchaseDate.Value > DateTime.UtcNow)
		{
			errors.Add("purchaseDate cannot be in the future.");
		}
		if (request.DateOfBirth.HasValue && request.PurchaseDate.HasValue && request.PurchaseDate.Value < request.DateOfBirth.Value)
		{
			errors.Add("purchaseDate cannot be earlier than dateOfBirth.");
		}
		if (request.DamId.HasValue)
		{
			string damSex = await (from a in _context.Animals
				where a.AnimalId == (ulong)request.DamId.Value
				select a.Sex).FirstOrDefaultAsync(ct);
			if (damSex != null && !string.Equals(damSex, "FEMALE", StringComparison.OrdinalIgnoreCase))
			{
				errors.Add("The dam must be a FEMALE animal.");
			}
		}
		if (request.SireId.HasValue)
		{
			string sireSex = await (from a in _context.Animals
				where a.AnimalId == (ulong)request.SireId.Value
				select a.Sex).FirstOrDefaultAsync(ct);
			if (sireSex != null && !string.Equals(sireSex, "MALE", StringComparison.OrdinalIgnoreCase))
			{
				errors.Add("The sire must be a MALE animal.");
			}
		}
		List<string> list = errors;
		list.AddRange(await ValidateIdentificationAsync(null, request.EarTag, request.Rfid, ct));
		return errors;
	}

	public async Task<List<string>> ValidateIdentificationAsync(ulong? animalId, string? earTag, string? rfid, CancellationToken ct)
	{
		List<string> errors = new List<string>();
		(string Type, string? Value)[] candidates = new (string, string)[2]
		{
			("EAR_TAG", earTag),
			("RFID", rfid)
		};
		(string Type, string? Value)[] array = candidates;
		for (int i = 0; i < array.Length; i++)
		{
			(string, string) tuple = array[i];
			string type = tuple.Item1;
			string value = tuple.Item2;
			if (string.IsNullOrWhiteSpace(value))
			{
				continue;
			}
			string candidate = value.Trim();
			if (candidate.Length > 150)
			{
				errors.Add(type + " must be 150 characters or fewer.");
				continue;
			}
			ulong? num = ((!(type == "EAR_TAG")) ? (await (from a in _context.Animals.AsNoTracking()
				where a.RfidNumber == candidate
				select a).Select((Expression<Func<Animal, ulong?>>)((Animal a) => a.AnimalId)).FirstOrDefaultAsync(ct)) : (await (from a in _context.Animals.AsNoTracking()
				where a.TagNumber == candidate
				select a).Select((Expression<Func<Animal, ulong?>>)((Animal a) => a.AnimalId)).FirstOrDefaultAsync(ct)));
			ulong? owner = num;
			if (owner.HasValue && (!animalId.HasValue || owner != animalId.Value))
			{
				errors.Add(type + " '" + candidate + "' is already assigned to another animal.");
			}
		}
		return errors;
	}

	private async Task UpsertIdentificationsAsync(ulong animalId, string? earTag, string? rfid, bool? makePrimary, CancellationToken ct)
	{
		Animal animal = await _context.Animals.FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId, ct);
		if (animal != null)
		{
			if (!string.IsNullOrWhiteSpace(earTag))
			{
				animal.TagNumber = earTag.Trim();
			}
			if (!string.IsNullOrWhiteSpace(rfid))
			{
				animal.RfidNumber = rfid.Trim();
			}
			await _context.SaveChangesAsync(ct);
		}
	}

	private async Task<AnimalDetailDto?> LoadDetailAsync(ulong animalId, CancellationToken ct)
	{
		_context.ChangeTracker.Clear();
		Animal animal = await _context.Animals.AsNoTracking().Include((Animal a) => a.Breed).Include((Animal a) => a.Farm)
			.Include((Animal a) => a.Group)
			.ThenInclude((AnimalGroup g) => g.Shed)
			.Include((Animal a) => a.Dam)
			.Include((Animal a) => a.Sire)
			.Include((Animal a) => a.StatusHistory)
			.FirstOrDefaultAsync((Animal a) => a.AnimalId == animalId, ct);
		return (animal == null) ? null : AnimalDetailMapper.Map(animal);
	}

	private static string? Trim(string value)
	{
		return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
	}

	private static async Task ExecuteAsync(DbConnection connection, IDbContextTransaction? efTransaction, CancellationToken ct, string sql, params (string Name, object? Value)[] parameters)
	{
		await using DbCommand command = connection.CreateCommand();
		command.CommandText = sql;
		command.Transaction = efTransaction?.GetDbTransaction();
		for (int i = 0; i < parameters.Length; i++)
		{
			(string, object) tuple = parameters[i];
			string name = tuple.Item1;
			object value = tuple.Item2;
			DbParameter parameter = command.CreateParameter();
			parameter.ParameterName = name;
			parameter.Value = value ?? DBNull.Value;
			command.Parameters.Add(parameter);
		}
		await command.ExecuteNonQueryAsync(ct);
	}
}
