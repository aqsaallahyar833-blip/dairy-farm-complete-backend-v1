/**
 * PUNJAB PURE DAIRY - AUDIT & VALIDATION SYSTEM
 * Module: dairyCalculations.js
 * Description: Step-by-step calculation engine with complete audit logs.
 *
 * PHASE 0 CONTRACT
 * ----------------
 * Every function follows one rule: it either calculates from data that was
 * actually supplied, or it returns an INSUFFICIENT_DATA result carrying a
 * reason. It never substitutes a default figure.
 *
 * Every value previously used as a fallback (milk price, herd size, a "reported
 * profit", a 4-animal withdrawal hold, a tank volume, a monthly expectation)
 * was a hard-coded case-study constant with no origin in the `dairy farm 1`
 * database. All of them have been removed.
 *
 * Thresholds in config.json remain, because a threshold is a configurable rule
 * trigger and is never presented as a measurement.
 *
 * This file is plain JavaScript so it can be imported by the Vite app, the
 * Express server, and `node testSuite.js` without a build step.
 */

import config from './config.json' with { type: 'json' };

export const CALC_STATUS = {
  OK: 'OK',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

/**
 * Builds the standard "cannot calculate" result.
 * @param {string} message human-readable reason
 * @param {string[]} missing list of what was absent
 */
const insufficient = (message, missing) => ({
  status: CALC_STATUS.INSUFFICIENT_DATA,
  message,
  missing,
});

export const DairyMath = {
  round(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  },

  /**
   * Division that reports insufficiency instead of silently returning a fallback.
   * Zero over zero is genuinely 0; non-zero over zero is undefined, not zero.
   * @returns {number|null}
   */
  safeDivide(numerator, denominator) {
    if (denominator === 0 || denominator === null || denominator === undefined || isNaN(denominator)) {
      if (numerator === 0) return 0;
      return null;
    }
    return this.round(numerator / denominator, 2);
  },

  /** Reads a numeric input without inventing one. @returns {number|null} */
  num(value) {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) return null;
    return Number(value);
  },
};

/** Audit trail helper. Records each substituted value behind a result. */
export class CalculationAuditTrail {
  constructor(name) {
    this.calculationName = name;
    this.timestamp = new Date().toISOString();
    this.steps = [];
  }

  addStep(stepNumber, description, formula, substitutedValues, result) {
    this.steps.push({
      step: stepNumber,
      description,
      formula,
      values: substitutedValues,
      result: typeof result === 'number' ? DairyMath.round(result) : result,
    });
  }

  finalize(finalSummary) {
    return {
      calculationName: this.calculationName,
      timestamp: this.timestamp,
      steps: this.steps,
      summary: finalSummary,
    };
  }
}

/**
 * 1. DAILY MILK PRODUCTION & SESSION BREAKDOWN
 *
 * Requires at least one milk record. Counts milking cows from the records
 * themselves - it never assumes a herd size. Revenue needs a supplied rate.
 */
