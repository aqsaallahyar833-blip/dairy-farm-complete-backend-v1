import { Expense, Income, MilkRecord } from '../../types';

export interface DateFilterRange {
  from?: string;
  to?: string;
  date?: string;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  milkSales: number;
  animalSales: number;
  calfSales: number;
  manureSales: number;
  otherIncome: number;
  transactionCount: number;
}

export interface ExpenseBreakdown {
  totalExpenses: number;
  feed: number;
  medicine: number;
  labour: number;
  electricity: number;
  water: number;
  diesel: number;
  veterinary: number;
  maintenance: number;
  animalPurchases: number;
  transport: number;
  other: number;
  productionRelatedExpenses: number;
  transactionCount: number;
}

export interface ProfitAndLossResult {
  totalRevenue: number;
  totalExpenses: number;
  netProfitOrLoss: number; // positive = profit, negative = loss
  isProfit: boolean;
  isLoss: boolean;
  profitAmount: number; // >= 0
  lossAmount: number; // >= 0
  profitMarginPercent: number;
  formattedStatus: string; // e.g. "Profit: Rs 150,000" or "Loss: Rs 50,000"
}

export interface FarmProfitabilityReport {
  timeframe: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  dateRange: { from: string; to: string };
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  profitAndLoss: ProfitAndLossResult;
  milkMetrics: {
    totalMilkLiters: number;
    /** Null when no milk was produced in the range - not zero. */
    revenuePerLiter: number | null;
    /** Null when no milk was produced in the range - not zero. */
    costPerLiter: number | null;
    /** Null when either input is unavailable - not a default price. */
    marginPerLiter: number | null;
  };
}

export interface AnimalProfitabilityResult {
  animalId: string;
  animalTag: string;
  name?: string;
  totalMilkLiters: number;
  /** Null when no rate was supplied - never a default. */
  milkRatePerLiter: number | null;
  /** Null when no rate was supplied. */
  milkRevenue: number | null;
  feedCostAllocated: number;
  medicineCost: number;
  veterinaryCost: number;
  otherAllocatedCost: number;
  totalCost: number;
  /** Null when revenue could not be derived. */
  estimatedContribution: number | null;
  /** Null when contribution could not be derived. */
  isPositiveContribution: boolean | null;
  calculable: boolean;
  notes: string;
}

