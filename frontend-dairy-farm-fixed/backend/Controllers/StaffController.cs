using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = "Owner,Manager")]
public class StaffController : ControllerBase
{
	public sealed class CreateUserRequest
	{
		public ulong FarmId { get; set; }

		public string Username { get; set; } = "";

		public string? Name { get; set; }

		public string? Email { get; set; }

		public string? Phone { get; set; }

		public string Password { get; set; } = "";

		public List<string> Roles { get; set; } = new List<string>();
	}

	public sealed class RolesRequest
	{
		public List<string> Roles { get; set; } = new List<string>();
	}

	public sealed class StatusRequest
	{
		public string Status { get; set; } = "ACTIVE";
	}

	private readonly AppDbContext _db;

	private readonly PasswordHasher<User> _hasher = new PasswordHasher<User>();

	public StaffController(AppDbContext db, FarmScopeGuard farmScope)
	{
		_db = db;
		_farmScope = farmScope;
	}

	private readonly FarmScopeGuard _farmScope;

	[HttpGet]
	public async Task<IActionResult> List([FromQuery] ulong farmId)
	{
		// Authorize the requested farm BEFORE it becomes a query filter, so a
		// caller cannot enumerate another farm's staff by changing farmId.
		var denied = await this.EnsureFarmAccessAsync(_farmScope, farmId);
		if (denied is not null) return denied;

		return Ok(Result.Ok((await (from x in _db.Users.AsNoTracking().Include((User x) => x.Role).Include((User x) => x.Farm)
			where x.FarmId == farmId
			select x).ToListAsync()).Select((User x) => new
		{
			UserId = x.UserId,
			Username = x.Username,
			Name = x.FullName,
			Email = x.Email,
			Phone = x.Phone,
			Status = x.Status,
			FarmId = x.FarmId,
			FarmName = x.Farm?.Name,
			RoleId = x.RoleId,
			Role = x.Role?.Name,
			LastLoginAt = x.LastLoginAt
		})));
	}

	[HttpPost]
	[Authorize(Roles = "Owner")]
	public async Task<IActionResult> Create([FromBody] CreateUserRequest r)
	{
		// The account is created INTO r.FarmId, so that farm must be one this
		// identity may actually manage. No substitution of a default farm.
		var deniedFarm = await this.EnsureFarmAccessAsync(_farmScope, r.FarmId);
		if (deniedFarm is not null) return deniedFarm;

		if (string.IsNullOrWhiteSpace(r.Username) || string.IsNullOrWhiteSpace(r.Password))
		{
			return BadRequest(Result.Fail("Username and a password are required."));
		}
		if (r.Password.Length < 12)
		{
			return BadRequest(Result.Fail("Password must be at least 12 characters."));
		}
		string username = r.Username.Trim();
		if (await _db.Users.AnyAsync((User x) => x.Username == username))
		{
			return Conflict(Result.Fail("Username is already registered."));
		}
		bool flag = r.FarmId == 0;
		bool flag2 = flag;
		if (!flag2)
		{
			flag2 = !(await _db.Farms.AnyAsync((Farm x) => x.FarmId == r.FarmId));
		}
		if (flag2)
		{
			return BadRequest(Result.Fail("A valid farmId is required."));
		}
		Role? role = null;
		foreach (string roleName in r.Roles.Where((string n) => !string.IsNullOrWhiteSpace(n)).Distinct(StringComparer.OrdinalIgnoreCase))
		{
			role = await _db.Roles.FirstOrDefaultAsync((Role x) => x.Name == roleName);
			if (role != null)
			{
				break;
			}
		}
		if (role == null)
		{
			return BadRequest(Result.Fail("At least one valid role name is required."));
		}
		User u = new User
		{
			FarmId = r.FarmId,
			RoleId = role.RoleId,
			Username = username,
			FullName = (r.Name?.Trim() ?? username),
			Email = r.Email?.Trim(),
			Phone = r.Phone,
			Status = "ACTIVE",
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		u.PasswordHash = _hasher.HashPassword(u, r.Password);
		_db.Users.Add(u);
		await _db.SaveChangesAsync();
		return Ok(Result.Ok(new
		{
			UserId = u.UserId,
			Username = u.Username,
			Name = u.FullName,
			Email = u.Email,
			FarmId = u.FarmId,
			Role = role.Name
		}, "Staff account created."));
	}

	[HttpPatch("{id:long}/status")]
	public async Task<IActionResult> Status(ulong id, [FromBody] StatusRequest r)
	{
		User? u = await _db.Users.FindAsync(id);
		if (u == null)
		{
			return NotFound(Result.Fail("User not found."));
		}
		// Authorize the PERSISTED user's farm before mutating the record.
		var deniedStatus = await this.EnsureFarmAccessAsync(_farmScope, u.FarmId);
		if (deniedStatus is not null) return deniedStatus;

		string requested = (r.Status ?? string.Empty).Trim().ToUpperInvariant();
		u.Status = ((requested == "ACTIVE") ? "ACTIVE" : "INACTIVE");
		u.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(Result.Ok(new { u.UserId, u.Status }));
	}

	[HttpPut("{id:long}/roles")]
	[Authorize(Roles = "Owner")]
	public async Task<IActionResult> Roles(ulong id, [FromBody] RolesRequest r)
	{
		User? u = await _db.Users.FindAsync(id);
		if (u == null)
		{
			return NotFound(Result.Fail("User not found."));
		}
		// Authorize the PERSISTED user's farm before changing its role.
		var deniedRoles = await this.EnsureFarmAccessAsync(_farmScope, u.FarmId);
		if (deniedRoles is not null) return deniedRoles;

		Role? role = null;
		foreach (string name in r.Roles.Where((string n) => !string.IsNullOrWhiteSpace(n)).Distinct(StringComparer.OrdinalIgnoreCase))
		{
			role = await _db.Roles.FirstOrDefaultAsync((Role x) => x.Name == name);
			if (role != null)
			{
				break;
			}
		}
		if (role == null)
		{
			return BadRequest(Result.Fail("At least one valid role name is required."));
		}
		u.RoleId = role.RoleId;
		u.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(Result.Ok(new
		{
			UserId = u.UserId,
			Role = role.Name
		}, "Roles updated."));
	}
}
