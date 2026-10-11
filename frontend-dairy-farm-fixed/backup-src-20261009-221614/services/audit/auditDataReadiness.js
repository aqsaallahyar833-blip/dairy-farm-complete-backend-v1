/**
 * PUNJAB PURE DAIRY - AUDIT & VALIDATION SYSTEM
 * Module: src/services/audit/auditDataReadiness.js
 *
 * PURPOSE
 * -------
 * Single source of truth for "can this audit rule actually be calculated right now?"
 *
 * Phase 0 rule: the audit module must NEVER present a number that did not come
 * from a database record. This module therefore reports *readiness*, not findings.
 *
 * Each category declares:
 *   - the database tables it depends on (ground truth, verified against `dairy farm 1`)
 *   - the schema capability that is missing, if any
 *   - a status derived from the ACTUAL record counts passed in
 *
 * In Phase 1 this module is fed by the real API instead of the in-memory dataset.
 *
 * Plain JavaScript so it can be imported by the React view, the Express handler
 * and `node testSuite.js` without a build step.
 *
 * @typedef {'AVAILABLE'|'NO_RECORDS'|'INSUFFICIENT_DATA'|'REQUIRES_CONFIGURATION'|'REQUIRES_SCHEMA'} ReadinessStatus
 */

/**
 * Schema capabilities verified against the live `dairy farm 1` schema.
 * Each flag is false because the supporting column or table does not exist.
 */
const DEFAULT_CAPABILITIES = {
  medicineHasAntimicrobialFlag: false, // medicines has no drug-class or withdrawal-days column
  milkRecordHasRejectionReason: false, // milk_records.rejected is a bare boolean
  bulkTankTableExists: false, // no tank / daily aggregate table
  qualityPricingTableExists: false, // milk_sales carries one flat rate
  feedNutritionDataPopulated: false, // feed_items.nutritional_json is NULL on every row
  openingStockTableExists: false, // no opening balance or stocktake table
  recordedClosingStockColumnExists: false, // feed_items / medicines hold no current-stock column
};

const count = (rows) => (Array.isArray(rows) ? rows.length : null);
const isNonZero = (n) => n !== null && n > 0;

/**
 * Build the eight audit readiness categories from real record counts.
 * No figure in the output is assumed - every count is measured or null.
 * @param {Record<string, unknown[]> & {capabilities?: typeof DEFAULT_CAPABILITIES}} [input]
 */
