import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  ChevronDown,
  CheckCircle2,
  BarChart3,
  Calendar,
  Droplets,
  Heart,
  Stethoscope,
  Wheat,
  DollarSign,
  Baby,
  Skull,
  Activity,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  reportService,
  dashboardService,
  animalService,
  breedingService,
  healthService,
  feedService,
  financeService,
} from '../services';
import { useAuth } from '../context/AuthContext';
import {
  Animal,
  MilkReport,
  FinancialReport,
  BreedingRecord,
  TreatmentRecord,
  FeedItem,
  Expense,
  Income,
  MortalityRecord,
  CalvingRecord,
  DashboardSummary,
} from '../types';
import { ReportTables } from './reports/ReportTables';
import { PresetKey } from './reports/reportDataHelpers';

interface ReportTypeMeta {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  description: string;
}

export const ReportsView: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  // Always active on a specific report (default: 'daily')
  const [selectedReport, setSelectedReport] = useState<string>('daily');

  // Attached preset state: 'today' | '7days' | 'month' | 'year'
  const [activePreset, setActivePreset] = useState<PresetKey>('month');

  const [dateRange, setDateRange] = useState({
    from: monthStart,
    to: today,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Farm scope for the dashboard summary this view also consumes.
  const { farmId } = useAuth();

  // Loaded data for reports
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [milkReport, setMilkReport] = useState<MilkReport | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [calvings, setCalvings] = useState<CalvingRecord[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  const reportTypes: ReportTypeMeta[] = [
    {
      id: 'daily',
      label: 'Daily Report',
      icon: Activity,
      tag: 'Daily Audit',
      description: '24-hour chronological operational audit capturing morning/evening milking, TMR feed allocations, veterinary treatments, AI services, and bulk milk tanker dispatch.',
    },
    {
      id: 'weekly',
      label: 'Weekly Report',
      icon: Calendar,
      tag: '7-Day Summary',
      description: 'Rolling 7-day performance ledger summarizing daily parlor yields, average yield per cow, total feed fed, veterinary events, revenue, operating costs, and net daily cashflow.',
    },
    {
      id: 'monthly',
      label: 'Monthly Report',
      icon: BarChart3,
      tag: 'Financial Ledger',
      description: 'Consolidated 4-week farm performance ledger comparing total milk outputs, gross revenues, feed OPEX, labor, healthcare costs, and monthly net profitability.',
    },
    {
      id: 'animal',
      label: 'Animal Report',
      icon: Layers,
      tag: 'Herd Census',
      description: 'Complete herd inventory roster of 106 cattle with RFID tags, breeds, sex, physiological categories, lactation stages, days in milk (DIM), daily yields, and pen assignments.',
    },
    {
      id: 'milk',
      label: 'Milk Report',
      icon: Droplets,
      tag: 'Parlor & Quality',
      description: 'In-depth bulk milk collection records, morning/evening parlor yields, Fat % & SNF % quality laboratory tests, daily cow averages, and commercial buyer billing totals.',
    },
    {
      id: 'breeding',
      label: 'Breeding Report',
      icon: Heart,
      tag: 'Reproduction',
      description: 'Artificial insemination (AI) and natural breeding registry sorted by Animal ID in ascending order, semen straw codes, technician signatures, and pregnancy diagnosis results.',
    },
    {
      id: 'health',
      label: 'Health Report',
      icon: Stethoscope,
      tag: 'Veterinary',
      description: 'Clinical disease treatment logs, medication administration, routes, attending veterinarian records, treatment costs, and antibiotic milk withholding safety periods.',
    },
    {
      id: 'feed',
      label: 'Feed Report',
      icon: Wheat,
      tag: 'Nutrition & Silage',
      description: 'Inventory levels for corn silage, concentrate feeds, mineral supplements, unit purchase prices, daily herd consumption rates, inventory asset value, and reorder warnings.',
    },
    {
      id: 'financial',
      label: 'Financial Report',
      icon: DollarSign,
      tag: 'Cashflow Journal',
      description: 'Comprehensive financial cashflow ledger documenting bulk milk proceeds, livestock sales receipts, feed expenditures, veterinary consumables, wages, and operating profit.',
    },
    {
      id: 'mortality',
      label: 'Mortality Report',
      icon: Skull,
      tag: 'Necropsy Audit',
      description: 'Necropsy casebook documenting herd mortality cases, clinical cause of death, necropsy findings, attending veterinarian certifications, and capital financial loss accounting.',
    },
    {
      id: 'calf',
      label: 'Calf Report',
      icon: Baby,
      tag: 'Youngstock',
      description: 'Neonatal and weaned calf registry tracking dam and sire pedigree, birth date, birth weights, colostrum feeding protocol compliance (>4L within 2 hours), and calf hutch pens.',
    },
    {
      id: 'pregnancy',
      label: 'Pregnancy Report',
      icon: Sparkles,
      tag: 'Gestation & Maternity',
      description: 'Gestation registry for confirmed pregnant cows (PD+), days in calf, expected calving date countdown, and timely alerts for maternity pen transfer and dry-off protocols.',
    },
  ];

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [
        animRes,
        milkRes,
        finRes,
        breedRes,
        treatRes,
        feedRes,
        expRes,
        incRes,
        dashRes,
      ] = await Promise.all([
        animalService.list(),
        reportService.getMilkReport(farmId, { from: dateRange.from, to: dateRange.to }),
        reportService.getFinancialReport(farmId, dateRange.from, dateRange.to),
        breedingService.list(farmId),
        healthService.listTreatments(farmId),
        feedService.listFeedItems(farmId),
        financeService.listExpenses(farmId),
        financeService.listIncomes(farmId),
        dashboardService.getSummary(farmId),
      ]);

      if (animRes?.data) setAnimals(animRes.data);
      if (milkRes?.data) setMilkReport(milkRes.data);
      if (finRes?.data) setFinancialReport(finRes.data);
      if (breedRes?.data) setBreedingRecords(breedRes.data);
      if (treatRes?.data) setTreatments(treatRes.data);
      if (feedRes?.data) setFeedItems(feedRes.data);
      if (expRes?.data) setExpenses(expRes.data);
      if (incRes?.data) setIncomes(incRes.data);
      if (dashRes?.data) setDashboardSummary(dashRes.data);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: PresetKey) => {
    setActivePreset(preset);
    const end = new Date();
    const start = new Date(end);
    let newRange = { from: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`, to: end.toISOString().slice(0, 10) };

    if (preset === 'today') {
      newRange = { from: newRange.to, to: newRange.to };
    } else if (preset === '7days') {
      start.setDate(end.getDate() - 6);
      newRange = { from: start.toISOString().slice(0, 10), to: newRange.to };
    } else if (preset === 'month') {
      newRange = { from: newRange.from, to: newRange.to };
    } else if (preset === 'year') {
      newRange = { from: `${end.getFullYear()}-01-01`, to: `${end.getFullYear()}-12-31` };
    }

    setDateRange(newRange);
    const label =
      preset === 'today'
        ? `Today (${newRange.to})`
        : preset === '7days'
        ? `Past 7 Days (${newRange.from} - ${newRange.to})`
        : preset === 'month'
        ? `This Month (${newRange.from} - ${newRange.to})`
        : `This Year (${newRange.from} - ${newRange.to})`;
    showToast(`Loaded ${label} data`);
  };

  const handleOpenReport = (reportId: string) => {
    setSelectedReport(reportId);
    setSearchQuery('');
  };

  const handleExport = async (format: 'PDF' | 'Excel' | 'CSV' | 'WordPress') => {
    setExportMenuOpen(false);
    const repId = selectedReport || 'daily';

    const reportData = {
        animals,
        milkReport,
        financialReport,
        breedingRecords,
        treatments,
        feedItems,
        expenses,
        incomes,
        mortalities,
        calvings,
      };

    if (format === 'PDF') {
      const { exportReportToPdf } = await import('./reports/ReportExporter');
      exportReportToPdf(repId, dateRange.from, dateRange.to, reportData);
      showToast(`Downloaded ${repId.toUpperCase()} Report PDF document.`);
      return;
    }

    if (format === 'WordPress') {
      if (repId === 'milk' && milkReport) {
        const { downloadMilkSummaryReportWordPress } = await import('../utils/milkReportExport');
        downloadMilkSummaryReportWordPress(milkReport, dateRange);
        showToast(`Downloaded WordPress WXR export for Milk Report.`);
      } else {
        const { exportReportToCsv } = await import('./reports/ReportExporter');
        exportReportToCsv(repId, dateRange.from, dateRange.to, reportData);
        showToast(`Exported ${repId.toUpperCase()} data file.`);
      }
      return;
    }

    if (format === 'CSV' || format === 'Excel') {
      const { exportReportToCsv } = await import('./reports/ReportExporter');
      exportReportToCsv(repId, dateRange.from, dateRange.to, reportData);
      showToast(`Downloaded ${repId.toUpperCase()} Report CSV.`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeReportObj =
    reportTypes.find((r) => r.id === selectedReport) || reportTypes[0];

  // Attached segmented button group: Today | 7 Days | This Month | This Year
  const renderAttachedPresetButtons = () => (
    <div className="inline-flex flex-wrap items-center rounded-lg border border-emerald-300 bg-white p-0.5 shadow-2xs">
      <button
        type="button"
        onClick={() => handleApplyPreset('today')}
        className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-md transition-all font-bold cursor-pointer ${
          activePreset === 'today'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-emerald-800 hover:bg-emerald-50'
        }`}
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => handleApplyPreset('7days')}
        className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-md transition-all font-bold cursor-pointer ${
          activePreset === '7days'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-emerald-800 hover:bg-emerald-50'
        }`}
      >
        7 Days
      </button>
      <button
        type="button"
        onClick={() => handleApplyPreset('month')}
        className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-md transition-all font-bold cursor-pointer ${
          activePreset === 'month'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-emerald-800 hover:bg-emerald-50'
        }`}
      >
        This Month
      </button>
      <button
        type="button"
        onClick={() => handleApplyPreset('year')}
        className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-md transition-all font-bold cursor-pointer ${
          activePreset === 'year'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-emerald-800 hover:bg-emerald-50'
        }`}
      >
        This Year
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toast Notification in clean Emerald & White */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-emerald-700 animate-in fade-in flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card: 12-Report Tabs Selector + Search + Presets + Print & Export */}
      <div className="bg-white rounded-xl border border-emerald-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Row 1: All 12 Reports Switcher (Responsive scrollable tabs on tablet/desktop, clean dropdown on mobile) */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-100 flex-wrap">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              Reports
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              12
            </span>
          </div>

          {/* Mobile Select dropdown (< lg screens) */}
          <div className="lg:hidden flex-1 max-w-[220px]">
            <select
              value={selectedReport}
              onChange={(e) => handleOpenReport(e.target.value)}
              className="w-full bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
            >
              {reportTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop/Tablet Horizontal Tabs (>= lg screens) */}
          <div className="hidden lg:flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-thin flex-1 justify-start">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => handleOpenReport(report.id)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs border border-emerald-700'
                      : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                  title={report.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-700'}`} />
                  <span>{report.label.replace(' Report', '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Search Input + Presets (Today | 7 Days | This Month | This Year) + Print & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search within active report */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeReportObj.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-emerald-50/40 border border-emerald-200 rounded-lg text-xs text-emerald-950 placeholder-emerald-700/60 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
            />
          </div>

          {/* Attached Preset Buttons: Today | 7 Days | This Month | This Year */}
          <div className="flex items-center">
            {renderAttachedPresetButtons()}
          </div>

          {/* Action Buttons: Print & Export */}
          <div className="flex items-center space-x-2">
            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 shadow-2xs transition min-h-[34px] cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Print</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="inline-flex items-center justify-between space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition min-h-[34px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-emerald-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-3.5 py-1 border-b border-emerald-100 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Export ({dateRange.from} to {dateRange.to})
                  </div>
                  <button
                    onClick={() => handleExport('PDF')}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center space-x-2 text-emerald-950 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export as PDF Document</span>
                  </button>
                  <button
                    onClick={() => handleExport('CSV')}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center space-x-2 text-emerald-950 font-medium"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Export CSV / Excel Sheet</span>
                  </button>
                  <button
                    onClick={() => handleExport('WordPress')}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center space-x-2 text-emerald-950 font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export for WordPress (WXR)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render selected report content via ReportTables (with live calculated data) */}
      <ReportTables
        selectedReport={selectedReport}
        activePreset={activePreset}
        dateRange={dateRange}
        searchTerm={searchQuery}
        animals={animals}
        milkReport={milkReport}
        financialReport={financialReport}
        breedingRecords={breedingRecords}
        treatments={treatments}
        feedItems={feedItems}
        expenses={expenses}
        incomes={incomes}
        mortalities={mortalities}
        calvings={calvings}
        dashboardSummary={dashboardSummary}
      />
    </div>
  );
};
