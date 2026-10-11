import React, { useState, useEffect, useMemo } from 'react';
import {
  Droplets,
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  X,
  ShieldAlert,
  LayoutGrid,
  List,
  FileDown,
  Download,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Save,
  Filter,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Sparkles,
  User,
  Check,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { milkService, animalService, milkCalculationService } from '../services';
import { useAuth } from '../context/AuthContext';
import { MilkRecord, MilkDailySummary, Animal, CreateMilkRecordInput } from '../types';
import { QuickMilkEntryModal } from './modals/QuickMilkEntryModal';
import { useActivationKey } from '../utils/useActivationKey';

interface MilkViewProps {
  /** Whether this view is the currently visible tab (vs. preserved-but-hidden). */
  isActive?: boolean;
}

export const MilkView: React.FC<MilkViewProps> = ({ isActive = true }) => {
  // Forces the chart wrapper to remount the instant this tab becomes
  // visible again, so Recharts measures real dimensions instead of the
  // 0x0 it sees while the tab is display:none. See useActivationKey.
  const chartActivationKey = useActivationKey(isActive);

  // Main Tab: 'recording' | 'history' | 'logs'
  const [activeTab, setActiveTab] = useState<'recording' | 'history' | 'logs'>('recording');

  // Farm scope comes from the AUTHENTICATED identity, never hardcoded.
  const { farmId } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionFilter, setSessionFilter] = useState<'All' | 'Morning' | 'Evening'>('All');
  const [periodFilter, setPeriodFilter] = useState<'Today' | 'This Week' | 'This Month' | 'This Year'>('Today');
  const [selectedShed, setSelectedShed] = useState<string>('All');
  const [recordingMode, setRecordingMode] = useState<'group' | 'individual'>('group');
  const [records, setRecords] = useState<MilkRecord[]>([]);
  const [summary, setSummary] = useState<MilkDailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile View Toggle: 'card' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Lactating cows for logging dropdown & sheet
  const [lactatingCows, setLactatingCows] = useState<Animal[]>([]);

  // Selected animal in Individual Mode
  const [individualCowId, setIndividualCowId] = useState<string>('');

  // Bulk sheet entries state
  interface SheetRow {
    animalId: string;
    animalTag: string;
    animalName: string;
    breed?: string;
    photoUrl?: string;
    shed: string;
    morning: string;
    evening: string;
    fatMorning?: number;
    fatEvening?: number;
    snfMorning?: number;
    snfEvening?: number;
    quality: 'Accepted' | 'Rejected';
    isWithdrawalActive?: boolean;
    hasMorningRecord: boolean;
    hasEveningRecord: boolean;
    saved: boolean;
    error?: string;
  }
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);

  // Quick next-animal modal state
  const [showNextAnimalModal, setShowNextAnimalModal] = useState(false);

  // Log Milk Modal (Individual entry)
  const [showLogModal, setShowLogModal] = useState(false);
  const [form, setForm] = useState<CreateMilkRecordInput>({
    date: new Date().toISOString().slice(0, 10),
    session: 'Morning',
    animalId: '',
    quantityLiters: 0,
    qualityStatus: 'Accepted',
  });
  const [selectedCowForLog, setSelectedCowForLog] = useState<Animal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History / Analytics tab state
  const [historyCowId, setHistoryCowId] = useState<string>('');
  const [historyDateRange, setHistoryDateRange] = useState<'7' | '14' | '30'>('7');
  const [cowHistoryRecords, setCowHistoryRecords] = useState<MilkRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadLactatingCows();
  }, []);

  useEffect(() => {
    if (lactatingCows.length > 0) {
      loadMilkData(lactatingCows);
    }
  }, [selectedDate, sessionFilter, periodFilter]);

  const loadLactatingCows = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await animalService.list({ lactating: true, pageSize: 100 });
      setLactatingCows(res.data);
      if (res.data.length > 0) {
        if (!form.animalId) {
          setForm((prev) => ({ ...prev, animalId: res.data[0].id }));
          setSelectedCowForLog(res.data[0]);
        }
        if (!historyCowId) {
          setHistoryCowId(res.data[0].id);
        }
        if (!individualCowId) {
          setIndividualCowId(res.data[0].id);
        }

        await loadMilkData(res.data);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load milk records.');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodRange = (anchorDate: string, period: typeof periodFilter) => {
    const anchor = new Date(`${anchorDate}T00:00:00`);
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (period === 'Today') return { from: anchorDate, to: anchorDate };

    if (period === 'This Week') {
      const start = new Date(anchor);
      const day = start.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + mondayOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: format(start), to: format(end) };
    }

    if (period === 'This Month') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { from: format(start), to: format(end) };
    }

    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31);
    return { from: format(start), to: format(end) };
  };

  const loadMilkData = async (cowsList: Animal[] = lactatingCows) => {
    setLoading(true);
    setLoadError(null);
    try {
      const cows = cowsList.length > 0 ? cowsList : lactatingCows;
      const { from, to } = getPeriodRange(selectedDate, periodFilter);
      const [recRes, selectedDateRes, sumRes] = await Promise.all([
        milkService.list(farmId, { from, to, pageSize: 1000 }),
        milkService.list(farmId, { pageSize: 200 }),
        milkService.getDailySummary(farmId, selectedDate),
      ]);

      const allPeriodRecords = recRes.data;
      const filteredRecords =
        sessionFilter === 'All'
          ? allPeriodRecords
          : allPeriodRecords.filter((r) => r.session === sessionFilter);
      setRecords(filteredRecords);
      setSummary(sumRes.data);

      const allRecords = selectedDateRes.data;

      // Synchronize SheetRows with actual records from the database
      if (cows.length > 0) {
        const rows: SheetRow[] = cows.map((cow) => {
          const mRec = allRecords.find(
            (r) =>
              (r.animalId === cow.id ||
                r.animalTag === cow.animalId ||
                r.animalTag === cow.earTag) &&
              r.date === selectedDate &&
              r.session === 'Morning'
          );
          const eRec = allRecords.find(
            (r) =>
              (r.animalId === cow.id ||
                r.animalTag === cow.animalId ||
                r.animalTag === cow.earTag) &&
              r.date === selectedDate &&
              r.session === 'Evening'
          );

          return {
            animalId: cow.id,
            animalTag: cow.earTag || cow.animalId,
            animalName: cow.name || '—',
            breed: cow.breed,
            photoUrl: cow.photoUrl,
            shed: cow.location || 'Unassigned',
            morning: mRec ? String(mRec.quantityLiters) : '',
            evening: eRec ? String(eRec.quantityLiters) : '',
            fatMorning: mRec?.fatPercent,
            fatEvening: eRec?.fatPercent,
            snfMorning: mRec?.snfPercent,
            snfEvening: eRec?.snfPercent,
            quality: (mRec?.qualityStatus ||
              eRec?.qualityStatus ||
              (cow.isWithdrawalActive ? 'Rejected' : 'Accepted')) as 'Accepted' | 'Rejected',
            isWithdrawalActive: cow.isWithdrawalActive,
            hasMorningRecord: !!mRec,
            hasEveningRecord: !!eRec,
            saved: sessionFilter === 'Morning' ? !!mRec : sessionFilter === 'Evening' ? !!eRec : !!(mRec || eRec),
          };
        });

        setSheetRows(rows);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load milk records.');
    } finally {
      setLoading(false);
    }
  };

  // Load individual cow history for Section 7
  useEffect(() => {
    if (historyCowId) {
      loadCowHistory(historyCowId);
    }
  }, [historyCowId, historyDateRange]);

  const loadCowHistory = async (cowId: string) => {
    setHistoryLoading(true);
    try {
      const res = await milkService.list(farmId, { animalId: cowId, pageSize: 100 });
      setCowHistoryRecords(res.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load cow history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCowSelect = (cowId: string) => {
    const cow = lactatingCows.find((c) => c.id === cowId) || null;
    setSelectedCowForLog(cow);
    setForm((prev) => ({
      ...prev,
      animalId: cowId,
    }));
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation for negative/implausible values according to configurable farm rules
    if (form.quantityLiters <= 0) {
      setErrorMessage('Validation Error: Milk volume must be greater than 0 Liters.');
      return;
    }
    if (form.quantityLiters > 40) {
      setErrorMessage('Validation Warning: Single milking session volume exceeds 40 Liters (implausible). Please confirm value.');
      return;
    }

    setSubmitting(true);
    try {
      await milkService.create(farmId, {
        animalId: form.animalId,
        date: form.date || selectedDate,
        session: form.session,
        quantityLiters: form.quantityLiters,
        fatPercent: form.fatPercent,
        proteinPercent: form.proteinPercent,
        snfPercent: form.snfPercent,
        scc: form.scc,
        qualityStatus: form.qualityStatus,
        rejectionReason: form.rejectionReason,
        remarks: form.remarks,
      });
      setShowLogModal(false);
      showToast(`Milk session logged successfully for ${form.animalId}`);
      loadMilkData();
      if (historyCowId === form.animalId) {
        loadCowHistory(form.animalId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record milk entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Sheet Row Input Handler with validation
  const handleSheetChange = (animalId: string, field: 'morning' | 'evening' | 'quality', value: string) => {
    setSheetRows((prev) =>
      prev.map((row) => {
        if (row.animalId === animalId) {
          const updated = { ...row, [field]: value, saved: false };
          const mNum = parseFloat(field === 'morning' ? value : row.morning) || 0;
          const eNum = parseFloat(field === 'evening' ? value : row.evening) || 0;

          if (mNum < 0 || eNum < 0) {
            updated.error = 'Negative values not allowed';
          } else if (mNum > 35 || eNum > 35) {
            updated.error = 'Implausible yield (>35L/session)';
          } else {
            updated.error = undefined;
          }
          return updated;
        }
        return row;
      })
    );
  };

  // Bulk save all sheet entries
  const handleBulkSave = async () => {
    setSavingBulk(true);
    try {
      let savedCount = 0;
      for (const row of sheetRows) {
        const m = parseFloat(row.morning) || 0;
        const e = parseFloat(row.evening) || 0;
        if (m > 0 && !row.error) {
          await milkService.create(farmId, {
            animalId: row.animalId,
            date: selectedDate,
            session: 'Morning',
            quantityLiters: m,
            qualityStatus: row.quality,
          });
          savedCount++;
        }
        if (e > 0 && !row.error) {
          await milkService.create(farmId, {
            animalId: row.animalId,
            date: selectedDate,
            session: 'Evening',
            quantityLiters: e,
            qualityStatus: row.quality,
          });
          savedCount++;
        }
      }
      setSheetRows((prev) => prev.map((r) => ({ ...r, saved: true })));
      showToast(`Bulk saved ${savedCount} milking session records for ${selectedDate}`);
      loadMilkData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Error during bulk save');
    } finally {
      setSavingBulk(false);
    }
  };

  // Filtered rows for shed
  const filteredSheetRows = useMemo(() => {
    if (selectedShed === 'All') return sheetRows;
    return sheetRows.filter((r) => r.shed.toLowerCase().includes(selectedShed.toLowerCase()));
  }, [sheetRows, selectedShed]);

  const shed1Count = useMemo(
    () => sheetRows.filter((r) => r.shed.toLowerCase().includes('shed 1')).length,
    [sheetRows]
  );
  const shed2Count = useMemo(
    () => sheetRows.filter((r) => r.shed.toLowerCase().includes('shed 2')).length,
    [sheetRows]
  );

  // Computed session-specific totals & averages for the active filter
  const sessionStats = useMemo(() => {
    let morningTotal = 0;
    let eveningTotal = 0;
    let morningCount = 0;
    let eveningCount = 0;

    filteredSheetRows.forEach((r) => {
      const m = parseFloat(r.morning) || 0;
      const e = parseFloat(r.evening) || 0;
      if (m > 0) {
        morningTotal += m;
        morningCount++;
      }
      if (e > 0) {
        eveningTotal += e;
        eveningCount++;
      }
    });

    const totalLiters = morningTotal + eveningTotal;
    const count = filteredSheetRows.length || 1;

    return {
      morningTotal: Math.round(morningTotal * 10) / 10,
      eveningTotal: Math.round(eveningTotal * 10) / 10,
      totalLiters: Math.round(totalLiters * 10) / 10,
      morningCount,
      eveningCount,
      morningAvg: morningCount > 0 ? (morningTotal / morningCount).toFixed(1) : '0.0',
      eveningAvg: eveningCount > 0 ? (eveningTotal / eveningCount).toFixed(1) : '0.0',
      dailyAvg: (totalLiters / count).toFixed(1),
    };
  }, [filteredSheetRows]);

  // Save single row / individual animal record
  const handleSaveRowRecord = async (row: SheetRow, targetSession?: 'Morning' | 'Evening') => {
    try {
      const sessionToSave = targetSession || (sessionFilter === 'Evening' ? 'Evening' : 'Morning');
      const qty = parseFloat(sessionToSave === 'Morning' ? row.morning : row.evening) || 0;
      if (qty <= 0) {
        showToast(`Volume must be greater than 0 for ${row.animalTag}`);
        return;
      }
      await milkService.create(farmId, {
        animalId: row.animalId,
        date: selectedDate,
        session: sessionToSave,
        quantityLiters: qty,
        qualityStatus: row.quality,
      });
      showToast(`✓ Saved ${sessionToSave} record for ${row.animalTag} (${qty} L)`);
      await loadMilkData();
    } catch (err: any) {
      showToast(err.message || 'Error saving record');
    }
  };

  // Navigation handlers for Individual Mode
  const handleNextIndividualCow = () => {
    if (filteredSheetRows.length === 0) return;
    const currentIndex = filteredSheetRows.findIndex((r) => r.animalId === individualCowId);
    const nextIndex = (currentIndex + 1) % filteredSheetRows.length;
    setIndividualCowId(filteredSheetRows[nextIndex].animalId);
  };

  const handlePrevIndividualCow = () => {
    if (filteredSheetRows.length === 0) return;
    const currentIndex = filteredSheetRows.findIndex((r) => r.animalId === individualCowId);
    const prevIndex = (currentIndex - 1 + filteredSheetRows.length) % filteredSheetRows.length;
    setIndividualCowId(filteredSheetRows[prevIndex].animalId);
  };

  const handleDateShift = (deltaDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  // History calculations
  const historyStats = useMemo(() => {
    if (!cowHistoryRecords.length) {
      return { avg: null, peak: null, total: null, current: null };
    }
    const total = cowHistoryRecords.reduce((s, r) => s + (r.quantityLiters || 0), 0);
    const avg = total / cowHistoryRecords.length;
    const peak = Math.max(...cowHistoryRecords.map((r) => r.quantityLiters || 0));
    const current = cowHistoryRecords[0]?.quantityLiters || 0;
    return {
      avg: parseFloat(avg.toFixed(1)),
      peak: parseFloat(peak.toFixed(1)),
      total: parseFloat(total.toFixed(1)),
      current: parseFloat(current.toFixed(1)),
    };
  }, [cowHistoryRecords]);

  // Daily aggregated chart data for History tab
  const historyChartData = useMemo(() => {
    const map: { [date: string]: { date: string; morning: number; evening: number; total: number } } = {};
    cowHistoryRecords.forEach((r) => {
      const d = r.date.slice(5);
      if (!map[d]) {
        map[d] = { date: d, morning: 0, evening: 0, total: 0 };
      }
      if (r.session === 'Morning') map[d].morning += r.quantityLiters || 0;
      else map[d].evening += r.quantityLiters || 0;
      map[d].total += r.quantityLiters || 0;
    });

    const list = Object.values(map);
    if (list.length === 0) {
      return [];
    }
    return list.slice(-14);
  }, [cowHistoryRecords]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header & Section Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Droplets className="w-5 h-5 text-emerald-700" />
              <span>Milk Recording &amp; Quality Analytics</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Session-based parlor recording &bull; Bulk sheet workflow &bull; Historical cow production metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Next Animal Parlor Flow */}
          <button
            id="btn-next-animal"
            onClick={() => setShowNextAnimalModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[42px] cursor-pointer"
            title="Next-animal rapid mobile parlor logging"
          >
            <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Next-Animal Workflow</span>
          </button>

          {/* Log Milk Modal Trigger */}
          <button
            id="btn-log-milk"
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[42px] cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Individual Milk Entry</span>
          </button>
        </div>
      </div>

      {/* 3 Section Navigation Tabs per Document 02 Specifications */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex space-x-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('recording')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 min-h-[38px] ${
            activeTab === 'recording'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Milk Recording Page (Sec. 6)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 min-h-[38px] ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Milk History Page (Sec. 7)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 min-h-[38px] ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Session Logs &amp; Export</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: MILK RECORDING PAGE                                            */}
      {/* ========================================================================= */}
      {activeTab === 'recording' && (
        <div className="space-y-4">
          {/* Simple recording controls */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Entry mode</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  id="mode-group-batch"
                  type="button"
                  onClick={() => setRecordingMode('group')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    recordingMode === 'group' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Records
                </button>
                <button
                  id="mode-individual"
                  type="button"
                  onClick={() => setRecordingMode('individual')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    recordingMode === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Individual Entry
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sessionFilter === 'All' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const { downloadMilkReportWordPressCSV } = await import('../utils/milkReportExport');
                    downloadMilkReportWordPressCSV(records, selectedDate);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={savingBulk}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingBulk ? 'Saving...' : `Save ${sessionFilter} Records`}
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: PROFESSIONAL MILK RECORDS TABLE */}
          {recordingMode === 'group' && (() => {
            const periodRecords = records.filter((record) => {
              const { from, to } = getPeriodRange(selectedDate, periodFilter);
              return record.date >= from && record.date <= to;
            });

            const displayRecords = periodRecords.filter((record) => {
              if (selectedShed === 'All') return true;
              const row = sheetRows.find(
                (r) => r.animalId === record.animalId || r.animalTag === record.animalTag
              );
              return !!row && row.shed.toLowerCase().includes(selectedShed.toLowerCase());
            });

            const morningRecords = periodRecords.filter((r) => r.session === 'Morning');
            const eveningRecords = periodRecords.filter((r) => r.session === 'Evening');
            const totalLiters = displayRecords.reduce((sum, r) => sum + (r.quantityLiters || 0), 0);
            const morningLiters = morningRecords
              .filter((record) => {
                if (selectedShed === 'All') return true;
                const row = sheetRows.find((r) => r.animalId === record.animalId || r.animalTag === record.animalTag);
                return !!row && row.shed.toLowerCase().includes(selectedShed.toLowerCase());
              })
              .reduce((sum, r) => sum + (r.quantityLiters || 0), 0);
            const eveningLiters = eveningRecords
              .filter((record) => {
                if (selectedShed === 'All') return true;
                const row = sheetRows.find((r) => r.animalId === record.animalId || r.animalTag === record.animalTag);
                return !!row && row.shed.toLowerCase().includes(selectedShed.toLowerCase());
              })
              .reduce((sum, r) => sum + (r.quantityLiters || 0), 0);
            const totalValue = 0;
            const selectedPeriodLabel = periodFilter === 'Today'
              ? selectedDate.split('-').reverse().join('/')
              : periodFilter;

            return (
              <div className="space-y-4">
                {/* Simple summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Milk', value: `${totalLiters.toFixed(1)} L`, icon: Droplets },
                    { label: 'Morning', value: `${morningLiters.toFixed(1)} L`, icon: Sun },
                    { label: 'Evening', value: `${eveningLiters.toFixed(1)} L`, icon: Moon },
                    { label: 'Total Value', value: `Rs ${Math.round(totalValue).toLocaleString()}`, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        <Icon className="w-3.5 h-3.5 text-emerald-700" />
                        {label}
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900 font-mono">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 mr-1">Session</span>
                      {(['All', 'Morning', 'Evening'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSessionFilter(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            sessionFilter === s
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="hidden xl:block h-6 w-px bg-slate-200" />

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 mr-1">Period</span>
                      {(['Today', 'This Week', 'This Month', 'This Year'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPeriodFilter(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            periodFilter === p
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 xl:ml-auto">
                      <span className="text-xs font-semibold text-slate-500">Shed / Group</span>
                      <select
                        value={selectedShed}
                        onChange={(e) => setSelectedShed(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="All">All Sheds</option>
                        <option value="Shed 1">Shed 1 - High Yielders</option>
                        <option value="Shed 2">Shed 2 - Mid Yielders</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reference date:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-800 bg-white"
                      />
                    </div>
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-800">{displayRecords.length}</strong> records for <strong className="text-slate-800">{selectedPeriodLabel}</strong>
                    </span>
                  </div>
                </div>

                {/* Individual record table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Milk Records</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Each milking session is shown as an individual record.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const { downloadMilkReportWordPressCSV } = await import('../utils/milkReportExport');
                        downloadMilkReportWordPressCSV(displayRecords, selectedDate);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>

                  {loading ? (
                    <div className="p-10 text-center text-sm text-slate-500">Loading milk records...</div>
                  ) : displayRecords.length === 0 ? (
                    <div className="p-10 text-center">
                      <Droplets className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">No milk records found</p>
                      <p className="text-xs text-slate-500 mt-1">Try another session, period, date, or shed.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[780px] text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                          <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3 text-left font-bold">Animal ID</th>
                            <th className="px-4 py-3 text-left font-bold">Milking Session</th>
                            <th className="px-4 py-3 text-right font-bold">Quantity (Liters)</th>
                            <th className="px-4 py-3 text-right font-bold">Price / Liter</th>
                            <th className="px-4 py-3 text-right font-bold">Total Value (Rs)</th>
                            <th className="px-4 py-3 text-left font-bold">Quality Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayRecords.map((rec) => {
                            const price = rec.pricePerLiter;
                            const value = rec.totalAmount;
                            const isRejected = rec.qualityStatus === 'Rejected';
                            return (
                              <tr key={rec.id} className="hover:bg-slate-50 transition">
                                <td className="px-4 py-3">
                                  <div className="font-mono font-bold text-slate-900">{rec.animalTag || rec.animalId}</div>
                                  {rec.animalName && <div className="text-[10px] text-slate-400 mt-0.5">{rec.animalName}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                                    rec.session === 'Morning'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {rec.session === 'Morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                    {rec.session === 'Third' ? 'Third' : rec.session}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{(rec.quantityLiters || 0).toFixed(1)} L</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-700">{price != null ? `Rs ${price.toLocaleString()}` : '—'}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">Rs {Math.round(value).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                                    isRejected
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {isRejected ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                    {isRejected ? 'Withdrawal' : 'Accepted'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* MODE 2: INDIVIDUAL MODE                                                   */}
          {/* ========================================================================= */}
          {recordingMode === 'individual' && (() => {
            const activeCowRow =
              filteredSheetRows.find((r) => r.animalId === individualCowId) ||
              filteredSheetRows[0] ||
              sheetRows[0];
            const activeCow = lactatingCows.find((c) => c.id === (activeCowRow?.animalId || ''));

            if (!activeCowRow) {
              return (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No animals found for the selected shed.
                </div>
              );
            }

            const currentLiters =
              sessionFilter === 'Evening'
                ? parseFloat(activeCowRow.evening) || 0
                : parseFloat(activeCowRow.morning) || 0;

            // Milk price lives in milk_sales, not milk_records: no revenue here.
            const sessionRevenue: number | null = null;

            return (
              <div className="space-y-4">
                {/* 16-Cow Selector Strip */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Select Animal to Record ({filteredSheetRows.length} Cows in {selectedShed})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Showing: {sessionFilter} Milk Records
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {filteredSheetRows.map((r) => {
                      const isSelected = r.animalId === activeCowRow.animalId;
                      const recordedValue =
                        sessionFilter === 'Evening'
                          ? r.evening
                          : sessionFilter === 'Morning'
                          ? r.morning
                          : (parseFloat(r.morning) + parseFloat(r.evening)).toFixed(1);

                      const hasRecord =
                        sessionFilter === 'Evening'
                          ? r.hasEveningRecord
                          : sessionFilter === 'Morning'
                          ? r.hasMorningRecord
                          : r.hasMorningRecord || r.hasEveningRecord;

                      return (
                        <button
                          key={r.animalId}
                          onClick={() => setIndividualCowId(r.animalId)}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-900">{r.animalTag}</span>
                            {hasRecord && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{r.animalName}</div>
                          <div className="mt-1 font-mono font-bold text-[11px] text-emerald-800">
                            {recordedValue} L
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focused Single Cow Milking Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                    <div className="flex items-center space-x-3.5">
                      {activeCow?.photoUrl ? (
                        <img
                          src={activeCow.photoUrl}
                          alt={activeCowRow.animalTag}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center font-mono text-sm shrink-0">
                          {activeCowRow.animalTag}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base text-slate-900 font-mono">
                            Ear Tag: {activeCowRow.animalTag}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            {activeCow?.breed || '—'}
                          </span>
                          {activeCowRow.isWithdrawalActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                              Medicine Withdrawal Hold
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {activeCowRow.animalName} &bull; {activeCowRow.shed} &bull; Lactation #{activeCow?.lactationNumber || 2} &bull; {activeCow?.daysInMilk || 180} Days in Milk
                        </p>
                      </div>
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePrevIndividualCow}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        onClick={handleNextIndividualCow}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Recording Form for this Animal */}
                  <div className="p-5 space-y-5">
                    {/* Session Selector within Card */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-700">Recording Session:</span>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            sessionFilter === 'Morning'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : sessionFilter === 'Evening'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {sessionFilter === 'Morning' && '☀️ Morning (Session 1: 05:00 AM)'}
                          {sessionFilter === 'Evening' && '🌙 Evening (Session 2: 05:00 PM)'}
                          {sessionFilter === 'All' && '🥛 Full Day (Both Sessions)'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Date: <span className="font-bold text-slate-800 font-mono">{selectedDate.split('-').reverse().join('/')}</span>
                      </div>
                    </div>

                    {/* Large Yield Controls */}
                    {sessionFilter === 'All' ? (
                      /* Read-only Combined Daily View for Individual Cow */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">
                              Morning Yield (Session 1)
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xl font-bold font-mono text-amber-950">
                                {parseFloat(activeCowRow.morning) > 0 ? parseFloat(activeCowRow.morning).toFixed(1) : '—'}
                              </span>
                              <span className="text-xs font-semibold text-amber-700">Liters</span>
                              {(activeCowRow.hasMorningRecord || activeCowRow.saved) && (
                                <span className="text-emerald-700 font-bold text-sm">✓</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200">
                            <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block mb-1">
                              Evening Yield (Session 2)
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xl font-bold font-mono text-indigo-950">
                                {parseFloat(activeCowRow.evening) > 0 ? parseFloat(activeCowRow.evening).toFixed(1) : '—'}
                              </span>
                              <span className="text-xs font-semibold text-indigo-700">Liters</span>
                              {(activeCowRow.hasEveningRecord || activeCowRow.saved) && (
                                <span className="text-emerald-700 font-bold text-sm">✓</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                              Total Daily Yield
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xl font-bold font-mono text-emerald-950">
                                {(parseFloat(activeCowRow.morning) + parseFloat(activeCowRow.evening)).toFixed(1)}
                              </span>
                              <span className="text-xs font-semibold text-emerald-700">Liters</span>
                            </div>
                          </div>
                        </div>

                        {/* Quality & Lab Solids Readonly */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Quality Tank Status
                            </label>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                activeCowRow.quality === 'Rejected'
                                  ? 'border border-rose-300 bg-rose-50 text-rose-800'
                                  : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {activeCowRow.quality === 'Rejected' ? 'Rejected / Withdrawal Withheld' : 'Accepted into Bulk Tank'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Average Fat %
                            </label>
                            <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                              {activeCowRow.fatMorning != null && activeCowRow.fatEvening != null
                                ? `${((activeCowRow.fatMorning + activeCowRow.fatEvening) / 2).toFixed(1)}%`
                                : 'Not recorded'}
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Average SNF %
                            </label>
                            <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                              {activeCowRow.snfMorning != null && activeCowRow.snfEvening != null
                                ? `${((activeCowRow.snfMorning + activeCowRow.snfEvening) / 2).toFixed(1)}%`
                                : 'Not recorded'}
                            </div>
                          </div>
                        </div>

                        {/* Financial & Status Bar */}
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-xs text-emerald-900 font-semibold block">
                              Recorded Volume:
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-800">
                              {(parseFloat(activeCowRow.morning) + parseFloat(activeCowRow.evening)).toFixed(1)} L
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300/80 text-slate-700 rounded-lg text-xs font-semibold">
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Combined Record (Non-Editable)</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleNextIndividualCow}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>Next Cow</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              {sessionFilter === 'Evening' ? 'Evening Milk Yield' : 'Morning Milk Yield'}
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="40"
                                value={sessionFilter === 'Evening' ? activeCowRow.evening : activeCowRow.morning}
                                onChange={(e) =>
                                  handleSheetChange(
                                    activeCowRow.animalId,
                                    sessionFilter === 'Evening' ? 'evening' : 'morning',
                                    e.target.value
                                  )
                                }
                                className="w-32 px-3 py-2 border-2 border-emerald-600 bg-white rounded-xl text-2xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-lg font-bold text-slate-600">Liters</span>
                            </div>
                          </div>

                          {/* Quick Stepper Buttons */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-500 font-medium block">Quick Adjustments:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[-1.0, -0.5, +0.5, +1.0].map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  onClick={async () => {
                                    const field = sessionFilter === 'Evening' ? 'evening' : 'morning';
                                    const current = parseFloat(activeCowRow[field]) || 0;
                                    const updated = Math.max(0, current + delta).toFixed(1);
                                    handleSheetChange(activeCowRow.animalId, field, updated);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                                >
                                  {delta > 0 ? `+${delta}` : delta} L
                                </button>
                              ))}
                              {activeCow?.dailyAvgMilk && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const field = sessionFilter === 'Evening' ? 'evening' : 'morning';
                                    const factor = sessionFilter === 'Evening' ? 0.48 : 0.52;
                                    const avgVal = (activeCow.dailyAvgMilk! * factor).toFixed(1);
                                    handleSheetChange(activeCowRow.animalId, field, avgVal);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                                >
                                  Set to Avg ({(activeCow.dailyAvgMilk * (sessionFilter === 'Evening' ? 0.48 : 0.52)).toFixed(1)}L)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quality & Lab Solids */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Quality Tank Status
                            </label>
                            <select
                              value={activeCowRow.quality}
                              onChange={(e) => handleSheetChange(activeCowRow.animalId, 'quality', e.target.value as any)}
                              className={`w-full text-xs p-2 rounded-lg border font-semibold ${
                                activeCowRow.quality === 'Rejected'
                                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                                  : 'border-slate-300 bg-white text-emerald-800'
                              }`}
                            >
                              <option value="Accepted">Accepted into Bulk Tank</option>
                              <option value="Rejected">Rejected / Withdrawal Withheld</option>
                            </select>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Fat % (Lab Standard)
                            </label>
                            <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                              {(sessionFilter === 'Evening' ? activeCowRow.fatEvening : activeCowRow.fatMorning) != null
                                ? `${sessionFilter === 'Evening' ? activeCowRow.fatEvening : activeCowRow.fatMorning}%`
                                : 'Not recorded'}
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                              SNF % (Solids-Not-Fat)
                            </label>
                            <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                              {(sessionFilter === 'Evening' ? activeCowRow.snfEvening : activeCowRow.snfMorning) != null
                                ? `${sessionFilter === 'Evening' ? activeCowRow.snfEvening : activeCowRow.snfMorning}%`
                                : 'Not recorded'}
                            </div>
                          </div>
                        </div>

                        {/* Financial & Status Bar */}
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-xs text-emerald-900 font-semibold block">
                              Session Revenue Valuation:
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-800">
                              {currentLiters} L
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSaveRowRecord(activeCowRow, sessionFilter === 'Evening' ? 'Evening' : 'Morning')}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>
                                Save {sessionFilter === 'Evening' ? 'Evening' : 'Morning'} Record
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                await handleSaveRowRecord(activeCowRow, sessionFilter === 'Evening' ? 'Evening' : 'Morning');
                                handleNextIndividualCow();
                              }}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>Save &amp; Next Cow</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: MILK HISTORY PAGE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Animal Selector & Date Range Strip */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Select Animal:</span>
                <select
                  value={historyCowId}
                  onChange={(e) => setHistoryCowId(e.target.value)}
                  className="text-xs font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {lactatingCows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.earTag || cow.animalId} — {cow.name || 'Unnamed'} ({cow.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
                <span className="text-slate-500 px-2 font-medium">Range:</span>
                {(['7', '14', '30'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setHistoryDateRange(r)}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      historyDateRange === r ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Last {r} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={() => showToast('Exported individual cow milk production dossier')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              <FileDown className="w-4 h-4 text-emerald-700" />
              <span>Export History Dossier</span>
            </button>
          </div>

          {/* 4 KPI Cards: average, peak, total, current */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Average Daily Yield</span>
              <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{historyStats.avg != null ? `${historyStats.avg} L` : '—'}</div>
              <span className="text-[11px] text-slate-400">Consistent parlor average</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Peak Milk Yield</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{historyStats.peak != null ? `${historyStats.peak} L` : '—'}</div>
              <span className="text-[11px] text-emerald-700 font-medium">Lactation peak</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Recorded Milk</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{historyStats.total != null ? `${historyStats.total} L` : '—'}</div>
              <span className="text-[11px] text-slate-400">Selected period volume</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Current Daily Yield</span>
              <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{historyStats.current != null ? `${historyStats.current} L` : '—'}</div>
              <span className="text-[11px] text-slate-400">Latest recorded day</span>
            </div>
          </div>

          {/* Line Chart of Daily Milk */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Milk Yield Trajectory for {lactatingCows.find((c) => c.id === historyCowId)?.earTag || historyCowId}
                </h3>
                <p className="text-xs text-slate-500">Morning vs Evening session trends</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Lactation Stability Check
              </span>
            </div>
            {/* FIX: min-w-0 handles flex shrink; key remounts the chart the
                instant this tab goes from hidden to visible so it always
                measures a real, non-zero size instead of getting stuck at 0. */}
            <div key={`lactation-chart-${chartActivationKey}`} className="h-64 w-full min-w-0">
              {isActive && historyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="morning" name="Morning (L)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="evening" name="Evening (L)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="total" name="Total Daily (L)" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">Unavailable without milk records</div>
              )}
            </div>
          </div>

          {/* Table of Daily Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700">
              Daily Milking Log Table
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[650px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Quantity (L)</th>
                    <th className="px-4 py-3">Price / Liter</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3">Quality Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cowHistoryRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.date}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.session === 'Morning' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.session}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-emerald-800 font-mono">{(r.quantityLiters ?? 0).toFixed(1)} L</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">{r.pricePerLiter != null ? `Rs ${r.pricePerLiter}` : '—'}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 font-mono">
                        {r.totalAmount != null ? `Rs ${r.totalAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.qualityStatus === 'Rejected' ? (
                          <span className="text-rose-700 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accepted into Tank
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: SESSION LOGS & EXPORT (Current Parlor Records)                   */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Top Controls & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs text-slate-800 font-medium focus:outline-none bg-transparent"
                />
              </div>

              {/* Download PDF Button */}
              <button
                id="btn-download-pdf"
                onClick={async () => {
                  const { downloadMilkReportPDF } = await import('../utils/milkReportExport');
                  downloadMilkReportPDF(records, summary, selectedDate, sessionFilter);
                }}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Download formatted PDF milk report"
              >
                <FileDown className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>PDF Report</span>
              </button>

              {/* WordPress Export Dropdown */}
              <div className="relative">
                <button
                  id="btn-export-wordpress"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>WP Formats</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {exportMenuOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      WordPress Formats
                    </div>
                    <button
                      onClick={async () => {
                        setExportMenuOpen(false);
                        const { downloadMilkReportWordPress } = await import('../utils/milkReportExport');
                        downloadMilkReportWordPress(records, summary, selectedDate);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-medium flex items-center justify-between"
                    >
                      <span>WordPress WXR (XML)</span>
                      <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-mono">.xml</span>
                    </button>
                    <button
                      onClick={async () => {
                        setExportMenuOpen(false);
                        const { downloadMilkReportWordPressCSV } = await import('../utils/milkReportExport');
                        downloadMilkReportWordPressCSV(records, selectedDate);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 font-medium flex items-center justify-between"
                    >
                      <span>TablePress CSV</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">.csv</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex items-center md:hidden border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewMode('card')}
                className={`p-1.5 rounded-md ${mobileViewMode === 'card' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`p-1.5 rounded-md ${mobileViewMode === 'table' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Daily Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Morning Yield</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-1 block truncate">{summary.morningLiters} L</span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">Session 1 (05:00)</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Evening Yield</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-1 block truncate">{summary.eveningLiters} L</span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">Session 2 (17:00)</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Total Daily Milk</span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono mt-1 block truncate">{summary.totalLiters} L</span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">
                  Avg {summary.averagePerCow} L/cow
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Milking Cows</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-1 block truncate">
                  {summary.milkingCowsCount} Cows
                </span>
                <span className="text-[10px] text-slate-400 truncate block">Active Milkers</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Discarded</span>
                <span className="text-base sm:text-lg font-bold text-rose-700 font-mono mt-1 block truncate">{summary.rejectedLiters} L</span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">Rejected / Hold</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 block truncate">Est. Day Revenue</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-1 block truncate">
                  {summary.revenue != null ? `Rs ${summary.revenue.toLocaleString()}` : 'Not available'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate block">Pricing is not part of milk records</span>
              </div>
            </div>
          )}

          {/* Session Records Table or Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {loadError ? (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-rose-700">{loadError}</p>
                <button
                  type="button"
                  onClick={loadLactatingCows}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading milk logs...
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No milk records logged for {selectedDate} in {sessionFilter} session.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className={`${mobileViewMode === 'card' ? 'block md:hidden' : 'hidden'} divide-y divide-slate-100`}>
                  {records.map((rec) => {
                    const isRej = rec.qualityStatus === 'Rejected';
                    const unitPrice = rec.pricePerLiter;
                    const recTotal = rec.totalAmount;

                    return (
                      <div key={rec.id} className={`p-3.5 space-y-2.5 ${isRej ? 'bg-rose-50/30' : 'hover:bg-slate-50/70'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm font-mono">{rec.animalTag}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  rec.session === 'Morning'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.session}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">Price: Rs {unitPrice} / L</span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-emerald-700 text-base">{(rec.quantityLiters ?? 0).toFixed(1)} L</span>
                            <div className="text-[12px] font-mono font-bold text-slate-900">
                              {isRej ? (
                                <span className="text-rose-600 line-through">Rs 0</span>
                              ) : (
                                <span className="text-emerald-800">{recTotal != null ? `Rs ${recTotal.toLocaleString()}` : '—'}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <span className="text-slate-500 font-medium">Quality Verification:</span>
                          {isRej ? (
                            <span className="font-semibold text-rose-700 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 inline shrink-0" /> Rejected
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" /> Accepted
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className={`${mobileViewMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto w-full min-w-0`}>
                  <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Animal ID</th>
                        <th className="px-4 py-3">Milking Session</th>
                        <th className="px-4 py-3">Quantity (Liters)</th>
                        <th className="px-4 py-3">Price / Liter</th>
                        <th className="px-4 py-3">Total Value (Rs)</th>
                        <th className="px-4 py-3">Quality Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((rec) => {
                        const isRej = rec.qualityStatus === 'Rejected';
                        const unitPrice = rec.pricePerLiter;
                        const recTotal = rec.totalAmount;

                        return (
                          <tr key={rec.id} className={isRej ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{rec.animalTag}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  rec.session === 'Morning' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.session}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-700 font-mono text-sm">
                              {(rec.quantityLiters ?? 0).toFixed(1)} L
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono">Rs {unitPrice}</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {isRej ? (
                                <span className="text-rose-600 line-through">Rs 0 (Rejected)</span>
                              ) : (
                                <span className="text-emerald-800 font-bold">{recTotal != null ? `Rs ${recTotal.toLocaleString()}` : '—'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isRej ? (
                                <span className="text-rose-700 font-semibold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 inline" /> Discarded
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Accepted
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INDIVIDUAL LOG MILK ENTRY (with Save, Cancel, Validation)          */}
      {/* ========================================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Individual Milking</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Cow *</label>
                <select
                  required
                  value={form.animalId}
                  onChange={(e) => handleCowSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {lactatingCows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.earTag || cow.animalId} — {cow.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Milking Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Session</label>
                  <select
                    value={form.session}
                    onChange={(e) => setForm((prev) => ({ ...prev, session: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Third">Third Session</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantity (Liters) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="45"
                    required
                    value={form.quantityLiters}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantityLiters: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end text-[11px] text-slate-500">
                  Pricing is recorded separately from milk production.
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quality Status</label>
                <select
                  value={form.qualityStatus}
                  onChange={(e) => setForm((prev) => ({ ...prev, qualityStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Accepted">Accepted into Bulk Tank</option>
                  <option value="Rejected">Rejected / Withdrawal Discard</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Save Milk Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Next Animal Parlor Flow Modal */}
      <QuickMilkEntryModal
        isOpen={showNextAnimalModal}
        onClose={() => setShowNextAnimalModal(false)}
        defaultDate={selectedDate}
        defaultSession={sessionFilter === 'All' ? 'Morning' : sessionFilter}
        onSuccess={() => {
          loadMilkData();
          showToast('Successfully recorded parlor milking sequence');
        }}
      />
    </div>
  );
};
