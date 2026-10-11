/**
 * PUNJAB PURE DAIRY - AUDIT & VALIDATION SYSTEM
 * Module: testSuite.js
 *
 * PHASE 0 REWRITE
 * ----------------
 * The previous suite asserted that fabricated case-study figures were correct:
 *   -Rs 125,855 audited loss, Rs 237,855 discrepancy, Rs 59,145 revenue,
 * Rs 185,000 expenses, +Rs 112,000 reported profit, 5,968 vs 12,711 litres,
 * 4 cows under withdrawal, Rs 13,125/day forfeit.
 *
 * None of those figures came from the `dairy farm 1` database, so asserting
 * them was asserting a fiction. This suite now asserts the opposite property:
 * that the engine REFUSES to produce a figure when the data is absent.
 *
 * Run:  node testSuite.js
 */

import config from './config.json' with { type: 'json' };
import {
  DairyMath,
  CALC_STATUS,
  calculateTrueFinancialPnl,
  calculateDailyMilkYield,
  calculateExpensePerCow,
  reconcileMonthlyMilkYield,
  calculateWithdrawalImpact,
  DairyCalculations,
} from './dairyCalculations.js';
import { DairyValidationEngine, RuleOutcome } from './dairyValidation.js';
import { DashboardValidationService } from './dashboardValidation.js';
import { buildReadinessCategories, summarizeReadiness, AUDIT_RULES } from './src/services/audit/auditDataReadiness.js';

let passed = 0;
let failed = 0;

const header = (t) => console.log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

const assert = (condition, name, detail = '') => {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    console.log(`  [FAIL] ${name}${detail ? ` -- ${detail}` : ''}`);
  }
};

// ---------------------------------------------------------------------------
header('SCENARIO 1: Financial P&L must refuse to invent a value');
// ---------------------------------------------------------------------------

const pnlEmpty = calculateTrueFinancialPnl([], []);
assert(pnlEmpty.status === CALC_STATUS.INSUFFICIENT_DATA, 'empty ledger returns INSUFFICIENT_DATA');
assert(
  typeof pnlEmpty.message === 'string' && pnlEmpty.message.length > 0,
  'insufficient result carries an explanatory message'
);
assert(pnlEmpty.netProfitOrLoss === undefined, 'no net profit figure is produced', `got ${pnlEmpty.netProfitOrLoss}`);
assert(pnlEmpty.discrepancyError === undefined, 'no discrepancy is produced');
assert(pnlEmpty.missing.length > 0, 'the result names what is missing');

const pnlPartial = calculateTrueFinancialPnl([{ amount: 1000, category: 'Milk Sales' }], []);
assert(pnlPartial.status === CALC_STATUS.OK, 'income-only ledger still yields a partial calculation');
assert(pnlPartial.completeLedger === false, 'partial ledger is flagged as incomplete');
assert(pnlPartial.comparisonPerformed === false, 'no comparison when no reported figure is supplied');

// With a reported figure actually supplied, the comparison happens.
const pnlCompared = calculateTrueFinancialPnl([{ amount: 1000 }], [{ amount: 400 }], { reportedDashboardFigure: 5000 });
assert(pnlCompared.comparisonPerformed === true, 'comparison runs when a reported figure is supplied');
assert(pnlCompared.discrepancyError === 4400, 'variance is derived from supplied inputs', `got ${pnlCompared.discrepancyError}`);

// ---------------------------------------------------------------------------
header('SCENARIO 2: Profit endpoint must not apply default revenue/expenses');
// ---------------------------------------------------------------------------

const calc = new DairyCalculations();
const marginMissing = calc.calculateProfitMargin(undefined, undefined);
assert(marginMissing.status === CALC_STATUS.INSUFFICIENT_DATA, 'profit with no inputs returns INSUFFICIENT_DATA');
assert(marginMissing.profit === undefined, 'no profit figure is produced from missing inputs');

const marginHalf = calc.calculateProfitMargin(1000, undefined);
assert(marginHalf.status === CALC_STATUS.INSUFFICIENT_DATA, 'partial inputs still return INSUFFICIENT_DATA');

const marginReal = calc.calculateProfitMargin(1000, 400);
assert(marginReal.status === CALC_STATUS.OK, 'complete inputs calculate normally');
assert(marginReal.profit === 600, 'profit derives from supplied figures', `got ${marginReal.profit}`);

// ---------------------------------------------------------------------------
header('SCENARIO 3: Milk calculations must refuse to assume a herd or a rate');
// ---------------------------------------------------------------------------

