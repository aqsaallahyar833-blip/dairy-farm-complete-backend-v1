using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using DairyFarm.Api.Data;
using DairyFarm.Api.Infrastructure;
using DairyFarm.Api.Repositories;
using DairyFarm.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

public class Program
{
	private static async Task Main(string[] args)
	{
		WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
		string rawConnectionString = builder.Configuration.GetConnectionString("DairyFarm");
		if (string.IsNullOrWhiteSpace(rawConnectionString))
		{
			throw new InvalidOperationException("ConnectionStrings__DairyFarm is not set. Provide it as an environment variable or user-secret. See backend/.env.example for the expected shape. No credential is ever hard-coded in this project.");
		}
		string connectionString = ConnectionStringNormalizer.EnsureSslMode(rawConnectionString);
		ConnectionStringNormalizer.DatabaseNameOf(connectionString);
		builder.Services.AddDbContext<AppDbContext>((DbContextOptionsBuilder options) =>
		{
			options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), (MySqlDbContextOptionsBuilder my) =>
			{
				my.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5L), null);
			});
		});
		builder.Services.AddControllers((MvcOptions options) =>
		{
			options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
		}).ConfigureApiBehaviorOptions((ApiBehaviorOptions options) =>
		{
			options.InvalidModelStateResponseFactory = (ActionContext context) =>
			{
				Dictionary<string, string[]> error = context.ModelState.Where((KeyValuePair<string, ModelStateEntry> x) =>
				{
					ModelStateEntry value = x.Value;
					return value != null && value.Errors.Count > 0;
				}).ToDictionary((KeyValuePair<string, ModelStateEntry> x) => x.Key, (KeyValuePair<string, ModelStateEntry> x) => x.Value.Errors.Select((ModelError e) => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage).ToArray());
				return new BadRequestObjectResult(Result.Fail("Validation failed.", error));
			};
		}).AddJsonOptions((JsonOptions options) =>
		{
			options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
			options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
		});
		builder.Services.AddEndpointsApiExplorer();
		builder.Services.AddSwaggerGen();
		JwtOptions jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>();
		if (jwtOptions == null)
		{
			throw new InvalidOperationException("No 'Jwt' configuration section was found. Provide Jwt__Key, Jwt__Issuer, Jwt__Audience and Jwt__ExpiryMinutes as environment variables or user-secrets. See backend/.env.example.");
		}
		jwtOptions.Validate();
		builder.Services.AddSingleton(Options.Create(jwtOptions));
		builder.Services.AddAuthentication((AuthenticationOptions options) =>
		{
			options.DefaultAuthenticateScheme = "smart";
			options.DefaultChallengeScheme = "smart";
		}).AddPolicyScheme("smart", "JWT or API Key", (PolicySchemeOptions options) =>
		{
			options.ForwardDefaultSelector = (HttpContext context) => context.Request.Headers.ContainsKey("X-API-Key") ? "ApiKey" : "Bearer";
		}).AddJwtBearer((JwtBearerOptions options) =>
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
				ClockSkew = TimeSpan.FromSeconds(30L)
			};
		})
			.AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", (AuthenticationSchemeOptions _) =>
			{
			});
		builder.Services.AddAuthorization();
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
		builder.Services.AddScoped<FarmScopeGuard>();
		string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
		if (allowedOrigins.Length == 0)
		{
			throw new InvalidOperationException("No CORS origins configured. Set Cors:AllowedOrigins in appsettings.json. Wildcard origins are intentionally not permitted.");
		}
		builder.Services.AddCors((CorsOptions options) =>
		{
			options.AddPolicy("frontend", (CorsPolicyBuilder policy) =>
			{
				policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
			});
		});
		WebApplication app = builder.Build();
		if (args.Contains("--bootstrap-owner", StringComparer.OrdinalIgnoreCase))
		{
			string requestedFarmName = null;
			int withFarmIndex = Array.FindIndex(args, (string a) => string.Equals(a, "--with-farm", StringComparison.OrdinalIgnoreCase));
			if (withFarmIndex >= 0)
			{
				if (withFarmIndex + 1 >= args.Length || args[withFarmIndex + 1].StartsWith("--", StringComparison.Ordinal))
				{
					Console.Error.WriteLine("Bootstrap not performed: --with-farm requires a farm name, for example --bootstrap-owner --with-farm \"Main Dairy Farm\".");
					return;
				}
				requestedFarmName = args[withFarmIndex + 1];
			}
			using IServiceScope scope = app.Services.CreateScope();
			OwnerBootstrapService bootstrap = scope.ServiceProvider.GetRequiredService<OwnerBootstrapService>();
			BootstrapResult outcome = await bootstrap.RunAsync(requestedFarmName);
			if (outcome.Success)
			{
				Console.WriteLine(outcome.Message);
			}
			else
			{
				Console.Error.WriteLine("Bootstrap not performed: " + outcome.Message);
			}
			return;
		}
		if (app.Environment.IsDevelopment())
		{
			app.UseSwagger();
			app.UseSwaggerUI();
		}
		app.UseExceptionHandler((IApplicationBuilder errorApp) =>
		{
			errorApp.Run(async (HttpContext context) =>
			{
				context.Response.StatusCode = 500;
				await context.Response.WriteAsJsonAsync(Result.Fail("An unexpected server error occurred."));
			});
		});
		app.UseCors("frontend");
		app.UseAuthentication();
		app.UseAuthorization();
		app.MapControllers();
		app.Run();
	}
}
