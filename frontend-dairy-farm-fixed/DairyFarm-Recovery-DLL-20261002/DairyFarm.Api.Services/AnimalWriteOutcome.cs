namespace DairyFarm.Api.Services;

public enum AnimalWriteOutcome
{
	Created,
	Updated,
	AnimalNotFound,
	ValidationFailed,
	DuplicateCode,
	StatusChangeNotPermitted,
	SameStatus
}