const milkEmpty = calculateDailyMilkYield([]);
assert(milkEmpty.status === CALC_STATUS.INSUFFICIENT_DATA, 'no milk records returns INSUFFICIENT_DATA');

const milkNoRate = calculateDailyMilkYield([{ animalId: 'A1', date: '2026-01-01', session: 'MORNING', quantityLiters: 10 }]);
assert(milkNoRate.status === CALC_STATUS.OK, 'milk records alone are calculable');
assert(milkNoRate.grossRevenuePKR === null, 'revenue is null when no rate is supplied', `got ${milkNoRate.grossRevenuePKR}`);
assert(milkNoRate.milkingCowsCount === 1, 'milking cow count comes from the records, not a default');

const milkWithRate = calculateDailyMilkYield(
  [{ animalId: 'A1', date: '2026-01-01', session: 'MORNING', quantityLiters: 10 }],
  { pricePerLiter: 100 }
);
assert(milkWithRate.grossRevenuePKR === 1000, 'revenue derives from the supplied rate', `got ${milkWithRate.grossRevenuePKR}`);

const reconEmpty = reconcileMonthlyMilkYield([], null, null);
assert(reconEmpty.status === CALC_STATUS.INSUFFICIENT_DATA, 'reconciliation with no data returns INSUFFICIENT_DATA');
assert(reconEmpty.percentageMismatch === undefined, 'no percentage deficit is fabricated');

const reconNoDays = reconcileMonthlyMilkYield([100, 110], 700, null);
assert(reconNoDays.status === CALC_STATUS.INSUFFICIENT_DATA, 'missing days-elapsed blocks the calculation');

const reconReal = reconcileMonthlyMilkYield([100, 110], 700, 6);
assert(reconReal.status === CALC_STATUS.OK, 'complete inputs reconcile');
assert(reconReal.calculatedExpectedLiters === 630, 'expected volume derives from samples and days', `got ${reconReal.calculatedExpectedLiters}`);

// ---------------------------------------------------------------------------
header('SCENARIO 4: Withdrawal must report "none" rather than a default hold');
// ---------------------------------------------------------------------------

const withdrawalNone = calculateWithdrawalImpact([]);
assert(withdrawalNone.activeWithdrawnAnimalsCount === 0, 'no animals are invented');
assert(withdrawalNone.dailyQuarantinedLiters === null, 'quarantined volume is null, not a figure');
assert(withdrawalNone.dailyFinancialLossPKR === null, 'forfeit is null, not a figure');
assert(withdrawalNone.status === CALC_STATUS.INSUFFICIENT_DATA, 'no treatments returns INSUFFICIENT_DATA');

// pricePerLiter is a positional number, not an object.
const withdrawalReal = calculateWithdrawalImpact([{ animalId: 'A1', dailyYieldLiters: 12 }], 100);
assert(withdrawalReal.activeWithdrawnAnimalsCount === 1, 'count reflects the supplied records');
assert(withdrawalReal.dailyQuarantinedLiters === 12, 'volume sums the supplied yields');
assert(withdrawalReal.dailyFinancialLossPKR === 1200, 'forfeit derives from the supplied rate', `got ${withdrawalReal.dailyFinancialLossPKR}`);

// ---------------------------------------------------------------------------
header('SCENARIO 5: Expense per animal must require a real head count');
// ---------------------------------------------------------------------------

const epcNoHerd = calculateExpensePerCow(100000, null);
assert(epcNoHerd.status === CALC_STATUS.INSUFFICIENT_DATA, 'no animal count returns INSUFFICIENT_DATA');
assert(epcNoHerd.costPerCowDailyPKR === undefined, 'no per-cow figure is produced');

const epcZeroHerd = calculateExpensePerCow(100000, 0);
assert(epcZeroHerd.status === CALC_STATUS.INSUFFICIENT_DATA, 'a zero animal count is not silently treated as one');

const epcReal = calculateExpensePerCow(100000, 50);
assert(epcReal.status === CALC_STATUS.OK, 'complete inputs calculate');
assert(epcReal.costPerCowDailyPKR === 2000, 'per-cow cost derives from supplied figures', `got ${epcReal.costPerCowDailyPKR}`);

// ---------------------------------------------------------------------------
header('SCENARIO 6: Safe division must not report an undefined ratio as zero');
// ---------------------------------------------------------------------------

assert(DairyMath.safeDivide(0, 0) === 0, 'zero over zero is genuinely zero');
assert(DairyMath.safeDivide(10, 0) === null, 'non-zero over zero is null, not zero');
assert(DairyMath.safeDivide(10, 4) === 2.5, 'ordinary division still works');

