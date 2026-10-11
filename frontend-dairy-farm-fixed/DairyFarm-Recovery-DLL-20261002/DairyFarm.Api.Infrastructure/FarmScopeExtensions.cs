using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace DairyFarm.Api.Infrastructure;

public static class FarmScopeExtensions
{
	public static async Task<IActionResult?> EnsureFarmAccessAsync(this ControllerBase controller, FarmScopeGuard guard, ulong? requestedFarmId, CancellationToken ct = default(CancellationToken))
	{
		if (!CurrentUser.TryGetUserId(controller.User, out var userId))
		{
			return controller.Unauthorized(Result.Fail("Authentication is required."));
		}
		bool flag;
		if (requestedFarmId.HasValue)
		{
			ulong valueOrDefault = requestedFarmId.GetValueOrDefault();
			if (valueOrDefault != 0L)
			{
				flag = false;
				goto IL_0072;
			}
		}
		flag = true;
		goto IL_0072;
		IL_0072:
		if (flag)
		{
			return controller.BadRequest(Result.Fail("A farmId query parameter is required."));
		}
		if (!(await guard.IsAuthorizedAsync(userId, requestedFarmId.Value, ct)))
		{
			return controller.StatusCode(403, Result.Fail("You are not authorised to access this farm."));
		}
		return null;
	}
}
