using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using DairyFarm.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Models;

namespace DairyFarm.Api.Controllers;

[ApiController]
[Route("api/api-keys")]
[Authorize(Roles="Owner")]
public class ApiKeysController : ControllerBase
{
    private readonly AppDbContext _db;
    public ApiKeysController(AppDbContext db)=>_db=db;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ulong companyId)
    {
        var rows=await _db.ApiKeys.AsNoTracking().Where(x=>x.FarmId==companyId).Select(x=>new {
            x.ApiKeyId,x.Name,x.KeyPrefix,x.Scopes,x.CreatedAt,x.ExpiresAt,x.RevokedAt,x.UserId
        }).ToListAsync();
        return Ok(Result.Ok(rows));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest request)
    {
        if(request.FarmId==0 || string.IsNullOrWhiteSpace(request.Name)) return BadRequest(Result.Fail("FarmId and name are required."));
        var raw="dfk_"+Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var hash=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
        var row=new ApiKey{FarmId=request.FarmId,UserId=request.UserId,Name=request.Name.Trim(),KeyPrefix=raw[..12],KeyHash=hash,Scopes=string.IsNullOrWhiteSpace(request.Scopes)?"*":request.Scopes,CreatedAt=DateTime.UtcNow,ExpiresAt=request.ExpiresAt};
        _db.ApiKeys.Add(row); await _db.SaveChangesAsync();
        return Ok(Result.Ok(new {id=row.ApiKeyId,name=row.Name,key=raw,keyPrefix=row.KeyPrefix,expiresAt=row.ExpiresAt},"API key created. Store the key now; it is not shown again."));
    }

    [HttpPost("{id:long}/revoke")]
    public async Task<IActionResult> Revoke(ulong id)
    {
        var row=await _db.ApiKeys.FindAsync(id); if(row==null)return NotFound(Result.Fail("API key not found."));
        row.RevokedAt=DateTime.UtcNow; await _db.SaveChangesAsync();
        return Ok(Result.Ok(new {id},"API key revoked."));
    }

    public sealed class CreateApiKeyRequest
    {
        public ulong FarmId{get;set;}
        public ulong? UserId{get;set;}
        public string Name{get;set;}="";
        public string? Scopes{get;set;}
        public DateTime? ExpiresAt{get;set;}
    }
}