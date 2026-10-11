/**
 * PUNJAB PURE DAIRY - AUDIT & VALIDATION SYSTEM
 * Module: dairyValidation.js
 * Description: Core validation engine for data sanity, anomaly detection,
 * regulatory compliance, and multi-factor reconciliation.
 *
 * PHASE 0 CONTRACT
 * ----------------
 * This engine validates the data it is GIVEN. It never injects baseline values
 * to make a rule fire.
 *
 * Removed in Phase 0:
 *   - default income / expense / profit figures injected into the dataset
 *   - a default lactating-cow count
 *   - a default reported monthly milk volume
 *   - a default days-elapsed value
 *   - a default daily milk baseline injected when no records were supplied
 *   - a hard-coded four-animal withdrawal hold (tag, medicine, dates, yields)
 *
 * A rule with no data now reports INSUFFICIENT_DATA and is excluded from the
 * error and warning counts, so an empty database can never look like a clean
 * pass or a catastrophic failure.
 *
 * Plain JavaScript: importable by Vite, the Express server and `node testSuite.js`.
 */

import config from './config.json' with { type: 'json' };
import {
  DairyMath,
  CALC_STATUS,
  calculateTrueFinancialPnl,
  calculateExpensePerCow,
  reconcileMonthlyMilkYield,
  calculateWithdrawalImpact,
} from './dairyCalculations.js';

export const ValidationSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

