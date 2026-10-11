using System.Globalization;
using System.Security.Claims;
using System.Security.Principal;

namespace DairyFarm.Api.Controllers;

public static class CurrentUser
{
	public static ulong? GetUserId(ClaimsPrincipal principal)
	{
		IIdentity? identity = principal.Identity;
		if (identity == null || !identity.IsAuthenticated)
		{
			return null;
		}
		string text = principal.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value ?? principal.FindFirst("sub")?.Value;
		if (string.IsNullOrWhiteSpace(text))
		{
			return null;
		}
		ulong result;
		return ulong.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out result) ? new ulong?(result) : ((ulong?)null);
	}

	public static bool TryGetUserId(ClaimsPrincipal principal, out ulong userId)
	{
		ulong? userId2 = GetUserId(principal);
		userId = userId2.GetValueOrDefault();
		return userId2.HasValue;
	}
}