export function calculateDailyMilkYield(records = [], options = {}) {
  const audit = new CalculationAuditTrail('Daily Milk Production Calculation');

  if (!Array.isArray(records) || records.length === 0) {
    return insufficient('Insufficient milk records to calculate daily production.', ['milk_records rows']);
  }

  const pricePerLiter = DairyMath.num(options.pricePerLiter);
  const hasPrice = pricePerLiter !== null;

  let morningLiters = 0;
  let eveningLiters = 0;
  let thirdLiters = 0;
  let rejectedLiters = 0;
  let totalLiters = 0;
  const uniqueAnimalIds = new Set();
  const animalContributions = {};
  let unclassifiedSessionRecords = 0;

  records.forEach((r) => {
    const qty = Number(r.quantityLiters ?? r.amount ?? 0);
    const session = String(r.session || '').toLowerCase();
    const isRejected = r.qualityStatus === 'Rejected' || r.isRejected === true;
    const animalId = String(r.animalId || r.animalTag || 'Unknown');

    uniqueAnimalIds.add(animalId);
    animalContributions[animalId] = (animalContributions[animalId] || 0) + qty;

    if (session.includes('morn')) morningLiters += qty;
    else if (session.includes('eve')) eveningLiters += qty;
    else if (session.includes('third') || session.includes('aft')) thirdLiters += qty;
    else {
      morningLiters += qty;
      unclassifiedSessionRecords += 1;
    }

    if (isRejected) rejectedLiters += qty;
    else totalLiters += qty;
  });

  const grossLiters = totalLiters + rejectedLiters;
  const activeMilkingCows = uniqueAnimalIds.size;
  const avgPerCow = DairyMath.safeDivide(grossLiters, activeMilkingCows);

  audit.addStep(1, 'Aggregate Milking Sessions', 'Gross = Morning + Evening + Third', { morningLiters, eveningLiters, thirdLiters }, grossLiters);
  audit.addStep(2, 'Separate Rejected Milk (Withdrawal/Mastitis)', 'Net Accepted = Gross - Rejected', { grossLiters, rejectedLiters }, totalLiters);
  audit.addStep(3, 'Count Milking Animals Present in Records', 'Count = Distinct animal identifiers in the supplied records', { distinctAnimals: activeMilkingCows }, activeMilkingCows);
  if (avgPerCow !== null) {
    audit.addStep(4, 'Compute Average Yield per Milking Cow', 'Average = Gross / Milking Cows Count', { grossLiters, activeMilkingCows }, avgPerCow);
  }
  if (hasPrice) {
    audit.addStep(5, 'Calculate Revenue at Supplied Rate', 'Revenue = Accepted L * supplied rate', { totalLiters, pricePerLiter }, DairyMath.round(totalLiters * pricePerLiter));
  }

  return {
    status: CALC_STATUS.OK,
    grossLiters: DairyMath.round(grossLiters),
    acceptedLiters: DairyMath.round(totalLiters),
    rejectedLiters: DairyMath.round(rejectedLiters),
    morningLiters: DairyMath.round(morningLiters),
    eveningLiters: DairyMath.round(eveningLiters),
    thirdLiters: DairyMath.round(thirdLiters),
    milkingCowsCount: activeMilkingCows,
    averagePerCowLiters: avgPerCow,
    unclassifiedSessionRecords,
    animalContributions,
    // Null, not zero, when no rate was supplied.
    grossRevenuePKR: hasPrice ? DairyMath.round(totalLiters * pricePerLiter) : null,
    rejectedRevenueLossPKR: hasPrice ? DairyMath.round(rejectedLiters * pricePerLiter) : null,
    priceBasis: hasPrice ? 'supplied by caller' : 'no rate supplied - revenue not calculated',
    auditTrail: audit.finalize({ grossLiters, acceptedLiters: totalLiters, milkingCows: activeMilkingCows }),
  };
}

/**
 * 2. TRUE PROFIT & LOSS AUDIT ENGINE
 *
 * Requires real income and expense rows to produce a net figure. A comparison
 * against a separately reported figure is only made when that figure is
 * actually supplied - there is no default "reported" value.
 */
