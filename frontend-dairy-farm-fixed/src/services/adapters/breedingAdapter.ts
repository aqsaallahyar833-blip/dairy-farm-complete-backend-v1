import { BreedingRecord } from '../../types';

export const breedingAdapter = {
  formatRecord(record: BreedingRecord) {
    return {
      ...record,
      statusLabel: record.pregnancyResult
        ? `Pregnancy: ${record.pregnancyResult}`
        : record.serviceDate
        ? 'Inseminated (Check Pending)'
        : 'Heat Detected',
      daysUntilCalving: record.expectedCalvingDate
        ? Math.ceil(
            (new Date(record.expectedCalvingDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };
  },
};
