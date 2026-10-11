using System.Text;
using System.Text.Json.Serialization;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
// The connection string is NEVER hard-coded. It is supplied by the environment
// variable ConnectionStrings__DairyFarm (or an equivalent configuration
// provider). If it is absent the API refuses to start rather than falling back
// to a baked-in credential.
var rawConnectionString = builder.Configuration.GetConnectionString(ConnectionStringNormalizer.ConnectionName);

if (string.IsNullOrWhiteSpace(rawConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings__DairyFarm is not set. " +
        "Provide it as an environment variable or user-secret. " +
        "See backend/.env.example for the expected shape. " +
        "No credential is ever hard-coded in this project.");
}

// Adds an explicit SslMode when the operator has not chosen one, which avoids
// the local "SSL Authentication Error" handshake failure.
var connectionString = ConnectionStringNormalizer.EnsureSslMode(rawConnectionString);
var targetDatabase = ConnectionStringNormalizer.DatabaseNameOf(connectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString),
        my => my.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));
        // RECONCILED: no UseSnakeCaseNamingConvention() call. That extension comes
        // from the third-party EFCore.NamingConventions package, which is not
        // referenced. It is not needed here because every entity property carries
        // an explicit [Column("snake_case")] mapping, so EF already targets the
        // canonical column names.

// ---------------------------------------------------------------------------
// MVC
// ---------------------------------------------------------------------------
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
})
.ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(
                x => x.Key,
                x => x.Value!.Errors
                    .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage)
                    .ToArray());

        return new BadRequestObjectResult(Result.Fail("Validation failed.", errors));
    };
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---------------------------------------------------------------------------
// Authentication (Phase 2A)
//
// JWT Bearer over the EXISTING users / roles tables. The signing key comes from
// configuration (environment variable Jwt__Key or user-secrets) and is NEVER
// stored in appsettings.json. JwtOptions.Validate() fails fast at startup when
// it is missing or too short, so a misconfigured deployment can never silently
// accept unsigned tokens.
// ---------------------------------------------------------------------------
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>();
if (jwtOptions is null)
{
    throw new InvalidOperationException(
        "No 'Jwt' configuration section was found. Provide Jwt__Key, Jwt__Issuer, " +
        "Jwt__Audience and Jwt__ExpiryMinutes as environment variables or user-secrets. " +
        "See backend/.env.example.");
}

jwtOptions.Validate();

// Registers the already-bound instance so IOptions<JwtOptions> resolves to it.
builder.Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(jwtOptions));

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "smart";
        options.DefaultChallengeScheme = "smart";
    })
    .AddPolicyScheme("smart", "JWT or API Key", options =>
    {
        options.ForwardDefaultSelector = context =>
            context.Request.Headers.ContainsKey("X-API-Key") ? "ApiKey" : JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    })
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DairyFarm.Api.Infrastructure.ApiKeyAuthenticationHandler>("ApiKey", _ => { });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------
builder.Services.AddSingleton<DatabaseHealth>();
builder.Services.AddScoped<AnimalRepository>();
builder.Services.AddScoped<BreedRepository>();
builder.Services.AddScoped<FarmRepository>();
builder.Services.AddScoped<AnimalGroupRepository>();
builder.Services.AddScoped<ShedRepository>();

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AnimalCodeGenerator>();
builder.Services.AddScoped<AnimalWriteService>();
builder.Services.AddScoped<AnimalStatusService>();
builder.Services.AddScoped<AnimalPhotoService>();
builder.Services.AddScoped<AnimalQrService>();
builder.Services.AddScoped<OwnerBootstrapService>();
builder.Services.AddScoped<DairyFarm.Api.Infrastructure.FarmScopeGuard>();

// ---------------------------------------------------------------------------
// CORS - controlled origin list. No wildcard is used.
// The list is supplied in appsettings.json and can be overridden with
// Cors__AllowedOrigins__0, __1, ... environment variables.
// ---------------------------------------------------------------------------
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "No CORS origins configured. Set Cors:AllowedOrigins in appsettings.json. " +
        "Wildcard origins are intentionally not permitted.");
}

const string CorsPolicy = "frontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Opt-in owner bootstrap.
//
// This runs ONLY when the operator explicitly passes --bootstrap-owner. It is
// never part of normal startup, so no account can be created by accident and
// the application can never silently seed production data.
//
// The password comes from the INITIAL_OWNER_PASSWORD environment variable. It
// is never hard-coded, never read from a repository file, and never logged.
// ---------------------------------------------------------------------------
if (args.Contains("--bootstrap-owner", StringComparer.OrdinalIgnoreCase))
{
    // Optional first-run argument: --with-farm "Main Dairy Farm"
    //
    // The company name comes from INITIAL_COMPANY_NAME and the owner
    // credentials from INITIAL_OWNER_EMAIL / INITIAL_OWNER_PASSWORD, all of
    // which are environment variables (or user-secrets). Nothing is hard-coded
    // and no credential is ever echoed.
    string? requestedFarmName = null;

    var withFarmIndex = Array.FindIndex(args, a =>
        string.Equals(a, "--with-farm", StringComparison.OrdinalIgnoreCase));

    if (withFarmIndex >= 0)
    {
        if (withFarmIndex + 1 >= args.Length || args[withFarmIndex + 1].StartsWith("--", StringComparison.Ordinal))
        {
            Console.Error.WriteLine(
                "Bootstrap not performed: --with-farm requires a farm name, for example " +
                "--bootstrap-owner --with-farm \"Main Dairy Farm\".");
            return;
        }

        requestedFarmName = args[withFarmIndex + 1];
    }

    using var scope = app.Services.CreateScope();
    var bootstrap = scope.ServiceProvider.GetRequiredService<OwnerBootstrapService>();
    var outcome = await bootstrap.RunAsync(requestedFarmName);

    if (outcome.Success)
    {
        Console.WriteLine(outcome.Message);
    }
    else
    {
        // Written to stderr, still without ever echoing a credential.
        Console.Error.WriteLine($"Bootstrap not performed: {outcome.Message}");
    }

    return;
}

// ---------------------------------------------------------------------------
// Pipeline
//
// NOTE: there is deliberately NO scope that runs EnsureCreated / Migrate /
// ExecuteSqlRaw here. This API never creates, alters or drops database objects.
// ---------------------------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            Result.Fail("An unexpected server error occurred."));
    });
});

// Authentication must run before authorization. Without these two calls every
// [Authorize] endpoint would treat the request as anonymous.
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ---------------------------------------------------------------------------
// Liveness and readiness live in Controllers/HealthController.cs so that the
// project has a single owner for each route. Do not also MapGet them here:
// registering the same path in both places throws AmbiguousMatchException at
// startup.
// ---------------------------------------------------------------------------

app.Run();