export function calculateTrueFinancialPnl(incomeRecords = [], expenseRecords = [], options = {}) {
  const audit = new CalculationAuditTrail('True Profit & Loss Audited Calculation');

  const hasIncome = Array.isArray(incomeRecords) && incomeRecords.length > 0;
  const hasExpense = Array.isArray(expenseRecords) && expenseRecords.length > 0;

  if (!hasIncome && !hasExpense) {
    return insufficient('Insufficient financial data. No income or expense transactions exist.', [
      'income rows',
      'expenses rows',
    ]);
  }

  const totalRevenue = incomeRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpenses = expenseRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const auditedNetProfitOrLoss = DairyMath.round(totalRevenue - totalExpenses);
  const isLoss = auditedNetProfitOrLoss < 0;
  const isProfit = auditedNetProfitOrLoss >= 0;

  // Only compare when a real reported figure was provided.
  const reportedSupplied = options.reportedDashboardFigure;
  const hasReported = reportedSupplied !== undefined && reportedSupplied !== null && !isNaN(Number(reportedSupplied));
  const reportedDashboardFigure = hasReported ? Number(reportedSupplied) : null;
  const discrepancyError = hasReported ? DairyMath.round(reportedDashboardFigure - auditedNetProfitOrLoss) : null;

  audit.addStep(1, 'Total Inflow Realization', 'Sum of All Incomes', { recordsCount: incomeRecords.length }, totalRevenue);
  audit.addStep(2, 'Total Outflow Deductions', 'Sum of All Expenses', { recordsCount: expenseRecords.length }, totalExpenses);
  audit.addStep(3, 'Compute Actual Net P&L', 'Net = Inflow - Outflow', { totalRevenue, totalExpenses }, auditedNetProfitOrLoss);
  if (hasReported) {
    audit.addStep(4, 'Audit Dashboard Discrepancy', 'Discrepancy = Reported - Audited', { reported: reportedDashboardFigure, audited: auditedNetProfitOrLoss }, discrepancyError);
  }

  const expenseByCategory = {};
  expenseRecords.forEach((e) => {
    const cat = e.category || 'Uncategorised';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount || 0);
  });

  return {
    status: CALC_STATUS.OK,
    completeLedger: hasIncome && hasExpense,
    totalRevenue: DairyMath.round(totalRevenue),
    totalExpenses: DairyMath.round(totalExpenses),
    netProfitOrLoss: auditedNetProfitOrLoss,
    isLoss,
    isProfit,
    absoluteLossAmount: isLoss ? Math.abs(auditedNetProfitOrLoss) : 0,
    absoluteProfitAmount: isProfit ? auditedNetProfitOrLoss : 0,
    reportedDashboardFigure,
    discrepancyError,
    comparisonPerformed: hasReported,
    expenseBreakdown: expenseByCategory,
    auditTrail: audit.finalize({
      auditedNetProfitOrLoss,
      discrepancyError,
      status: isLoss ? 'OPERATING_AT_DEFICIT' : 'PROFITABLE',
    }),
  };
}

/**
 * 3. EXPENSE PER COW VALIDATION ENGINE
 *
 * Requires a real expense total AND a real animal count. The anomaly corridor is
 * taken from configured thresholds, never from a hard-coded benchmark.
 */
export function calculateExpensePerCow(totalDailyExpense, cowCount) {
  const audit = new CalculationAuditTrail('Expense Per Cow Anomaly Audit');

  const expense = DairyMath.num(totalDailyExpense);
  const count = DairyMath.num(cowCount);
  const missing = [];

  if (expense === null) missing.push('daily expense total');
  if (count === null || count === 0) missing.push('non-disposed animal count');

  if (missing.length > 0) {
    return insufficient('Insufficient data to calculate expense per animal.', missing);
  }

  const costPerCow = DairyMath.safeDivide(expense, count);
  if (costPerCow === null) {
    return insufficient('Expense per animal is undefined because the animal count is zero.', ['non-disposed animal count']);
  }

  const thresholds = config.validationRules.expenseThresholds;
  const warningLevel = DairyMath.num(thresholds.warningPerCowDailyPKR);
  const criticalLevel = DairyMath.num(thresholds.criticalPerCowDailyPKR);

  const isAnomalous = warningLevel !== null && costPerCow > warningLevel;
  const isCriticalAnomaly = criticalLevel !== null ? costPerCow > criticalLevel : false;

  audit.addStep(1, 'Compute Cost Per Animal', 'CostPerCow = TotalDailyExpense / AnimalCount', { expense, animalCount: count }, costPerCow);
  audit.addStep(2, 'Evaluate Against Configured Warning Threshold', 'Anomalous when CostPerCow > configured warning level', { warningLevel, calculated: costPerCow }, isAnomalous ? 'ANOMALOUS' : 'NORMAL');

  return {
    status: CALC_STATUS.OK,
    totalDailyExpense: expense,
    animalCount: count,
    costPerCowDailyPKR: costPerCow,
    warningThresholdPKR: warningLevel,
    criticalThresholdPKR: criticalLevel,
    isAnomalous,
    isCriticalAnomaly,
    severity: isCriticalAnomaly ? 'CRITICAL' : isAnomalous ? 'HIGH' : 'NORMAL',
    recommendedInvestigation: isCriticalAnomaly
      ? 'Verify whether a bulk purchase or lump-sum utility or payroll charge was booked as a single day of operating expense instead of being amortised.'
      : 'Operating expense per head is within the configured corridor.',
    auditTrail: audit.finalize({ costPerCow, isAnomalous, isCriticalAnomaly }),
  };
}

