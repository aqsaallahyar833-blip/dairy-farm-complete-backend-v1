using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class FarmModulesController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly AnimalCodeGenerator _codes;

	private static readonly Dictionary<string, Type> Types = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
	{
		["milk-records"] = typeof(MilkRecord),
		["lactations"] = typeof(Lactation),
		["milk-buyers"] = typeof(MilkBuyer),
		["milk-sales"] = typeof(MilkSale),
		["breeding-events"] = typeof(BreedingEvent),
		["pregnancies"] = typeof(Pregnancy),
		["calvings"] = typeof(Calving),
		["calves"] = typeof(Calf),
		["health-records"] = typeof(HealthRecord),
		["diseases"] = typeof(Disease),
		["medicines"] = typeof(Medicine),
		["treatments"] = typeof(Treatment),
		["vaccinations"] = typeof(VaccinationRecord),
		["feeds"] = typeof(FeedItem),
		["feed-transactions"] = typeof(FeedTransaction),
		["feed-consumption"] = typeof(FeedConsumption),
		["rations"] = typeof(RationPlan),
		["ration-items"] = typeof(RationPlanItem),
		["suppliers"] = typeof(Supplier),
		["inventory-items"] = typeof(InventoryItem),
		["inventory-transactions"] = typeof(InventoryTransaction),
		["animal-purchases"] = typeof(AnimalPurchase),
		["animal-sales"] = typeof(AnimalSale),
		["mortalities"] = typeof(AnimalMortality),
		["finance-categories"] = typeof(FinanceCategory),
		["expenses"] = typeof(FinanceTransaction),
		["income"] = typeof(FinanceTransaction),
		["tasks"] = typeof(TaskItem),
		["alerts"] = typeof(Alert),
		["notifications"] = typeof(Notification),
		["attachments"] = typeof(Attachment),
		["audit-logs"] = typeof(AuditLog)
	};

	public FarmModulesController(AppDbContext db, AnimalCodeGenerator codes)
	{
		_db = db;
		_codes = codes;
	}

	private bool TryType(string module, out Type type)
	{
		return Types.TryGetValue(module, out type);
	}

	[HttpGet("{module}")]
	public async Task<IActionResult> List(string module, [FromQuery] ulong? farmId, [FromQuery] string? search, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
	{
		if (!TryType(module, out Type type))
		{
			return NotFound(Result.Fail("Unknown module."));
		}
		page = Math.Max(1, page);
		pageSize = Math.Clamp(pageSize, 1, 500);
		IQueryable<object> set = SetFor(type).Cast<object>();
		List<object> list = await set.ToListAsync();
		if (farmId.HasValue)
		{
			list = list.Where((object x) => GetULong(x, "FarmId") == farmId.Value).ToList();
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			string s = search.Trim().ToLowerInvariant();
			list = list.Where((object x) => x.GetType().GetProperties().Any((PropertyInfo p) => p.PropertyType == typeof(string) && ((p.GetValue(x) as string)?.ToLowerInvariant().Contains(s) ?? false))).ToList();
		}
		PropertyInfo dateProp = type.GetProperty("Date") ?? type.GetProperty("CreatedAt");
		if (from.HasValue && dateProp != null)
		{
			list = list.Where((object x) => ToDate(x, dateProp) >= from.Value).ToList();
		}
		if (to.HasValue && dateProp != null)
		{
			list = list.Where((object x) => ToDate(x, dateProp) <= to.Value).ToList();
		}
		int total = list.Count;
		list = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();
		return Ok(new
		{
			success = true,
			data = list,
			page = page,
			pageSize = pageSize,
			total = total,
			totalPages = Math.Max(1, (int)Math.Ceiling((double)total / (double)pageSize))
		});
	}

	[HttpGet("{module}/{id:long}")]
	public async Task<IActionResult> Get(string module, ulong id)
	{
		if (!TryType(module, out Type type))
		{
			return NotFound(Result.Fail("Unknown module."));
		}
		object entity = await FindByIdAsync(type, id);
		IActionResult result;
		if (entity != null)
		{
			IActionResult actionResult = Ok(Result.Ok(entity));
			result = actionResult;
		}
		else
		{
			IActionResult actionResult = NotFound(Result.Fail("Record not found."));
			result = actionResult;
		}
		return result;
	}

	[HttpPost("{module}")]
	public async Task<IActionResult> Create(string module, [FromBody] JsonElement body)
	{
		if (!TryType(module, out Type type))
		{
			return NotFound(Result.Fail("Unknown module."));
		}
		object entity = JsonSerializer.Deserialize(body.GetRawText(), type, new JsonSerializerOptions
		{
			PropertyNameCaseInsensitive = true
		});
		if (entity == null)
		{
			return BadRequest(Result.Fail("Invalid record."));
		}
		string error = await ValidateBusinessRules(module, entity);
		if (error != null)
		{
			return BadRequest(Result.Fail(error));
		}
		SetAuditFields(entity, create: true);
		_db.Add(entity);
		await ApplySideEffectsBeforeSave(module, entity);
		await _db.SaveChangesAsync();
		if (module.Equals("calvings", StringComparison.OrdinalIgnoreCase))
		{
			await TryCreateCalfAsync((Calving)entity);
		}
		await WriteAudit(module, entity, null, entity);
		return Ok(Result.Ok(entity, "Record saved successfully."));
	}

	[HttpPut("{module}/{id:long}")]
	public async Task<IActionResult> Update(string module, ulong id, [FromBody] JsonElement body)
	{
		if (!TryType(module, out Type type))
		{
			return NotFound(Result.Fail("Unknown module."));
		}
		object entity = await FindByIdAsync(type, id);
		if (entity == null)
		{
			return NotFound(Result.Fail("Record not found."));
		}
		string old = JsonSerializer.Serialize(entity);
		object incoming = JsonSerializer.Deserialize(body.GetRawText(), type, new JsonSerializerOptions
		{
			PropertyNameCaseInsensitive = true
		});
		if (incoming == null)
		{
			return BadRequest(Result.Fail("Invalid record."));
		}
		PropertyInfo key = type.GetProperty("Id");
		key.SetValue(incoming, id);
		string error = await ValidateBusinessRules(module, incoming);
		if (error != null)
		{
			return BadRequest(Result.Fail(error));
		}
		_db.Entry(entity).CurrentValues.SetValues(incoming);
		SetAuditFields(entity, create: false);
		await ApplySideEffectsBeforeSave(module, entity);
		await _db.SaveChangesAsync();
		await WriteAudit(module, entity, old, entity);
		return Ok(Result.Ok(entity, "Record updated successfully."));
	}

	[HttpDelete("{module}/{id:long}")]
	[Authorize(Roles = "Owner,Manager")]
	public async Task<IActionResult> Delete(string module, ulong id)
	{
		if (!TryType(module, out Type type))
		{
			return NotFound(Result.Fail("Unknown module."));
		}
		object entity = await FindByIdAsync(type, id);
		if (entity == null)
		{
			return NotFound(Result.Fail("Record not found."));
		}
		_db.Remove(entity);
		await _db.SaveChangesAsync();
		await WriteAudit(module, entity, JsonSerializer.Serialize(entity), null);
		return Ok(Result.Ok(new { id }, "Record deleted."));
	}

	private static ulong GetULong(object o, string prop)
	{
		object obj = o.GetType().GetProperty(prop)?.GetValue(o);
		if (obj is ulong result)
		{
			return result;
		}
		if (obj is long num && num > 0)
		{
			return (ulong)num;
		}
		if (obj is int num2 && num2 > 0)
		{
			return (ulong)num2;
		}
		if (obj == null)
		{
			return 0uL;
		}
		ulong result2;
		return ulong.TryParse(obj.ToString(), out result2) ? result2 : 0;
	}

	private static DateOnly? ToDate(object o, PropertyInfo p)
	{
		object value = p.GetValue(o);
		if (1 == 0)
		{
		}
		DateOnly? result;
		if (value is DateOnly value2)
		{
			result = value2;
		}
		else
		{
			result = ((!(value is DateTime dateTime)) ? ((DateOnly?)null) : new DateOnly?(DateOnly.FromDateTime(dateTime)));
		}
		if (1 == 0)
		{
		}
		return result;
	}

	private static void SetAuditFields(object entity, bool create)
	{
		PropertyInfo property = entity.GetType().GetProperty("CreatedAt");
		if (create && property?.PropertyType == typeof(DateTime))
		{
			property.SetValue(entity, DateTime.UtcNow);
		}
		PropertyInfo property2 = entity.GetType().GetProperty("UpdatedAt");
		if (property2?.PropertyType == typeof(DateTime))
		{
			property2.SetValue(entity, DateTime.UtcNow);
		}
	}

	private async Task<string?> ValidateBusinessRules(string module, object e)
	{
		ulong farmId = GetULong(e, "FarmId");
		if (farmId == 0L && module != "diseases" && module != "ration-items")
		{
			return "FarmId is required for farm records.";
		}
		foreach (PropertyInfo p in from propertyInfo in e.GetType().GetProperties()
			where propertyInfo.PropertyType == typeof(DateOnly)
			select propertyInfo)
		{
			if ((DateOnly)p.GetValue(e) == default(DateOnly))
			{
				return p.Name + " is required.";
			}
		}
		if (module == "milk-records" && new decimal[4]
		{
			GetDecimal(e, "Morning"),
			GetDecimal(e, "Evening"),
			GetDecimal(e, "Third"),
			GetDecimal(e, "Rejected")
		}.Any((decimal x) => x < 0m))
		{
			return "Milk quantities cannot be negative.";
		}
		if (module == "feed-consumption" && GetDecimal(e, "Quantity") < 0m)
		{
			return "Feed quantity cannot be negative.";
		}
		if (module == "expenses" && GetDecimal(e, "Amount") < 0m)
		{
			return "Expense amount cannot be negative.";
		}
		if (module == "income" && GetDecimal(e, "Amount") < 0m)
		{
			return "Income amount cannot be negative.";
		}
		if (module == "animal-sales")
		{
			ulong aid = GetULong(e, "AnimalId");
			Animal a = await _db.Animals.AsNoTracking().FirstOrDefaultAsync((Animal x) => x.AnimalId == aid);
			if (a == null)
			{
				return "Animal not found.";
			}
			if (a.Status.Equals("DEAD", StringComparison.OrdinalIgnoreCase))
			{
				return "A dead animal cannot be sold.";
			}
		}
		return null;
	}

	private static decimal GetDecimal(object o, string prop)
	{
		return (o.GetType().GetProperty(prop)?.GetValue(o) is decimal num) ? num : 0m;
	}

	private async Task ApplySideEffectsBeforeSave(string module, object e)
	{
		if (module == "milk-records")
		{
			decimal total = GetDecimal(e, "Morning") + GetDecimal(e, "Evening") + GetDecimal(e, "Third");
			e.GetType().GetProperty("Total")?.SetValue(e, total);
		}
		if (module == "milk-sales")
		{
			decimal total2 = GetDecimal(e, "Quantity") * GetDecimal(e, "PricePerLiter");
			e.GetType().GetProperty("Total")?.SetValue(e, total2);
		}
		if (module == "animal-purchases")
		{
			decimal landed = GetDecimal(e, "PurchasePrice") + GetDecimal(e, "TransportCost") + GetDecimal(e, "VeterinaryCost");
			e.GetType().GetProperty("LandedCost")?.SetValue(e, landed);
		}
		if (module == "animal-sales")
		{
			ulong aid = GetULong(e, "AnimalId");
			Animal a = await _db.Animals.FindAsync(aid);
			if (a != null)
			{
				a.Status = "SOLD";
				a.UpdatedAt = DateTime.UtcNow;
			}
		}
		if (module == "mortalities")
		{
			ulong aid2 = GetULong(e, "AnimalId");
			Animal a2 = await _db.Animals.FindAsync(aid2);
			if (a2 != null)
			{
				a2.Status = "DEAD";
				a2.UpdatedAt = DateTime.UtcNow;
			}
		}
		if (!(module == "treatments"))
		{
			return;
		}
		ulong mid = GetULong(e, "MedicineId");
		if (mid != 0)
		{
			Medicine med = await _db.Medicines.AsNoTracking().FirstOrDefaultAsync((Medicine x) => x.MedicineId == mid);
			if (med == null)
			{
				throw new InvalidOperationException("Medicine not found.");
			}
			DateTime? start = ((e.GetType().GetProperty("StartDate")?.GetValue(e) is DateTime sdt) ? new DateTime?(sdt.Date) : ((DateTime?)null));
			if (start.HasValue)
			{
				e.GetType().GetProperty("WithdrawalMilkUntil")?.SetValue(e, start.Value.AddHours(med.WithdrawalMilkHours));
				e.GetType().GetProperty("WithdrawalMeatUntil")?.SetValue(e, start.Value.AddDays(med.WithdrawalMeatDays));
			}
		}
	}

	private async Task TryCreateCalfAsync(Calving calving)
	{
		if (calving.CalfCount <= 0 || calving.CalvingDate == default(DateTime) || await _db.Calves.AnyAsync((Calf c) => c.CalvingId == (ulong?)calving.CalvingId))
		{
			return;
		}
		ulong? sire = await (from c in _db.Calves
			where c.DamId == (ulong?)calving.AnimalId
			orderby c.BirthDate descending
			select c.SireId).FirstOrDefaultAsync();
		for (int i = 0; i < calving.CalfCount; i++)
		{
			Animal calfAnimal = null;
			if (i == 0)
			{
				string code = await _codes.NextCodeAsync(calving.FarmId);
				calfAnimal = new Animal
				{
					FarmId = calving.FarmId,
					AnimalCode = code,
					Sex = "FEMALE",
					DateOfBirth = calving.CalvingDate,
					Status = "CALF",
					DamId = calving.AnimalId,
					SireId = sire,
					CreatedAt = DateTime.UtcNow,
					UpdatedAt = DateTime.UtcNow
				};
				_db.Animals.Add(calfAnimal);
				await _db.SaveChangesAsync();
			}
			_db.Calves.Add(new Calf
			{
				FarmId = calving.FarmId,
				CalvingId = calving.CalvingId,
				CalfAnimalId = calfAnimal?.AnimalId,
				DamId = calving.AnimalId,
				SireId = sire,
				BirthDate = calving.CalvingDate,
				Sex = "FEMALE",
				ColostrumReceived = calving.ColostrumGiven,
				ColostrumTimeHours = calving.ColostrumTimeHours,
				Outcome = "ALIVE",
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			});
		}
		await _db.SaveChangesAsync();
	}

	private IQueryable SetFor(Type type)
	{
		if (!(typeof(AppDbContext).GetProperties().FirstOrDefault((PropertyInfo p) => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>) && p.PropertyType.GetGenericArguments()[0] == type)?.GetValue(_db) is IQueryable result))
		{
			throw new InvalidOperationException("No DbSet is mapped for '" + type.Name + "'.");
		}
		return result;
	}

	private Task<object?> FindByIdAsync(Type type, ulong id)
	{
		MethodInfo methodInfo = typeof(FarmModulesController).GetMethod("FindByIdCoreAsync", BindingFlags.Static | BindingFlags.NonPublic) ?? throw new InvalidOperationException("FindByIdCoreAsync is missing.");
		return (Task<object>)methodInfo.MakeGenericMethod(type).Invoke(null, new object[2] { _db, id });
	}

	private static async Task<object?> FindByIdCoreAsync<TEntity>(AppDbContext db, ulong id) where TEntity : class
	{
		return await db.Set<TEntity>().FindAsync(id).ConfigureAwait(continueOnCapturedContext: false);
	}

	private async Task WriteAudit(string module, object entity, string? oldValue, object? newValue)
	{
		ulong? uid = (ulong.TryParse(User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"), out var x) ? new ulong?(x) : ((ulong?)null));
		ulong farm = GetULong(entity, "FarmId");
		_db.AuditLogs.Add(new AuditLog
		{
			UserId = uid,
			FarmId = ((farm == 0L) ? ((ulong?)null) : new ulong?(farm)),
			Action = ((newValue == null) ? "DELETE" : ((oldValue == null) ? "CREATE" : "UPDATE")),
			EntityType = module,
			EntityId = GetULong(entity, "Id"),
			OldValues = oldValue,
			NewValues = ((newValue == null) ? null : JsonSerializer.Serialize(newValue)),
			CreatedAt = DateTime.UtcNow,
			Module = module,
			IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
		});
		await _db.SaveChangesAsync();
	}
}
