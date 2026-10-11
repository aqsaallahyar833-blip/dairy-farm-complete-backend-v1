using System.Security.Claims;
using DairyFarm.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FarmScopeGuard _farmScope;

    public NotificationsController(AppDbContext db, FarmScopeGuard farmScope)
    {
        _db = db;
        _farmScope = farmScope;
    }

    private ulong? UserId => ulong.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier),out var id)?id:null;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ulong farmId, [FromQuery] bool unreadOnly=false, CancellationToken ct=default)
    {
        // The client-supplied farmId must be authorised before any row is read.
        var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
        if (denied is not null) return denied;

        var q=_db.Notifications.AsNoTracking().Where(x=>x.FarmId==farmId);
        if(UserId.HasValue) q=q.Where(x=>x.UserId==null||x.UserId==UserId);
        if(unreadOnly) q=q.Where(x=>!x.IsRead);
        return Ok(Result.Ok(await q.OrderByDescending(x=>x.CreatedAt).Take(200).ToListAsync()));
    }

    [HttpPost("{id:long}/read")]
    public async Task<IActionResult> Read(ulong id, CancellationToken ct=default)
    {
        // Ownership check: the row must belong to a farm the caller can access.
        // Without this, any authenticated user could flip any notification.
        var n=await _db.Notifications.AsNoTracking().FirstOrDefaultAsync(x=>x.NotificationId==id,ct);
        if(n==null)return NotFound(Result.Fail("Notification not found."));

        var denied = await this.EnsureFarmAccessAsync(_farmScope, n.FarmId, ct);
        if (denied is not null) return denied;

        var tracked=await _db.Notifications.FindAsync(id);
        if(tracked==null)return NotFound(Result.Fail("Notification not found."));
        tracked.IsRead=true; await _db.SaveChangesAsync(ct); return Ok(Result.Ok(tracked,"Notification marked as read."));
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll([FromQuery] ulong farmId, CancellationToken ct=default)
    {
        var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
        if (denied is not null) return denied;

        var rows=await _db.Notifications.Where(x=>x.FarmId==farmId&&!x.IsRead&&(x.UserId==null||x.UserId==UserId)).ToListAsync();
        foreach(var n in rows)n.IsRead=true; await _db.SaveChangesAsync(ct);
        return Ok(Result.Ok(new {count=rows.Count},"All notifications marked as read."));
    }
}