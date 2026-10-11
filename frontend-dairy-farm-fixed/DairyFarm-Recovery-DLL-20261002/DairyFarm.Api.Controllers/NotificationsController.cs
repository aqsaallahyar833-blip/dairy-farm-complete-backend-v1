using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly FarmScopeGuard _farmScope;

	private ulong? UserId
	{
		get
		{
			ulong result;
			return ulong.TryParse(User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"), out result) ? new ulong?(result) : ((ulong?)null);
		}
	}

	public NotificationsController(AppDbContext db, FarmScopeGuard farmScope)
	{
		_db = db;
		_farmScope = farmScope;
	}

	[HttpGet]
	public async Task<IActionResult> List([FromQuery] ulong farmId, [FromQuery] bool unreadOnly = false, CancellationToken ct = default(CancellationToken))
	{
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
		if (denied != null)
		{
			return denied;
		}
		IQueryable<Notification> q = from x in _db.Notifications.AsNoTracking()
			where x.FarmId == farmId
			select x;
		if (UserId.HasValue)
		{
			q = q.Where((Notification x) => x.UserId == (ulong?)null || x.UserId == UserId);
		}
		if (unreadOnly)
		{
			q = q.Where((Notification x) => !x.IsRead);
		}
		return Ok(Result.Ok(await q.OrderByDescending((Notification x) => x.CreatedAt).Take(200).ToListAsync()));
	}

	[HttpPost("{id:long}/read")]
	public async Task<IActionResult> Read(ulong id, CancellationToken ct = default(CancellationToken))
	{
		Notification n = await _db.Notifications.AsNoTracking().FirstOrDefaultAsync((Notification x) => x.NotificationId == id, ct);
		if (n == null)
		{
			return NotFound(Result.Fail("Notification not found."));
		}
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, n.FarmId, ct);
		if (denied != null)
		{
			return denied;
		}
		Notification tracked = await _db.Notifications.FindAsync(id);
		if (tracked == null)
		{
			return NotFound(Result.Fail("Notification not found."));
		}
		tracked.IsRead = true;
		await _db.SaveChangesAsync(ct);
		return Ok(Result.Ok(tracked, "Notification marked as read."));
	}

	[HttpPost("read-all")]
	public async Task<IActionResult> ReadAll([FromQuery] ulong farmId, CancellationToken ct = default(CancellationToken))
	{
		IActionResult denied = await this.EnsureFarmAccessAsync(_farmScope, farmId, ct);
		if (denied != null)
		{
			return denied;
		}
		List<Notification> rows = await _db.Notifications.Where((Notification x) => x.FarmId == farmId && !x.IsRead && (x.UserId == (ulong?)null || x.UserId == UserId)).ToListAsync();
		foreach (Notification n in rows)
		{
			n.IsRead = true;
		}
		await _db.SaveChangesAsync(ct);
		return Ok(Result.Ok(new
		{
			count = rows.Count
		}, "All notifications marked as read."));
	}
}
