export type PresetKey = 'today' | '7days' | '30days' | 'month' | 'year' | 'custom';

type DailyActivity = {
  time: string;
  date: string;
  module: string;
  description: string;
  metrics: string;
  staff: string;
  financialImpact: string;
  status: string;
};

type WeeklyRow = {
  date: string;
  day: string;
  milk: number;
  avgCow: string;
  feedKg: number;
  healthEvents: string;
  rev: number;
  exp: number;
  net: number;
};

type MonthlyRow = {
  period: string;
  milk: number;
  avgDaily: number;
  feed: number;
  feedExp: number;
  otherExp: number;
  totalExp: number;
  labor: number;
  total: number;
  revenue: number;
  profit: number;
  margin: string;
};

type MilkReportViewData = {
  kpi: {
    totalMilk: string;
    subtext: string;
    dailyAvg: string;
    avgFat: string;
    avgSnf: string;
    totalRevenue: string;
  };
  sessions?: Array<{ label: string; cows: number; liters: number; avgPerCow: string; fat: string; snf: string; revenue: number; status: string }>;
  cows?: Array<{ id: string; tag: string; name: string; liters: number; morning: number; evening: number; total: number; avgPerCow: string; fat: string; snf: string; rev: number; status: string }>;
  days?: Array<{ date: string; morning: number; evening: number; total: number; avgCow: string; fat: number | null; snf: number | null; rev: number | null }>;
};

const unavailableMilkData = (): MilkReportViewData => ({
  kpi: {
    totalMilk: '—',
    subtext: 'No report rows available',
    dailyAvg: '—',
    avgFat: '—',
    avgSnf: '—',
    totalRevenue: '—',
  },
});

// Report rows must come from report API responses. There is no supported
// backend activity ledger for these synthetic daily/weekly/monthly rows.
export const getDailyReportActivities = (_date?: string, _preset: PresetKey = 'today'): DailyActivity[] => [];

export const getWeeklyDayRows = (
  _endDate?: string,
  _totalMilk?: number,
  _preset: PresetKey = '7days'
): WeeklyRow[] => [];

export const getMonthlyWeekRows = (
  _totalMilk?: number,
  _revenue?: number,
  _cost?: number,
  _preset: PresetKey = 'month'
): MonthlyRow[] => [];

export const getMilkReportDataForPreset = (_preset: PresetKey = 'month'): MilkReportViewData =>
  unavailableMilkData();
