/**
 * PUNJAB PURE DAIRY - AUDIT & VALIDATION SYSTEM
 * Module: dashboardValidation.js
 * Description: Dashboard integration layer that intercepts, audits, validates,
 * and transparently annotates dashboard metrics.
 *
 * PHASE 0 CONTRACT
 * ----------------
 * This layer annotates the dashboard. It does not supply the dashboard with
 * numbers it does not have.
 *
 * Removed in Phase 0:
 *   - default expense / cow-count / monthly-volume values injected into the dataset
 *   - a default reported profit used as the comparison baseline
 *   - a fixed 14-day period assumption
 *   - hard-coded "proof" step text containing specific costs, volumes, animals,
 *     tank sizes and rupee losses
 *   - correctedMetrics that returned fixed figures regardless of input
 *   - a self-executing CLI block that printed a fabricated audit report
 *
 * Every transparency card is now built from supplied records. When records are
 * absent the card states that the check could not be performed, and the badge
 * reports how much was actually audited.
 *
 * Plain JavaScript: importable by Vite, the Express server and `node testSuite.js`.
 */

import config from './config.json' with { type: 'json' };
import { DairyValidationEngine, RuleOutcome } from './dairyValidation.js';
import {
  CALC_STATUS,
  calculateTrueFinancialPnl,
  calculateExpensePerCow,
  reconcileMonthlyMilkYield,
  calculateWithdrawalImpact,
} from './dairyCalculations.js';

const has = (v) => Array.isArray(v) && v.length > 0;

export class DashboardValidationService {
  constructor(engine = null) {
    this.engine = engine || new DairyValidationEngine();
  }

  /**
   * Audits a dashboard summary object against whatever raw records are supplied.
   * No default is substituted for a missing record set.
   */
  auditDashboard(dashboardData = {}, rawDatabase = {}) {
    const dataset = {
      incomes: rawDatabase.incomes ?? null,
      expenses: rawDatabase.expenses ?? null,
      milkRecords: rawDatabase.milkRecords ?? null,
      animals: rawDatabase.animals ?? null,
      activeTreatments: rawDatabase.treatments ?? null,
      withdrawnAnimals: rawDatabase.withdrawnAnimals ?? null,
      dailyExpenseTotal: dashboardData.finance?.todayExpenses ?? null,
      animalCount: dashboardData.animalCounts?.total ?? null,
      reportedMonthlyMilkLiters: dashboardData.milk?.monthlyLiters ?? null,
      dashboardFinancials:
        dashboardData.finance?.estimatedProfitToday === undefined
          ? {}
          : { estimatedProfitToday: dashboardData.finance.estimatedProfitToday },
    };

    const auditResult = this.engine.validateFarmDataset(dataset);
    const explanationCards = this.buildTransparencyCards(auditResult, dashboardData, dataset);
    const correctedMetrics = this.computeCorrectedMetrics(dataset);

    return {
      isValid: auditResult.isValid,
      status: auditResult.status,
      timestamp: auditResult.timestamp,
      dataSufficient: auditResult.dataSufficient,
      rulesRun: auditResult.rulesRun,
      rulesSkipped: auditResult.rulesSkipped,
      ruleResults: auditResult.ruleResults,
      summary: auditResult.summary,
      criticalErrors: auditResult.criticalErrors,
      warnings: auditResult.warnings,
      detectedIssues: auditResult.detectedIssues,
      actionableRecommendations: auditResult.actionableRecommendations,
      explanationCards,
      correctedMetrics,
      badge: this.getBadgeStatus(auditResult),
    };
  }

  /**
   * Visual status badge. Reports what was actually audited, and never claims
   * verified integrity when nothing could be checked.
   */
  getBadgeStatus(auditResult) {
    if (!auditResult) {
      return { text: 'Audit Not Run', subtext: 'No validation result available', color: 'slate', statusLevel: 'PENDING', pulse: false };
    }
    if (auditResult.dataSufficient === false || auditResult.rulesRun === 0) {
      return {
        text: 'Insufficient Data for Audit',
        subtext: `No rule could be evaluated. ${auditResult.rulesSkipped} of ${auditResult.rulesSkipped} categories lack the records they require.`,
        color: 'slate',
        statusLevel: 'NO_DATA',
        pulse: false,
      };
    }
    if (auditResult.summary.criticalCount > 0) {
      return {
        text: `${auditResult.summary.criticalCount} Critical Discrepancy Detected`,
        subtext: `Calculated from ${auditResult.rulesRun} rule(s); ${auditResult.rulesSkipped} could not be evaluated`,
        color: 'rose',
        statusLevel: 'CRITICAL',
        pulse: true,
      };
    }
    if (auditResult.summary.highCount > 0 || auditResult.summary.warningCount > 0) {
      return {
        text: `${auditResult.summary.highCount + auditResult.summary.warningCount} Audit Warning(s)`,
        subtext: `Calculated from ${auditResult.rulesRun} rule(s); ${auditResult.rulesSkipped} could not be evaluated`,
        color: 'amber',
        statusLevel: 'WARNING',
        pulse: false,
      };
    }
    return {
      text: 'Evaluated Rules Passed',
      subtext: `No discrepancy in ${auditResult.rulesRun} evaluated rule(s). ${auditResult.rulesSkipped} category(ies) not evaluable with current data.`,
      color: 'emerald',
      statusLevel: 'PASS',
      pulse: false,
    };
  }

