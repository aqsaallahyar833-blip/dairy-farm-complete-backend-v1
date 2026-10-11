using System;
using System.Data;
using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class AnimalStatusService
{
	private readonly AppDbContext _context;

	private readonly ILogger<AnimalStatusService> _logger;

	public AnimalStatusService(AppDbContext context, ILogger<AnimalStatusService> logger)
	{
		_context = context;
		_logger = logger;
	}

	public async Task<StatusChangeOutcome> ChangeStatusAsync(ulong animalId, string newStatus, string? reason, ulong userId, CancellationToken ct = default(CancellationToken))
	{
		IExecutionStrategy strategy = _context.Database.CreateExecutionStrategy();
		DbConnection connection = _context.Database.GetDbConnection();
		bool openedHere = false;
		StatusChangeOutcome result;
		try
		{
			result = await strategy.ExecuteAsync(async () =>
			{
				if (connection.State != ConnectionState.Open)
				{
					await connection.OpenAsync(ct);
					openedHere = true;
				}
				StatusChangeOutcome result2;
				await using (IDbContextTransaction transaction = await _context.Database.BeginTransactionAsync(ct))
				{
					Animal animal = await _context.Animals.FromSqlInterpolated($"SELECT * FROM animals WHERE animal_id = {animalId} FOR UPDATE").FirstOrDefaultAsync(ct);
					if (animal == null)
					{
						await transaction.RollbackAsync(ct);
						result2 = StatusChangeOutcome.AnimalNotFound;
					}
					else
					{
						string target = newStatus.Trim().ToUpperInvariant();
						if (string.Equals(animal.Status, target, StringComparison.Ordinal))
						{
							await transaction.RollbackAsync(ct);
							result2 = StatusChangeOutcome.SameStatus;
						}
						else
						{
							long previousMaxId = await ScalarAsync(connection, transaction, ct, "SELECT COALESCE(MAX(id), 0) FROM animal_status_history WHERE animal_id = @animalId", ("@animalId", animalId));
							await ExecuteAsync(connection, transaction, ct, "SET @app_user_id = @userId", ("@userId", userId));
							string oldStatus = animal.Status;
							animal.Status = target;
							await _context.SaveChangesAsync(ct);
							string trimmedReason = reason?.Trim();
							if (!string.IsNullOrEmpty(trimmedReason))
							{
								await ExecuteAsync(connection, transaction, ct, "UPDATE animal_status_history\n                          SET reason = @reason\n                          WHERE id = (\n                              SELECT id FROM (\n                                  SELECT id\n                                  FROM animal_status_history\n                                  WHERE animal_id = @animalId AND id > @previousMaxId\n                                  ORDER BY id DESC\n                                  LIMIT 1\n                              ) AS newest\n                          )", ("@reason", trimmedReason), ("@animalId", animalId), ("@previousMaxId", previousMaxId));
							}
							await transaction.CommitAsync(ct);
							_logger.LogInformation("Animal {AnimalId} status changed {OldStatus} -> {NewStatus} by user {UserId}.", animalId, oldStatus, target, userId);
							result2 = StatusChangeOutcome.Updated;
						}
					}
				}
				return result2;
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

	private static async Task<long> ScalarAsync(DbConnection connection, IDbContextTransaction? efTransaction, CancellationToken ct, string sql, params (string Name, object? Value)[] parameters)
	{
		long result2;
		await using (DbCommand command = connection.CreateCommand())
		{
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
			object result = await command.ExecuteScalarAsync(ct);
			bool flag = ((result == null || result is DBNull) ? true : false);
			result2 = (flag ? 0 : Convert.ToInt64(result));
		}
		return result2;
	}
}
