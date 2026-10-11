import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Filter,
  ChevronRight,
  Droplets,
  Heart,
  Stethoscope,
  Wheat,
  Clock,
  Check,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { alertService } from '../services';
import { Notification } from '../types';

interface AlertsViewProps {
  onSelectAnimal?: (animalId: string) => void;
  onNavigate?: (tab: string) => void;
}

interface AlertItem {
  id: string;
  title: string;
  date: string;
  category: 'reproduction' | 'health' | 'feed' | 'tasks';
  severity: 'urgent' | 'high' | 'medium';
  animalId?: string;
  animalName?: string;
  description: string;
  badgeText: string;
  targetTab: string;
  isRead?: boolean;
  snoozedUntil?: string | null;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onSelectAnimal, onNavigate }) => {
  // Tabs grouped per Section 14: Reproduction, Health, Feed, Tasks
  const [activeTab, setActiveTab] = useState<'all' | 'reproduction' | 'health' | 'feed' | 'tasks'>('all');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const initialAlerts: AlertItem[] = [
    {
      id: 'alert-005',
      title: 'Medicine Withdrawal Active (DO NOT MILK INTO BULK TANK)',
      date: '14 May 2024',
      category: 'health',
      severity: 'urgent',
      animalId: 'HF-027',
      animalName: 'Bella',
      description: 'Intramast-DC antibiotic withdrawal in effect. Milk must NOT enter bulk tank until 21 May. Strict dump required.',
      badgeText: 'Health / Withdrawal',
      targetTab: 'health',
      isRead: false,
    },
    {
      id: 'alert-001',
      title: 'Pregnancy Diagnosis (PD) Due',
      date: '14 May 2024',
      category: 'reproduction',
      severity: 'high',
      animalId: 'HF-027',
      animalName: 'Bella',
      description: 'Artificial insemination performed 35 days ago. Ultrasound verification due today.',
      badgeText: 'Reproduction',
      targetTab: 'breeding',
      isRead: false,
    },
    {
      id: 'alert-003',
      title: 'Calving Due in 10 Days',
      date: '24 May 2024',
      category: 'reproduction',
      severity: 'high',
      animalId: 'HF-031',
      animalName: 'Daisy',
      description: 'Expected calving date approaching. Transfer cow to maternity box for continuous monitoring.',
      badgeText: 'Reproduction',
      targetTab: 'breeding',
      isRead: false,
    },
    {
      id: 'alert-007',
      title: 'Dry-off Protocol Due',
      date: '18 May 2024',
      category: 'reproduction',
      severity: 'medium',
      animalId: 'HF-014',
      animalName: 'Molly',
      description: 'Cow is 220 days pregnant (60 days prior to expected calving). Cease milking and infuse dry cow tube.',
      badgeText: 'Reproduction',
      targetTab: 'breeding',
      isRead: false,
    },
    {
      id: 'alert-002',
      title: 'FMD Vaccination Booster Due in 7 Days',
      date: '21 May 2024',
      category: 'health',
      severity: 'medium',
      animalId: 'Shed 1',
      animalName: 'All Lactating Milkers',
      description: 'Scheduled Foot and Mouth Disease (FMD) annual booster for lactating herd.',
      badgeText: 'Health',
      targetTab: 'health',
      isRead: false,
    },
    {
      id: 'alert-006',
      title: 'Feed Inventory Below Reorder Point',
      date: '14 May 2024',
      category: 'feed',
      severity: 'high',
      animalId: 'Feed Silo 2',
      animalName: 'Wanda Concentrates',
      description: 'Supreme Dairy Wanda is down to 450 kg (Safety stock reorder threshold is 800 kg). Dispatch purchase PO.',
      badgeText: 'Feed / Stock',
      targetTab: 'feed',
      isRead: false,
    },
    {
      id: 'alert-008',
      title: 'Feed Premix Batch Approaching Expiry',
      date: '14 May 2024',
      category: 'feed',
      severity: 'medium',
      animalId: 'Mineral Bay',
      animalName: 'Chelated Mineral Mix',
      description: 'Lot #MM-2024-02 reaches 30-day expiry limit on 30 May. Prioritize in next TMR mix.',
      badgeText: 'Feed',
      targetTab: 'feed',
      isRead: false,
    },
    {
      id: 'alert-009',
      title: 'Task Overdue: Calving Pen Disinfection',
      date: '13 May 2024',
      category: 'tasks',
      severity: 'high',
      animalId: 'Pen M-01',
      animalName: 'Maternity Wing',
      description: 'Assigned to Muhammad Akram. Deep steam clean and lime sanitization required before next calving.',
      badgeText: 'Tasks',
      targetTab: 'tasks',
      isRead: false,
    },
  ];

  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);

  const handleMarkAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: !a.isRead } : a))
    );
    showToast('Alert status updated');
  };

  const handleSnooze = (id: string, days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const dateStr = until.toISOString().split('T')[0];

    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, snoozedUntil: dateStr } : a))
    );
    showToast(`Alert snoozed for ${days} day${days > 1 ? 's' : ''} (until ${dateStr})`);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'all') return true;
    return a.category === activeTab;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const criticalWithdrawal = alerts.find((a) => a.severity === 'urgent' && !a.isRead);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Critical Banner (Section 14: withdrawal active banner do not milk into bulk tank) */}
      {criticalWithdrawal && (
        <div className="bg-rose-600 text-white p-4 rounded-xl shadow-lg border-2 border-rose-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-rose-700/80 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-rose-100">
                Critical Food Safety Hold &bull; Withdrawal Active
              </div>
              <div className="font-bold text-sm sm:text-base text-white">
                {criticalWithdrawal.title} — {criticalWithdrawal.animalId}
              </div>
              <p className="text-xs text-rose-100 mt-0.5 max-w-2xl">{criticalWithdrawal.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {onNavigate && (
              <button
                onClick={() => onNavigate('health')}
                className="px-3.5 py-2 bg-white text-rose-800 font-bold rounded-lg text-xs hover:bg-rose-50 transition shadow-xs"
              >
                Open Health &amp; Drug Log
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <span>Farm Notifications &amp; Clinical Alerts Center</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lifecycle triggers &bull; Food safety withdrawal holds &bull; Reproduction heat &amp; PD due &bull; Feed reorder alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
              showToast('All alerts marked as read');
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Mark All Read
          </button>
          <span className="text-xs font-semibold px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
            {unreadCount} Unresolved
          </span>
        </div>
      </div>

      {/* Grouped Tabs per Section 14: Reproduction, Health, Feed, Tasks */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex space-x-1.5 overflow-x-auto scrollbar-none">
        {[
          { key: 'all', label: `All Alerts (${alerts.length})` },
          {
            key: 'reproduction',
            label: `Reproduction (${alerts.filter((a) => a.category === 'reproduction').length})`,
          },
          {
            key: 'health',
            label: `Health & Drug (${alerts.filter((a) => a.category === 'health').length})`,
          },
          {
            key: 'feed',
            label: `Feed & Stock (${alerts.filter((a) => a.category === 'feed').length})`,
          },
          {
            key: 'tasks',
            label: `Tasks (${alerts.filter((a) => a.category === 'tasks').length})`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
              activeTab === t.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts List with Section 14 Actions: Mark as Read, Snooze (1 day / 3 days), Go to animal / record */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No active alerts in this category.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isUrgent = alert.severity === 'urgent';
            const isHigh = alert.severity === 'high';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                  alert.isRead
                    ? 'border-slate-200 bg-slate-50/50 opacity-70'
                    : isUrgent
                    ? 'border-rose-300 bg-rose-50/30'
                    : isHigh
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUrgent
                        ? 'bg-rose-100 text-rose-700'
                        : isHigh
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {isUrgent ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : isHigh ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-xs sm:text-sm font-bold leading-tight ${
                          alert.isRead ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {alert.title}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alert.category === 'health'
                            ? 'bg-rose-100 text-rose-800'
                            : alert.category === 'reproduction'
                            ? 'bg-emerald-100 text-emerald-800'
                            : alert.category === 'feed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {alert.badgeText}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">&bull; {alert.date}</span>

                      {alert.snoozedUntil && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Snoozed until {alert.snoozedUntil}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>

                    {alert.animalId && (
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 pt-0.5">
                        <span>Target:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {alert.animalId} {alert.animalName ? `(${alert.animalName})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 14 Actions on Alert: Mark as read, Snooze (1 day / 3 days), Go to animal / record */}
                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end flex-wrap">
                  {/* Mark as read toggle */}
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition min-h-[36px]"
                  >
                    {alert.isRead ? 'Reopen' : 'Mark Read'}
                  </button>

                  {/* Snooze (1 day / 3 days) */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => handleSnooze(alert.id, 1)}
                      className="px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition min-h-[36px]"
                      title="Snooze for 1 day"
                    >
                      Snooze 1d
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    <button
                      onClick={() => handleSnooze(alert.id, 3)}
                      className="px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition min-h-[36px]"
                      title="Snooze for 3 days"
                    >
                      3d
                    </button>
                  </div>

                  {/* Go to animal (if animal tagged) */}
                  {onSelectAnimal && alert.animalId && alert.animalId.startsWith('HF-') && (
                    <button
                      onClick={() => onSelectAnimal(alert.animalId!)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition min-h-[36px]"
                    >
                      View Cow
                    </button>
                  )}

                  {/* Go to record / tab */}
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate(alert.targetTab)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition shadow-2xs flex items-center space-x-1 min-h-[36px]"
                    >
                      <span>Go to Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