/**
 * 4. MONTHLY YIELD RECONCILIATION
 *
 * Requires observed daily yields AND a reported month-to-date total. Neither is
 * assumed. The previous version projected an "expected" total from a hard-coded
 * baseline even when no records existed.
 */
export function reconcileMonthlyMilkYield(dailyYieldSamples = [], reportedMonthlyTotal = null, daysInMonth = null) {
  const audit = new CalculationAuditTrail('Monthly Yield Aggregation Reconciliation');

  const samples = (Array.isArray(dailyYieldSamples) ? dailyYieldSamples : []).map(Number).filter((n) => !isNaN(n));
  const reported = DairyMath.num(reportedMonthlyTotal);
  const days = DairyMath.num(daysInMonth);
  const missing = [];

  if (samples.length === 0) missing.push('observed daily yield samples');
  if (reported === null) missing.push('reported month-to-date volume');
  if (days === null || days === 0) missing.push('days elapsed in the period');

  if (missing.length > 0) {
    return insufficient('Insufficient milk records to reconcile monthly yield.', missing);
  }

  const sampleSum = samples.reduce((s, n) => s + n, 0);
  const sampleAvg = DairyMath.safeDivide(sampleSum, samples.length);
  if (sampleAvg === null) {
    return insufficient('Average daily yield could not be derived from the supplied samples.', ['observed daily yield samples']);
  }

  const calculatedExpectedMonthlyTotal = Math.round(sampleAvg * days);
  const discrepancyLiters = Math.round(calculatedExpectedMonthlyTotal - reported);
  const percentageMismatch = calculatedExpectedMonthlyTotal === 0 ? 0 : Math.round((discrepancyLiters / calculatedExpectedMonthlyTotal) * 100);

  const tolerance = DairyMath.num(config.validationRules.milkYieldTolerances.monthlyYieldDiscrepancyMaxPercent);
  const isSevereMismatch = tolerance !== null && Math.abs(percentageMismatch) > tolerance;

  audit.addStep(1, 'Calculate Daily Expected Yield', 'Average = Sum(DailySamples) / Count', { sampleCount: samples.length, sampleSum }, sampleAvg);
  audit.addStep(2, 'Project Expected Period Volume', 'Expected = DailyAverage * DaysElapsed', { sampleAvg, days }, calculatedExpectedMonthlyTotal);
  audit.addStep(3, 'Compute Variance against Reported', 'Discrepancy = Expected - Reported', { calculatedExpectedMonthlyTotal, reported }, discrepancyLiters);
  audit.addStep(4, 'Compute Percentage Deficit', 'Deficit% = (Discrepancy / Expected) * 100', { discrepancyLiters, calculatedExpectedMonthlyTotal }, percentageMismatch);

  return {
    status: CALC_STATUS.OK,
    calculatedExpectedLiters: calculatedExpectedMonthlyTotal,
    reportedMonthlyLiters: reported,
    discrepancyLiters,
    percentageMismatch,
    tolerancePercent: tolerance,
    isSevereMismatch,
    possibleCauses: [
      'Evening or third milking session rows were omitted from the aggregation filter.',
      'A reporting query filtered a single group or shed instead of the whole herd.',
      'Date-boundary mismatch between the storage time zone and the farm reporting time zone.',
    ],
    auditTrail: audit.finalize({ calculatedExpectedMonthlyTotal, reported, discrepancyLiters, percentageMismatch }),
  };
}

