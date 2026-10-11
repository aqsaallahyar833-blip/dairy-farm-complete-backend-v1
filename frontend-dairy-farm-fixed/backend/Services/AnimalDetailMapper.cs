using DairyFarm.Api.DTOs;
using DairyFarm.Api.Models;

namespace DairyFarm.Api.Services;

/// <summary>
/// Entity -> DTO projection for animals.
///
/// Extracted from AnimalRepository so the read path and the write path return
/// IDENTICAL shapes. Two separate mappers would be a guaranteed source of drift
/// between what a POST returns and what a later GET returns for the same animal.
///
/// RECONCILED against the canonical schema: the ear tag and RFID are columns on
/// `animals` (tag_number / rfid_number), the birth date is `date_of_birth`, the
/// acquired date is `acquisition_date`, and the profile image is `photo_url`.
/// There is no animal_identifications table, so nothing is read from one.
/// </summary>
public static class AnimalDetailMapper
{
    public static AnimalDto MapToList(Animal animal) => new()
    {
        AnimalId = animal.AnimalId,
        AnimalCode = animal.AnimalCode,
        TagNumber = animal.TagNumber,
        Name = animal.Name,
        BreedId = animal.BreedId,
        BreedName = animal.Breed?.Name,
        DateOfBirth = animal.DateOfBirth,
        Status = animal.Status,
        Sex = animal.Sex,
        FarmId = animal.FarmId,
        FarmName = animal.Farm?.Name,
        GroupId = animal.GroupId,
        GroupName = animal.Group?.Name,
        Photo = animal.PhotoUrl,
        Notes = animal.Notes,
        PurchaseDate = animal.AcquisitionDate,
        PurchasePrice = animal.PurchasePrice,
        AgeInMonths = CalculateAgeInMonths(animal.DateOfBirth),
        CreatedAt = animal.CreatedAt,
        UpdatedAt = animal.UpdatedAt
    };

    public static AnimalDetailDto Map(Animal animal)
    {
        var dto = new AnimalDetailDto
        {
            AnimalId = animal.AnimalId,
            AnimalCode = animal.AnimalCode,
            TagNumber = animal.TagNumber,
            RfidNumber = animal.RfidNumber,
            Name = animal.Name,
            BreedId = animal.BreedId,
            BreedName = animal.Breed?.Name,
            DateOfBirth = animal.DateOfBirth,
            Status = animal.Status,
            Sex = animal.Sex,
            FarmId = animal.FarmId,
            FarmName = animal.Farm?.Name,
            GroupId = animal.GroupId,
            GroupName = animal.Group?.Name,
            Photo = animal.PhotoUrl,
            Notes = animal.Notes,
            PurchaseDate = animal.AcquisitionDate,
            PurchasePrice = animal.PurchasePrice,
            AgeInMonths = CalculateAgeInMonths(animal.DateOfBirth),
            CreatedAt = animal.CreatedAt,
            UpdatedAt = animal.UpdatedAt,
            DamId = animal.DamId,
            DamAnimalCode = animal.Dam?.AnimalCode,
            SireId = animal.SireId,
            SireAnimalCode = animal.Sire?.AnimalCode
        };

        // Shed is reached only via the animal's group; animals has no shed_id.
        if (animal.Group?.Shed is { } shed)
        {
            dto.Shed = new ShedDto
            {
                ShedId = shed.ShedId,
                ShedName = shed.Name,
                FarmId = shed.FarmId,
                FarmName = shed.Farm?.Name,
                Capacity = shed.Capacity,
                Notes = shed.Notes
            };
        }

        dto.StatusHistory = animal.StatusHistory
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => new AnimalStatusHistoryDto
            {
                StatusHistoryId = h.StatusHistoryId,
                OldStatus = h.OldStatus,
                NewStatus = h.NewStatus,
                Reason = h.Reason,
                ChangedAt = h.CreatedAt,
                UserId = h.ChangedBy
            })
            .ToList();

        return dto;
    }

    private static int? CalculateAgeInMonths(DateTime? dateOfBirth)
    {
        if (!dateOfBirth.HasValue)
        {
            return null;
        }

        var today = DateTime.Now;
        var months = ((today.Year - dateOfBirth.Value.Year) * 12) + (today.Month - dateOfBirth.Value.Month);

        if (today.Day < dateOfBirth.Value.Day)
        {
            months -= 1;
        }

        return months >= 0 ? months : null;
    }
}

