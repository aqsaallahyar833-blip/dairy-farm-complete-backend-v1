using System.Security.Claims;
using DairyFarm.Api.Data;
using DairyFarm.Api.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Infrastructure;

/// <summary>
/// Server-side farm authorisation for every farm-scoped endpoint.
///
/// WHY THIS EXISTS
/// The JWT already carries the caller's user id and home farm. Endpoints that
/// also accept a client-supplied `farmId` were previously filtering on that
/// value alone, so ANY authenticated user could read ANY farm's data by
/// guessing an id. A client-supplied id must never be an authorisation
/// decision; this service makes the server authoritative.
///
/// THE RULE (uses the EXISTING schema only - no new table, no new column)
///   A caller may access a farm when EITHER:
///     1. the farm is the caller's OWN farm  -> users.farm_id   (the JWT
///        "farm_id" claim), which is the normal single-farm case, OR
///     2. the caller has an explicit grant    -> farm_user_access
///        (user_id, farm_id), which is how legitimate multi-farm access is
///        modelled.
///
/// Access is re-checked against the DATABASE on every request rather than
/// trusted from the token, so revoking a grant in `farm_user_access` takes
/// effect immediately and a stale token cannot widen access.
/// </summary>
public sealed class FarmScopeGuard
{
    private readonly AppDbContext _db;

    public FarmScopeGuard(AppDbContext db) => _db = db;

    /// <summary>
    /// True when the user may read/write data scoped to <paramref name="farmId"/>.
    /// </summary>
    public async Task<bool> IsAuthorizedAsync(ulong userId, ulong farmId, CancellationToken ct = default)
    {
        // 1. The caller's own farm.
        if (await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.UserId == userId && u.FarmId == farmId, ct))
        {
            return true;
        }

        // 2. An explicit multi-farm grant.
        return await _db.FarmUserAccess
            .AsNoTracking()
            .AnyAsync(a => a.UserId == userId && a.FarmId == farmId, ct);
    }

    /// <summary>
    /// Every farm id the user may read: their own farm plus any explicit grant.
    /// Used by endpoints that return a COLLECTION (e.g. GET /api/farms) and
    /// therefore cannot take a single farmId to authorise.
    /// </summary>
    public async Task<HashSet<ulong>> GetAuthorizedFarmIdsAsync(ulong userId, CancellationToken ct = default)
    {
        var ids = new HashSet<ulong>();

        var home = await _db.Users
            .AsNoTracking()
            .Where(u => u.UserId == userId)
            .Select(u => (ulong?)u.FarmId)
            .FirstOrDefaultAsync(ct);

        if (home is not null) ids.Add(home.Value);

        var granted = await _db.FarmUserAccess
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.FarmId)
            .ToListAsync(ct);

        foreach (var id in granted) ids.Add(id);

        return ids;
    }
}

/// <summary>
/// Controller-side helpers so every farm-scoped endpoint applies the identical
/// rule without repeating the query.
/// </summary>
public static class FarmScopeExtensions
{
    /// <summary>
    /// Validates a client-supplied farm id against the authenticated identity.
    ///
    /// Returns null when the caller is allowed to proceed, otherwise the
    /// response to return:
    ///   401 - no resolvable authenticated user (the endpoint should also carry
    ///         [Authorize]; this is defence in depth for API-key callers).
    ///   403 - authenticated, but not authorised for that farm.
    ///   400 - no farmId supplied. It is NEVER silently defaulted to the first
    ///         farm or to the caller's farm, because that would hide a broken
    ///         client.
    ///
    /// The 403 body is deliberately generic so it does not disclose whether the
    /// farm exists.
    /// </summary>
    public static async Task<IActionResult?> EnsureFarmAccessAsync(
        this ControllerBase controller,
        FarmScopeGuard guard,
        ulong? requestedFarmId,
        CancellationToken ct = default)
    {
        if (!CurrentUser.TryGetUserId(controller.User, out var userId))
        {
            return controller.Unauthorized(
                Result.Fail("Authentication is required."));
        }

        if (requestedFarmId is null or 0)
        {
            return controller.BadRequest(
                Result.Fail("A farmId query parameter is required."));
        }

        if (!await guard.IsAuthorizedAsync(userId, requestedFarmId.Value, ct))
        {
            return controller.StatusCode(
                StatusCodes.Status403Forbidden,
                Result.Fail("You are not authorised to access this farm."));
        }

        return null;
    }
}