/**
 * 5. WITHDRAWAL & CONTAMINATION IMPACT
 *
 * Requires real treatment-derived records. The previous version defaulted to a
 * 4-animal hold, invented ear tags, invented medicines, invented withdrawal
 * dates and assumed a fixed daily yield per animal, then priced the result.
 */
export function calculateWithdrawalImpact(withdrawnAnimals = [], pricePerLiter = null) {
  const audit = new CalculationAuditTrail('Withdrawal & Food Safety Audit');

  const animals = Array.isArray(withdrawnAnimals) ? withdrawnAnimals : [];

  if (animals.length === 0) {
    return {
      ...insufficient('No active withdrawal records. No treatment rows exist, so no animal is under a milk withdrawal period.', [
        'treatments rows with an active withdrawal window',
      ]),
      activeWithdrawnAnimalsCount: 0,
      animalsInHold: [],
      // Explicitly null: no forfeit figure can be stated, not a zero forfeit.
      dailyQuarantinedLiters: null,
      dailyFinancialLossPKR: null,
      projected7DayLossPKR: null,
      riskLevel: 'NOT_EVALUABLE',
    };
  }

  const price = DairyMath.num(pricePerLiter);
  const missingYields = animals.filter((a) => DairyMath.num(a.dailyYieldLiters) === null).length;

  let totalQuarantinedDailyLiters = 0;
  const detailedAnimals = animals.map((a) => {
    const yieldLiters = DairyMath.num(a.dailyYieldLiters);
    if (yieldLiters !== null) totalQuarantinedDailyLiters += yieldLiters;
    return {
      animalRef: a.tag || a.animalTag || a.animalId || null,
      medicine: a.medicine || a.medicineName || null,
      withdrawalUntil: a.withdrawalUntil || a.withdrawalEnd || null,
      dailyYieldLiters: yieldLiters,
      dailyDiscardValuePKR: yieldLiters !== null && price !== null ? DairyMath.round(yieldLiters * price) : null,
    };
  });

  const dailyQuarantinedLiters = missingYields > 0 ? null : DairyMath.round(totalQuarantinedDailyLiters);
  const dailyFinancialLoss =
    dailyQuarantinedLiters !== null && price !== null ? DairyMath.round(dailyQuarantinedLiters * price) : null;

  audit.addStep(1, 'Identify Withheld Herd Members', 'Count of animals with an active withdrawal window', { animalCount: animals.length }, animals.length);
  if (dailyQuarantinedLiters !== null) {
    audit.addStep(2, 'Sum Quarantined Milk Volume', 'Quarantined L = Sum(Animal Yield)', { totalLiters: totalQuarantinedDailyLiters }, dailyQuarantinedLiters);
  }
  if (dailyFinancialLoss !== null) {
    audit.addStep(3, 'Estimate Daily Forfeiture', 'Daily Forfeit = Quarantined L * supplied rate', { dailyQuarantinedLiters, pricePerLiter: price }, dailyFinancialLoss);
  }

  return {
    status: CALC_STATUS.OK,
    activeWithdrawnAnimalsCount: animals.length,
    dailyQuarantinedLiters,
    dailyFinancialLossPKR: dailyFinancialLoss,
    projected7DayLossPKR: dailyFinancialLoss !== null ? DairyMath.round(dailyFinancialLoss * 7) : null,
    priceBasis: price !== null ? 'supplied by caller' : 'no rate supplied - forfeit not valued',
    animalsMissingYieldData: missingYields,
    riskLevel: 'REQUIRES_REVIEW',
    animalsInHold: detailedAnimals,
    safetyProtocolMandate:
      'Milk from any animal inside its withdrawal window must be diverted away from the primary chilling tank.',
    auditTrail: audit.finalize({ count: animals.length, dailyQuarantinedLiters, dailyFinancialLoss }),
  };
}

