import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Database,
  Download,
  Lock,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CircleSlash,
} from 'lucide-react';
import config from '../../config.json';
import {
  buildReadinessCategories,
  summarizeReadiness,
  AUDIT_RULES,
  READINESS_STATUS_META,
} from '../services/audit/auditDataReadiness';
import { defaultEngine } from '../../dairyValidation.js';
import { defaultDashboardValidator } from '../../dashboardValidation.js';

interface ValidationViewProps {
  onNavigate?: (tab: string) => void;
}

type SubTab = 'readiness' | 'rules' | 'proofs' | 'checks';

/**
 * Audit & Validation System
 *
 * PHASE 0: this view reports what the system can and cannot audit. It does not
 * present a financial, production, withdrawal, breeding, feed, inventory or
 * quality figure, because no such figure has been derived from the database.
 * Every panel states availability, and every unavailable panel says what is
 * required to make it available.
 */
export const ValidationView: React.FC<ValidationViewProps> = ({ onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('readiness');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('financial');
  const [expandedRule, setExpandedRule] = useState<string | null>('RULE-01');
  const [auditTimestamp, setAuditTimestamp] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Measured state. These arrays are the record sets the audit engine is allowed
   * to reason about. They are empty, so every rule correctly reports insufficient
   * data rather than producing a result.
   */
  const measured = useMemo(
    () => ({
      incomes: [] as unknown[],
      expenses: [] as unknown[],
      payments: [] as unknown[],
      milkRecords: [] as unknown[],
      lactations: [] as unknown[],
      animals: [] as unknown[],
      healthRecords: [] as unknown[],
      treatments: [] as unknown[],
      medicines: [] as unknown[],
      feedItems: [] as unknown[],
      feedConsumption: [] as unknown[],
      feedPurchases: [] as unknown[],
      breedingEvents: [] as unknown[],
      pregnancies: [] as unknown[],
      calvings: [] as unknown[],
      users: [] as unknown[],
      userRoles: [] as unknown[],
      rolePermissions: [] as unknown[],
      auditLogs: [] as unknown[],
    }),
    []
  );

  /**
   * Schema capabilities verified against the live `dairy farm 1` schema.
   * Each flag is false because the supporting column or table does not exist.
   */
  const capabilities = useMemo(
    () => ({
      medicineHasAntimicrobialFlag: false, // medicines has no drug-class or withdrawal-days column
      milkRecordHasRejectionReason: false, // milk_records.rejected is a bare boolean
      bulkTankTableExists: false, // no tank / daily aggregate table
      qualityPricingTableExists: false, // milk_sales carries one flat rate
      feedNutritionDataPopulated: false, // feed_items.nutritional_json is NULL on every row
      openingStockTableExists: false, // no opening balance or stocktake table
      recordedClosingStockColumnExists: false, // feed_items / medicines hold no current-stock column
    }),
    []
  );

  const categories = useMemo(() => buildReadinessCategories({ ...measured, capabilities }), [measured, capabilities]);
  const summary = useMemo(() => summarizeReadiness(categories), [categories]);

  /**
   * Runs the validation engine over the measured records only.
   * With no records this returns NO_DATA_TO_VALIDATE, which is displayed as-is.
   */
  const engineResult = useMemo(() => {
    try {
      return defaultEngine.validateFarmDataset({
        incomes: measured.incomes,
        expenses: measured.expenses,
        milkRecords: measured.milkRecords,
        animals: measured.animals,
        activeTreatments: measured.treatments,
        withdrawnAnimals: null,
        pregnancies: measured.pregnancies,
        calvings: measured.calvings,
        dailyExpenseTotal: null,
        animalCount: null,
        reportedMonthlyMilkLiters: null,
        observedDailyYields: null,
        daysInMonth: null,
        dashboardFinancials: {},
      });
    } catch {
      return null;
    }
  }, [measured]);

  const transparencyCards = useMemo(() => {
    try {
      return defaultDashboardValidator.auditDashboard({}, { ...measured }).explanationCards;
    } catch {
      return [] as any[];
    }
  }, [measured]);

  useEffect(() => {
    setAuditTimestamp(new Date().toLocaleTimeString());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setAuditTimestamp(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 400);
  };

  const categoryById = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ===================== TOP ACTION ROW ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            🐄
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${summary.availableCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                {summary.availableCount > 0 ? 'Partially Auditable' : 'Awaiting Source Data'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {config.farm.name} • Evaluated {auditTimestamp || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition min-h-[40px] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Re-evaluating…' : 'Re-evaluate Readiness'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ===================== DATA READINESS SUMMARY ===================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">Audit Data Readiness</h3>
            <p className="text-xs text-slate-600 mt-1">{summary.headline}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Categories</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{categories.length}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Available</div>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{summary.availableCount}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Insufficient Data</div>
            <div className="text-xl font-black text-amber-700 font-mono mt-0.5">
              {categories.filter((c) => c.status === 'INSUFFICIENT_DATA').length}
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Blocked</div>
            <div className="text-xl font-black text-rose-700 font-mono mt-0.5">
              {categories.filter((c) => c.status === 'REQUIRES_SCHEMA' || c.status === 'REQUIRES_CONFIGURATION').length}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== SUB-TABS ===================== */}
      <div className="flex items-center space-x-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        {(
          [
            { id: 'readiness' as SubTab, label: 'Data Readiness', icon: Database },
            { id: 'rules' as SubTab, label: `Audit Rules (${AUDIT_RULES.length})`, icon: ShieldAlert },
            { id: 'proofs' as SubTab, label: 'Calculation Proofs', icon: FileText },
            { id: 'checks' as SubTab, label: 'Engine Results', icon: Terminal },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition shrink-0 ${
                activeSubTab === t.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================== TAB: READINESS ===================== */}
      {activeSubTab === 'readiness' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              A category is marked <strong>Available</strong> only when the records it needs exist. Where records are
              absent, this module states the shortfall and what is required. It does not display a placeholder, estimate
              or benchmark figure in place of a measurement.
            </p>
          </div>

          {categories.map((c) => {
            const meta = READINESS_STATUS_META[c.status];
            const isOpen = expandedCategory === c.id;
            return (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isOpen ? null : c.id)}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{c.label}</div>
                      <div className="text-xs text-slate-500 truncate">{c.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.ring} ${meta.text}`}>
                      {meta.label}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-4 space-y-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Status</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{c.message}</p>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                        Required to enable
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{c.requirement}</p>
                    </div>

                    {c.recordCounts && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                          Measured record counts
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(c.recordCounts).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700"
                            >
                              {k.replace(/_/g, ' ')}: {v === null ? 'n/a' : `${v}`}
                              {v !== null ? (v === 0 ? ' (0 records found)' : '') : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                        Source tables
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.dependsOnTables.map((t) => (
                          <span key={t} className="px-2 py-1 rounded-md bg-slate-100 text-[11px] font-mono text-slate-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {c.schemaGaps && c.schemaGaps.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-rose-500 tracking-wider mb-1.5">
                          Schema gaps
                        </div>
                        <ul className="space-y-1.5">
                          {c.schemaGaps.map((g, i) => (
                            <li key={i} className="text-xs text-rose-800 flex items-start gap-2 leading-relaxed">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TAB: RULES ===================== */}
      {activeSubTab === 'rules' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Each rule states what it intends to detect and why it can or cannot be evaluated. Feasibility{' '}
              <strong>A</strong> = calculable from the current schema, <strong>B</strong> = calculable once the API and
              data exist, <strong>C</strong> = needs additional schema, <strong>D</strong> = must be redesigned. A
              withdrawn rule reports no figure.
            </p>
          </div>

          {AUDIT_RULES.map((rule) => {
            const cat = categoryById(rule.categoryId);
            const meta = READINESS_STATUS_META[cat?.status ?? 'INSUFFICIENT_DATA'];
            const isOpen = expandedRule === rule.id;
            const feasibilityTone =
              rule.feasibility === 'A'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : rule.feasibility === 'B'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : rule.feasibility === 'C'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  onClick={() => setExpandedRule(isOpen ? null : rule.id)}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold font-mono text-slate-600 shrink-0">
                      {rule.id}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{rule.title}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {cat ? `${cat.label} — ${meta.label}` : 'Category unavailable'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${feasibilityTone}`}>
                      {rule.feasibility}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-4 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Intent</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{rule.intent}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                        Feasibility ({rule.feasibility})
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{rule.feasibilityNote}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider mb-1">
                        Phase 0 disposition
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">{rule.phase0Disposition}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TAB: PROOFS ===================== */}
      {activeSubTab === 'proofs' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              A proof card shows the substituted values behind a number. A card only carries steps when a calculation
              actually ran; otherwise it records what was missing.
            </p>
          </div>

          {transparencyCards.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <CircleSlash className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 mt-3">No calculation could be performed</p>
              <p className="text-xs text-slate-500 mt-1">
                No transaction, milk or treatment records were available to the engine.
              </p>
            </div>
          )}

          {transparencyCards.map((card: any) => (
            <div key={card.id} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {card.evaluable ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  ) : (
                    <CircleSlash className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">{card.title}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {card.evaluable ? 'Calculated from supplied records' : card.reason}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    card.evaluable
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {card.evaluable ? card.severity : 'Not Evaluable'}
                </span>
              </div>

              {card.evaluable && card.comparison && (
                <div className="px-4 sm:px-5 pb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(card.comparison).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                          {k.replace(/([A-Z])/g, ' $1')}
                        </div>
                        <div className="text-xs font-bold text-slate-800 font-mono mt-0.5 break-words">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {card.stepByStepProof && card.stepByStepProof.length > 0 && (
                <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-3 space-y-2">
                  {card.stepByStepProof.map((s: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold text-slate-700">{s.name}</span>
                      <span className="text-slate-400 font-mono"> · {s.formula}</span>
                      <p className="text-slate-600 font-mono mt-0.5 break-words">{s.calculation}</p>
                    </div>
                  ))}
                </div>
              )}

              {!card.evaluable && card.requiredFor && (
                <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Required</div>
                  <p className="text-xs text-slate-600">{card.requiredFor}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===================== TAB: ENGINE RESULTS ===================== */}
      {activeSubTab === 'checks' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Validation Engine Output</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <span>status: {engineResult?.status ?? 'ERROR'}</span>
                <span>·</span>
                <span>evaluated: {engineResult?.rulesRun ?? 0}</span>
                <span>·</span>
                <span>skipped: {engineResult?.rulesSkipped ?? 0}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              The engine ran over the available records. {engineResult?.rulesRun ?? 0} rule(s) could be evaluated and{' '}
              {engineResult?.rulesSkipped ?? 0} could not, because the records each requires do not exist. A rule that
              could not run is reported as such and is excluded from the error and warning totals.
            </p>

            <div className="mt-4 space-y-1.5">
              {(engineResult?.ruleResults ?? []).map((r: any) => (
                <div
                  key={r.ruleId}
                  className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                      r.outcome === 'PASS'
                        ? 'bg-emerald-500'
                        : r.outcome === 'ISSUE'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 font-mono">{r.ruleId}</div>
                    <div className="text-xs text-slate-700">{r.title}</div>
                    {r.message && <div className="text-[11px] text-slate-500 mt-0.5">{r.message}</div>}
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                    {r.outcome.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Access Control</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This module must be protected by role-based access control. The database defines an{' '}
              <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-100">audit:view</code> permission, but
              no role holds it and no user is assigned a role, so access cannot currently be restricted. Granting
              permissions and creating users is out of scope for this phase.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">What Phase 1 Requires</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                'A read-only data-access layer over the live database, replacing the in-memory record sets.',
                'Endpoints returning measured aggregates per audit category rather than supplied payloads.',
                'Population of the transactional tables so financial, milk, treatment, breeding and feed rules can run.',
                'Schema additions for antimicrobial classification, milk rejection reasons, feed nutrition and stock balances.',
                'User, role and permission seeding so this module can be access-controlled.',
              ].map((t, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ===================== FOOTER NAV ===================== */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
        >
          ← Back to Dashboard
        </button>
        <button
          onClick={() => onNavigate?.('finance')}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition"
        >
          Finance Records →
        </button>
        <button
          onClick={() => onNavigate?.('settings')}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
        >
          Audit Thresholds
        </button>
      </div>
    </div>
  );
};

export default ValidationView;
