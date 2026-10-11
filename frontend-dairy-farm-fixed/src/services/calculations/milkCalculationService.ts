import { MilkRecord, MilkingSession, MilkQualityStatus, MilkDailySummary, MilkAnimalSummary } from '../../types';

export const STANDARD_MILK_PRICE_PER_LITER = 150; // Rs / Liter default benchmark

export interface DailyMilkBreakdown {
  morning: number;
  evening: number;
  third: number;
  total: number;
}

export interface MilkQualityMetrics {
  avgFat: number | null;
  avgSnf: number | null;
  avgProtein: number | null;
  avgScc: number | null;
}

export interface MilkDropAlertResult {
  hasDrop: boolean;
  dropLiters: number;
  dropPercentage: number;
  recentAverage: number;
  todayMilk: number;
  alertType: 'Management Alert'; // Explicitly not a medical diagnosis
  message: string;
}

export interface MilkHistoryStats {
  todayTotal: number;
  yesterdayTotal: number;
  last7DaysTotal: number;
  last7DaysAverage: number;
  last30DaysTotal: number;
  last30DaysAverage: number;
  monthlyTotal: number;
}

export const milkCalculationService = {
  /**
   * Calculates milk revenue based on volume and price per liter
   */
  calculateMilkRevenue(liters: number, unitPrice: number = STANDARD_MILK_PRICE_PER_LITER): number {
    return Math.round((liters ?? 0) * unitPrice);
  },

  /**
   * Sums milk for a single animal on a single day across sessions:
   * Daily Total = Morning + Evening + Third Milking
   */
  calculateDailyMilk(records: MilkRecord[]): DailyMilkBreakdown {
    let morning = 0;
    let evening = 0;
    let third = 0;

    for (const r of records) {
      const q = r.quantityLiters ?? 0;
      if (r.session === 'Morning') morning += q;
      else if (r.session === 'Evening') evening += q;
      else if (r.session === 'Third') third += q;
    }

    const total = Math.round((morning + evening + third) * 100) / 100;
    return {
      morning: Math.round(morning * 100) / 100,
      evening: Math.round(evening * 100) / 100,
      third: Math.round(third * 100) / 100,
      total,
    };
  },

  /**
   * Calculates herd daily summary for a STRICT date:
   * Only records where record.date === targetDate
   */
  calculateHerdDailySummary(
    records: MilkRecord[],
    targetDate: string,
    unitPrice: number = STANDARD_MILK_PRICE_PER_LITER
  ): MilkDailySummary {
    const dayRecords = records.filter((r) => r.date === targetDate);

    let morningLiters = 0;
    let eveningLiters = 0;
    let thirdLiters = 0;
    let rejectedLiters = 0;
    let acceptedLiters = 0;
    let revenueSum = 0;

    const producingAnimalIds = new Set<string>();

    let fatSum = 0;
    let fatCount = 0;
    let snfSum = 0;
    let snfCount = 0;

    for (const r of dayRecords) {
      const q = r.quantityLiters ?? 0;
      if (r.session === 'Morning') morningLiters += q;
      else if (r.session === 'Evening') eveningLiters += q;
      else if (r.session === 'Third') thirdLiters += q;

      if (r.qualityStatus === 'Rejected') {
        rejectedLiters += q;
      } else {
        acceptedLiters += q;
        const recordPrice = r.pricePerLiter ?? unitPrice;
        const recordRevenue = r.totalAmount !== undefined ? r.totalAmount : (q * recordPrice);
        revenueSum += recordRevenue;
      }

      if (r.animalId) {
        producingAnimalIds.add(r.animalId);
      }

      if (r.fatPercent !== undefined && r.fatPercent !== null) {
        fatSum += r.fatPercent;
        fatCount++;
      }
      if (r.snfPercent !== undefined && r.snfPercent !== null) {
        snfSum += r.snfPercent;
        snfCount++;
      }
    }

    const totalLiters = Math.round((morningLiters + eveningLiters + thirdLiters) * 100) / 100;
    const milkingCowsCount = producingAnimalIds.size;
    const averagePerCow = milkingCowsCount > 0 ? Math.round((totalLiters / milkingCowsCount) * 10) / 10 : 0;
    const revenue = Math.round(revenueSum);

    return {
      date: targetDate,
      morningLiters: Math.round(morningLiters * 100) / 100,
      eveningLiters: Math.round(eveningLiters * 100) / 100,
      thirdLiters: Math.round(thirdLiters * 100) / 100,
      totalLiters,
      milkingCowsCount,
      averagePerCow,
      rejectedLiters: Math.round(rejectedLiters * 100) / 100,
      revenue,
      avgFat: fatCount > 0 ? Math.round((fatSum / fatCount) * 100) / 100 : 3.8,
      avgSnf: snfCount > 0 ? Math.round((snfSum / snfCount) * 100) / 100 : 8.85,
    };
  },

  /**
   * Calculates overall milk production history statistics from actual stored records
   */
  calculateProductionHistory(records: MilkRecord[], targetDate?: string): MilkHistoryStats {
    const safeTargetDate = targetDate || new Date().toISOString().slice(0, 10);

    // 1. Today
    const todaySummary = this.calculateHerdDailySummary(records, safeTargetDate);

    // 2. Yesterday (date minus 1 day in YYYY-MM-DD)
    const targetDt = new Date(safeTargetDate);
    const yesterdayDt = new Date(targetDt);
    yesterdayDt.setDate(targetDt.getDate() - 1);
    const yesterdayStr = yesterdayDt.toISOString().slice(0, 10);
    const yesterdaySummary = this.calculateHerdDailySummary(records, yesterdayStr);

    // 3. Last 7 Days
    let last7Total = 0;
    const distinctDays7 = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const dt = new Date(targetDt);
      dt.setDate(targetDt.getDate() - i);
      const dStr = dt.toISOString().slice(0, 10);
      const dayRecs = (records || []).filter((r) => r.date === dStr);
      if (dayRecs.length > 0) distinctDays7.add(dStr);
      for (const r of dayRecs) {
        last7Total += r.quantityLiters ?? 0;
      }
    }
    const daysIn7 = Math.max(1, distinctDays7.size);
    const last7DaysAverage = Math.round((last7Total / daysIn7) * 10) / 10;

    // 4. Last 30 Days
    let last30Total = 0;
    const distinctDays30 = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const dt = new Date(targetDt);
      dt.setDate(targetDt.getDate() - i);
      const dStr = dt.toISOString().slice(0, 10);
      const dayRecs = (records || []).filter((r) => r.date === dStr);
      if (dayRecs.length > 0) distinctDays30.add(dStr);
      for (const r of dayRecs) {
        last30Total += r.quantityLiters ?? 0;
      }
    }
    const daysIn30 = Math.max(1, distinctDays30.size);
    const last30DaysAverage = Math.round((last30Total / daysIn30) * 10) / 10;

    // 5. Monthly total (same YYYY-MM)
    const monthPrefix = safeTargetDate.slice(0, 7);
    const monthlyTotal = (records || [])
      .filter((r) => r.date && r.date.startsWith(monthPrefix))
      .reduce((sum, r) => sum + (r.quantityLiters ?? 0), 0);

    return {
      todayTotal: todaySummary.totalLiters,
      yesterdayTotal: yesterdaySummary.totalLiters,
      last7DaysTotal: Math.round(last7Total * 100) / 100,
      last7DaysAverage,
      last30DaysTotal: Math.round(last30Total * 100) / 100,
      last30DaysAverage,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    };
  },

  /**
   * Evaluates milk drop management alert:
   * Milk drop alert = (recentAverage - todayMilk) / recentAverage >= threshold
   * Strict rule: Labeled as Management Alert only, never as a medical diagnosis.
   */
  checkMilkDropAlert(
    todayMilk: number,
    recentAverage: number,
    thresholdPercent: number = 15
  ): MilkDropAlertResult {
    if (recentAverage <= 0) {
      return {
        hasDrop: false,
        dropLiters: 0,
        dropPercentage: 0,
        recentAverage: 0,
        todayMilk,
        alertType: 'Management Alert',
        message: 'Normal production',
      };
    }

    const dropLiters = Math.max(0, recentAverage - todayMilk);
    const dropPercentage = Math.round((dropLiters / recentAverage) * 1000) / 10;
    const hasDrop = dropPercentage >= thresholdPercent;

    const message = hasDrop
      ? `Management Alert: Production drop of ${dropLiters.toFixed(1)} L (${dropPercentage}%) compared to recent average (${recentAverage.toFixed(1)} L/day). Check parlor milking protocol, feed intake, or schedule veterinary evaluation.`
      : 'Production is within normal operating variance.';

    return {
      hasDrop,
      dropLiters: Math.round(dropLiters * 100) / 100,
      dropPercentage,
      recentAverage: Math.round(recentAverage * 100) / 100,
      todayMilk: Math.round(todayMilk * 100) / 100,
      alertType: 'Management Alert',
      message,
    };
  },

  /**
   * Calculates performance metrics for a specific animal across all historical records
   */
  calculateAnimalMilkPerformance(
    animalIdOrTag: string,
    allRecords: MilkRecord[],
    targetDate: string = new Date().toISOString().slice(0, 10)
  ): {
    todayMilk: number;
    average7Days: number;
    average30Days: number;
    lactationTotal: number;
    peakMilk: number;
    peakDate: string;
    trend: 'Increasing' | 'Stable' | 'Decreasing';
    records: MilkRecord[];
  } {
    const animalRecords = allRecords
      .filter((r) => r.animalId === animalIdOrTag || r.animalTag === animalIdOrTag)
      .sort((a, b) => b.date.localeCompare(a.date));

    // Daily totals grouped by date
    const dailyMap: Record<string, number> = {};
    for (const r of animalRecords) {
      dailyMap[r.date] = (dailyMap[r.date] || 0) + (r.quantityLiters ?? 0);
    }

    const todayMilk = Math.round((dailyMap[targetDate] || 0) * 100) / 100;

    // Find peak daily production
    let peakMilk = 0;
    let peakDate = '';
    for (const [d, sum] of Object.entries(dailyMap)) {
      if (sum > peakMilk) {
        peakMilk = sum;
        peakDate = d;
      }
    }

    // 7-day average
    const targetDt = new Date(targetDate);
    let sum7 = 0;
    let count7 = 0;
    for (let i = 0; i < 7; i++) {
      const dt = new Date(targetDt);
      dt.setDate(targetDt.getDate() - i);
      const dStr = dt.toISOString().slice(0, 10);
      if (dailyMap[dStr] !== undefined) {
        sum7 += dailyMap[dStr];
        count7++;
      }
    }
    const average7Days = count7 > 0 ? Math.round((sum7 / count7) * 10) / 10 : todayMilk;

    // 30-day average
    let sum30 = 0;
    let count30 = 0;
    for (let i = 0; i < 30; i++) {
      const dt = new Date(targetDt);
      dt.setDate(targetDt.getDate() - i);
      const dStr = dt.toISOString().slice(0, 10);
      if (dailyMap[dStr] !== undefined) {
        sum30 += dailyMap[dStr];
        count30++;
      }
    }
    const average30Days = count30 > 0 ? Math.round((sum30 / count30) * 10) / 10 : average7Days;

    // Lactation total
    const lactationTotal = Math.round(
      animalRecords.reduce((sum, r) => sum + (r.quantityLiters ?? 0), 0) * 100
    ) / 100;

    // Trend comparison: today vs 7-day average
    let trend: 'Increasing' | 'Stable' | 'Decreasing' = 'Stable';
    if (todayMilk > average7Days * 1.05) trend = 'Increasing';
    else if (todayMilk < average7Days * 0.95) trend = 'Decreasing';

    return {
      todayMilk,
      average7Days,
      average30Days,
      lactationTotal,
      peakMilk: Math.round(peakMilk * 10) / 10,
      peakDate,
      trend,
      records: animalRecords,
    };
  },

  /**
   * Calculates Days in Milk (DIM) from actual calving date to current date / dry date
   */
  calculateDaysInMilk(calvingDateStr: string, referenceDateStr: string = new Date().toISOString().slice(0, 10)): number {
    if (!calvingDateStr) return 0;
    const calving = new Date(calvingDateStr);
    const ref = new Date(referenceDateStr);
    const diffMs = ref.getTime() - calving.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },
};