  /**
   * Builds transparency cards. Each card either shows a calculation derived from
   * the supplied records, or states plainly that the check could not be performed.
   */
  buildTransparencyCards(auditResult, dashboardData, dataset) {
    const cards = [];

    // Card 1: Financial reconciliation
    const reported = dashboardData.finance?.estimatedProfitToday;
    const hasReported = reported !== undefined && reported !== null && !isNaN(Number(reported));
    const truePnl = calculateTrueFinancialPnl(dataset.incomes ?? [], dataset.expenses ?? [], {
      reportedDashboardFigure: hasReported ? Number(reported) : undefined,
    });

    if (truePnl.status !== CALC_STATUS.OK) {
      cards.push({
        id: 'CARD-PROFIT-AUDIT',
        title: 'Profit & Loss Reconciliation',
        ruleId: 'RULE-01',
        evaluable: false,
        severity: 'NOT_EVALUABLE',
        comparison: null,
        reason: truePnl.message,
        requiredFor: 'At least one income row and one expense row.',
        stepByStepProof: [],
      });
    } else {
      const steps = [
        {
          step: 1,
          name: 'Total Inflow',
          formula: 'Sum of income rows supplied',
          calculation: `${dataset.incomes.length} income row(s) totalling Rs ${truePnl.totalRevenue.toLocaleString()}`,
        },
        {
          step: 2,
          name: 'Total Outflow',
          formula: 'Sum of expense rows supplied',
          calculation: `${dataset.expenses.length} expense row(s) totalling Rs ${truePnl.totalExpenses.toLocaleString()}`,
        },
        {
          step: 3,
          name: 'Ledger Net Result',
          formula: 'Net = Inflow - Outflow',
          calculation: `Rs ${truePnl.totalRevenue.toLocaleString()} - Rs ${truePnl.totalExpenses.toLocaleString()} = Rs ${truePnl.netProfitOrLoss.toLocaleString()}`,
        },
      ];
      if (truePnl.comparisonPerformed) {
        steps.push({
          step: 4,
          name: 'Variance Against Reported Figure',
          formula: 'Variance = Reported - Ledger',
          calculation: `Rs ${truePnl.reportedDashboardFigure.toLocaleString()} - Rs ${truePnl.netProfitOrLoss.toLocaleString()} = Rs ${truePnl.discrepancyError.toLocaleString()}`,
        });
      } else {
        steps.push({
          step: 4,
          name: 'Variance Against Reported Figure',
          formula: 'Variance = Reported - Ledger',
          calculation: 'Not performed: no reported profit figure was supplied to compare against.',
        });
      }

      cards.push({
        id: 'CARD-PROFIT-AUDIT',
        title: 'Profit & Loss Reconciliation',
        ruleId: 'RULE-01',
        evaluable: true,
        severity: truePnl.discrepancyError !== null && truePnl.discrepancyError !== 0 ? 'HIGH' : 'PASS',
        comparison: {
          reportedFigure: truePnl.reportedDashboardFigure !== null ? `Rs ${truePnl.reportedDashboardFigure.toLocaleString()}` : 'not supplied',
          ledgerResult: `Rs ${truePnl.netProfitOrLoss.toLocaleString()}`,
          variance: truePnl.discrepancyError !== null ? `Rs ${truePnl.discrepancyError.toLocaleString()}` : 'not compared',
        },
        reason: null,
        stepByStepProof: steps,
      });
    }

    // Card 2: Expense per head
    const expensePerCow = calculateExpensePerCow(dataset.dailyExpenseTotal, dataset.animalCount);
    if (expensePerCow.status !== CALC_STATUS.OK) {
      cards.push({
        id: 'CARD-EXPENSE-PER-COW-AUDIT',
        title: 'Operating Expense per Animal',
        ruleId: 'RULE-03',
        evaluable: false,
        severity: 'NOT_EVALUABLE',
        comparison: null,
        reason: expensePerCow.message,
        requiredFor: 'A daily expense total and a non-disposed animal count.',
        stepByStepProof: [],
      });
    } else {
      cards.push({
        id: 'CARD-EXPENSE-PER-COW-AUDIT',
        title: 'Operating Expense per Animal',
        ruleId: 'RULE-03',
        evaluable: true,
        severity: expensePerCow.severity,
        comparison: {
          calculated: `Rs ${expensePerCow.costPerCowDailyPKR.toLocaleString()} / animal / day`,
          warningThreshold: expensePerCow.warningThresholdPKR !== null ? `Rs ${expensePerCow.warningThresholdPKR.toLocaleString()}` : 'not configured',
          criticalThreshold: expensePerCow.criticalThresholdPKR !== null ? `Rs ${expensePerCow.criticalThresholdPKR.toLocaleString()}` : 'not configured',
        },
        reason: null,
        stepByStepProof: [
          {
            step: 1,
            name: 'Cost per Animal',
            formula: 'Daily expense / animal count',
            calculation: `Rs ${expensePerCow.totalDailyExpense.toLocaleString()} / ${expensePerCow.animalCount} animal(s) = Rs ${expensePerCow.costPerCowDailyPKR.toLocaleString()} per animal per day`,
          },
          {
            step: 2,
            name: 'Threshold Evaluation',
            formula: 'Compare against configured thresholds',
            calculation: `Result: ${expensePerCow.isCriticalAnomaly ? 'above critical threshold' : expensePerCow.isAnomalous ? 'above warning threshold' : 'within corridor'}`,
          },
        ],
      });
    }

    // Card 3: Milk yield reconciliation
    const dailyTotals = has(dataset.milkRecords) ? groupDailyTotals(dataset.milkRecords) : [];
    const milkRecon = reconcileMonthlyMilkYield(dailyTotals, dataset.reportedMonthlyMilkLiters ?? null, null);
    if (milkRecon.status !== CALC_STATUS.OK || dailyTotals.length === 0) {
      cards.push({
        id: 'CARD-MILK-YIELD-RECON',
        title: 'Monthly Milk Yield Reconciliation',
        ruleId: 'RULE-04',
        evaluable: false,
        severity: 'NOT_EVALUABLE',
        comparison: null,
        reason:
          dailyTotals.length === 0
            ? 'Insufficient milk records. No daily output can be derived, so no expected volume can be projected.'
            : milkRecon.message,
        requiredFor: 'Milk records covering the period, plus the reported month-to-date volume and the number of days elapsed.',
        stepByStepProof: [],
      });
    } else {
      cards.push({
        id: 'CARD-MILK-YIELD-RECON',
        title: 'Monthly Milk Yield Reconciliation',
        ruleId: 'RULE-04',
        evaluable: true,
        severity: milkRecon.isSevereMismatch ? 'HIGH' : 'PASS',
        comparison: {
          derivedFromRecords: `${milkRecon.calculatedExpectedLiters.toLocaleString()} L`,
          reported: milkRecon.reportedMonthlyLiters !== null ? `${milkRecon.reportedMonthlyLiters.toLocaleString()} L` : 'not supplied',
          discrepancy: milkRecon.discrepancyLiters !== null ? `${milkRecon.discrepancyLiters.toLocaleString()} L (${milkRecon.percentageMismatch}%)` : 'not compared',
        },
        reason: null,
        stepByStepProof: [
          {
            step: 1,
            name: 'Daily Totals Derived From Records',
            formula: 'Group milk records by date and sum',
            calculation: `${dailyTotals.length} day(s) of recorded output`,
          },
        ],
      });
    }

    // Card 4: Withdrawal compliance
    const withdrawal = calculateWithdrawalImpact(dataset.withdrawnAnimals ?? []);
    if (!withdrawal.activeWithdrawnAnimalsCount) {
      cards.push({
        id: 'CARD-WITHDRAWAL-AUDIT',
        title: 'Withdrawal Period Compliance',
        ruleId: 'RULE-05',
        evaluable: false,
        severity: 'NOT_EVALUABLE',
        comparison: null,
        reason: 'No active withdrawal records. No treatment rows exist, so no animal is under a milk withdrawal period.',
        requiredFor: 'At least one treatment row with an active withdrawal window.',
        stepByStepProof: [],
      });
    } else {
      cards.push({
        id: 'CARD-WITHDRAWAL-AUDIT',
        title: 'Withdrawal Period Compliance',
        ruleId: 'RULE-05',
        evaluable: true,
        severity: 'HIGH',
        comparison: {
          animalsInHold: `${withdrawal.activeWithdrawnAnimalsCount} animal(s)`,
          dailyVolume: withdrawal.dailyQuarantinedLiters !== null ? `${withdrawal.dailyQuarantinedLiters} L / day` : 'not quantified',
          dailyForfeit:
            withdrawal.dailyFinancialLossPKR !== null ? `Rs ${withdrawal.dailyFinancialLossPKR.toLocaleString()} / day` : 'not valued (no selling rate supplied)',
        },
        reason: null,
        stepByStepProof: [
          {
            step: 1,
            name: 'Animals Inside Withdrawal Window',
            formula: 'Count of treatment-derived records with an active hold',
            calculation: `${withdrawal.activeWithdrawnAnimalsCount} animal(s)`,
          },
        ],
      });
    }

    return cards;
  }

