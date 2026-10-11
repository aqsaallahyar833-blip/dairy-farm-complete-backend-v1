namespace DairyFarm.Api.Services;

public record StoredPhoto(ulong AnimalId, byte[] Bytes, string ContentType, ulong PhotoId);
