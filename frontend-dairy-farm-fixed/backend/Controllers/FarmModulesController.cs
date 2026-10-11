using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DairyFarm.Api.Infrastructure;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class FarmModulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AnimalCodeGenerator _codes;
    private readonly FarmScopeGuard _farmScope;

    public FarmModulesController(AppDbContext db, AnimalCodeGenerator codes, FarmScopeGuard farmScope)
    {
        _db = db;
        // RECONCILED: the calf auto-creation path allocates the calf's code from
        // the per-farm counter in `animal_code_sequences`, which is exactly what
        // AnimalCodeGenerator does. The field was never wired up.
        _codes = codes;
        // Farm authorisation for every scoped module route. Server-authoritative;
        // never derived from a client-supplied id.
        _farmScope = farmScope;
    }

    /// <summary>
    /// Module route -> canonical entity type, mapped to the 49-table schema.
    /// Routes whose old entity was consolidated point at the table that absorbed
    /// it: feeds/feed-purchases -> feed_transactions, rations -> ration_plans,
    /// vaccinations -> vaccination_records, health-events -> health_records,
    /// mortalities -> animal_mortalities, expenses/income -> the single
    /// finance_transactions ledger, customers -> milk_buyers.
    /// Routes with no canonical equivalent (customer-payments, supplier-payments,
    /// growth-records) are NOT mapped and return 404 rather than inventing schema.
    /// </summary>
    private static readonly Dictionary<string, Type> Types = new(StringComparer.OrdinalIgnoreCase)
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

    private bool TryType(string module, out Type type) => Types.TryGetValue(module, out type!);

    /// <summary>
    /// How a module's farm ownership is determined.
    /// </summary>
    private enum Ownership
    {
        /// <summary>The entity carries its own farm_id column.</summary>
        DirectFarmId,
        /// <summary>Global catalogue: no farm ownership at all.</summary>
        None,
        /// <summary>Ownership comes from the parent Animal.</summary>
        ViaAnimal,
        /// <summary>Ownership comes from the parent RationPlan.</summary>
        ViaRationPlan
    }

    /// <summary>
    /// Per-module ownership strategy.
    ///
    /// BOUNDED AND EXPLICIT BY DESIGN. Ownership is resolved only through this
    /// fixed table plus the AppDbContext DbSets below - never through arbitrary
    /// reflection over unknown types or a caller-supplied type name. A module
    /// that is absent falls back to DirectFarmId, which is the safe default
    /// (authorise against the entity's own farm_id) rather than "allow".
    ///
    /// Verified against the canonical model:
    ///   - diseases / medicines have NO farm column and NO parent navigation:
    ///     they are global catalogues.
    ///   - lactations      -> lactrations.animal_id -> animals.farm_id
    ///   - ration-items    -> ration_plan_items.ration_plan_id -> ration_plans.farm_id
    ///   - everything else carries its own farm_id.
    /// </summary>
    private static readonly Dictionary<string, Ownership> Ownerships = new(StringComparer.OrdinalIgnoreCase)
    {
        ["diseases"] = Ownership.None,
        ["medicines"] = Ownership.None,
        ["lactations"] = Ownership.ViaAnimal,
        ["ration-items"] = Ownership.ViaRationPlan
    };

    private static Ownership OwnershipOf(string module) =>
        Ownerships.TryGetValue(module, out var o) ? o : Ownership.DirectFarmId;

    /// <summary>
    /// Resolves the farm that owns a loaded entity.
    /// Returns null when the module is global, or when ownership cannot be
    /// resolved - an unresolvable record is DENIED, never allowed by default.
    /// </summary>
    private async Task<ulong?> ResolveOwningFarmAsync(string module, object entity, CancellationToken ct)
    {
        switch (OwnershipOf(module))
        {
            case Ownership.None:
                return null; // global reference data

            case Ownership.ViaAnimal:
            {
                var animalId = GetULong(entity, "AnimalId");
                if (animalId == 0) return null;
                return await _db.Animals.AsNoTracking()
                    .Where(a => a.AnimalId == animalId)
                    .Select(a => (ulong?)a.FarmId)
                    .FirstOrDefaultAsync(ct);
            }

            case Ownership.ViaRationPlan:
            {
                var planId = GetULong(entity, "RationPlanId");
                if (planId == 0) return null;
                return await _db.RationPlans.AsNoTracking()
                    .Where(p => p.RationPlanId == planId)
                    .Select(p => (ulong?)p.FarmId)
                    .FirstOrDefaultAsync(ct);
            }

            default:
            {
                var farmId = GetULong(entity, "FarmId");
                return farmId == 0 ? null : farmId;
            }
        }
    }

    /// <summary>
    /// Authorises a PERSISTED record against the farm that actually owns it.
    /// Used by the id-based GET / PUT / DELETE paths so that a record id alone
    /// never grants access to a foreign farm.
    /// </summary>
    private async Task<IActionResult?> AuthorizePersistedAsync(string module, object entity, CancellationToken ct)
    {
        if (OwnershipOf(module) == Ownership.None)
        {
            return null; // global catalogue, no farm boundary
        }

        var owningFarm = await ResolveOwningFarmAsync(module, entity, ct);

        // Unresolvable ownership is denied rather than treated as permitted.
        if (owningFarm is null or 0)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                Result.Fail("You are not authorised to access this farm."));
        }

        return await this.EnsureFarmAccessAsync(_farmScope, owningFarm.Value, ct);
    }

    /// <summary>
    /// Authorises the farm a caller is trying to WRITE a new record into, so a
    /// body like { "farmId": 999999 } cannot create a row in a foreign farm.
    /// </summary>
    private async Task<IActionResult?> AuthorizeNewRecordAsync(string module, object entity, CancellationToken ct)
    {
        if (OwnershipOf(module) == Ownership.None)
        {
            return null;
        }

        var targetFarm = await ResolveOwningFarmAsync(module, entity, ct);

        if (targetFarm is null or 0)
        {
            return BadRequest(Result.Fail("A farmId is required for this record."));
        }

        return await this.EnsureFarmAccessAsync(_farmScope, targetFarm.Value, ct);
    }

    [HttpGet("{module}")]
    public async Task<IActionResult> List(string module, [FromQuery] ulong? farmId, [FromQuery] string? search, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int page=1, [FromQuery] int pageSize=100, CancellationToken ct=default)
    {
        if (!TryType(module, out var type)) return NotFound(Result.Fail("Unknown module."));

        // The client-supplied farmId is authorised BEFORE it is used as a filter.
        // An unauthorised farm is rejected outright; it is never silently
        // replaced by the caller's home farm.
        //
        // GLOBAL MODULES ARE EXEMPT: a module classified Ownership.None (e.g.
        // diseases, medicines) has no farm ownership, so its existing behaviour
        // is preserved and no farm requirement is imposed on it.
        if (farmId.HasValue && OwnershipOf(module) != Ownership.None)
        {
            var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId.Value, ct);
            if (denied is not null) return denied;
        }
        page=Math.Max(1,page); pageSize=Math.Clamp(pageSize,1,500);
        var set=((System.Linq.IQueryable)SetFor(type)).Cast<object>();
        var list=await set.ToListAsync();
        if (farmId.HasValue) list=list.Where(x=>GetULong(x,"FarmId")==farmId.Value).ToList();
        if (!string.IsNullOrWhiteSpace(search)) {
            var s=search.Trim().ToLowerInvariant();
            list=list.Where(x=>x.GetType().GetProperties().Any(p=>p.PropertyType==typeof(string) && (p.GetValue(x) as string)?.ToLowerInvariant().Contains(s)==true)).ToList();
        }
        var dateProp=type.GetProperty("Date") ?? type.GetProperty("CreatedAt");
        if (from.HasValue && dateProp!=null) list=list.Where(x=>ToDate(x,dateProp)>=from.Value).ToList();
        if (to.HasValue && dateProp!=null) list=list.Where(x=>ToDate(x,dateProp)<=to.Value).ToList();
        var total=list.Count;
        list=list.Skip((page-1)*pageSize).Take(pageSize).ToList();
        return Ok(new { success=true, data=list, page, pageSize, total, totalPages=Math.Max(1,(int)Math.Ceiling(total/(double)pageSize)) });
    }

    [HttpGet("{module}/{id:long}")]
    public async Task<IActionResult> Get(string module, ulong id, CancellationToken ct)
    {
        if (!TryType(module,out var type)) return NotFound(Result.Fail("Unknown module."));
        var entity=await FindByIdAsync(type, id);
        if (entity==null) return NotFound(Result.Fail("Record not found."));

        // Authorise against the farm that ACTUALLY owns this row, not anything
        // the caller supplied. A record id alone never grants access.
        var denied = await AuthorizePersistedAsync(module, entity, ct);
        if (denied is not null) return denied;

        return Ok(Result.Ok(entity));
    }

    [HttpPost("{module}")]
    public async Task<IActionResult> Create(string module, [FromBody] JsonElement body, CancellationToken ct)
    {
        if (!TryType(module,out var type)) return NotFound(Result.Fail("Unknown module."));
        var entity=JsonSerializer.Deserialize(body.GetRawText(),type,new JsonSerializerOptions{PropertyNameCaseInsensitive=true});
        if(entity==null) return BadRequest(Result.Fail("Invalid record."));

        // A body carrying a foreign farmId must not create a row there.
        var denied = await AuthorizeNewRecordAsync(module, entity, ct);
        if (denied is not null) return denied;

        var error=await ValidateBusinessRules(module,entity);
        if(error!=null) return BadRequest(Result.Fail(error));
        SetAuditFields(entity,true);
        _db.Add(entity);
        await ApplySideEffectsBeforeSave(module,entity);
        await _db.SaveChangesAsync();
        if (module.Equals("calvings",StringComparison.OrdinalIgnoreCase))
            await TryCreateCalfAsync((Calving)entity);
        await WriteAudit(module,entity,null,entity);
        return Ok(Result.Ok(entity,"Record saved successfully."));
    }

    [HttpPut("{module}/{id:long}")]
    public async Task<IActionResult> Update(string module, ulong id, [FromBody] JsonElement body, CancellationToken ct)
    {
        if (!TryType(module,out var type)) return NotFound(Result.Fail("Unknown module."));
        var entity=await FindByIdAsync(type, id);
        if(entity==null) return NotFound(Result.Fail("Record not found."));

        // Authorise the PERSISTED row's farm BEFORE any mutation, so a caller
        // from farm A can never modify a record owned by farm B.
        var denied = await AuthorizePersistedAsync(module, entity, ct);
        if (denied is not null) return denied;

        var old=JsonSerializer.Serialize(entity);

        // Remember the current ownership so the body cannot silently move the
        // record into another farm.
        var currentFarmId = OwnershipOf(module) == Ownership.DirectFarmId
            ? GetULong(entity, "FarmId")
            : 0UL;

        var incoming=JsonSerializer.Deserialize(body.GetRawText(),type,new JsonSerializerOptions{PropertyNameCaseInsensitive=true});
        if(incoming==null) return BadRequest(Result.Fail("Invalid record."));
        var key = _db.Model.FindEntityType(type)?.FindPrimaryKey()?.Properties
            .FirstOrDefault()?.PropertyInfo
            ?? throw new InvalidOperationException($"No primary key is mapped for '{type.Name}'.");
        key.SetValue(incoming, Convert.ChangeType(id, Nullable.GetUnderlyingType(key.PropertyType) ?? key.PropertyType));

        // Ownership transfer is not a supported operation on this endpoint: the
        // persisted farm_id is restored regardless of what the body asked for.
        if (currentFarmId != 0)
        {
            type.GetProperty("FarmId")?.SetValue(incoming, currentFarmId);
        }

        var error=await ValidateBusinessRules(module,incoming); if(error!=null) return BadRequest(Result.Fail(error));
        _db.Entry(entity).CurrentValues.SetValues(incoming);
        SetAuditFields(entity,false);
        await ApplySideEffectsBeforeSave(module,entity);
        await _db.SaveChangesAsync();
        await WriteAudit(module,entity,old,entity);
        return Ok(Result.Ok(entity,"Record updated successfully."));
    }

    [HttpDelete("{module}/{id:long}")]
    [Authorize(Roles="Owner,Manager")]
    public async Task<IActionResult> Delete(string module, ulong id, CancellationToken ct)
    {
        if (!TryType(module,out var type)) return NotFound(Result.Fail("Unknown module."));
        var entity=await FindByIdAsync(type, id);
        if(entity==null) return NotFound(Result.Fail("Record not found."));

        // Never delete on the strength of the primary key alone: the row's
        // owning farm must be authorised first.
        var denied = await AuthorizePersistedAsync(module, entity, ct);
        if (denied is not null) return denied;
        _db.Remove(entity); await _db.SaveChangesAsync();
        await WriteAudit(module,entity,JsonSerializer.Serialize(entity),null);
        return Ok(Result.Ok(new {id},"Record deleted."));
    }

    private static ulong GetULong(object o,string prop)
{
    var v=o.GetType().GetProperty(prop)?.GetValue(o);
    if(v is ulong u) return u;
    if(v is long l && l>0) return (ulong)l;
    if(v is int i && i>0) return (ulong)i;
    if(v is null) return 0;
    return ulong.TryParse(v.ToString(), out var n) ? n : 0;
}
    private static DateOnly? ToDate(object o,PropertyInfo p){var v=p.GetValue(o); return v switch { DateOnly d=>d, DateTime dt=>DateOnly.FromDateTime(dt), _=>null};}
    private static void SetAuditFields(object entity,bool create){var p=entity.GetType().GetProperty("CreatedAt"); if(create&&p?.PropertyType==typeof(DateTime))p.SetValue(entity,DateTime.UtcNow); var u=entity.GetType().GetProperty("UpdatedAt"); if(u?.PropertyType==typeof(DateTime))u.SetValue(entity,DateTime.UtcNow);}

    private async Task<string?> ValidateBusinessRules(string module, object e)
    {
        var farmId=GetULong(e,"FarmId");
        if(farmId==0 && module!="diseases" && module!="ration-items") return "FarmId is required for farm records.";
        foreach(var p in e.GetType().GetProperties().Where(p=>p.PropertyType==typeof(DateOnly))){
            if((DateOnly)p.GetValue(e)! == default) return $"{p.Name} is required.";
        }
        if (module is "breeding-events" or "pregnancies" or "calvings")
        {
            var animalId = GetULong(e, "AnimalId");
            if (animalId == 0 || !await _db.Animals.AnyAsync(x => x.AnimalId == animalId && x.FarmId == farmId))
                return "Animal not found in the selected farm.";
        }
        if (module is "health-records" or "treatments")
        {
            var animalId = GetULong(e, "AnimalId");
            if (animalId == 0 || !await _db.Animals.AnyAsync(x => x.AnimalId == animalId && x.FarmId == farmId))
                return "Animal not found in the selected farm.";
        }
        if (module == "pregnancies")
        {
            var breedingEventId = GetULong(e, "BreedingEventId");
            if (breedingEventId > 0 && !await _db.BreedingEvents.AnyAsync(
                    x => x.BreedingEventId == breedingEventId && x.FarmId == farmId))
                return "Breeding event not found in the selected farm.";
        }
        if (module == "calvings")
        {
            var pregnancyId = GetULong(e, "PregnancyId");
            if (pregnancyId > 0 && !await _db.Pregnancies.AnyAsync(
                    x => x.PregnancyId == pregnancyId && x.FarmId == farmId))
                return "Pregnancy not found in the selected farm.";
        }
        if (module == "treatments")
        {
            var healthRecordId = GetULong(e, "HealthRecordId");
            if (healthRecordId > 0 && !await _db.HealthRecords.AnyAsync(
                    x => x.HealthRecordId == healthRecordId && x.FarmId == farmId))
                return "Health record not found in the selected farm.";

            var medicineId = GetULong(e, "MedicineId");
            if (medicineId > 0 && !await _db.Medicines.AnyAsync(x => x.MedicineId == medicineId))
                return "Medicine not found.";
        }
        if (module == "vaccinations")
        {
            var animalId = GetULong(e, "AnimalId");
            var groupId = GetULong(e, "GroupId");
            if (animalId == 0 && groupId == 0)
                return "An animal or group is required.";
            if (animalId > 0 && !await _db.Animals.AnyAsync(x => x.AnimalId == animalId && x.FarmId == farmId))
                return "Animal not found in the selected farm.";
            if (groupId > 0 && !await _db.AnimalGroups.AnyAsync(x => x.GroupId == groupId && x.FarmId == farmId))
                return "Animal group not found in the selected farm.";
        }
        if (module == "feed-consumption")
        {
            var feedItemId = GetULong(e, "FeedItemId");
            if (feedItemId == 0 || !await _db.FeedItems.AnyAsync(x => x.FeedItemId == feedItemId && x.FarmId == farmId))
                return "Feed item not found in the selected farm.";
            var animalId = GetULong(e, "AnimalId");
            var groupId = GetULong(e, "GroupId");
            if (animalId == 0 && groupId == 0)
                return "An animal or group is required.";
            if (animalId > 0 && !await _db.Animals.AnyAsync(x => x.AnimalId == animalId && x.FarmId == farmId))
                return "Animal not found in the selected farm.";
            if (groupId > 0 && !await _db.AnimalGroups.AnyAsync(x => x.GroupId == groupId && x.FarmId == farmId))
                return "Animal group not found in the selected farm.";
        }
        if (module == "inventory-transactions")
        {
            var inventoryItemId = GetULong(e, "InventoryItemId");
            if (inventoryItemId == 0 || !await _db.InventoryItems.AnyAsync(
                    x => x.InventoryItemId == inventoryItemId && x.FarmId == farmId))
                return "Inventory item not found in the selected farm.";
            var supplierId = GetULong(e, "SupplierId");
            if (supplierId > 0 && !await _db.Suppliers.AnyAsync(
                    x => x.SupplierId == supplierId && x.FarmId == farmId))
                return "Supplier not found in the selected farm.";
        }
        if (module is "expenses" or "income")
        {
            var categoryId = GetULong(e, "CategoryId");
            if (categoryId == 0 || !await _db.FinanceCategories.AnyAsync(
                    x => x.CategoryId == categoryId && x.FarmId == farmId))
                return "Finance category not found in the selected farm.";
            var supplierId = GetULong(e, "SupplierId");
            if (supplierId > 0 && !await _db.Suppliers.AnyAsync(
                    x => x.SupplierId == supplierId && x.FarmId == farmId))
                return "Supplier not found in the selected farm.";
            var buyerId = GetULong(e, "BuyerId");
            if (buyerId > 0 && !await _db.MilkBuyers.AnyAsync(
                    x => x.BuyerId == buyerId && x.FarmId == farmId))
                return "Milk buyer not found in the selected farm.";
        }
        if(module=="milk-records" && GetDecimal(e,"MilkLiters") < 0) return "Milk quantity cannot be negative.";
        if(module=="feed-consumption" && GetDecimal(e,"Quantity")<0) return "Feed quantity cannot be negative.";
        if(module=="expenses" && GetDecimal(e,"Amount")<0) return "Expense amount cannot be negative.";
        if(module=="income" && GetDecimal(e,"Amount")<0) return "Income amount cannot be negative.";
        if(module=="animal-sales"){
            var aid=GetULong(e,"AnimalId"); var a=await _db.Animals.AsNoTracking().FirstOrDefaultAsync(x=>x.AnimalId==aid);
            if(a==null) return "Animal not found."; if(a.Status.Equals("DEAD",StringComparison.OrdinalIgnoreCase)) return "A dead animal cannot be sold.";
        }
        return null;
    }
    private static decimal GetDecimal(object o,string prop){var v=o.GetType().GetProperty(prop)?.GetValue(o); return v is decimal d?d:0;}
    private async Task ApplySideEffectsBeforeSave(string module, object e)
    {
        if(module=="milk-records"){var total=GetDecimal(e,"Morning")+GetDecimal(e,"Evening")+GetDecimal(e,"Third"); e.GetType().GetProperty("Total")?.SetValue(e,total);}
        if(module=="milk-sales"){var total=GetDecimal(e,"Quantity")*GetDecimal(e,"PricePerLiter"); e.GetType().GetProperty("Total")?.SetValue(e,total);}
        if(module=="animal-purchases"){var landed=GetDecimal(e,"PurchasePrice")+GetDecimal(e,"TransportCost")+GetDecimal(e,"VeterinaryCost"); e.GetType().GetProperty("LandedCost")?.SetValue(e,landed);}
        if(module=="animal-sales"){
            var aid=GetULong(e,"AnimalId"); var a=await _db.Animals.FindAsync(aid); if(a!=null){a.Status="SOLD";a.UpdatedAt=DateTime.UtcNow;}
        }
        if(module=="mortalities"){
            var aid=GetULong(e,"AnimalId"); var a=await _db.Animals.FindAsync(aid); if(a!=null){a.Status="DEAD";a.UpdatedAt=DateTime.UtcNow;}
        }
        if(module=="treatments"){
            // RECONCILED: medicines carry NO stock column - stock lives in the
            // signed inventory ledger - so nothing is decremented here. The
            // withdrawal dates are derived from withdrawal_milk_hours /
            // withdrawal_meat_days and stored on the treatment, which is what
            // the milk hold actually reads.
            var mid=GetULong(e,"MedicineId");
            if(mid>0){
                var med=await _db.Medicines.AsNoTracking().FirstOrDefaultAsync(x=>x.MedicineId==mid);
                if(med==null)throw new InvalidOperationException("Medicine not found.");
                var rawStart=e.GetType().GetProperty("StartDate")?.GetValue(e);
                var start=rawStart is DateTime sdt ? sdt.Date : (DateTime?)null;
                if(start.HasValue){
                    e.GetType().GetProperty("WithdrawalMilkUntil")?.SetValue(e,start.Value.AddHours(med.WithdrawalMilkHours));
                    e.GetType().GetProperty("WithdrawalMeatUntil")?.SetValue(e,start.Value.AddDays(med.WithdrawalMeatDays));
                }
            }
        }
    }
    /// <summary>
    /// Registers calves when a calving is recorded.
    ///
    /// RECONCILED against the canonical schema: Calving has `calving_date`,
    /// `animal_id` (the dam) and `calf_count`. There is no Calving.CalfId /
    /// Calving.CalfSex / Calving.DamId / Calving.SireId column, so calf detail
    /// lives on the `calves` row and the link back to a registered animal is
    /// `calves.calf_animal_id`.
    /// </summary>
    private async Task TryCreateCalfAsync(Calving calving)
    {
        if (calving.CalfCount <= 0 || calving.CalvingDate == default) return;

        // Idempotent: never create calves twice for the same calving.
        if (await _db.Calves.AnyAsync(c => c.CalvingId == calving.CalvingId)) return;

        var sire = await _db.Calves
            .Where(c => c.DamId == calving.AnimalId)
            .OrderByDescending(c => c.BirthDate)
            .Select(c => (ulong?)c.SireId)
            .FirstOrDefaultAsync();

        for (var i = 0; i < calving.CalfCount; i++)
        {
            Animal? calfAnimal = null;

            // The first calf is registered as an animal so it joins the herd and
            // receives a code from the per-farm counter; any further calves are
            // recorded as `calves` rows only.
            if (i == 0)
            {
                var code = await _codes.NextCodeAsync(calving.FarmId);

                calfAnimal = new Animal
                {
                    FarmId = calving.FarmId,
                    AnimalCode = code,
                    Sex = "FEMALE",
                    // RECONCILED: animals.date_of_birth (there is no `dob`).
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

    /// <summary>
    /// Resolve a canonical entity type to its queryable set, for the list path.
    ///
    /// The lookup is restricted to AppDbContext's OWN DbSet properties, so this
    /// cannot be steered into arbitrary reflection or an unmapped entity type.
    /// </summary>
    private IQueryable SetFor(Type type)
    {
        var property = typeof(AppDbContext)
            .GetProperties()
            .FirstOrDefault(p =>
                p.PropertyType.IsGenericType
                && p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>)
                && p.PropertyType.GetGenericArguments()[0] == type);

        if (property?.GetValue(_db) is not IQueryable set)
        {
            throw new InvalidOperationException($"No DbSet is mapped for '{type.Name}'.");
        }

        return set;
    }

    /// <summary>
    /// Fetch one row of a canonical entity type by primary key.
    ///
    /// EF Core has no usable non-generic Set(Type)/FindAsync, so the work is
    /// done in a generic helper invoked through MakeGenericMethod. The type is
    /// never taken from caller input: it always comes from the Types map above.
    /// </summary>
    private Task<object?> FindByIdAsync(Type type, ulong id)
    {
        var core = typeof(FarmModulesController)
            .GetMethod(nameof(FindByIdCoreAsync), BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException("FindByIdCoreAsync is missing.");

        return (Task<object?>)core.MakeGenericMethod(type).Invoke(null, new object?[] { _db, id })!;
    }

    private static async Task<object?> FindByIdCoreAsync<TEntity>(AppDbContext db, ulong id)
        where TEntity : class
    {
        return await db.Set<TEntity>().FindAsync(new object?[] { id }).ConfigureAwait(false);
    }

    private async Task WriteAudit(string module,object entity,string? oldValue,object? newValue){
        var uid=ulong.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier),out var x)?x:(ulong?)null;
        var farm=GetULong(entity,"FarmId");
        var entityId = _db.Entry(entity).Metadata.FindPrimaryKey()?.Properties
            .FirstOrDefault()?.PropertyInfo?.GetValue(entity);
        var auditId = entityId is null ? 0UL : Convert.ToUInt64(entityId);
        _db.AuditLogs.Add(new AuditLog{UserId=uid,FarmId=farm==0?null:farm,Action=newValue==null?"DELETE":oldValue==null?"CREATE":"UPDATE",EntityType=module,EntityId=auditId,OldValues=oldValue,NewValues=newValue==null?null:JsonSerializer.Serialize(newValue),CreatedAt=DateTime.UtcNow,Module=module,IpAddress=HttpContext.Connection.RemoteIpAddress?.ToString()});
        await _db.SaveChangesAsync();
    }
}