  /**
   * Corrected figures. Every entry is null unless it was actually derived.
   * Returning a fixed number here was the source of the withdrawn claims.
   */
  computeCorrectedMetrics(dataset) {
    const truePnl = calculateTrueFinancialPnl(dataset.incomes ?? [], dataset.expenses ?? []);
    const pnlAvailable = truePnl.status === CALC_STATUS.OK;

    return {
      dataSufficient: pnlAvailable,
      finance: {
        totalRevenue: pnlAvailable ? truePnl.totalRevenue : null,
        totalExpenses: pnlAvailable ? truePnl.totalExpenses : null,
        netProfitOrLoss: pnlAvailable ? truePnl.netProfitOrLoss : null,
        isLoss: pnlAvailable ? truePnl.isLoss : null,
        isProfit: pnlAvailable ? truePnl.isProfit : null,
      },
      milk: {
        recordedLiters: has(dataset.milkRecords)
          ? Math.round(dataset.milkRecords.reduce((s, r) => s + Number(r.quantityLiters ?? 0), 0) * 100) / 100
          : null,
        recordedDays: has(dataset.milkRecords) ? groupDailyTotals(dataset.milkRecords).length : null,
        reconciledDiscrepancyLiters: null,
        quarantinedLitersToday: null,
      },
      compliance: {
        activeWithdrawalAnimals: has(dataset.withdrawnAnimals) ? dataset.withdrawnAnimals.length : 0,
        withdrawalForfeitValued: false,
      },
      note:
        'Every field above is null or zero because it was not derivable from supplied records. No figure on this object is a default.',
    };
  }
}