/**
 * 6. STATIC CALCULATION HELPERS
 * Each requires its inputs; none carries a default population or rate.
 */
export class DairyCalculations {
  /** Revenue = volume x supplied rate. No default rate is applied. */
  calculateMilkRevenue(volumeLiters, pricePerLiter = null) {
    const volume = DairyMath.num(volumeLiters);
    const price = DairyMath.num(pricePerLiter);
    if (volume === null || price === null) {
      return insufficient('Insufficient data to calculate milk revenue.', [
        volume === null ? 'volume in litres' : null,
        price === null ? 'selling rate per litre' : null,
      ].filter(Boolean));
    }
    const totalRevenue = Math.round(volume * price);
    return {
      status: CALC_STATUS.OK,
      volumeLiters: volume,
      pricePerLiter: price,
      totalRevenue,
      formula: 'Revenue = Volume (L) x Price (Rs/L)',
      calculation: `${volume} L x Rs ${price}/L = Rs ${totalRevenue}`,
    };
  }

  calculateProfitMargin(revenue, expenses) {
    const rev = DairyMath.num(revenue);
    const exp = DairyMath.num(expenses);
    if (rev === null || exp === null) {
      return insufficient('Insufficient financial data. Revenue and expenses must both be supplied.', [
        rev === null ? 'revenue' : null,
        exp === null ? 'expenses' : null,
      ].filter(Boolean));
    }
    const profit = DairyMath.round(rev - exp);
    const isLoss = profit < 0;
    const marginPercent = rev > 0 ? DairyMath.round((profit / rev) * 100, 2) : null;
    const profitToExpenseRatio = exp > 0 ? DairyMath.round((profit / exp) * 100, 2) : null;

    return {
      status: CALC_STATUS.OK,
      revenue: rev,
      expenses: exp,
      profit,
      marginPercent,
      profitToExpenseRatio,
      resultStatus: isLoss ? 'LOSS' : 'PROFIT',
      isLoss,
      isProfit: !isLoss,
      formula: 'Profit = Revenue - Expenses',
      steps: [
        `Step 1: Revenue = Rs ${rev.toLocaleString()}`,
        `Step 2: Expenses = Rs ${exp.toLocaleString()}`,
        `Step 3: Profit = Rs ${rev.toLocaleString()} - Rs ${exp.toLocaleString()} = Rs ${profit.toLocaleString()} ${isLoss ? '(LOSS)' : '(PROFIT)'}`,
        marginPercent !== null ? `Step 4: Margin = (${profit.toLocaleString()} / ${rev.toLocaleString()}) x 100 = ${marginPercent}%` : 'Step 4: Margin undefined because revenue is zero.',
        profitToExpenseRatio !== null ? `Step 5: Profit-to-expense = (${profit.toLocaleString()} / ${exp.toLocaleString()}) x 100 = ${profitToExpenseRatio}%` : 'Step 5: Profit-to-expense undefined because expenses are zero.',
      ],
    };
  }

