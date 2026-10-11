using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/api-keys")]
[Authorize(Roles = "Owner")]
public class ApiKeysController : ControllerBase
{
	public sealed class CreateApiKeyRequest
	{
		public ulong FarmId { get; set; }

		public ulong? UserId { get; set; }

		public string Name { get; set; } = "";

		public string? Scopes { get; set; }

		public DateTime? ExpiresAt { get; set; }
	}

	private readonly AppDbContext _db;

	public ApiKeysController(AppDbContext db)
	{
		_db = db;
	}

	[HttpGet]
	public async Task<IActionResult> List([FromQuery] ulong companyId)
	{
		return Ok(Result.Ok(await (from x in _db.ApiKeys.AsNoTracking()
			where x.FarmId == companyId
			select new { x.ApiKeyId, x.Name, x.KeyPrefix, x.Scopes, x.CreatedAt, x.ExpiresAt, x.RevokedAt, x.UserId }).ToListAsync()));
	}

	[HttpPost]
	public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest request)
	{
		if (request.FarmId == 0L || string.IsNullOrWhiteSpace(request.Name))
		{
			return BadRequest(Result.Fail("FarmId and name are required."));
		}
		string raw = "dfk_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
		string hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
		ApiKey row = new ApiKey
		{
			FarmId = request.FarmId,
			UserId = request.UserId,
			Name = request.Name.Trim(),
			KeyPrefix = raw.Substring(0, 12),
			KeyHash = hash,
			Scopes = (string.IsNullOrWhiteSpace(request.Scopes) ? "*" : request.Scopes),
			CreatedAt = DateTime.UtcNow,
			ExpiresAt = request.ExpiresAt
		};
		_db.ApiKeys.Add(row);
		await _db.SaveChangesAsync();
		return Ok(Result.Ok(new
		{
			id = row.ApiKeyId,
			name = row.Name,
			key = raw,
			keyPrefix = row.KeyPrefix,
			expiresAt = row.ExpiresAt
		}, "API key created. Store the key now; it is not shown again."));
	}

	[HttpPost("{id:long}/revoke")]
	public async Task<IActionResult> Revoke(ulong id)
	{
		ApiKey row = await _db.ApiKeys.FindAsync(id);
		if (row == null)
		{
			return NotFound(Result.Fail("API key not found."));
		}
		row.RevokedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(Result.Ok(new { id }, "API key revoked."));
	}
}
