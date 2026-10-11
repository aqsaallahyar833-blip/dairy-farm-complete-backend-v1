using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FarmScopeGuard _farmScope;

    public ReportsController(AppDbContext db, FarmScopeGuard farmScope)
    {
        _db = db;
        _farmScope = farmScope;
    }

    /// <summary>
    /// Convert a DateOnly query parameter into a DateTime range that brackets the
    /// whole day. The canonical date columns (record_date, transaction_date,
    /// event_date) are MySQL DATE, mapped as DateTime, so the conversion belongs
    /// at this query boundary. The database column types are unchanged.
    /// </summary>
    private static DateTime DayStart(DateOnly d) => d.ToDateTime(TimeOnly.MinValue);

    private static DateTime DayEnd(DateOnly d) => d.ToDateTime(TimeOnly.MaxValue);

    /// <summary>
    /// GET /api/reports/farm?farmId=&amp;from=&amp;to=
    ///
    /// RECONCILED against the canonical schema:
    ///   * income and expense come from the SINGLE finance ledger
    ///     (finance_transactions) filtered by transaction_type. There are no
    ///     separate income/expense tables, so the balance is a single ledger read.
    ///   * health events come from health_records, whose date is record_date.
    ///   * milk is session based: the daily total is SUM(milk_liters) over the
    ///     session rows, never a stored total column.
    /// </summary>
    [HttpGet("farm")]
    public async Task<IActionResult> Farm([FromQuery] ulong farmId, [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
    {
        // The supplied farmId is verified against the authenticated identity
        // before any ledger is read; it is never itself the authorisation.
        var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
        if (denied is not null) return denied;

        if (to < from) return BadRequest(Result.Fail("to date must be on or after from date."));

        var start = DayStart(from);
        var end = DayEnd(to);

        var milk = await _db.MilkRecords
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end)
            .ToListAsync();

        // One authoritative ledger; INCOME and EXPENSE are distinguished by
        // transaction_type only.
        var income = await _db.FinanceTransactions
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.TransactionType == "INCOME"
                     && x.TransactionDate >= start && x.TransactionDate <= end)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        var expense = await _db.FinanceTransactions
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.TransactionType == "EXPENSE"
                     && x.TransactionDate >= start && x.TransactionDate <= end)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        var health = await _db.HealthRecords
            .AsNoTracking()
            .CountAsync(x => x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end);

        var breeding = await _db.BreedingEvents
            .AsNoTracking()
            .CountAsync(x => x.FarmId == farmId && x.EventDate >= start && x.EventDate <= end);

        // Withdrawn / treated milk is flagged with is_rejected and is not
        // saleable, so it is reported separately from production.
        var saleableLiters = milk.Where(x => !x.IsRejected).Sum(x => x.MilkLiters);

        return Ok(Result.Ok(new
        {
            from,
            to,
            milkLiters = milk.Sum(x => x.MilkLiters),
            saleableLiters,
            rejectedLiters = milk.Sum(x => x.MilkLiters) - saleableLiters,
            milkRecords = milk.Count,
            income,
            expenses = expense,
            estimatedProfit = income - expense,
            healthEvents = health,
            breedingEvents = breeding
        }));
    }

    /// <summary>
    /// GET /api/reports/milk?farmId=&amp;from=&amp;to=
    ///
    /// Daily production, summed across the MORNING/EVENING/THIRD session rows
    /// for the same animal and date. uq_milk_animal_date_session guarantees one
    /// row per session, so the sum is a true daily total.
    /// </summary>
    [HttpGet("milk")]
    public async Task<IActionResult> Milk([FromQuery] ulong farmId, [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
    {
        // Same rule as the farm report: authorise the farm first.
        var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
        if (denied is not null) return denied;

        if (to < from) return BadRequest(Result.Fail("to date must be on or after from date."));

        var start = DayStart(from);
        var end = DayEnd(to);

        var rows = await _db.MilkRecords
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end)
            .GroupBy(x => x.RecordDate.Date)
            .Select(g => new
            {
                date = g.Key,
                total = g.Sum(x => x.MilkLiters),
                saleable = g.Where(x => !x.IsRejected).Sum(x => x.MilkLiters),
                animals = g.Select(x => x.AnimalId).Distinct().Count()
            })
            .OrderBy(x => x.date)
            .ToListAsync();

        return Ok(Result.Ok(rows));
    }
}