  calculateCostPerLiter(expenses, milkProduced, marketPrice = null) {
    const exp = DairyMath.num(expenses);
    const milk = DairyMath.num(milkProduced);
    if (exp === null || milk === null) {
      return insufficient('Insufficient data to calculate cost per litre.', [
        exp === null ? 'total expenses' : null,
        milk === null ? 'milk produced' : null,
      ].filter(Boolean));
    }
    const costPerLiter = DairyMath.safeDivide(exp, milk);
    if (costPerLiter === null) {
      return insufficient('Cost per litre is undefined because no milk was produced.', ['milk produced']);
    }
    const price = DairyMath.num(marketPrice);
    const marginOrLossPerLiter = price !== null ? DairyMath.round(price - costPerLiter) : null;

    return {
      status: CALC_STATUS.OK,
      totalExpenses: exp,
      milkProducedLiters: milk,
      costPerLiter,
      marketPricePerLiter: price,
      marginOrLossPerLiter,
      isOperatingAtLoss: marginOrLossPerLiter !== null ? marginOrLossPerLiter < 0 : null,
      formula: 'Cost/L = Total Expenses / Milk Produced',
      calculation: `Rs ${exp.toLocaleString()} / ${milk} L = Rs ${costPerLiter}/L`,
    };
  }

  calculateAveragePerCow(totalMilk, lactatingCows) {
    const milk = DairyMath.num(totalMilk);
    const cows = DairyMath.num(lactatingCows);
    if (milk === null || cows === null || cows === 0) {
      return insufficient('Insufficient data to calculate average yield per cow.', [
        milk === null ? 'total milk' : null,
        cows === null || cows === 0 ? 'lactating cow count' : null,
      ].filter(Boolean));
    }
    const avg = DairyMath.safeDivide(milk, cows);
    return {
      status: CALC_STATUS.OK,
      totalMilkLiters: milk,
      lactatingCows: cows,
      averagePerCowLiters: avg,
      formula: 'Average = Total Milk / Lactating Cows',
      calculation: `${milk} L / ${cows} = ${avg} L/cow`,
    };
  }

  calculatePregnancyRate(pregnantCount, breedingPopulation) {
    const pregnant = DairyMath.num(pregnantCount);
    const pop = DairyMath.num(breedingPopulation);
    if (pregnant === null || pop === null || pop === 0) {
      return insufficient('Insufficient data to calculate pregnancy rate.', [
        pregnant === null ? 'pregnant count' : null,
        pop === null || pop === 0 ? 'breeding population' : null,
      ].filter(Boolean));
    }
    const ratePercent = DairyMath.round((pregnant / pop) * 100, 1);
    const isBelowTarget = ratePercent < 30;
    return {
      status: CALC_STATUS.OK,
      pregnantCount: pregnant,
      breedingPopulation: pop,
      ratePercent,
      isBelowTarget,
      formula: 'Pregnancy Rate = (Pregnant / Breeding Population) x 100',
      calculation: `(${pregnant} / ${pop}) x 100 = ${ratePercent}%`,
    };
  }

  /** Reconciles supplied herd buckets. No bucket is assumed to exist. */
  calculateHerdBreakdown(herd = {}) {
    const suppliedTotal = DairyMath.num(herd.total);
    const buckets = {};
    let anySupplied = false;

    Object.entries(herd).forEach(([key, value]) => {
      if (key === 'total') return;
      const n = DairyMath.num(value);
      if (n !== null) {
        buckets[key] = n;
        anySupplied = true;
      }
    });

    if (!anySupplied) {
      return insufficient('Insufficient data to build a herd breakdown. No herd buckets were supplied.', ['herd status counts']);
    }

    const calculatedTotal = Object.values(buckets).reduce((s, n) => s + n, 0);
    const total = suppliedTotal !== null ? suppliedTotal : calculatedTotal;
    const isValid = suppliedTotal === null ? null : calculatedTotal === suppliedTotal;

    return {
      status: CALC_STATUS.OK,
      total,
      calculatedTotal,
      buckets,
      lactatingPercent: total > 0 ? DairyMath.round(((buckets.lactating || 0) / total) * 100, 1) : null,
      sickPercent: total > 0 ? DairyMath.round(((buckets.sick || 0) / total) * 100, 2) : null,
      isValid,
    };
  }
}

export const defaultCalculations = new DairyCalculations();

export default DairyCalculations;
