using DairyFarm.Api.Data;
using DairyFarm.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DairyFarm.Api.Services;

public record BootstrapResult(
    bool Success,
    string Message,
    ulong? UserId = null,
    ulong? CompanyId = null,
    ulong? FarmId = null,
    bool AlreadyInitialized = false);

/// <summary>
/// One-time creation of the initial installation record set, in order:
/// company -> farm -> Owner account.
///
/// WHY THIS EXISTS
/// The canonical schema requires `users.farm_id` (NOT NULL, FK -> farms) and
/// `farms.company_id` (NOT NULL, FK -> companies). On a genuinely empty
/// installation there is no farm, so an Owner could never be created, so no user
/// could ever authenticate, so no farm could ever be created through the API.
/// This service breaks that first-run deadlock without any direct SQL.
///
/// SAFETY DESIGN - deliberately hard to trigger by accident:
///   * It ONLY runs when the operator passes --bootstrap-owner explicitly.
///     It never runs on ordinary startup.
///   * The password comes from the INITIAL_OWNER_PASSWORD environment variable
///     (or user-secret). It is never read from a repository file, never
///     prompted for, and never hard-coded.
///   * It refuses to create a second Owner when one already holds the role, so
///     it cannot reset or duplicate an existing administrator.
///   * It is IDEMPOTENT: company, farm and farm_user_access are resolved rather
///     than duplicated when they already exist.
///   * All writes run inside ONE transaction, so a failure can never leave a
///     half-created installation.
///   * The plaintext is used in memory only long enough to hash it. It is never
///     logged, never stored, and never returned.
///
/// If the installation cannot be initialized safely this returns Success=false
/// with an explanation rather than inventing anything.
/// </summary>
public class OwnerBootstrapService
{
    private readonly AppDbContext _context;
    private readonly ILogger<OwnerBootstrapService> _logger;
    private readonly PasswordHasher<User> _hasher = new();

    public OwnerBootstrapService(AppDbContext context, ILogger<OwnerBootstrapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Run the first-run initialization. <paramref name="requestedFarmName"/>
    /// comes from the --with-farm argument; when null the INITIAL_FARM_NAME
    /// environment variable is used instead.
    /// </summary>
    public async Task<BootstrapResult> RunAsync(string? requestedFarmName = null, CancellationToken ct = default)
    {
        // The canonical `users` table has a UNIQUE `username` (what sign-in
        // matches on) and a nullable `email`, so INITIAL_OWNER_EMAIL is used as
        // BOTH. Existing operator configuration keeps working unchanged.
        var email = Environment.GetEnvironmentVariable("INITIAL_OWNER_EMAIL");
        var password = Environment.GetEnvironmentVariable("INITIAL_OWNER_PASSWORD");
        var name = Environment.GetEnvironmentVariable("INITIAL_OWNER_NAME") ?? "Owner";
        var farmIdRaw = Environment.GetEnvironmentVariable("INITIAL_OWNER_FARM_ID");

        // First-run only. Both are optional: an installation that already has a
        // farm needs neither.
        var companyName = Environment.GetEnvironmentVariable("INITIAL_COMPANY_NAME");
        var farmName = requestedFarmName
            ?? Environment.GetEnvironmentVariable("INITIAL_FARM_NAME");

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return new BootstrapResult(false,
                "INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD must both be set as environment " +
                "variables (or user-secrets) before the bootstrap can run. No account was created.");
        }

        if (password.Length < 12)
        {
            return new BootstrapResult(false,
                "INITIAL_OWNER_PASSWORD must be at least 12 characters. No account was created.");
        }

        // The Owner role is seeded reference data and must already exist.
        var ownerRole = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == "Owner", ct);

        if (ownerRole is null)
        {
            return new BootstrapResult(false,
                "No role named 'Owner' exists. The roles table must be populated first. " +
                "No account was created.");
        }

