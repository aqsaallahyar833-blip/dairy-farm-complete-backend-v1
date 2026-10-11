import { Request, Response } from 'express';
import { DairyValidationEngine } from '../dairyValidation.js';
import { DairyCalculations } from '../dairyCalculations.js';
import { DashboardValidationService } from '../dashboardValidation.js';
import { buildReadinessCategories, summarizeReadiness } from '../src/services/audit/auditDataReadiness.js';

const validator = new DairyValidationEngine();
const calculator = new DairyCalculations();
const dashboardValidator = new DashboardValidationService(validator);

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const toNumber = (v: unknown): number | null => {
  if (isFiniteNumber(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

/**
 * POST /api/validate/dashboard
 *
 * Validates the records supplied in the request body. It does not query the
 * database and it does not substitute baseline values: a dataset that contains
 * no runnable rule is reported as NO_DATA_TO_VALIDATE, not as a pass.
 */
export function handleValidateDashboard(req: Request, res: Response) {
  try {
    const { farmId, date, data } = req.body || {};
    const report = validator.validate(data || req.body || {});

    res.json({
      farmId: farmId ?? null,
      date: date ?? null,
      status: report.status,
      dataSufficient: report.dataSufficient,
      rulesEvaluated: report.rulesRun,
      rulesSkipped: report.rulesSkipped,
      ruleResults: report.ruleResults,
      summary: report.summary,
      criticalIssues: report.detectedIssues,
      criticalErrors: report.criticalErrors,
      warnings: report.warnings,
      actionableRecommendations: report.actionableRecommendations,
      auditMetadata: {
        engineVersion: 'v2.0.0-PHASE0',
        timestamp: report.timestamp,
        note: 'All figures are derived from the supplied records. No default or benchmark value is substituted.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Validation failed' });
  }
}

/**
 * POST /api/calculate/profit
 *
 * Requires both revenue and expenses to be supplied. There is no longer a default
 * revenue or expense figure: if either is missing the endpoint reports
 * INSUFFICIENT_DATA rather than calculating a loss from invented inputs.
 */
export function handleCalculateProfit(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const revenue = toNumber(body.revenue);
    const expenses = toNumber(body.expenses);
    const missing: string[] = [];
    if (revenue === null) missing.push('revenue');
    if (expenses === null) missing.push('expenses');

    if (missing.length > 0) {
      return res.status(400).json({
        status: 'INSUFFICIENT_DATA',
        message: 'Insufficient financial data. A profit figure can only be calculated from supplied transaction totals.',
        missing,
        revenue: null,
        expenses: null,
        profit: null,
        marginPercent: null,
        profitToExpenseRatio: null,
        note: 'No default revenue or expense figure is applied.',
      });
    }

    const result = calculator.calculateProfitMargin(revenue, expenses);

    res.json({
      farmId: body.farmId ?? null,
      revenue: result.revenue,
      expenses: result.expenses,
      profit: result.profit,
      marginPercent: result.marginPercent,
      profitToExpenseRatio: result.profitToExpenseRatio,
      status: result.status_label,
      isLoss: result.isLoss,
      isProfit: result.isProfit,
      formula: result.formula,
      steps: result.steps,
      auditLog: [
        {
          formula: 'Profit = Revenue - Expenses',
          values: `Rs ${result.revenue.toLocaleString()} - Rs ${result.expenses.toLocaleString()}`,
          result: `Rs ${result.profit.toLocaleString()} (${result.status_label})`,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Profit calculation failed' });
  }
}

/**
 * POST /api/validate/batch
 */
export function handleValidateBatch(req: Request, res: Response) {
  try {
    const farms = (req.body && req.body.farms) || [];
    const results = farms.map((f: any) => {
      const report = validator.validate((f && f.data) || {});
      return {
        farmId: (f && f.farmId) ?? null,
        status: report.status,
        dataSufficient: report.dataSufficient,
        rulesEvaluated: report.rulesRun,
        rulesSkipped: report.rulesSkipped,
        errorsCount: report.summary.criticalCount,
        warningsCount: report.summary.warningCount,
        criticalIssues: report.detectedIssues,
      };
    });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch validation failed' });
  }
}

/**
 * GET /api/audit/trail/:farmId
 *
 * Returns the transparency cards actually produced from the supplied records.
 * The card count is derived, never a fixed total.
 */
export function handleGetAuditTrail(req: Request, res: Response) {
  try {
    const { farmId } = req.params;
    const auditData = dashboardValidator.auditDashboard(
      (req.query.dashboard ? JSON.parse(String(req.query.dashboard)) : {}) as Record<string, any>,
      (req.query.records ? JSON.parse(String(req.query.records)) : {}) as Record<string, any>,
    );

    const notEvaluable = (auditData.explanationCards || []).filter((c: any) => !c.evaluable).length;

    res.json({
      farmId: farmId ?? null,
      totalCalculations: (auditData.explanationCards || []).length,
      notEvaluable,
      dataSufficient: auditData.dataSufficient,
      rulesEvaluated: auditData.rulesRun,
      rulesSkipped: auditData.rulesSkipped,
      status: auditData.status,
      badge: auditData.badge,
      calculations: (auditData.explanationCards || []).map((c: any) => ({
        id: c.id,
        name: c.title,
        ruleRef: c.ruleId,
        evaluable: c.evaluable,
        severity: c.severity,
        comparison: c.comparison,
        reason: c.reason,
        requiredFor: c.requiredFor ?? null,
        steps: c.stepByStepProof,
        timestamp: auditData.timestamp,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Audit trail failed' });
  }
}

/**
 * GET /api/audit/data-readiness?farmId
 *
 * Phase 0 endpoint: reports which audit categories can be calculated from the
 * records actually present, and why the remainder cannot be. Returns no findings.
 */
export function handleAuditDataReadiness(req: Request, res: Response) {
  try {
    const records = (req.query.records ? JSON.parse(String(req.query.records)) : {}) as Record<string, any>;
    const capabilities = (req.query.capabilities ? JSON.parse(String(req.query.capabilities)) : undefined) as any;

    // Imported at module scope (ESM has no require) and applied to measured counts only.
    const categories = buildReadinessCategories({ ...records, capabilities });
    const summary = summarizeReadiness(categories);

    res.json({
      farmId: req.query.farmId ?? null,
      ...summary,
      note: 'Readiness reflects measured record counts only. No audit finding is produced by this endpoint.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Data readiness evaluation failed' });
  }
}