// ---------------------------------------------------------------------------
header('SCENARIO 7: Validation engine reports NO_DATA rather than a clean pass');
// ---------------------------------------------------------------------------

const engine = new DairyValidationEngine();
const emptyReport = engine.validateFarmDataset({});

assert(emptyReport.status === 'NO_DATA_TO_VALIDATE', 'empty dataset is not reported as PASS', `got ${emptyReport.status}`);
assert(emptyReport.dataSufficient === false, 'data sufficiency is false');
assert(emptyReport.isValid === true, 'no errors were raised (nothing was checkable)');
assert(emptyReport.rulesRun === 0, 'no rule is claimed to have run');
assert(emptyReport.rulesSkipped > 0, 'skipped rules are reported');
assert(emptyReport.summary.criticalCount === 0, 'no critical count is fabricated');
assert(Array.isArray(emptyReport.ruleResults) && emptyReport.ruleResults.length > 0, 'per-rule outcomes are reported');
assert(
  emptyReport.ruleResults.every((r) => r.outcome === RuleOutcome.INSUFFICIENT_DATA),
  'every rule reports INSUFFICIENT_DATA'
);

// A dataset with real data must actually run rules.
const realReport = engine.validateFarmDataset({
  incomes: [{ amount: 5000, category: 'Milk Sales' }],
  expenses: [{ amount: 3000, category: 'Feed' }],
  dailyExpenseTotal: 3000,
  animalCount: 10,
  animals: [{ earTag: 'A1' }, { earTag: 'A2' }],
});
assert(realReport.dataSufficient === true, 'real data makes the dataset sufficient');
assert(realReport.rulesRun > 0, 'rules run when data exists', `rulesRun=${realReport.rulesRun}`);
assert(realReport.isValid === true, 'a clean real dataset passes');
assert(realReport.summary.categoriesAuditable > 0, 'auditable categories are counted');

// Duplicate identifiers must still be detected.
const dupReport = engine.validateFarmDataset({
  animals: [{ earTag: 'A1' }, { earTag: 'A1' }],
});
assert(
  dupReport.criticalErrors.some((e) => e.code === 'HERD_DUPLICATE_TAG'),
  'duplicate animal identifiers are still detected'
);

// ---------------------------------------------------------------------------
header('SCENARIO 8: Reproductive cycle calculates only from real dates');
// ---------------------------------------------------------------------------

const reproNone = engine.validateReproductiveCycle([], []);
assert(reproNone.outcome === RuleOutcome.INSUFFICIENT_DATA, 'no pregnancy/calving rows blocks days-open');
assert(reproNone.daysOpen === null, 'no average days open is produced');

const reproReal = engine.validateReproductiveCycle(
  [{ animalId: 1, result: 'PREGNANT', diagnosisDate: '2026-01-01' }],
  [{ animalId: 1, dateTime: '2026-06-01' }]
);
assert(reproReal.outcome === RuleOutcome.PASS, 'verified conception and calving dates produce a result');
assert(reproReal.daysOpen.sampleSize === 1, 'sample size reflects the records');
assert(
  Math.abs(reproReal.daysOpen.average - 151) <= 1,
  'days open derives from the supplied dates',
  `got ${reproReal.daysOpen.average}`
);

// A non-PREGNANT result must not be treated as a conception.
const reproNotPregnant = engine.validateReproductiveCycle(
  [{ animalId: 1, result: 'NOT_PREGNANT', diagnosisDate: '2026-01-01' }],
  [{ animalId: 1, dateTime: '2026-06-01' }]
);
assert(reproNotPregnant.daysOpen === null, 'an unconfirmed pregnancy is not used as a conception date');

// ---------------------------------------------------------------------------
header('SCENARIO 9: Dashboard validator must not produce corrected figures');
// ---------------------------------------------------------------------------

const dashValidator = new DashboardValidationService();
const dashEmpty = dashValidator.auditDashboard({}, {});

