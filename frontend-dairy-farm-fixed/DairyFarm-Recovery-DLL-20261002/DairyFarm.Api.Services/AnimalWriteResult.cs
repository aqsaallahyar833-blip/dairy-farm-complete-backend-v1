using System.Collections.Generic;
using DairyFarm.Api.DTOs;

namespace DairyFarm.Api.Services;

public record AnimalWriteResult(AnimalWriteOutcome Outcome, AnimalDetailDto? Animal = null, string? Message = null, IReadOnlyList<string>? Errors = null);
