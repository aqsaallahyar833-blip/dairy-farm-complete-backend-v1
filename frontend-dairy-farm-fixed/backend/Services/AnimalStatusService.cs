using System.Data;
using System.Data.Common;
using DairyFarm.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public enum StatusChangeOutcome
{
    Updated,
    AnimalNotFound,
    SameStatus
}

/// <summary>
/// Lifecycle status changes for an animal.
///
/// WHY THIS EXISTS AND WHY IT IS NOT A PLAIN EF SaveChanges:
/// the database owns status history. `trg_animals_status_history_insert` and
/// `trg_animals_status_history_update` write `animal_status_history` rows and
/// read the MySQL SESSION variable `@app_user_id` for attribution:
///
///     user_id = NULLIF(@app_user_id, 0)
///
/// A session variable belongs to one physical connection. EF Core's connection
/// pool hands a different physical connection to each context, so setting
/// @app_user_id on one context and saving on another would attribute the
/// change to the wrong user - or to nobody.
///
/// This service therefore:
///   1. opens ONE connection and holds it,
///   2. begins a transaction on it,
///   3. sets @app_user_id on THAT connection,
///   4. performs the update through EF, which reuses the already-open
///      connection, so the trigger observes the variable,
///   5. fills in the `reason` the trigger left NULL,
///   6. commits,
///   7. clears @app_user_id before releasing the connection back to the pool,
///      so the next request cannot inherit the previous user's identity.
///
/// The existing triggers are NOT modified and NO second competing trigger is
/// created - the database remains the single writer of history rows.
/// </summary>
public class AnimalStatusService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AnimalStatusService> _logger;

    public AnimalStatusService(AppDbContext context, ILogger<AnimalStatusService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<StatusChangeOutcome> ChangeStatusAsync(
        ulong animalId,
        string newStatus,
        string? reason,
        ulong userId,
        CancellationToken ct = default)
    {
        // EnableRetryOnFailure (configured in Program.cs) installs
        // MySqlRetryingExecutionStrategy, which rejects user-initiated
        // transactions unless they are submitted through the strategy. The
        // whole locked read + update + history-reason write is therefore one
        // retriable unit; a failed attempt rolls back before it can retry.
        var strategy = _context.Database.CreateExecutionStrategy();
        var connection = _context.Database.GetDbConnection();
        var openedHere = false;

        try
        {
            return await strategy.ExecuteAsync(async () =>
            {
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync(ct);
                    openedHere = true;
                }

                await using var transaction = await _context.Database.BeginTransactionAsync(ct);

                // 1. Read the animal on the same connection, locked for the
                //    duration, so a concurrent status change cannot interleave.
                var animal = await _context.Animals
                    .FromSqlInterpolated($"SELECT * FROM animals WHERE animal_id = {animalId} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);

                if (animal is null)
                {
                    await transaction.RollbackAsync(ct);
                    return StatusChangeOutcome.AnimalNotFound;
                }

                var target = newStatus.Trim().ToUpperInvariant();

                // A no-op transition writes no history row at all (the trigger
                // only fires when the value actually changes) and would look
                // like a silent success while doing nothing. Reject it.
                if (string.Equals(animal.Status, target, StringComparison.Ordinal))
                {
                    await transaction.RollbackAsync(ct);
                    return StatusChangeOutcome.SameStatus;
                }

                // 2. Remember the highest existing history id so the row the
                //    trigger creates next is identified unambiguously.
                var previousMaxId = await ScalarAsync(connection, transaction, ct,
                    "SELECT COALESCE(MAX(id), 0) FROM animal_status_history WHERE animal_id = @animalId",
                    ("@animalId", animalId));

                // 3. Set the session variable ON THIS CONNECTION, before the
                //    write, so the trigger attributes the row to this user.
                await ExecuteAsync(connection, transaction, ct,
                    "SET @app_user_id = @userId",
                    ("@userId", userId));

                var oldStatus = animal.Status;

                // 4. The update. The AFTER UPDATE trigger observes @app_user_id.
                animal.Status = target;
                await _context.SaveChangesAsync(ct);

                // 5. The trigger hardcodes reason = NULL. Fill it in on the row
                //    it just inserted, on the same connection and transaction.
                var trimmedReason = reason?.Trim();
                if (!string.IsNullOrEmpty(trimmedReason))
                {
                    await ExecuteAsync(connection, transaction, ct,
                        @"UPDATE animal_status_history
                          SET reason = @reason
                          WHERE id = (
                              SELECT id FROM (
                                  SELECT id
                                  FROM animal_status_history
                                  WHERE animal_id = @animalId AND id > @previousMaxId
                                  ORDER BY id DESC
                                  LIMIT 1
                              ) AS newest
                          )",
                        ("@reason", trimmedReason!),
                        ("@animalId", animalId),
                        ("@previousMaxId", previousMaxId));
                }

                await transaction.CommitAsync(ct);

                _logger.LogInformation(
                    "Animal {AnimalId} status changed {OldStatus} -> {NewStatus} by user {UserId}.",
                    animalId, oldStatus, target, userId);

                return StatusChangeOutcome.Updated;
            });
        }
        catch
        {
            _context.ChangeTracker.Clear();
            throw;
        }
        finally
        {
            // Clear the session variable before the connection returns to the
            // pool. Without this the NEXT request to borrow this connection
            // would inherit @app_user_id and mis-attribute its history rows.
            try
            {
                if (connection.State == ConnectionState.Open)
                {
                    await ExecuteAsync(connection, null, CancellationToken.None, "SET @app_user_id = NULL");
                }
            }
            catch (DbException ex)
            {
                _logger.LogWarning(ex, "Could not clear @app_user_id before returning the connection to the pool.");
            }

            if (openedHere && connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }

            _context.ChangeTracker.Clear();
        }
    }

    private static async Task ExecuteAsync(
        DbConnection connection,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? efTransaction,
        CancellationToken ct,
        string sql,
        params (string Name, object? Value)[] parameters)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = efTransaction?.GetDbTransaction();

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task<long> ScalarAsync(
        DbConnection connection,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? efTransaction,
        CancellationToken ct,
        string sql,
        params (string Name, object? Value)[] parameters)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = efTransaction?.GetDbTransaction();

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        var result = await command.ExecuteScalarAsync(ct);
        return result is null or DBNull ? 0L : Convert.ToInt64(result);
    }
}