export const financialCalculationService = {
  /**
   * Filters transactions strictly within the specified date or date range
   */
  filterByDateRange<T extends { date: string }>(items: T[], range?: DateFilterRange): T[] {
    if (!range) return items;

    return items.filter((item) => {
      if (range.date) {
        return item.date === range.date;
      }
      if (range.from && item.date < range.from) {
        return false;
      }
      if (range.to && item.date > range.to) {
        return false;
      }
      return true;
    });
  },

  /**
   * Calculates detailed revenue breakdown from valid income transactions
   */
  calculateRevenue(incomes: Income[], range?: DateFilterRange): RevenueBreakdown {
    const filtered = this.filterByDateRange(incomes, range);

    let totalRevenue = 0;
    let milkSales = 0;
    let animalSales = 0;
    let calfSales = 0;
    let manureSales = 0;
    let otherIncome = 0;

    for (const inc of filtered) {
      const amount = inc.amount ?? 0;
      totalRevenue += amount;

      const cat = (inc.category || inc.source || '').toLowerCase().trim();
      if (cat.includes('milk')) {
        milkSales += amount;
      } else if (cat.includes('animal') || cat.includes('heifer') || cat.includes('cow') || cat.includes('cattle')) {
        animalSales += amount;
      } else if (cat.includes('calf')) {
        calfSales += amount;
      } else if (cat.includes('manure') || cat.includes('fertilizer') || cat.includes('compost')) {
        manureSales += amount;
      } else {
        otherIncome += amount;
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue),
      milkSales: Math.round(milkSales),
      animalSales: Math.round(animalSales),
      calfSales: Math.round(calfSales),
      manureSales: Math.round(manureSales),
      otherIncome: Math.round(otherIncome),
      transactionCount: filtered.length,
    };
  },

  /**
   * Calculates detailed expense breakdown from valid expense transactions
   */
  calculateExpenses(expenses: Expense[], range?: DateFilterRange): ExpenseBreakdown {
    const filtered = this.filterByDateRange(expenses, range);

    let totalExpenses = 0;
    let feed = 0;
    let medicine = 0;
    let labour = 0;
    let electricity = 0;
    let water = 0;
    let diesel = 0;
    let veterinary = 0;
    let maintenance = 0;
    let animalPurchases = 0;
    let transport = 0;
    let other = 0;

    for (const exp of filtered) {
      const amount = exp.amount ?? 0;
      totalExpenses += amount;

      const cat = (exp.category || '').toLowerCase().trim();
      if (cat.includes('feed') || cat.includes('silage') || cat.includes('fodder') || cat.includes('wanda')) {
        feed += amount;
      } else if (cat.includes('med') || cat.includes('vaccine')) {
        medicine += amount;
      } else if (cat.includes('labour') || cat.includes('labor') || cat.includes('wage') || cat.includes('payroll')) {
        labour += amount;
      } else if (cat.includes('elect')) {
        electricity += amount;
      } else if (cat.includes('water')) {
        water += amount;
      } else if (cat.includes('diesel') || cat.includes('fuel') || cat.includes('petrol')) {
        diesel += amount;
      } else if (cat.includes('vet') || cat.includes('doctor') || cat.includes('semen') || cat.includes('breeding')) {
        veterinary += amount;
      } else if (cat.includes('maint') || cat.includes('repair') || cat.includes('shed') || cat.includes('parlor')) {
        maintenance += amount;
      } else if (cat.includes('purchase') || cat.includes('acquisition')) {
        animalPurchases += amount;
      } else if (cat.includes('trans') || cat.includes('freight') || cat.includes('trucking')) {
        transport += amount;
      } else {
        other += amount;
      }
    }

    // Direct production expenses for milk cost calculations
    const productionRelatedExpenses = feed + medicine + veterinary + labour + electricity + diesel;

    return {
      totalExpenses: Math.round(totalExpenses),
      feed: Math.round(feed),
      medicine: Math.round(medicine),
      labour: Math.round(labour),
      electricity: Math.round(electricity),
      water: Math.round(water),
      diesel: Math.round(diesel),
      veterinary: Math.round(veterinary),
      maintenance: Math.round(maintenance),
      animalPurchases: Math.round(animalPurchases),
      transport: Math.round(transport),
      other: Math.round(other),
      productionRelatedExpenses: Math.round(productionRelatedExpenses),
      transactionCount: filtered.length,
    };
  },

  /**
   * Centralized Profit & Loss calculation:
   * Profit = Revenue - Expenses
   * If Expenses > Revenue: Loss is clearly distinguished, never masked as positive.
   */
  calculateProfitAndLoss(
    incomes: Income[],
    expenses: Expense[],
    range?: DateFilterRange
  ): ProfitAndLossResult {
    const rev = this.calculateRevenue(incomes, range);
    const exp = this.calculateExpenses(expenses, range);

    const netProfitOrLoss = rev.totalRevenue - exp.totalExpenses;
    const isLoss = netProfitOrLoss < 0;
    const isProfit = netProfitOrLoss >= 0;

    const profitAmount = isProfit ? netProfitOrLoss : 0;
    const lossAmount = isLoss ? Math.abs(netProfitOrLoss) : 0;

    const profitMarginPercent =
      rev.totalRevenue > 0
        ? Math.round((netProfitOrLoss / rev.totalRevenue) * 1000) / 10
        : 0;

    const formattedStatus = isLoss
      ? `Loss: Rs ${lossAmount.toLocaleString()}`
      : `Profit: Rs ${profitAmount.toLocaleString()}`;

    return {
      totalRevenue: rev.totalRevenue,
      totalExpenses: exp.totalExpenses,
      netProfitOrLoss,
      isProfit,
      isLoss,
      profitAmount,
      lossAmount,
      profitMarginPercent,
      formattedStatus,
    };
  },

  /**
   * Helper to summarize financial performance
   */
  calculateFinancialSummary(incomes: Income[], expenses: Expense[], range?: DateFilterRange) {
    const pnl = this.calculateProfitAndLoss(incomes, expenses, range);
    return {
      totalIncome: pnl.totalRevenue,
      totalExpense: pnl.totalExpenses,
      netProfit: pnl.netProfitOrLoss,
      profitMarginPercent: pnl.profitMarginPercent,
    };
  },

  /**
   * Cost Per Liter:
   * Cost Per Liter = Relevant Production Costs / Total Milk Liters
   * Returns null when the divisor is zero, because "cost per litre" is
   * undefined without a volume rather than zero.
   */
  calculateCostPerLiter(productionExpenses: number, totalMilkLiters: number): number | null {
    if (totalMilkLiters <= 0) return null;
    return Math.round((productionExpenses / totalMilkLiters) * 100) / 100;
  },

  /**
   * Milk Profit / Contribution Margin Per Liter:
   * Margin = Selling Price Per Liter - Cost Per Liter
   * Returns null when either input is unavailable, so no default price is assumed.
   */
  calculateMilkMarginPerLiter(sellingPricePerLiter: number | null, costPerLiter: number | null): number | null {
    if (sellingPricePerLiter === null || costPerLiter === null) return null;
    return Math.round((sellingPricePerLiter - costPerLiter) * 100) / 100;
  },

  /**
   * Comprehensive Farm Profitability across any timeframe
   */
  calculateFarmProfitability(
    incomes: Income[],
    expenses: Expense[],
    milkRecords: MilkRecord[],
    timeframe: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom',
    from: string,
    to: string
  ): FarmProfitabilityReport {
    const range: DateFilterRange = { from, to };
    const rev = this.calculateRevenue(incomes, range);
    const exp = this.calculateExpenses(expenses, range);
    const pnl = this.calculateProfitAndLoss(incomes, expenses, range);

    const rangeMilkRecords = this.filterByDateRange(milkRecords, range);
    const totalMilkLiters = Math.round(
      rangeMilkRecords.reduce((s, r) => s + (r.quantityLiters ?? 0), 0) * 100
    ) / 100;

    const revenuePerLiter =
      totalMilkLiters > 0
        ? Math.round((rev.milkSales / totalMilkLiters) * 100) / 100
        : null;

    const costPerLiter = this.calculateCostPerLiter(
      exp.productionRelatedExpenses,
      totalMilkLiters
    );

    const marginPerLiter = this.calculateMilkMarginPerLiter(revenuePerLiter, costPerLiter);

    return {
      timeframe,
      dateRange: { from, to },
      revenue: rev,
      expenses: exp,
      profitAndLoss: pnl,
      milkMetrics: {
        totalMilkLiters,
        revenuePerLiter,
        costPerLiter,
        marginPerLiter,
      },
    };
  },

  /**
   * Animal Profitability / Contribution Margin Calculation:
   * Clearly labels all allocated costs and assumptions.
   */
  calculateAnimalProfitability(params: {
    animalId: string;
    animalTag: string;
    name?: string;
    totalMilkLiters: number;
    milkRatePerLiter?: number;
    feedCostAllocated?: number;
    medicineCost?: number;
    veterinaryCost?: number;
    otherAllocatedCost?: number;
  }): AnimalProfitabilityResult {
    // No default milk rate. Without a supplied rate, revenue is not calculated
    // and the result is explicitly marked as not calculable.
    const milkRate = params.milkRatePerLiter ?? null;
    const milkRevenue = milkRate !== null ? Math.round(params.totalMilkLiters * milkRate) : null;
    const feed = params.feedCostAllocated ?? 0;
    const med = params.medicineCost ?? 0;
    const vet = params.veterinaryCost ?? 0;
    const other = params.otherAllocatedCost ?? 0;

    const totalCost = feed + med + vet + other;
    const estimatedContribution = milkRevenue !== null ? milkRevenue - totalCost : null;

    return {
      animalId: params.animalId,
      animalTag: params.animalTag,
      name: params.name,
      totalMilkLiters: params.totalMilkLiters,
      milkRatePerLiter: milkRate,
      milkRevenue,
      feedCostAllocated: feed,
      medicineCost: med,
      veterinaryCost: vet,
      otherAllocatedCost: other,
      totalCost,
      estimatedContribution,
      isPositiveContribution: estimatedContribution !== null ? estimatedContribution >= 0 : null,
      calculable: milkRevenue !== null,
      notes:
        milkRevenue !== null
          ? 'Contribution margin based on recorded milk yields, direct veterinary and medicine costs, and allocated feed cost.'
          : 'Not calculable: no milk selling rate was supplied, so revenue cannot be derived from recorded yield.',
    };
  },
};