export function buildReadinessCategories(input = {}) {
  const cap = { ...DEFAULT_CAPABILITIES, ...(input.capabilities || {}) };

  const income = count(input.incomes);
  const expense = count(input.expenses);
  const payment = count(input.payments);
  const milk = count(input.milkRecords);
  const lactation = count(input.lactations);
  const animal = count(input.animals);
  const health = count(input.healthRecords);
  const treatment = count(input.treatments);
  const medicine = count(input.medicines);
  const feedItem = count(input.feedItems);
  const feedConsumption = count(input.feedConsumption);
  const feedPurchase = count(input.feedPurchases);
  const breedingEvent = count(input.breedingEvents);
  const pregnancy = count(input.pregnancies);
  const calving = count(input.calvings);
  const user = count(input.users);
  const userRole = count(input.userRoles);
  const rolePerm = count(input.rolePermissions);
  const auditLog = count(input.auditLogs);

  const financialCapable = isNonZero(income) || isNonZero(expense);

  return [
    {
      id: 'financial',
      label: 'Financial',
      status: isNonZero(income) && isNonZero(expense) ? 'AVAILABLE' : 'INSUFFICIENT_DATA',
      message: financialCapable
        ? 'Partial transaction records present. A profit & loss figure can only be calculated once both income and expense rows exist.'
        : 'Insufficient transaction data. No income or expense records exist to calculate a profit & loss figure.',
      requirement: 'At least one income row AND at least one expense row in `income` / `expenses`.',
      dependsOnTables: ['income', 'expenses', 'income_categories', 'expense_categories', 'payments'],
      recordCounts: { income_rows: income, expense_rows: expense, payment_rows: payment },
      auditCapable: financialCapable,
    },
    {
      id: 'milk-production',
      label: 'Milk Production',
      status: !isNonZero(milk) ? 'INSUFFICIENT_DATA' : isNonZero(lactation) ? 'AVAILABLE' : 'INSUFFICIENT_DATA',
      message: !isNonZero(milk)
        ? 'Insufficient milk records. No milking sessions have been recorded, so production, yield and monthly reconciliation cannot be calculated.'
        : !isNonZero(lactation)
        ? 'Milk records exist but no lactation records. Per-animal yield analysis and expected-vs-recorded reconciliation remain unavailable.'
        : 'Milk and lactation records present. Production, session split and per-animal yield can be calculated.',
      requirement: 'At least one `milk_records` row, plus `lactations` rows for per-animal and expected-vs-recorded analysis.',
      dependsOnTables: ['milk_records', 'lactations', 'animals'],
      recordCounts: { milk_record_rows: milk, lactation_rows: lactation, animal_rows: animal },
      auditCapable: isNonZero(milk) && isNonZero(lactation),
    },
    {
      id: 'withdrawal-compliance',
      label: 'Withdrawal Compliance',
      status: isNonZero(treatment) ? 'AVAILABLE' : 'NO_RECORDS',
      message: isNonZero(treatment)
        ? 'Treatment records present. Animals under withdrawal can be identified from withdrawal end dates.'
        : 'No active withdrawal records. No treatment rows exist, so no animal can be reported as being under a milk withdrawal period.',
      requirement: 'At least one `treatments` row. `withdrawal_end` is already derived by a database trigger.',
      dependsOnTables: ['treatments', 'health_records', 'medicines', 'animals'],
      recordCounts: { treatment_rows: treatment, health_record_rows: health, medicine_rows: medicine },
      auditCapable: isNonZero(treatment),
      schemaGaps: [
        '`medicines` has no antimicrobial / drug-class flag and no default milk or meat withdrawal days, so an "antimicrobial treatment" cannot be identified.',
        '`milk_records.rejected` is a bare boolean with no reason column and no link to the originating treatment, so a rejection cannot be attributed or priced.',
        'No record exists of whether withheld milk was actually diverted, so forfeit can only be estimated, never verified.',
      ],
    },
    {
      id: 'breeding',
      label: 'Breeding',
      status: isNonZero(pregnancy) && isNonZero(calving) ? 'AVAILABLE' : 'NO_RECORDS',
      message:
        !isNonZero(pregnancy) && !isNonZero(calving)
          ? 'No breeding, pregnancy or calving records. Days open, conception interval and calving performance cannot be calculated.'
          : !isNonZero(calving)
          ? 'Pregnancy records exist but no calving records. Days open and calving performance cannot be calculated yet.'
          : !isNonZero(pregnancy)
          ? 'Calving records exist but no pregnancy records. A verified conception date is required to calculate days open.'
          : 'Pregnancy and calving records present. Days open and expected-versus-actual calving can be calculated from real dates.',
      requirement:
        'At least one `pregnancies` row (conception date = diagnosis_date where result is PREGNANT) and at least one `calvings` row.',
      dependsOnTables: ['pregnancies', 'calvings', 'breeding_events', 'lactations', 'animals'],
      recordCounts: { pregnancy_rows: pregnancy, calving_rows: calving, breeding_event_rows: breedingEvent },
      auditCapable: isNonZero(pregnancy) && isNonZero(calving),
    },
    {
      id: 'feed-efficiency',
      label: 'Feed Efficiency',
      status: cap.feedNutritionDataPopulated
        ? isNonZero(feedConsumption) && isNonZero(milk)
          ? 'AVAILABLE'
          : 'INSUFFICIENT_DATA'
        : 'REQUIRES_SCHEMA',
      message: !cap.feedNutritionDataPopulated
        ? 'Insufficient feed consumption and nutrition data. Feed conversion efficiency cannot be calculated because no dry-matter, energy or protein content is recorded for any feed item.'
        : !isNonZero(feedConsumption)
        ? 'Insufficient feed consumption data. No feed consumption rows exist to combine with milk output.'
        : 'Feed nutrition and consumption data present. Efficiency can be calculated.',
      requirement:
        '`feed_items.nutritional_json` populated with at least dry matter, plus `feed_consumption` rows and `milk_records` rows.',
      dependsOnTables: ['feed_items', 'feed_consumption', 'feed_purchases', 'rations', 'ration_lines'],
      recordCounts: { feed_item_rows: feedItem, feed_consumption_rows: feedConsumption, feed_purchase_rows: feedPurchase },
      auditCapable: cap.feedNutritionDataPopulated && isNonZero(feedConsumption) && isNonZero(milk),
      schemaGaps: [
        '`feed_items.nutritional_json` is NULL for every row, so no dry-matter basis exists.',
        '`ration_lines` and `feed_consumption` carry no dry-matter column and there is no intake or body-weight source.',
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      status: cap.openingStockTableExists && cap.recordedClosingStockColumnExists
        ? isNonZero(feedPurchase) || isNonZero(feedConsumption)
          ? 'AVAILABLE'
          : 'INSUFFICIENT_DATA'
        : 'REQUIRES_SCHEMA',
      message:
        !cap.openingStockTableExists || !cap.recordedClosingStockColumnExists
          ? 'No opening or stocktake data. A stock reconciliation cannot be performed because there is no opening balance, no stocktake record and no recorded closing stock to compare against.'
          : !isNonZero(feedPurchase) && !isNonZero(feedConsumption)
          ? 'No purchase or consumption movement rows. There is nothing to reconcile.'
          : 'Stock movement data present and a closing figure exists to compare against.',
      requirement: 'An opening balance or stocktake table, plus a recorded current-stock column on `feed_items` and `medicines`.',
      dependsOnTables: ['feed_items', 'feed_purchases', 'feed_consumption', 'medicine_stock_transactions'],
      recordCounts: { feed_purchase_rows: feedPurchase, feed_consumption_rows: feedConsumption },
      auditCapable: Boolean(cap.openingStockTableExists && cap.recordedClosingStockColumnExists),
      schemaGaps: [
        'No opening stock, stocktake or adjustment table exists for feed or medicine.',
        '`feed_items` and `medicines` define a minimum stock level but hold no current-stock column, so there is no recorded closing figure to reconcile against.',
      ],
    },
    {
      id: 'milk-quality',
      label: 'Milk Quality',
      status: !isNonZero(milk)
        ? 'NO_RECORDS'
        : cap.bulkTankTableExists && cap.qualityPricingTableExists
        ? 'AVAILABLE'
        : 'REQUIRES_SCHEMA',
      message: !isNonZero(milk)
        ? 'No milk quality records. No somatic cell count, fat, protein or SNF measurements have been recorded.'
        : 'Milk quality fields exist per animal and session, but quality-based revenue cannot be valued: there is no bulk tank record and no quality or premium pricing schedule.',
      requirement: '`milk_records` rows, plus a bulk tank aggregate table and a quality-differential price schedule.',
      dependsOnTables: ['milk_records', 'milk_sales'],
      recordCounts: { milk_record_rows: milk },
      auditCapable: isNonZero(milk) && cap.bulkTankTableExists && cap.qualityPricingTableExists,
      schemaGaps: [
        'No bulk tank or daily tank aggregate table exists, so a tank-level quality average has nowhere to be recorded.',
        '`milk_sales` carries a single flat rate with no fat, SNF or grade differential, so a quality premium cannot be quantified.',
        '`milk_records` has no rejection reason, so a quality rejection cannot be told apart from a withdrawal rejection.',
      ],
    },
    {
      id: 'rbac-audit-trail',
      label: 'RBAC / Audit Trail',
      status: isNonZero(user) && isNonZero(userRole) && isNonZero(rolePerm) ? 'AVAILABLE' : 'REQUIRES_CONFIGURATION',
      message:
        isNonZero(user) && isNonZero(userRole) && isNonZero(rolePerm)
          ? 'Users, role assignments and role permissions are present. The audit module can be protected by role-based access control.'
          : 'Audit permissions are not assigned to any role and no user holds a role, so the audit module cannot currently be protected by role-based access control.',
      requirement: 'At least one user, one user-to-role assignment and one role-to-permission grant.',
      dependsOnTables: ['users', 'user_roles', 'roles', 'role_permissions', 'permissions', 'audit_logs'],
      recordCounts: {
        user_rows: user,
        user_role_rows: userRole,
        role_permission_rows: rolePerm,
        audit_log_rows: auditLog,
      },
      auditCapable: isNonZero(user) && isNonZero(userRole) && isNonZero(rolePerm),
      schemaGaps: [
        'No database trigger writes to `audit_logs`, so audit logging is entirely the responsibility of the application and is currently absent.',
        'No `user_sessions` table exists in this schema, so there is no session store to attribute an action to a signed-in user.',
        'No table carries a soft-delete column, so a deleted record cannot be distinguished from one that never existed.',
      ],
    },
  ];
}

/**
 * The nine audit rules, restated as rule *definitions* with feasibility.
 * They deliberately carry no figures: the withdrawn numbers were a hard-coded
 * case study with no origin in the `dairy farm 1` database.
 */
export const AUDIT_RULES = [
  {
    id: 'RULE-01',
    title: 'Profit & Loss Reconciliation',
    categoryId: 'financial',
    intent:
      'Compare a reported profit figure against the ledger-derived figure and flag any sign or magnitude disagreement.',
    feasibility: 'B',
    feasibilityNote:
      'Computable once income and expense rows exist. Schema is already correct and foreign-keyed to farms and categories.',
    phase0Disposition:
      'Withdrawn as written. The original rule asserted a specific rupee variance produced by hard-coded API defaults, not by the database. Reinstated as a live ledger-versus-display comparison in Phase 1.',
  },
  {
    id: 'RULE-02',
    title: 'Operational Cash Deficit',
    categoryId: 'financial',
    intent: 'Detect a sustained negative net operating position and the resulting liquidity pressure.',
    feasibility: 'B',
    feasibilityNote:
      'A daily net movement can be computed from income and expenses. A true cash-deficit measure additionally needs a cash or bank ledger, which does not exist.',
    phase0Disposition:
      'Withdrawn as written. The original rule annualised a hard-coded daily figure into a multi-million exposure claim. No cash or bank ledger exists to support it.',
  },
  {
    id: 'RULE-03',
    title: 'Expense per Cow Anomaly',
    categoryId: 'financial',
    intent:
      'Flag operating expense per head that falls outside the configured corridor, broken down by expense category.',
    feasibility: 'B',
    feasibilityNote:
      'Fully computable from expense rows divided by a real non-disposed herd count. Expense categories are already seeded.',
    phase0Disposition:
      'Reinstated in principle, but the original benchmark comparison and the reported per-cow figure were both hard-coded. The rule now requires real expense rows before it can say anything.',
  },
  {
    id: 'RULE-04',
    title: 'Monthly Yield Reconciliation',
    categoryId: 'milk-production',
    intent:
      'Reconcile recorded monthly output against an expectation derived from the lactating herd and a configured per-cow yield.',
    feasibility: 'B',
    feasibilityNote:
      'Requires milk records, a real lactating herd count and a documented per-cow yield parameter.',
    phase0Disposition:
      'Withdrawn as written. The original expected and reported volumes, and the resulting deficit, were hard-coded constants. Any expectation must be derived and labelled as a parameter, never asserted as a measurement.',
  },
  {
    id: 'RULE-05',
    title: 'Antimicrobial Withdrawal Compliance',
    categoryId: 'withdrawal-compliance',
    intent: 'Identify animals under a milk withdrawal period and the milk that must be diverted from the bulk tank.',
    feasibility: 'C',
    feasibilityNote:
      'Identifying animals under withdrawal is fully supported today. Classifying a medicine as antimicrobial, attributing a rejected milk record to a treatment, and verifying actual forfeit are not.',
    phase0Disposition:
      'Partially withdrawn. The database can report which animals are under withdrawal from real treatment rows. The antimicrobial classification and the money-loss claim have no schema support and were entirely hard-coded.',
  },
  {
    id: 'RULE-06',
    title: 'Reproductive Cycle / Days Open',
    categoryId: 'breeding',
    intent:
      'Measure days open per animal from verified conception to verified calving, and flag animals beyond the configured threshold.',
    feasibility: 'A',
    feasibilityNote:
      'Every ingredient already exists: pregnancies.diagnosis_date with result PREGNANT gives the conception date, calvings.date_time gives the calving date, and both are foreign-keyed to animals. No schema change is required.',
    phase0Disposition:
      'Ready to implement. No withdrawal needed, but it also cannot be evaluated today because no pregnancy or calving rows exist. The original average days-open figure was hard-coded.',
  },
  {
    id: 'RULE-07',
    title: 'Feed Conversion Efficiency',
    categoryId: 'feed-efficiency',
    intent: 'Measure litres of milk produced per unit of feed dry matter consumed.',
    feasibility: 'C',
    feasibilityNote:
      'No dry-matter, energy or protein content is recorded for any feed item, and there is no intake or body-weight basis.',
    phase0Disposition:
      'Withdrawn as written. The original efficiency figure and the implied dry-matter waste were hard-coded. This rule cannot be calculated until feed nutrition data is populated.',
  },
  {
    id: 'RULE-08',
    title: 'Inventory Shrinkage',
    categoryId: 'inventory',
    intent: 'Reconcile opening stock plus purchases less consumption against a recorded closing stock, and isolate unexplained loss.',
    feasibility: 'D',
    feasibilityNote:
      'No opening balance, stocktake or adjustment record exists, and no current-stock column exists to compare against, so the reconciliation has no two sides.',
    phase0Disposition:
      'Withdrawn as written. The original shrinkage quantity and book-value loss were hard-coded. Redesign as a stock-integrity check once an opening and closing figure exist.',
  },
  {
    id: 'RULE-09',
    title: 'Milk Quality / SCC',
    categoryId: 'milk-quality',
    intent: 'Detect somatic cell count and composition breaches, and quantify any quality premium that is being forfeited.',
    feasibility: 'C',
    feasibilityNote:
      'Per-animal and per-session quality fields exist and are correctly typed, so threshold breaches are computable. There is no bulk tank record and no quality-differential pricing, so forfeited premium is not.',
    phase0Disposition:
      'Partially withdrawn. The premium forfeiture and the daily revenue opportunity loss were hard-coded. Only per-animal threshold alerting can be reinstated, and only once quality rows exist.',
  },
];

/** Rolls the categories up into an overall readiness state. */
export function summarizeReadiness(categories) {
  const available = categories.filter((c) => c.status === 'AVAILABLE');
  const blocked = categories.filter((c) => c.status !== 'AVAILABLE');
  const schemaBlocked = blocked.some((c) => c.status === 'REQUIRES_SCHEMA');
  const configBlocked = blocked.some((c) => c.status === 'REQUIRES_CONFIGURATION');

  const overall =
    blocked.length === 0
      ? 'READY'
      : available.length > 0
      ? 'PARTIALLY_READY'
      : schemaBlocked
      ? 'SCHEMA_BLOCKED'
      : configBlocked
      ? 'CONFIGURATION_BLOCKED'
      : 'NOT_READY';

  const headline =
    blocked.length === 0
      ? `All ${categories.length} audit categories are calculable from current records.`
      : available.length === 0
      ? `No audit findings can be calculated. ${blocked.length} of ${categories.length} categories lack the data they require.`
      : `${available.length} of ${categories.length} audit categories are calculable. ${blocked.length} remain blocked.`;

  return {
    categories,
    availableCount: available.length,
    blockedCount: blocked.length,
    blocked: blocked.map((c) => ({ label: c.label, status: c.status, message: c.message })),
    overall,
    headline,
    generatedAt: new Date().toISOString(),
  };
}

/** Presentation metadata for each readiness status. */
export const READINESS_STATUS_META = {
  AVAILABLE: { label: 'Available', dot: 'bg-emerald-500', text: 'text-emerald-700', ring: 'border-emerald-200 bg-emerald-50' },
  NO_RECORDS: { label: 'No Records', dot: 'bg-slate-400', text: 'text-slate-600', ring: 'border-slate-200 bg-slate-50' },
  INSUFFICIENT_DATA: { label: 'Insufficient Data', dot: 'bg-amber-500', text: 'text-amber-700', ring: 'border-amber-200 bg-amber-50' },
  REQUIRES_CONFIGURATION: { label: 'Requires Configuration', dot: 'bg-rose-500', text: 'text-rose-700', ring: 'border-rose-200 bg-rose-50' },
  REQUIRES_SCHEMA: { label: 'Requires Additional Schema', dot: 'bg-rose-500', text: 'text-rose-700', ring: 'border-rose-200 bg-rose-50' },
};

export default {
  buildReadinessCategories,
  summarizeReadiness,
  AUDIT_RULES,
  READINESS_STATUS_META,
  DEFAULT_CAPABILITIES,
};
