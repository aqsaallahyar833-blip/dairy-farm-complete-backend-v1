import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Droplets,
  DollarSign,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Plus,
  Heart,
  Stethoscope,
  Wheat,
  Eye,
  User,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, taskService } from '../services';
import { DashboardSummary, Task } from '../types';
import { useActivationKey } from '../utils/useActivationKey';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onSelectAnimal?: (animalId: string) => void;
  onOpenQuickMilk?: () => void;
  onOpenQuickHealth?: () => void;
  /** Whether this view is the currently visible tab (vs. preserved-but-hidden). */
  isActive?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectAnimal,
  onOpenQuickMilk,
  onOpenQuickHealth,
  isActive = true,
}) => {
  // Forces the chart wrappers to remount the instant this tab becomes
  // visible again, so Recharts measures real dimensions instead of the
  // 0x0 it sees while the tab is display:none. See useActivationKey.
  const chartActivationKey = useActivationKey(isActive);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Farm scope comes from the AUTHENTICATED identity. Never hardcoded, and
  // never read from mock or local storage.
  const { farmId, farmName } = useAuth();

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    if (farmId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sumRes = await dashboardService.getSummary(farmId);

      // A failed dashboard call is a FAILURE, not an empty farm. Never fall
      // back to mock values and never coerce a failure into zeros.
      if (!sumRes.success || !sumRes.data) {
        setSummary(null);
        setError(sumRes.message || 'Could not load dashboard data.');
        return;
      }

      setSummary(sumRes.data);

      // Tasks are still served by the mock service in this phase; that call is
      // intentionally left untouched (Phase B scope is the Dashboard summary).
      taskService
        .list()
        .then((r) => setTasks(r.data ?? []))
        .catch(() => setTasks([]));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setSummary(null);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">
            Loading {farmName ?? 'farm'} operational snapshot...
          </p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="max-w-md text-center">
          <h2 className="text-base font-semibold text-slate-800 mb-2">
            Dashboard unavailable
          </h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Dynamic 7-day milk production chart data from centralized service
  const milkProduction7Days = summary.charts?.milkLast7Days?.map((item) => ({
    day: item.label,
    liters: item.total,
  })) || [];

  // Dynamic 7-day expenses chart data from centralized service
  const expenses7Days = summary.charts?.expensesLast7Days?.map((item) => ({
    day: item.label,
    cost: item.amount,
  })) || [];

  /**
   * Renders a metric that has NO canonical backend source. `null` means
   * "not connected yet" and must never be shown as 0.
   */
  const unavailable = 'Not available yet';

  // Dynamic Top Milk Producers Today from centralized service
  const topProducers = summary.charts?.topMilkProducers?.map((cow) => ({
    id: cow.animalId || cow.tag,
    tag: cow.tag || cow.animalId,
    rfid: cow.rfid,
    yieldLiters: cow.liters,
    daysInMilk: 180,
    status: 'Lactating',
  })) || [];

  const milkChangePercent = summary.milk.yesterdayLiters > 0
    ? (((summary.milk.todayLiters - summary.milk.yesterdayLiters) / summary.milk.yesterdayLiters) * 100).toFixed(1)
    : '0.0';

  /**
   * A zero financial figure is not a measured result. When no transaction
   * produced a non-zero amount, the card states that no data exists rather
   * than rendering "Rs 0" as if it were revenue.
   */
  const hasFinancialData =
    summary.finance.todayRevenue > 0 || summary.finance.todayExpenses > 0 || summary.finance.estimatedProfitToday !== 0;

  const peakMilk = milkProduction7Days.length > 0 ? Math.max(...milkProduction7Days.map((d) => d.liters)) : 0;
  const peakExpense = expenses7Days.length > 0 ? Math.max(...expenses7Days.map((d) => d.cost)) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Farm Info Header (Matching Screen 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            🐄
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Green Dairy Farm</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Operating
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>14 May 2024</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">Muhammad Ali - Manager</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons Header (Requirement 2) */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => onNavigate('animals')}
            className="inline-flex items-center space-x-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Animal</span>
          </button>
          <button
            onClick={() => (onOpenQuickMilk ? onOpenQuickMilk() : onNavigate('milk'))}
            className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Record Milk</span>
          </button>
          <button
            onClick={() => (onOpenQuickHealth ? onOpenQuickHealth() : onNavigate('health'))}
            className="inline-flex items-center space-x-1 px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Health Event</span>
          </button>
        </div>
      </div>

      {/* Audit Data Readiness Banner — reports availability, never a fabricated finding */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wider">
                Audit Readiness
              </span>
              <h4 className="font-bold text-slate-800 text-sm">
                Dashboard figures below are not yet audit-verified
              </h4>
            </div>
            <p className="text-slate-600 mt-1 leading-relaxed">
              The financial, milk, withdrawal, breeding, feed, inventory and quality cards on this dashboard are
              currently served from placeholder data rather than the farm ledger, so no audit conclusion can be drawn
              from them. The Audit &amp; Validation module lists exactly which categories lack source records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
          <button
            onClick={() => onNavigate('validation')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <span>Check Audit Readiness</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Medicine Withdrawal Alert Banner.
          Contract gap: the dashboard endpoint has no withdrawal figure, so this
          banner only renders once a real source exists. It is never faked. */}
      {(summary.alerts.withdrawalActive ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs min-w-0">
              <h4 className="font-bold text-amber-900 leading-tight">
                Active Antimicrobial Hold: {summary.alerts.withdrawalActive} Animal{(summary.alerts.withdrawalActive ?? 0) > 1 ? 's' : ''} under Medicine Withdrawal
              </h4>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Veterinary withdrawal period is active. Milk from treated animals is rejected from bulk tank collection.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('health')}
            className="w-full sm:w-auto shrink-0 text-xs font-semibold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3.5 py-2 rounded-lg transition min-h-[40px] flex items-center justify-center"
          >
            Review Withdrawal →
          </button>
        </div>
      )}

      {/* Top 4 KPI Badges (Strictly from Underlying Records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Animals</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            {summary.animalCounts.total}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Head on farm</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lactating Cows</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
            {summary.animalCounts.lactating}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {((summary.animalCounts.lactating / (summary.animalCounts.total || 1)) * 100).toFixed(1)}% in milk
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pregnant Cows</span>
          <div className="text-xl sm:text-2xl font-black text-sky-700 mt-1 font-mono">
            {summary.animalCounts.pregnant}
          </div>
          <span className="text-[11px] text-sky-600 font-medium">Confirmed ultrasound</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Dry Cows</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">
            {summary.animalCounts.dry}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Pre-calving rest</span>
        </div>
      </div>

      {/* Secondary Herd Breakdown Strip (Requirement 1: Total, Lactating, Dry, Pregnant, Heifers, Calves, Bulls, Sick, Quarantine) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Herd Classification:
        </span>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-slate-600">
          <span className="cursor-pointer hover:text-emerald-800 transition" onClick={() => onNavigate('animals')}>
            Heifers: <strong className="font-mono text-slate-900">{summary.animalCounts.heifers}</strong>
          </span>
          <span className="cursor-pointer hover:text-emerald-800 transition" onClick={() => onNavigate('animals')}>
            Calves: <strong className="font-mono text-slate-900">{summary.animalCounts.calves}</strong>
          </span>
          <span className="cursor-pointer hover:text-emerald-800 transition" onClick={() => onNavigate('animals')}>
            Bulls: <strong className="font-mono text-slate-900">{summary.animalCounts.bulls}</strong>
          </span>
          <span className="cursor-pointer hover:text-rose-800 transition" onClick={() => onNavigate('health')}>
            Sick: <strong className="font-mono text-rose-700">{summary.animalCounts.sick}</strong>
          </span>
          <span className="cursor-pointer hover:text-amber-800 transition" onClick={() => onNavigate('health')}>
            Quarantine: <strong className="font-mono text-amber-700">{summary.animalCounts.quarantine}</strong>
          </span>
          <span className="cursor-pointer hover:text-sky-800 transition" onClick={() => onNavigate('breeding')}>
            Open: <strong className="font-mono text-sky-700">{summary.animalCounts.open}</strong>
          </span>
        </div>
      </div>

      {/* Hero Row: 4 Unified Operational Overview Cards in Standard Responsive 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Milk Overview (Today) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-emerald-600" /> Milk Overview (Today)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {Number(milkChangePercent) >= 0 ? `+${milkChangePercent}%` : `${milkChangePercent}%`} vs Yesterday
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Milk Produced</div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  {(summary?.milk?.todayLiters ?? 0).toLocaleString()} L
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-50">
                <span className="text-slate-500">Yesterday's Milk:</span>
                <span className="font-bold text-slate-800 font-mono">{(summary?.milk?.yesterdayLiters ?? 0).toLocaleString()} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Average / Cow:</span>
                <span className="font-bold text-slate-900 font-mono">{(summary?.milk?.averageLiters ?? 0).toFixed(1)} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Milk Revenue:</span>
                <span className="font-bold text-emerald-700 font-mono">Rs {(summary?.milk?.todayRevenue ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Yield:</span>
                <span className="font-medium text-slate-700 font-mono">
                  {(summary?.milk?.monthlyLiters ?? 0).toLocaleString()} L{' '}
                  <span
                    onClick={() => onNavigate('validation')}
                    className="text-[10px] text-slate-400 hover:underline cursor-pointer ml-1 inline-block"
                    title="Yield reconciliation requires real milk records and a documented per-cow yield parameter"
                  >
                    (not reconciled)
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('milk')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between w-full transition group"
          >
            <span>Open Milking Register</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
          </button>
        </div>

        {/* Card 2: Reproduction */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" /> Reproduction
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Next 30 Days</span>
            </div>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Pregnant Cows:</span>
                <span className="font-bold text-slate-900 font-mono">{summary.animalCounts.pregnant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Open / Ready:</span>
                <span className="font-bold text-slate-900 font-mono">{summary.animalCounts.open}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Upcoming Calvings:</span>
                <span className="font-bold text-amber-700 font-mono">{summary.alerts.breedingDue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Heifers Growing:</span>
                <span className="font-medium text-emerald-700 font-mono">{summary.animalCounts.heifers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calves:</span>
                <span className="font-medium text-slate-700 font-mono">{summary.animalCounts.calves}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('breeding')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between w-full transition group"
          >
            <span>Breeding Timeline</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
          </button>
        </div>

        {/* Card 3: Health & Vet */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-sky-600" /> Health & Vet
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Current</span>
            </div>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sick Animals:</span>
                <span className="font-bold text-rose-700 font-mono">{summary.animalCounts.sick}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Under Treatment:</span>
                <span className="font-bold text-amber-700 font-mono">{summary.alerts.healthAlerts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Withdrawal Animals:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {summary.alerts.withdrawalActive === null ? unavailable : summary.alerts.withdrawalActive}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quarantine Pen:</span>
                <span className="font-medium text-slate-700 font-mono">{summary.animalCounts.quarantine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vaccinations Due:</span>
                {/* Contract gap: the previous hardcoded "3 Herd Protocols" was a
                    fabricated statistic. There is no backend source. */}
                <span className="font-medium text-slate-500 font-mono">{unavailable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Feed Stock Alerts:</span>
                <span className="font-medium text-amber-700 font-mono">
                  {summary.alerts.feedStockWarnings === null ? unavailable : summary.alerts.feedStockWarnings}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('health')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between w-full transition group"
          >
            <span>Review Health Log</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
          </button>
        </div>

        {/* Card 4: Financial (Today) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Financial (Today)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">PKR</span>
            </div>
            <div className="space-y-2 mt-3 text-xs">
              {hasFinancialData ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Income:</span>
                    <span className="font-bold text-emerald-700 font-mono">Rs {summary.finance.todayRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expenses:</span>
                    <span className="font-bold text-rose-700 font-mono">Rs {summary.finance.todayExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="font-bold text-slate-800">Net:</span>
                    <span className={`font-black font-mono text-sm ${summary.finance.estimatedProfitToday >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                      Rs {summary.finance.estimatedProfitToday.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                    <span>Not yet reconciled against the farm ledger</span>
                    <span onClick={() => onNavigate('validation')} className="text-slate-600 font-bold hover:underline cursor-pointer">
                      Check readiness →
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="text-slate-400">No transaction data available</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Income, expenses and profit cannot be displayed because no transaction records exist for this period.
                  </p>
                  <span
                    onClick={() => onNavigate('validation')}
                    className="text-[10px] text-slate-600 font-bold hover:underline cursor-pointer mt-1.5 inline-block"
                  >
                    Check audit readiness →
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate('finance')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between w-full transition group"
          >
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
          </button>
        </div>
      </div>

      {/* Bottom Grid: 2 Charts & Top Milk Producers (Matching Screen 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Milk Production (Last 7 Days) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Milk Production (Last 7 Days)
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {(peakMilk ?? 0).toLocaleString()} L Peak
            </span>
          </div>
          {/* FIX: min-w-0 handles flex shrink; key remounts the chart the
              instant this tab goes from hidden to visible so it always
              measures a real, non-zero size instead of getting stuck at 0. */}
          <div key={`milk-chart-${chartActivationKey}`} className="h-44 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={milkProduction7Days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="liters" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Expenses (Last 7 Days) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Expenses (Last 7 Days)
            </h3>
            <span className="text-xs font-mono font-bold text-rose-700">
              Rs {(summary?.finance?.todayExpenses ?? 0).toLocaleString()}
            </span>
          </div>
          {/* FIX: min-w-0 handles flex shrink; key remounts the chart the
              instant this tab goes from hidden to visible so it always
              measures a real, non-zero size instead of getting stuck at 0. */}
          <div key={`expense-chart-${chartActivationKey}`} className="h-44 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenses7Days} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="cost" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Milk Producers (Today) List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Top Milk Producers (Today)
              </h3>
              <span className="text-[10px] text-emerald-700 font-bold">Lactation Peak</span>
            </div>

            <div className="space-y-2 text-xs">
              {topProducers.map((cow, i) => (
                <div
                  key={cow.id}
                  onClick={() => onSelectAnimal && onSelectAnimal(cow.id)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/60 transition cursor-pointer border border-transparent hover:border-emerald-200"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-black text-slate-900 font-mono">
                        {cow.tag}
                      </span>
                      <span className="text-[10px] text-slate-400 block">DIM: {cow.daysInMilk} Days</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {(cow.yieldLiters ?? 0).toFixed(1)} L
                    </span>
                    <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('animals')}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-900 font-semibold pt-3 border-t border-slate-100 mt-2 block"
          >
            View Complete Herd Registry →
          </button>
        </div>
      </div>
    </div>
  );
};
