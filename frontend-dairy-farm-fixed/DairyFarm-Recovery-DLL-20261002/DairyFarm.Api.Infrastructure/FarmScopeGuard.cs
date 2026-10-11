using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Infrastructure;

public sealed class FarmScopeGuard
{
	private readonly AppDbContext _db;

	public FarmScopeGuard(AppDbContext db)
	{
		_db = db;
	}

	public async Task<bool> IsAuthorizedAsync(ulong userId, ulong farmId, CancellationToken ct = default(CancellationToken))
	{
		if (await _db.Users.AsNoTracking().AnyAsync((User u) => u.UserId == userId && u.FarmId == farmId, ct))
		{
			return true;
		}
		return await _db.FarmUserAccess.AsNoTracking().AnyAsync((FarmUserAccess a) => a.UserId == userId && a.FarmId == farmId, ct);
	}
}
