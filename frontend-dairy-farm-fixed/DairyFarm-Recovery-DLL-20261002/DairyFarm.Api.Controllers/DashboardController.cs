using System;
using System.Collections.Generic;
using System.Linq;
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

	[HttpGet]
	public async Task<IActionResult> Get([FromQuery] ulong farmId, [FromQuery] DateOnly? date, CancellationToken ct)
	{
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
		if (denied != null)
		{
			return denied;
		}
		DateOnly d = date ?? DateOnly.FromDateTime(DateTime.Today);
		DateTime dayStart = d.ToDateTime(TimeOnly.MinValue);
		DateTime dayEnd = d.ToDateTime(TimeOnly.MaxValue);
		DateTime monthStart = new DateTime(d.Year, d.Month, 1);
		DateTime monthEnd = monthStart.AddMonths(1);
		List<Animal> animals = await (from a in _db.Animals.AsNoTracking()
			where a.FarmId == farmId
			select a).ToListAsync();
		List<MilkRecord> milk = await (from x in _db.MilkRecords.AsNoTracking()
			where x.FarmId == farmId && x.RecordDate >= ((DateTime)dayStart).AddDays(-1.0) && x.RecordDate <= dayEnd
			select x).ToListAsync();
		List<MilkRecord> monthMilk = await (from x in _db.MilkRecords.AsNoTracking()
			where x.FarmId == farmId && x.RecordDate >= monthStart && x.RecordDate < monthEnd
			select x).ToListAsync();
		List<FinanceTransaction> ledger = await (from x in _db.FinanceTransactions.AsNoTracking()
			where x.FarmId == farmId && x.TransactionDate >= monthStart && x.TransactionDate < monthEnd
			select x).ToListAsync();
		decimal revenue = ledger.Where((FinanceTransaction x) => x.TransactionType == "INCOME").Sum((FinanceTransaction x) => x.Amount);
		decimal monthExpenses = ledger.Where((FinanceTransaction x) => x.TransactionType == "EXPENSE").Sum((FinanceTransaction x) => x.Amount);
		decimal today = milk.Where((MilkRecord x) => x.RecordDate >= dayStart && x.RecordDate <= dayEnd).Sum((MilkRecord x) => x.MilkLiters);
		decimal yesterday = milk.Where((MilkRecord x) => x.RecordDate >= dayStart.AddDays(-1.0) && x.RecordDate <= dayStart.AddTicks(-1L)).Sum((MilkRecord x) => x.MilkLiters);
		decimal month = monthMilk.Sum((MilkRecord x) => x.MilkLiters);
		int lactating = animals.Count((Animal a) => a.Status == "LACTATING");
		int totalAnimals = animals.Count((Animal a) => a.Status != "SOLD" && a.Status != "DEAD");
		int lactating2 = lactating;
		int dry = animals.Count((Animal a) => a.Status == "DRY");
		int pregnant = animals.Count((Animal a) => a.Status == "PREGNANT");
		int open = animals.Count((Animal a) => a.Status == "ACTIVE");
		int heifers = animals.Count((Animal a) => a.Status == "HEIFER");
		int calves = animals.Count((Animal a) => a.Status == "CALF");
		int bulls = animals.Count((Animal a) => a.Status == "BULL");
		int sick = animals.Count((Animal a) => a.Status == "SICK");
		int quarantine = animals.Count((Animal a) => a.Status == "QUARANTINE");
		decimal todayMilk = today;
		decimal yesterdayMilk = yesterday;
		decimal averageMilkPerCow = ((lactating == 0) ? 0m : (today / (decimal)lactating));
		decimal monthlyMilk = month;
		decimal milkRevenue = revenue;
		decimal monthlyExpenses = monthExpenses;
		decimal estimatedProfit = revenue - monthExpenses;
		return Ok(new
		{
			success = true,
			data = new
			{
				totalAnimals = totalAnimals,
				lactating = lactating2,
				dry = dry,
				pregnant = pregnant,
				open = open,
				heifers = heifers,
				calves = calves,
				bulls = bulls,
				sick = sick,
				quarantine = quarantine,
				todayMilk = todayMilk,
				yesterdayMilk = yesterdayMilk,
				averageMilkPerCow = averageMilkPerCow,
				monthlyMilk = monthlyMilk,
				milkRevenue = milkRevenue,
				monthlyExpenses = monthlyExpenses,
				estimatedProfit = estimatedProfit,
				breedingReminders = await _db.Tasks.CountAsync((TaskItem x) => x.FarmId == farmId && x.DueDate <= dayEnd && x.Status != "COMPLETED" && x.Status != "CANCELLED"),
				healthAlerts = await _db.HealthRecords.CountAsync((HealthRecord x) => x.FarmId == farmId && x.RecoveryDate == null)
			}
		});
	}
}
