import { MilkRecord, MilkDailySummary } from '../../types';

export interface FormattedMilkRecord extends MilkRecord {
  formattedQuantity: string;
  isRejected: boolean;
  revenueEst: number;
}

export const milkAdapter = {
  formatRecord(record: MilkRecord): FormattedMilkRecord {
    return {
      ...record,
      formattedQuantity: `${(record.quantityLiters ?? 0).toFixed(1)} L`,
      isRejected: record.qualityStatus === 'Rejected',
      revenueEst: record.qualityStatus === 'Accepted' ? Math.round((record.quantityLiters ?? 0) * 150) : 0,
    };
  },

  formatDailySummary(summary: MilkDailySummary) {
    return {
      ...summary,
      totalFormatted: `${(summary.totalLiters ?? 0).toLocaleString()} L`,
      revenueFormatted: `Rs ${(summary.revenue ?? 0).toLocaleString()}`,
      avgFormatted: `${summary.averagePerCow ?? 0} L/cow`,
    };
  },
};