        // `users` carries a SINGLE role_id, so "is there already an Owner?" is a
        // direct check on the user table rather than a join through a junction.
        var existingOwner = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.RoleId == ownerRole.RoleId, ct);

        if (existingOwner is not null)
        {
            // IDEMPOTENCY: already initialized. Creating anything now would
            // duplicate the company, the farm or the owner.
            _logger.LogInformation(
                "Bootstrap skipped: the installation is already initialized (owner user {UserId}).",
                existingOwner.UserId);

            return new BootstrapResult(
                true,
                $"The installation is already initialized. An Owner account (user {existingOwner.UserId}) " +
                "already exists, so no company, farm or account was created.",
                existingOwner.UserId,
                existingOwner.Farm?.CompanyId,
                existingOwner.FarmId,
                AlreadyInitialized: true);
        }

        var trimmedEmail = email.Trim();

        // users.username is UNIQUE (uq_users_username).
        var usernameTaken = await _context.Users
            .AsNoTracking()
            .AnyAsync(u => u.Username == trimmedEmail, ct);

        if (usernameTaken)
        {
            return new BootstrapResult(false,
                "A user with that username already exists. No account was created.");
        }

        // Everything below runs inside ONE transaction so a failure can never
        // leave a company without a farm, or a farm without an owner.
        // EF Core does not allow a user-initiated transaction while a retrying
        // execution strategy is configured (this project uses
        // MySqlRetryingExecutionStrategy). The transaction must therefore be
        // created and committed INSIDE the retriable unit returned by
        // CreateExecutionStrategy().ExecuteAsync, which is the documented
        // pattern. A retry re-runs the whole unit; the change tracker is
        // cleared on failure so no half-applied state survives.
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async ct =>
        {
            await using var transaction = await _context.Database
                .BeginTransactionAsync(ct);

            try
            {
            ulong companyId;
            var companyCreated = false;

            // Step 1 - resolve or create the owning company.
            var existingCompany = await _context.Companies
                .OrderBy(c => c.CompanyId)
                .FirstOrDefaultAsync(ct);

            if (existingCompany is not null)
            {
                companyId = existingCompany.CompanyId;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(companyName))
                {
                                        return new BootstrapResult(false,
                        "The companies table is empty. Supply a company name with the " +
                        "INITIAL_COMPANY_NAME environment variable. Nothing was created.");
                }

                var company = new Company
                {
                    Name = companyName.Trim(),
                    Status = "ACTIVE",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Companies.Add(company);
                await _context.SaveChangesAsync(ct);
                companyId = company.CompanyId;
                companyCreated = true;
            }

            ulong farmId;
            var farmCreated = false;

            // Step 2 - resolve or create the farm the Owner is scoped to.
            if (!string.IsNullOrWhiteSpace(farmIdRaw) && ulong.TryParse(farmIdRaw, out var parsedFarmId))
            {
                if (!await _context.Farms.AsNoTracking().AnyAsync(f => f.FarmId == parsedFarmId, ct))
                {
                                        return new BootstrapResult(false,
                        $"No farm with id {parsedFarmId} exists. No account was created.");
                }

                farmId = parsedFarmId;
            }
            else if (!string.IsNullOrWhiteSpace(farmName))
            {
                // IDEMPOTENCY: reuse a farm of the same name rather than
                // creating a second one on a repeat run.
                var existingFarm = await _context.Farms
                    .Where(f => f.Name == farmName.Trim())
                    .OrderBy(f => f.FarmId)
                    .FirstOrDefaultAsync(ct);

                if (existingFarm is not null)
                {
                    farmId = existingFarm.FarmId;
                }
                else
                {
                    var farm = new Farm
                    {
                        CompanyId = companyId,
                        Name = farmName.Trim(),
                        // `farms.code` is UNIQUE installation-wide. Left NULL so a
                        // repeat run can never collide on it; MySQL permits
                        // repeated NULLs in a unique index.
                        Code = null,
                        Status = "ACTIVE",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Farms.Add(farm);
                    await _context.SaveChangesAsync(ct);
                    farmId = farm.FarmId;
                    farmCreated = true;
                }
            }
            else
            {
                var firstFarm = await _context.Farms
                    .OrderBy(f => f.FarmId)
                    .FirstOrDefaultAsync(ct);

                if (firstFarm is null)
                {
                                        return new BootstrapResult(false,
                        "No farm could be resolved. The farms table is empty, so supply a farm " +
                        "name with --with-farm \"...\" or the INITIAL_FARM_NAME environment " +
                        "variable. No account was created.");
                }

                farmId = firstFarm.FarmId;
            }

            // Step 3 - the Owner account itself.
            var user = new User
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

            // The plaintext leaves scope here; only the hash is persisted. The
            // hash is never logged.
            user.PasswordHash = _hasher.HashPassword(user, password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync(ct);

            // Step 4 - farm_user_access. Composite PK (user_id, farm_id). The
            // Owner is granted FULL so the account is not born read-only.
            var accessExists = await _context.FarmUserAccess
                .AnyAsync(a => a.UserId == user.UserId && a.FarmId == farmId, ct);

            if (!accessExists)
            {
                _context.FarmUserAccess.Add(new FarmUserAccess
                {
                    UserId = user.UserId,
                    FarmId = farmId,
                    AccessLevel = "FULL",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync(ct);
            }

            // Step 5 - commit. Nothing above is visible to any other connection
            // until this succeeds.
            await transaction.CommitAsync(ct);

            _logger.LogInformation(
                "Bootstrap created the initial installation. Company {CompanyId} (created: {CompanyCreated}), " +
                "farm {FarmId} (created: {FarmCreated}), owner user {UserId}. Credentials were supplied " +
                "out of band and are not logged.",
                companyId, companyCreated, farmId, farmCreated, user.UserId);

            var created = new List<string>();
            if (companyCreated) created.Add("company");
            if (farmCreated) created.Add("farm");
            created.Add("owner account");

            return new BootstrapResult(
                true,
                $"Created {string.Join(", ", created)}. You can now sign in.",
                user.UserId,
                companyId,
                farmId);
        }
        catch (Exception ex)
        {
            // Roll back so the installation is never left half-created. Only the
            // exception TYPE is logged: MySqlConnector messages can echo
            // connection details.
            await transaction.RollbackAsync(ct);
            _context.ChangeTracker.Clear();

            _logger.LogError(
                "Bootstrap failed and was rolled back. ErrorType={ErrorType}",
                ex.GetType().Name);

            return new BootstrapResult(false,
                $"Bootstrap failed and was rolled back ({ex.GetType().Name}). No account was created.");
            }
        }, ct);
    }
}
