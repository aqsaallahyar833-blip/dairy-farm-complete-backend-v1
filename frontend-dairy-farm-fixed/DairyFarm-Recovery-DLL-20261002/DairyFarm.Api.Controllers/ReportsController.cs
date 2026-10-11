using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
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

	private static DateTime DayStart(DateOnly d)
	{
		return d.ToDateTime(TimeOnly.MinValue);
	}

	private static DateTime DayEnd(DateOnly d)
	{
		return d.ToDateTime(TimeOnly.MaxValue);
	}

	[HttpGet("farm")]
	public async Task<IActionResult> Farm([FromQuery] ulong farmId, [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
	{
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
		if (denied != null)
		{
			return denied;
		}
		if (to < from)
		{
			return BadRequest(Result.Fail("to date must be on or after from date."));
		}
		DateTime start = DayStart(from);
		DateTime end = DayEnd(to);
		List<MilkRecord> milk = await (from x in _db.MilkRecords.AsNoTracking()
			where x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end
			select x).ToListAsync();
		decimal income = (await (from x in _db.FinanceTransactions.AsNoTracking()
			where x.FarmId == farmId && x.TransactionType == "INCOME" && x.TransactionDate >= start && x.TransactionDate <= end
			select x).SumAsync((Expression<Func<FinanceTransaction, decimal?>>)((FinanceTransaction x) => x.Amount), default(CancellationToken))).GetValueOrDefault();
		decimal expense = (await (from x in _db.FinanceTransactions.AsNoTracking()
			where x.FarmId == farmId && x.TransactionType == "EXPENSE" && x.TransactionDate >= start && x.TransactionDate <= end
			select x).SumAsync((Expression<Func<FinanceTransaction, decimal?>>)((FinanceTransaction x) => x.Amount), default(CancellationToken))).GetValueOrDefault();
		int health = await _db.HealthRecords.AsNoTracking().CountAsync((HealthRecord x) => x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end);
		int breeding = await _db.BreedingEvents.AsNoTracking().CountAsync((BreedingEvent x) => x.FarmId == farmId && x.EventDate >= start && x.EventDate <= end);
		decimal saleableLiters = milk.Where((MilkRecord x) => !x.IsRejected).Sum((MilkRecord x) => x.MilkLiters);
		return Ok(Result.Ok(new
		{
			from = from,
			to = to,
			milkLiters = milk.Sum((MilkRecord x) => x.MilkLiters),
			saleableLiters = saleableLiters,
			rejectedLiters = milk.Sum((MilkRecord x) => x.MilkLiters) - saleableLiters,
			milkRecords = milk.Count,
			income = income,
			expenses = expense,
			estimatedProfit = income - expense,
			healthEvents = health,
			breedingEvents = breeding
		}));
	}

	[HttpGet("milk")]
	public async Task<IActionResult> Milk([FromQuery] ulong farmId, [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
	{
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
		if (denied != null)
		{
			return denied;
		}
		if (to < from)
		{
			return BadRequest(Result.Fail("to date must be on or after from date."));
		}
		DateTime start = DayStart(from);
		DateTime end = DayEnd(to);
		return Ok(Result.Ok(await (from x in _db.MilkRecords.AsNoTracking()
			where x.FarmId == farmId && x.RecordDate >= start && x.RecordDate <= end
			group x by x.RecordDate.Date into g
			select new
			{
				date = g.Key,
				total = g.Sum((MilkRecord x) => x.MilkLiters),
				saleable = g.Where((MilkRecord x) => !x.IsRejected).Sum((MilkRecord x) => x.MilkLiters),
				animals = g.Select((MilkRecord x) => x.AnimalId).Distinct().Count()
			} into x
			orderby x.date
			select x).ToListAsync()));
	}
}
