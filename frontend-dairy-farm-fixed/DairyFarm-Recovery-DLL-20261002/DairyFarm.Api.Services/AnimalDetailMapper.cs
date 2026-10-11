using System;
using System.Linq;
using DairyFarm.Api.DTOs;
using DairyFarm.Api.Models;

namespace DairyFarm.Api.Services;

public static class AnimalDetailMapper
{
	public static AnimalDto MapToList(Animal animal)
	{
		return new AnimalDto
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
	}

	public static AnimalDetailDto Map(Animal animal)
	{
		AnimalDetailDto animalDetailDto = new AnimalDetailDto
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
		Shed shed = animal.Group?.Shed;
		if (shed != null)
		{
			animalDetailDto.Shed = new ShedDto
			{
				ShedId = shed.ShedId,
				ShedName = shed.Name,
				FarmId = shed.FarmId,
				FarmName = shed.Farm?.Name,
				Capacity = shed.Capacity,
				Notes = shed.Notes
			};
		}
		animalDetailDto.StatusHistory = (from h in animal.StatusHistory
			orderby h.CreatedAt descending
			select new AnimalStatusHistoryDto
			{
				StatusHistoryId = h.StatusHistoryId,
				OldStatus = h.OldStatus,
				NewStatus = h.NewStatus,
				Reason = h.Reason,
				ChangedAt = h.CreatedAt,
				UserId = h.ChangedBy
			}).ToList();
		return animalDetailDto;
	}

	private static int? CalculateAgeInMonths(DateTime? dateOfBirth)
	{
		if (!dateOfBirth.HasValue)
		{
			return null;
		}
		DateTime now = DateTime.Now;
		int num = (now.Year - dateOfBirth.Value.Year) * 12 + (now.Month - dateOfBirth.Value.Month);
		if (now.Day < dateOfBirth.Value.Day)
		{
			num--;
		}
		return (num >= 0) ? new int?(num) : ((int?)null);
	}
}
