using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public class OwnerBootstrapService
{
	private readonly AppDbContext _context;

	private readonly ILogger<OwnerBootstrapService> _logger;

	private readonly PasswordHasher<User> _hasher = new PasswordHasher<User>();

	public OwnerBootstrapService(AppDbContext context, ILogger<OwnerBootstrapService> logger)
	{
		_context = context;
		_logger = logger;
	}

	public async Task<BootstrapResult> RunAsync(string? requestedFarmName = null, CancellationToken ct = default(CancellationToken))
	{
		string email = Environment.GetEnvironmentVariable("INITIAL_OWNER_EMAIL");
		string password = Environment.GetEnvironmentVariable("INITIAL_OWNER_PASSWORD");
		string name = Environment.GetEnvironmentVariable("INITIAL_OWNER_NAME") ?? "Owner";
		string farmIdRaw = Environment.GetEnvironmentVariable("INITIAL_OWNER_FARM_ID");
		string companyName = Environment.GetEnvironmentVariable("INITIAL_COMPANY_NAME");
		string farmName = requestedFarmName ?? Environment.GetEnvironmentVariable("INITIAL_FARM_NAME");
		if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
		{
			return new BootstrapResult(Success: false, "INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD must both be set as environment variables (or user-secrets) before the bootstrap can run. No account was created.");
		}
		if (password.Length < 12)
		{
			return new BootstrapResult(Success: false, "INITIAL_OWNER_PASSWORD must be at least 12 characters. No account was created.");
		}
		Role ownerRole = await _context.Roles.AsNoTracking().FirstOrDefaultAsync((Role r) => r.Name == "Owner", ct);
		if (ownerRole == null)
		{
			return new BootstrapResult(Success: false, "No role named 'Owner' exists. The roles table must be populated first. No account was created.");
		}
		User existingOwner = await _context.Users.AsNoTracking().FirstOrDefaultAsync((User u) => u.RoleId == ownerRole.RoleId, ct);
		if (existingOwner != null)
		{
			_logger.LogInformation("Bootstrap skipped: the installation is already initialized (owner user {UserId}).", existingOwner.UserId);
			return new BootstrapResult(Success: true, $"The installation is already initialized. An Owner account (user {existingOwner.UserId}) " + "already exists, so no company, farm or account was created.", existingOwner.UserId, existingOwner.Farm?.CompanyId, existingOwner.FarmId, AlreadyInitialized: true);
		}
		string trimmedEmail = email.Trim();
		if (await _context.Users.AsNoTracking().AnyAsync((User u) => u.Username == trimmedEmail, ct))
		{
			return new BootstrapResult(Success: false, "A user with that username already exists. No account was created.");
		}
		IExecutionStrategy strategy = _context.Database.CreateExecutionStrategy();
		return await strategy.ExecuteAsync(async (CancellationToken cancellationToken) =>
		{
			BootstrapResult result;
			await using (IDbContextTransaction transaction = await _context.Database.BeginTransactionAsync(cancellationToken))
			{
				try
				{
					bool companyCreated = false;
					Company existingCompany = await _context.Companies.OrderBy((Company c) => c.CompanyId).FirstOrDefaultAsync(cancellationToken);
					ulong companyId;
					if (existingCompany != null)
					{
						companyId = existingCompany.CompanyId;
						goto IL_03d0;
					}
					if (!string.IsNullOrWhiteSpace(companyName))
					{
						Company company = new Company
						{
							Name = companyName.Trim(),
							Status = "ACTIVE",
							CreatedAt = DateTime.UtcNow,
							UpdatedAt = DateTime.UtcNow
						};
						_context.Companies.Add(company);
						await _context.SaveChangesAsync(cancellationToken);
						companyId = company.CompanyId;
						companyCreated = true;
						goto IL_03d0;
					}
					result = new BootstrapResult(Success: false, "The companies table is empty. Supply a company name with the INITIAL_COMPANY_NAME environment variable. Nothing was created.");
					goto end_IL_0174;
					IL_03d0:
					bool farmCreated = false;
					ulong farmId;
					if (!string.IsNullOrWhiteSpace(farmIdRaw) && ulong.TryParse(farmIdRaw, out var parsedFarmId))
					{
						if (await _context.Farms.AsNoTracking().AnyAsync((Farm f) => f.FarmId == parsedFarmId, cancellationToken))
						{
							farmId = parsedFarmId;
							goto IL_099a;
						}
						result = new BootstrapResult(Success: false, $"No farm with id {parsedFarmId} exists. No account was created.");
					}
					else
					{
						if (!string.IsNullOrWhiteSpace(farmName))
						{
							Farm existingFarm = await (from f in _context.Farms
								where f.Name == farmName.Trim()
								orderby f.FarmId
								select f).FirstOrDefaultAsync(cancellationToken);
							if (existingFarm != null)
							{
								farmId = existingFarm.FarmId;
							}
							else
							{
								Farm farm = new Farm
								{
									CompanyId = companyId,
									Name = farmName.Trim(),
									Code = null,
									Status = "ACTIVE",
									CreatedAt = DateTime.UtcNow,
									UpdatedAt = DateTime.UtcNow
								};
								_context.Farms.Add(farm);
								await _context.SaveChangesAsync(cancellationToken);
								farmId = farm.FarmId;
								farmCreated = true;
							}
							goto IL_099a;
						}
						Farm firstFarm = await _context.Farms.OrderBy((Farm f) => f.FarmId).FirstOrDefaultAsync(cancellationToken);
						if (firstFarm != null)
						{
							farmId = firstFarm.FarmId;
							goto IL_099a;
						}
						result = new BootstrapResult(Success: false, "No farm could be resolved. The farms table is empty, so supply a farm name with --with-farm \"...\" or the INITIAL_FARM_NAME environment variable. No account was created.");
					}
					goto end_IL_0174;
					IL_099a:
					User user = new User
					{
						FarmId = farmId,
						RoleId = ownerRole.RoleId,
						Username = trimmedEmail,
						FullName = name,
						Email = trimmedEmail,
						Status = "ACTIVE",
						CreatedAt = DateTime.UtcNow,
						UpdatedAt = DateTime.UtcNow
					};
					user.PasswordHash = _hasher.HashPassword(user, password);
					_context.Users.Add(user);
					await _context.SaveChangesAsync(cancellationToken);
					if (!(await _context.FarmUserAccess.AnyAsync((FarmUserAccess a) => a.UserId == user.UserId && a.FarmId == farmId, cancellationToken)))
					{
						_context.FarmUserAccess.Add(new FarmUserAccess
						{
							UserId = user.UserId,
							FarmId = farmId,
							AccessLevel = "FULL",
							CreatedAt = DateTime.UtcNow
						});
						await _context.SaveChangesAsync(cancellationToken);
					}
					await transaction.CommitAsync(cancellationToken);
					_logger.LogInformation("Bootstrap created the initial installation. Company {CompanyId} (created: {CompanyCreated}), farm {FarmId} (created: {FarmCreated}), owner user {UserId}. Credentials were supplied out of band and are not logged.", companyId, companyCreated, farmId, farmCreated, user.UserId);
					List<string> created = new List<string>();
					if (companyCreated)
					{
						created.Add("company");
					}
					if (farmCreated)
					{
						created.Add("farm");
					}
					created.Add("owner account");
					result = new BootstrapResult(Success: true, "Created " + string.Join(", ", created) + ". You can now sign in.", user.UserId, companyId, farmId);
					end_IL_0174:;
				}
				catch (Exception ex)
				{
					await transaction.RollbackAsync(cancellationToken);
					_context.ChangeTracker.Clear();
					_logger.LogError("Bootstrap failed and was rolled back. ErrorType={ErrorType}", ex.GetType().Name);
					result = new BootstrapResult(Success: false, "Bootstrap failed and was rolled back (" + ex.GetType().Name + "). No account was created.");
				}
			}
			return result;
		}, ct);
	}
}