assert(dashEmpty.dataSufficient === false, 'empty dashboard data is flagged insufficient');
assert(dashEmpty.rulesRun === 0, 'no rules run without records');
assert(dashEmpty.badge.statusLevel === 'NO_DATA', 'badge reports no data rather than a pass', `got ${dashEmpty.badge.statusLevel}`);
assert(!dashEmpty.badge.text.toLowerCase().includes('verified'), 'badge does not claim verified integrity');
assert(dashEmpty.explanationCards.length > 0, 'cards are still produced');
assert(
  dashEmpty.explanationCards.every((c) => c.evaluable === false),
  'every card is marked not evaluable'
);
assert(
  dashEmpty.explanationCards.every((c) => c.stepByStepProof.length === 0),
  'no proof steps are fabricated'
);
assert(dashEmpty.correctedMetrics.finance.netProfitOrLoss === null, 'corrected net result is null');
assert(dashEmpty.correctedMetrics.milk.reconciledDiscrepancyLiters === null, 'corrected milk discrepancy is null');
assert(dashEmpty.correctedMetrics.compliance.activeWithdrawalAnimals === 0, 'no withdrawal animals are claimed');

// ---------------------------------------------------------------------------
header('SCENARIO 10: Audit data readiness reflects measured counts only');
// ---------------------------------------------------------------------------

const emptyCategories = buildReadinessCategories({});
assert(emptyCategories.length === 8, 'all eight categories are present', `got ${emptyCategories.length}`);
assert(
  emptyCategories.every((c) => c.status !== 'AVAILABLE'),
  'no category claims availability without records'
);
assert(
  emptyCategories.every((c) => !c.message.match(/Rs\s?[\d,]+|\d+\s?L\b/)),
  'no category message contains a fabricated figure'
);

const summaryEmpty = summarizeReadiness(emptyCategories);
assert(summaryEmpty.availableCount === 0, 'zero categories available');
assert(summaryEmpty.blockedCount === 8, 'all categories blocked');
assert(summaryEmpty.overall !== 'READY', 'overall state is not READY');

// Explicitly empty arrays mean "measured, zero rows". Omitted means "not measurable".
const emptyFinancial = buildReadinessCategories({ incomes: [], expenses: [], payments: [] });
const financialCategory = emptyFinancial.find((c) => c.id === 'financial');
assert(financialCategory.status === 'INSUFFICIENT_DATA', 'financial is insufficient with no rows');
assert(financialCategory.recordCounts.income_rows === 0, 'measured income row count is 0');
assert(financialCategory.recordCounts.expense_rows === 0, 'measured expense row count is 0');
assert(
  emptyCategories.find((c) => c.id === 'financial').recordCounts.income_rows === null,
  'an unsupplied count is null (not measurable) rather than zero'
);

// A populated ledger must flip financial to available.
const populated = buildReadinessCategories({ incomes: [{ amount: 1 }], expenses: [{ amount: 1 }] });
assert(populated.find((c) => c.id === 'financial').status === 'AVAILABLE', 'real rows make financial available');

// Schema-blocked categories stay blocked even with data.
const withMilk = buildReadinessCategories({ milkRecords: [{ quantityLiters: 5 }] });
assert(
  withMilk.find((c) => c.id === 'milk-quality').status === 'REQUIRES_SCHEMA',
  'milk quality remains schema-blocked because no tank or pricing schedule exists'
);
assert(
  withMilk.find((c) => c.id === 'feed-efficiency').status === 'REQUIRES_SCHEMA',
  'feed efficiency remains schema-blocked because nutrition data is absent'
);

// ---------------------------------------------------------------------------
header('SCENARIO 11: Configuration contains no measured findings');
// ---------------------------------------------------------------------------

assert(config.knownCriticalIssues === undefined, 'the fabricated knownCriticalIssues array is removed');
assert(config._dataProvenance !== undefined, 'a data provenance notice is present');
assert(
  /no measured farm data/i.test(config._dataProvenance.WARNING),
  'the provenance notice states the file holds no measurements'
);

// ---------------------------------------------------------------------------
header('SCENARIO 12: The nine audit rules carry no figures');
// ---------------------------------------------------------------------------

assert(AUDIT_RULES.length === 9, 'all nine rules are defined', `got ${AUDIT_RULES.length}`);

const figurePattern = /Rs\s?[\d,]+|\b\d{3,}\b|\b\d+\s?L\b|\b\d+(\.\d+)?x\b/;
AUDIT_RULES.forEach((rule) => {
  const text = `${rule.title} ${rule.intent} ${rule.phase0Disposition}`;
  assert(!figurePattern.test(text), `${rule.id} contains no fabricated figure`);
  assert(['A', 'B', 'C', 'D'].includes(rule.feasibility), `${rule.id} carries a feasibility classification`);
});

const readinessRule = AUDIT_RULES.find((r) => r.id === 'RULE-06');
assert(readinessRule.feasibility === 'A', 'days-open is classified as calculable from the current schema');

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(78));
console.log(`RESULT: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(78) + '\n');

process.exit(failed > 0 ? 1 : 0);
