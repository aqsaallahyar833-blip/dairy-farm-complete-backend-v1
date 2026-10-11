using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FarmScopeGuard _farmScope;

    public DashboardController(AppDbContext db, FarmScopeGuard farmScope)
    {
        _db = db;
        _farmScope = farmScope;
    }

    /// <summary>
    /// GET /api/dashboard?farmId=&amp;date=
    ///
    /// RECONCILED against the canonical schema:
    ///   * milk is SESSION based, so every milk figure is SUM(milk_liters) over
    ///     the session rows; there is no stored `Total` column.
    ///   * the date column is `record_date` (MySQL DATE, mapped as DateTime).
    ///   * income and expenses both come from the SINGLE finance ledger,
    ///     split by transaction_type. There are no separate income/expense
    ///     tables.
    ///   * open health cases come from health_records where recovery_date is null.
    ///   * tasks.status is an enum: PENDING / IN_PROGRESS / COMPLETED /
    ///     CANCELLED / OVERDUE. "DONE" is not a valid stored value, so the
    ///     outstanding-task test is against COMPLETED and CANCELLED.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] ulong farmId, [FromQuery] DateOnly? date, CancellationToken ct)
    {
        // The client-supplied farmId is NOT an authorisation decision. The
        // server verifies it against the authenticated identity, so a caller
        // cannot read another farm's figures by guessing an id.
        var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
        if (denied is not null) return denied;

        var d = date ?? DateOnly.FromDateTime(DateTime.Today);
        var dayStart = d.ToDateTime(TimeOnly.MinValue);
        var dayEnd = d.ToDateTime(TimeOnly.MaxValue);
        var monthStart = new DateTime(d.Year, d.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var animals = await _db.Animals.AsNoTracking().Where(a => a.FarmId == farmId).ToListAsync();

        // SESSION ROWS. Daily/monthly figures are sums over the sessions.
        var milk = await _db.MilkRecords
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.RecordDate >= dayStart.AddDays(-1) && x.RecordDate <= dayEnd)
            .ToListAsync();

        var monthMilk = await _db.MilkRecords
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.RecordDate >= monthStart && x.RecordDate < monthEnd)
            .ToListAsync();

        // One authoritative ledger for both sides of the balance sheet.
        var ledger = await _db.FinanceTransactions
            .AsNoTracking()
            .Where(x => x.FarmId == farmId && x.TransactionDate >= monthStart && x.TransactionDate < monthEnd)
            .ToListAsync();

        var revenue = ledger.Where(x => x.TransactionType == "INCOME").Sum(x => x.Amount);
        var monthExpenses = ledger.Where(x => x.TransactionType == "EXPENSE").Sum(x => x.Amount);

        var today = milk.Where(x => x.RecordDate >= dayStart && x.RecordDate <= dayEnd).Sum(x => x.MilkLiters);
        var yesterday = milk
            .Where(x => x.RecordDate >= dayStart.AddDays(-1) && x.RecordDate <= dayStart.AddTicks(-1))
            .Sum(x => x.MilkLiters);
        var month = monthMilk.Sum(x => x.MilkLiters);

        var lactating = animals.Count(a => a.Status == "LACTATING");

        return Ok(new
        {
            success = true,
            data = new
            {
                totalAnimals = animals.Count(a => a.Status != "SOLD" && a.Status != "DEAD"),
                lactating,
                dry = animals.Count(a => a.Status == "DRY"),
                pregnant = animals.Count(a => a.Status == "PREGNANT"),
                open = animals.Count(a => a.Status == "ACTIVE"),
                heifers = animals.Count(a => a.Status == "HEIFER"),
                calves = animals.Count(a => a.Status == "CALF"),
                bulls = animals.Count(a => a.Status == "BULL"),
                sick = animals.Count(a => a.Status == "SICK"),
                quarantine = animals.Count(a => a.Status == "QUARANTINE"),
                todayMilk = today,
                yesterdayMilk = yesterday,
                averageMilkPerCow = lactating == 0 ? 0m : today / lactating,
                monthlyMilk = month,
                milkRevenue = revenue,
                monthlyExpenses = monthExpenses,
                estimatedProfit = revenue - monthExpenses,

                // Outstanding work: a task is done when it is COMPLETED or was
                // CANCELLED. OVERDUE is still outstanding.
                breedingReminders = await _db.Tasks.CountAsync(x =>
                    x.FarmId == farmId
                    && x.DueDate <= dayEnd
                    && x.Status != "COMPLETED"
                    && x.Status != "CANCELLED"),

                healthAlerts = await _db.HealthRecords.CountAsync(x => x.FarmId == farmId && x.RecoveryDate == null)
            }
        });
    }
}