/** Groups milk records into per-day totals. */
function groupDailyTotals(records) {
  const daily = new Map();
  records.forEach((r) => {
    const key = String(r.date || '');
    if (!key) return;
    daily.set(key, (daily.get(key) || 0) + Number(r.quantityLiters ?? 0));
  });
  return Array.from(daily.values());
}

export const defaultDashboardValidator = new DashboardValidationService();
export default DashboardValidationService;

/**
 * CLI runner. Reports only what it can actually evaluate. It prints no findings,
 * because no findings can be derived without records.
 */
const isNodeCli =
  typeof process !== 'undefined' &&
  Boolean(process?.argv && Array.isArray(process.argv) && process.argv[1] && process.argv[1].endsWith('dashboardValidation.js'));

if (isNodeCli) {
  const validator = new DashboardValidationService();
  const audit = validator.auditDashboard({}, {});

  console.log('\nPUNJAB PURE DAIRY - DASHBOARD VALIDATION\n');
  console.log(`Status             : ${audit.status}`);
  console.log(`Data sufficient    : ${audit.dataSufficient ? 'yes' : 'no'}`);
  console.log(`Rules evaluated    : ${audit.rulesRun}`);
  console.log(`Rules not evaluable: ${audit.rulesSkipped}`);
  console.log(`Critical findings  : ${audit.summary.criticalCount}`);
  console.log(`Warnings           : ${audit.summary.warningCount}`);
  console.log('\nNo findings are reported because no transaction, milk, treatment, breeding or feed');
  console.log('records were supplied. Provide real records, or connect the Phase 1 API, to produce');
  console.log('an audit result. No default or benchmark figure will be substituted.\n');

  audit.ruleResults.forEach((r) => {
    console.log(`  ${r.outcome.padEnd(20)} ${r.title}${r.message ? ` - ${r.message}` : ''}`);
  });
  console.log('');
}