/** Per-rule outcome. A rule that could not run is not a pass and not a failure. */
export const RuleOutcome = {
  PASS: 'PASS',
  ISSUE: 'ISSUE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

const isRecordArray = (v) => Array.isArray(v);
const hasRows = (v) => Array.isArray(v) && v.length > 0;

export class DairyValidationEngine {
  constructor(customConfig = null) {
    this.config = customConfig || config;
    this.rulesExecuted = 0;
  }

  /**
   * Universal validate method.
   * A structured { herd, milk, financial, health, reproduction } payload is
   * mapped to the internal dataset WITHOUT supplying any default value.
   */
  validate(input = {}) {
    if (input.herd || input.milk || input.financial || input.health || input.reproduction) {
      const dataset = {
        incomes: input.financial?.incomes ?? null,
        expenses: input.financial?.expenses ?? null,
        dailyExpenseTotal: input.financial?.expensesTotal ?? null,
        animalCount: input.herd?.total ?? null,
        lactatingCowsCount: input.herd?.lactating ?? null,
        reportedMonthlyMilkLiters: input.milk?.monthlyLiters ?? null,
        observedDailyYields: input.milk?.dailyYields ?? null,
        daysInMonth: input.milk?.daysElapsed ?? null,
        milkRecords: input.milk?.records ?? null,
        activeTreatments: input.health?.treatments ?? null,
        withdrawnAnimals: input.health?.withdrawnAnimals ?? null,
        animals: input.herd?.animals ?? null,
        pregnancies: input.reproduction?.pregnancies ?? null,
        calvings: input.reproduction?.calvings ?? null,
        dashboardFinancials:
          input.financial?.reportedProfit === undefined ? {} : { estimatedProfitToday: input.financial.reportedProfit },
      };
      return this.validateFarmDataset(dataset);
    }
    return this.validateFarmDataset(input);
  }

  /**
   * Run comprehensive farm-wide validation.
   * Only rules that actually ran contribute to errors and warnings.
   */
  validateFarmDataset(dataset = {}) {
    const timestamp = new Date().toISOString();
    const errors = [];
    const warnings = [];
    const detectedIssues = [];
    const recommendations = [];
    const ruleResults = [];
    let rulesRun = 0;
    let rulesSkipped = 0;

    const track = (ruleId, title, result, outcome) => {
      ruleResults.push({ ruleId, title, outcome, message: result?.message ?? null });
      if (outcome === RuleOutcome.INSUFFICIENT_DATA) rulesSkipped += 1;
      else rulesRun += 1;
    };

    // 1. Financial ledger & profit/loss integrity
    const financeAudit = this.validateFinances(dataset.incomes ?? null, dataset.expenses ?? null, dataset.dashboardFinancials ?? {});
    errors.push(...financeAudit.errors);
    warnings.push(...financeAudit.warnings);
    if (financeAudit.detectedIssue) detectedIssues.push(financeAudit.detectedIssue);
    recommendations.push(...financeAudit.recommendations);
    track('FIN-PNL', 'Financial P&L integrity', financeAudit.truePnl, financeAudit.outcome);

    // 2. Daily expense per head
    const expensePerCowAudit = this.validateExpensePerCow(
      dataset.dailyExpenseTotal ?? null,
      dataset.animalCount ?? dataset.lactatingCowsCount ?? null
    );
    errors.push(...expensePerCowAudit.errors);
    warnings.push(...expensePerCowAudit.warnings);
    if (expensePerCowAudit.detectedIssue) detectedIssues.push(expensePerCowAudit.detectedIssue);
    recommendations.push(...expensePerCowAudit.recommendations);
    track('FIN-EXP-COW', 'Expense per animal anomaly', expensePerCowAudit.analysis, expensePerCowAudit.outcome);

    // 3. Milk production & monthly reconciliation
    const milkAudit = this.validateMilkProduction(
      dataset.milkRecords ?? null,
      dataset.observedDailyYields ?? null,
      dataset.reportedMonthlyMilkLiters ?? null,
      dataset.daysInMonth ?? null
    );
    errors.push(...milkAudit.errors);
    warnings.push(...milkAudit.warnings);
    if (milkAudit.detectedIssue) detectedIssues.push(milkAudit.detectedIssue);
    recommendations.push(...milkAudit.recommendations);
    track('MILK-RECON', 'Monthly milk yield reconciliation', milkAudit.reconciliation, milkAudit.outcome);

    // 4. Withdrawal compliance
    const withdrawalAudit = this.validateWithdrawalHolds(
      dataset.activeTreatments ?? null,
      dataset.withdrawnAnimals ?? null,
      dataset.milkRecords ?? null
    );
    errors.push(...withdrawalAudit.errors);
    warnings.push(...withdrawalAudit.warnings);
    if (withdrawalAudit.detectedIssue) detectedIssues.push(withdrawalAudit.detectedIssue);
    recommendations.push(...withdrawalAudit.recommendations);
    track('VET-WITHDRAWAL', 'Withdrawal period compliance', withdrawalAudit.impact, withdrawalAudit.outcome);

    // 5. Herd census & animal identifier integrity
    const herdAudit = this.validateHerdCensus(dataset.animals ?? null);
    errors.push(...herdAudit.errors);
    warnings.push(...herdAudit.warnings);
    recommendations.push(...herdAudit.recommendations);
    track('HERD-CENSUS', 'Herd census & identifier integrity', herdAudit, herdAudit.outcome);

    // 6. Reproductive cycle (days open) - fully supported by the live schema
    const reproAudit = this.validateReproductiveCycle(dataset.pregnancies ?? null, dataset.calvings ?? null);
    errors.push(...reproAudit.errors);
    warnings.push(...reproAudit.warnings);
    recommendations.push(...reproAudit.recommendations);
    track('BREED-DAYS-OPEN', 'Reproductive cycle / days open', reproAudit, reproAudit.outcome);

    const isCompletelyValid = errors.length === 0;
    const dataSufficient = rulesRun > 0;

    return {
      isValid: isCompletelyValid,
      /**
       * PASS only when rules actually ran and none raised an error.
       * A dataset with no runnable rule is NO_DATA_TO_VALIDATE, never PASS.
       */
      status: !dataSufficient
        ? 'NO_DATA_TO_VALIDATE'
        : errors.some((e) => e.severity === ValidationSeverity.CRITICAL)
        ? 'CRITICAL_ACTION_REQUIRED'
        : errors.length > 0
        ? 'FAIL'
        : warnings.length > 0
        ? 'WARNING'
        : 'PASS',
      timestamp,
      dataSufficient,
      rulesRun,
      rulesSkipped,
      ruleResults,
      summary: {
        criticalCount: errors.filter((e) => e.severity === ValidationSeverity.CRITICAL).length,
        highCount: errors.filter((e) => e.severity === ValidationSeverity.HIGH).length,
        warningCount: warnings.length,
        totalIssues: detectedIssues.length,
        categoriesAuditable: rulesRun,
        categoriesBlocked: rulesSkipped,
      },
      criticalErrors: errors,
      warnings,
      detectedIssues,
      actionableRecommendations: recommendations,
    };
  }

  /**
   * Financial audit. Runs only when income or expense rows exist, and only
   * compares against a reported figure when one is actually supplied.
   */
  validateFinances(incomes, expenses, dashboardFinancials = {}) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let detectedIssue = null;

    const hasIncome = hasRows(incomes);
    const hasExpense = hasRows(expenses);

    if (!hasIncome && !hasExpense) {
      return {
        errors,
        warnings,
        detectedIssue,
        recommendations,
        outcome: RuleOutcome.INSUFFICIENT_DATA,
        truePnl: {
          status: CALC_STATUS.INSUFFICIENT_DATA,
          message: 'Insufficient financial data. No income or expense transactions exist.',
        },
      };
    }

    (hasExpense ? expenses : []).forEach((e) => {
      if (Number(e.amount) < 0) {
        errors.push({
          code: 'FIN_NEG_EXPENSE',
          severity: ValidationSeverity.CRITICAL,
          message: `Expense ${e.id || e.description} has a negative amount: ${e.amount} PKR. Negative expenses corrupt the accounting ledger.`,
        });
      }
    });

    (hasIncome ? incomes : []).forEach((i) => {
      if (Number(i.amount) < 0) {
        errors.push({
          code: 'FIN_NEG_INCOME',
          severity: ValidationSeverity.CRITICAL,
          message: `Income ${i.id || i.description} has a negative amount: ${i.amount} PKR.`,
        });
      }
    });

    // Only pass a reported figure through when one genuinely exists.
    const reported = dashboardFinancials?.estimatedProfitToday;
    const hasReported = reported !== undefined && reported !== null && !isNaN(Number(reported));

    const truePnl = calculateTrueFinancialPnl(hasIncome ? incomes : [], hasExpense ? expenses : [], {
      reportedDashboardFigure: hasReported ? Number(reported) : undefined,
    });

    if (!hasReported) {
      warnings.push({
        code: 'FIN_NO_REPORTED_FIGURE',
        severity: ValidationSeverity.INFO,
        message: 'No separately reported profit figure was supplied, so the ledger could not be reconciled against a display value.',
      });
    }

    if (hasReported && truePnl.status === CALC_STATUS.OK && truePnl.comparisonPerformed) {
      if (truePnl.isLoss && Number(reported) > 0) {
        detectedIssue = {
          ruleId: 'RULE-01',
          title: 'Reported Profit Disagrees With Ledger',
          severity: ValidationSeverity.CRITICAL,
          reportedValue: `+Rs ${Number(reported).toLocaleString()}`,
          actualValue: `-Rs ${Math.abs(truePnl.netProfitOrLoss).toLocaleString()}`,
          variancePKR: truePnl.discrepancyError,
          description: 'A positive reported profit was produced while the transaction ledger yields a loss.',
          rootCause: 'Either the display figure omits operating overhead or the subtraction of costs is inverted.',
          impact: 'Management may act on a profitability position the ledger does not support.',
        };

        errors.push({
          code: 'FIN_PROFIT_CALC_ERROR',
          severity: ValidationSeverity.CRITICAL,
          message: `Reported profit of +Rs ${Number(reported).toLocaleString()} disagrees with the ledger result of -Rs ${Math.abs(truePnl.netProfitOrLoss).toLocaleString()} (variance Rs ${truePnl.discrepancyError.toLocaleString()}).`,
        });

        recommendations.push({
          priority: 1,
          area: 'Financial Reporting',
          action: 'Reconcile the reported profit figure against the ledger-derived figure and remove any cached summary value that is not recomputed from transactions.',
        });
      } else {
        detectedIssue = {
          ruleId: 'RULE-01',
          title: 'Reported Profit Disagrees With Ledger',
          severity: ValidationSeverity.HIGH,
          reportedValue: `Rs ${Number(reported).toLocaleString()}`,
          actualValue: `Rs ${truePnl.netProfitOrLoss.toLocaleString()}`,
          variancePKR: truePnl.discrepancyError,
          description: 'The reported profit figure differs from the transaction ledger.',
          rootCause: 'A reporting filter or aggregation boundary is likely excluding transactions.',
          impact: 'Reported performance is not reliable for decision making.',
        };
        warnings.push({
          code: 'FIN_PROFIT_VARIANCE',
          severity: ValidationSeverity.HIGH,
          message: `Reported profit (Rs ${Number(reported).toLocaleString()}) differs from the ledger result (Rs ${truePnl.netProfitOrLoss.toLocaleString()}) by Rs ${truePnl.discrepancyError.toLocaleString()}.`,
        });
      }
    }

    if (truePnl.status === CALC_STATUS.OK && truePnl.isLoss) {
      warnings.push({
        code: 'FIN_OPERATING_LOSS',
        severity: ValidationSeverity.HIGH,
        message: `The recorded transactions for this period produce a net loss of Rs ${Math.abs(truePnl.netProfitOrLoss).toLocaleString()}. Completeness of the ledger should be confirmed before acting on this.`,
      });
      recommendations.push({
        priority: 2,
        area: 'Cost Review',
        action: 'Confirm the period is fully captured, then review ration cost per litre before deferring discretionary spend.',
      });
    }

    return { errors, warnings, detectedIssue, recommendations, outcome: RuleOutcome.ISSUE, truePnl };
  }

  /** Expense per head. Requires a real expense total and a real animal count. */
  validateExpensePerCow(dailyExpenseTotal, animalCount) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let detectedIssue = null;

    const analysis = calculateExpensePerCow(dailyExpenseTotal, animalCount);

    if (analysis.status !== CALC_STATUS.OK) {
      return { errors, warnings, detectedIssue, recommendations, outcome: RuleOutcome.INSUFFICIENT_DATA, analysis };
    }

    if (analysis.isCriticalAnomaly) {
      detectedIssue = {
        ruleId: 'RULE-03',
        title: 'Operating Expense per Animal Above Configured Threshold',
        severity: ValidationSeverity.CRITICAL,
        observedValue: `Rs ${analysis.costPerCowDailyPKR.toLocaleString()} / animal / day`,
        thresholdValue: `Rs ${analysis.criticalThresholdPKR?.toLocaleString()} / animal / day`,
        description: `Recorded expense divided by the non-disposed herd is Rs ${analysis.costPerCowDailyPKR.toLocaleString()} per animal per day, above the configured critical threshold.`,
        rootCause: 'A bulk purchase, utility bill or payroll advance may have been booked as a single day of operating expense instead of being amortised.',
        impact: 'Daily cost reporting is distorted and unit economics cannot be trusted.',
      };
      errors.push({
        code: 'EXPENSE_PER_COW_CRITICAL',
        severity: ValidationSeverity.CRITICAL,
        message: `Expense per animal per day is Rs ${analysis.costPerCowDailyPKR.toLocaleString()}, above the configured critical threshold of Rs ${analysis.criticalThresholdPKR?.toLocaleString()}.`,
      });
      recommendations.push({
        priority: 1,
        area: 'Expense Booking',
        action: 'Classify bulk feed deliveries and lump-sum asset or utility expenses as prepaid inventory and amortise them over the period they cover.',
      });
    } else if (analysis.isAnomalous) {
      warnings.push({
        code: 'EXPENSE_ANOMALY_WARN',
        severity: ValidationSeverity.MEDIUM,
        message: `Expense per animal per day is Rs ${analysis.costPerCowDailyPKR.toLocaleString()}, above the configured warning threshold of Rs ${analysis.warningThresholdPKR?.toLocaleString()}.`,
      });
    }

    return {
      errors,
      warnings,
      detectedIssue,
      recommendations,
      outcome: detectedIssue ? RuleOutcome.ISSUE : RuleOutcome.PASS,
      analysis,
    };
  }

  /** Milk production & monthly reconciliation. Requires real records. */
  validateMilkProduction(milkRecords, observedDailyYields, reportedMonthlyTotal, daysInMonth) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let detectedIssue = null;

    if (hasRows(milkRecords)) {
      milkRecords.forEach((r) => {
        const qty = Number(r.quantityLiters ?? 0);
        if (qty < 0) {
          errors.push({
            code: 'MILK_NEG_QTY',
            severity: ValidationSeverity.CRITICAL,
            message: `Animal ${r.animalId || r.animalTag} has a negative milk yield of ${qty} L on ${r.date}.`,
          });
        }
      });
    }

    const samples = hasRows(observedDailyYields)
      ? observedDailyYields
      : hasRows(milkRecords)
      ? deriveDailyTotals(milkRecords)
      : [];

    const reconciliation = reconcileMonthlyMilkYield(samples, reportedMonthlyTotal, daysInMonth);

    if (reconciliation.status !== CALC_STATUS.OK) {
      return { errors, warnings, detectedIssue, recommendations, outcome: RuleOutcome.INSUFFICIENT_DATA, reconciliation };
    }

    if (reconciliation.isSevereMismatch) {
      detectedIssue = {
        ruleId: 'RULE-04',
        title: 'Monthly Yield Does Not Reconcile With Recorded Daily Output',
        severity: ValidationSeverity.HIGH,
        expectedValue: `${reconciliation.calculatedExpectedLiters.toLocaleString()} L`,
        reportedValue: `${reconciliation.reportedMonthlyLiters?.toLocaleString()} L`,
        discrepancy: `${reconciliation.discrepancyLiters.toLocaleString()} L (${reconciliation.percentageMismatch}%)`,
        description: 'The month-to-date volume differs from the sum of recorded daily output beyond the configured tolerance.',
        rootCause: reconciliation.possibleCauses[0],
        impact: 'Reported production is unreliable for valuation and buyer quota reconciliation.',
      };
      errors.push({
        code: 'MILK_MONTHLY_MISMATCH',
        severity: ValidationSeverity.HIGH,
        message: `Month-to-date volume of ${reconciliation.reportedMonthlyLiters?.toLocaleString()} L differs from the recorded daily sum of ${reconciliation.calculatedExpectedLiters.toLocaleString()} L by ${reconciliation.discrepancyLiters.toLocaleString()} L (${reconciliation.percentageMismatch}%), beyond the configured ${reconciliation.tolerancePercent}% tolerance.`,
      });
      recommendations.push({
        priority: 2,
        area: 'Milk Aggregation',
        action: 'Re-run the monthly aggregation including every milking session and confirm the date filter matches the farm reporting time zone.',
      });
    }

    return {
      errors,
      warnings,
      detectedIssue,
      recommendations,
      outcome: detectedIssue ? RuleOutcome.ISSUE : RuleOutcome.PASS,
      reconciliation,
    };
  }

  /**
   * Withdrawal compliance. Uses only records that exist. When there are no
   * treatment rows the correct answer is "no active withdrawal", not a default hold.
   */
  validateWithdrawalHolds(activeTreatments, withdrawnAnimals, milkRecords) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let detectedIssue = null;

    const treatments = hasRows(activeTreatments) ? activeTreatments : [];
    const animalsInHold = hasRows(withdrawnAnimals) ? withdrawnAnimals : [];

    if (treatments.length === 0 && animalsInHold.length === 0) {
      return {
        errors,
        warnings,
        detectedIssue,
        recommendations,
        outcome: RuleOutcome.INSUFFICIENT_DATA,
        impact: {
          status: CALC_STATUS.INSUFFICIENT_DATA,
          message: 'No active withdrawal records. No treatment rows exist, so no animal is under a milk withdrawal period.',
          activeWithdrawnAnimalsCount: 0,
          dailyQuarantinedLiters: null,
          dailyFinancialLossPKR: null,
        },
      };
    }

    const impact = calculateWithdrawalImpact(animalsInHold);

    if (impact.activeWithdrawnAnimalsCount > 0) {
      const forfeit = impact.dailyFinancialLossPKR !== null ? `Rs ${impact.dailyFinancialLossPKR.toLocaleString()} / day` : 'not valued (no selling rate supplied)';
      const volume =
        impact.dailyQuarantinedLiters !== null ? `${impact.dailyQuarantinedLiters} L / day` : 'not quantified (daily yield per animal missing)';

      detectedIssue = {
        ruleId: 'RULE-05',
        title: 'Animals Under Active Milk Withdrawal',
        severity: ValidationSeverity.HIGH,
        affectedAnimals: `${impact.activeWithdrawnAnimalsCount} animal(s)`,
        quarantinedLiters: volume,
        dailyFinancialLoss: forfeit,
        description: `${impact.activeWithdrawnAnimalsCount} animal(s) are inside a milk withdrawal window.`,
        rootCause: 'Clinical therapy requires a mandatory holding period before milk may re-enter the bulk tank.',
        impact: 'Milk from these animals entering the primary chilling tank risks rejection of the whole tank lot.',
      };

      warnings.push({
        code: 'VET_WITHDRAWAL_ACTIVE',
        severity: ValidationSeverity.HIGH,
        message: `${impact.activeWithdrawnAnimalsCount} animal(s) under withdrawal hold (${volume}). Bulk tank diversion must be enforced.`,
      });

      // Cross-check only against records that exist.
      if (hasRows(milkRecords)) {
        milkRecords.forEach((r) => {
          const ref = r.animalId || r.animalTag;
          const inHold = animalsInHold.some((a) => (a.tag || a.animalTag || a.animalId) === ref);
          const accepted = r.qualityStatus === 'Accepted' || r.isRejected === false;
          if (inHold && accepted) {
            const until = animalsInHold.find((a) => (a.tag || a.animalTag || a.animalId) === ref)?.withdrawalUntil;
            errors.push({
              code: 'VET_WITHDRAWAL_CONTAMINATION_VIOLATION',
              severity: ValidationSeverity.CRITICAL,
              message: `Animal ${ref} is under an active withdrawal hold${until ? ` until ${until}` : ''}, but a milk record for it is marked as accepted.`,
            });
          }
        });
      }

      recommendations.push({
        priority: 1,
        area: 'Food Safety & Milk Hygiene',
        action: 'Verify physical identification on every affected animal and mandate a separate diversion container during milking.',
      });
    }

    return { errors, warnings, detectedIssue, recommendations, outcome: detectedIssue ? RuleOutcome.ISSUE : RuleOutcome.PASS, impact };
  }

  /** Herd census & animal identifier structure. Pure structural check, no defaults. */
  validateHerdCensus(animals) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];

    if (!hasRows(animals)) {
      return { errors, warnings, recommendations, outcome: RuleOutcome.INSUFFICIENT_DATA };
    }

    const tagSet = new Set();
    animals.forEach((a) => {
      const tag = a.earTag || a.animalCode || a.animalId;
      if (tag === undefined || tag === null || tag === '') {
        errors.push({
          code: 'HERD_MISSING_IDENTIFIER',
          severity: ValidationSeverity.CRITICAL,
          message: 'An animal record has no ear tag, animal code or identifier.',
        });
        return;
      }
      if (tagSet.has(tag)) {
        errors.push({
          code: 'HERD_DUPLICATE_TAG',
          severity: ValidationSeverity.CRITICAL,
          message: `Duplicate ear tag or animal code detected: ${tag}. Each animal must hold a unique identifier.`,
        });
      }
      tagSet.add(tag);
    });

    return { errors, warnings, recommendations, outcome: errors.length ? RuleOutcome.ISSUE : RuleOutcome.PASS };
  }

  /**
   * Reproductive cycle / days open.
   *
   * This is the one rule whose required data the schema already fully supports:
   * a verified conception date comes from pregnancies where the result is
   * PREGNANT, and a verified calving date comes from calvings.date_time.
   * Both are foreign-keyed to the same animal, so no cross-animal pairing is possible.
   */
  validateReproductiveCycle(pregnancies, calvings) {
    this.rulesExecuted += 1;
    const errors = [];
    const warnings = [];
    const recommendations = [];

    if (!hasRows(pregnancies) || !hasRows(calvings)) {
      return { errors, warnings, recommendations, outcome: RuleOutcome.INSUFFICIENT_DATA, daysOpen: null, sampleSize: 0 };
    }

    // Conceptions keyed by animal, using only confirmed pregnancies.
    const conceptionByAnimal = new Map();
    pregnancies.forEach((p) => {
      if (String(p.result).toUpperCase() !== 'PREGNANT') return;
      const key = String(p.animalId ?? p.animal_id ?? '');
      const date = p.diagnosisDate ?? p.diagnosis_date;
      if (!key || !date) return;
      const d = new Date(date);
      if (isNaN(d.getTime())) return;
      const existing = conceptionByAnimal.get(key);
      if (!existing || d < existing) conceptionByAnimal.set(key, d);
    });

    const daysOpenSamples = [];
    const unpairedCalvings = [];

    calvings.forEach((c) => {
      const key = String(c.animalId ?? c.animal_id ?? '');
      const date = c.dateTime ?? c.date_time ?? c.date;
      const conception = conceptionByAnimal.get(key);
      if (!conception || !date) {
        if (key) unpairedCalvings.push(key);
        return;
      }
      const calved = new Date(date);
      if (isNaN(calved.getTime())) return;
      const days = Math.round((calved.getTime() - conception.getTime()) / 86400000);
      if (days >= 0) daysOpenSamples.push(days);
    });

    if (daysOpenSamples.length === 0) {
      recommendations.push({
        priority: 2,
        area: 'Breeding Records',
        action: 'Record a confirmed pregnancy result for each calving so a conception date exists to measure days open against.',
      });
      return {
        errors,
        warnings,
        recommendations,
        outcome: RuleOutcome.INSUFFICIENT_DATA,
        daysOpen: null,
        sampleSize: 0,
        unpairedCalvings: unpairedCalvings.length,
      };
    }

    const average = DairyMath.round(daysOpenSamples.reduce((s, n) => s + n, 0) / daysOpenSamples.length, 1);
    const threshold = DairyMath.num(this.config.benchmarks?.daysOpenWarningThreshold);

    if (threshold !== null && average > threshold) {
      warnings.push({
        code: 'BREED_DAYS_OPEN_ABOVE_THRESHOLD',
        severity: ValidationSeverity.MEDIUM,
        message: `Average days open across ${daysOpenSamples.length} measured calvings is ${average} days, above the configured warning threshold of ${threshold} days.`,
      });
    }

    return {
      errors,
      warnings,
      recommendations,
      outcome: RuleOutcome.PASS,
      daysOpen: {
        average,
        minimum: Math.min(...daysOpenSamples),
        maximum: Math.max(...daysOpenSamples),
        sampleSize: daysOpenSamples.length,
        thresholdDays: threshold,
      },
      sampleSize: daysOpenSamples.length,
      unpairedCalvings: unpairedCalvings.length,
    };
  }
}

/** Groups milk records into per-day totals. Returns [] when there are no records. */
function deriveDailyTotals(records) {
  const daily = new Map();
  records.forEach((r) => {
    const key = String(r.date || '');
    if (!key) return;
    daily.set(key, (daily.get(key) || 0) + Number(r.quantityLiters ?? 0));
  });
  return Array.from(daily.values());
}

export const defaultEngine = new DairyValidationEngine();
export default DairyValidationEngine;
