import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
} from 'lucide-react';
import { ReturnButton } from './ReturnButton';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onDataRefresh: () => void;
  onOpenMobileMenu?: () => void;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Operations Dashboard',
    subtitle: 'Daily milk yield, breeding alerts, feed stock, and financial summary',
  },
  validation: {
    title: 'Audit & SaaS Validation System',
    subtitle: 'Transparent mathematical calculations, anomaly detection, regulatory compliance, and test suite',
  },
  animals: {
    title: 'Cattle & Herd Registry',
    subtitle: 'Individual identification, lineage, lactation stage, and RFID tags',
  },
  milk: {
    title: 'Milk Production & Quality',
    subtitle: 'Shift-wise logging (Morning/Noon/Evening), Fat/SNF testing, and bulk tank batches',
  },
  breeding: {
    title: 'Breeding, AI & Calving',
    subtitle: 'Heat tracking, artificial insemination, pregnancy diagnosis, and newborn calves',
  },
  health: {
    title: 'Herd Health & Veterinary',
    subtitle: 'Active treatments, antibiotic milk withholding periods, and pharmacy inventory',
  },
  feed: {
    title: 'Feed Management & Rations',
    subtitle: 'Silage/TMR inventory, crude protein formulations, and daily consumption',
  },
  finance: {
    title: 'Financial Ledger & Billing',
    subtitle: 'Milk buyer revenue, supplier payables, operating costs, and margins',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Comprehensive farm analytics, operational audits, and exportable registries',
  },
  inventory: {
    title: 'Supplies & Warehouse Stock',
    subtitle: 'Feed silos, liquid nitrogen semen straws, and veterinary pharmacy balances',
  },
  tasks: {
    title: 'Farm Tasks & Herd Schedules',
    subtitle: 'Daily protocol calendar: vaccinations, AI schedules, pregnancy checks, and dry-off dates',
  },
  alerts: {
    title: 'Alerts & Critical Notices',
    subtitle: 'Health holds, low feed warnings, breeding cycles, and temperature alerts',
  },
  settings: {
    title: 'Farm Settings & Configuration',
    subtitle: 'Farm profile • Cattle breeds & categories • Ration templates • Users & roles • System preferences',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onDataRefresh,
  onOpenMobileMenu,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const currentMeta = tabTitles[currentTab] || {
    title: 'Dairy Farm Management',
    subtitle: 'Herd operations and commercial milk management',
  };

  return (
    <header
      id="app-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs"
    >
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Left: Global Return Button, Mobile hamburger menu & Branding or Desktop Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Global Return Button prominently in the top-left */}
            <ReturnButton variant="header" className="shrink-0" hideIfAtRoot />

            {/* Hamburger button visible only on mobile/tablet */}
            <button
              id="header-mobile-menu-btn"
              onClick={onOpenMobileMenu}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 shrink-0"
              aria-label="Open navigation menu"
              aria-expanded="false"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile / Tablet Logo & Name */}
            <div className="flex items-center space-x-2 lg:hidden min-w-0">
              <span className="text-xl shrink-0" aria-hidden="true">🐄</span>
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 block truncate leading-tight">
                  Punjab Pure Dairy
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {currentMeta.title}
                </span>
              </div>
            </div>

            {/* Desktop View Header Title */}
            <div className="hidden lg:block min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate tracking-tight">
                {currentMeta.title}
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-xl">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Farm Status Badge (Desktop only) */}
            <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Morning Shift Verified</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                id="header-notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="View system notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 sm:p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Farm Alerts & Notice Board</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                      2 Urgent
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    <div className="py-2.5">
                      <span className="font-bold text-rose-700 block">Milk Withholding Active</span>
                      <span className="text-slate-600 text-[11px] block mt-0.5">
                        HF-012 (Mastitis Penicillin-G) hold until 18 May. Milk must NOT enter bulk tank.
                      </span>
                    </div>
                    <div className="py-2.5">
                      <span className="font-bold text-amber-700 block">Calving Due Soon</span>
                      <span className="text-slate-600 text-[11px] block mt-0.5">
                        HF-063 expected in 10 days. Move to maternity pen.
                      </span>
                    </div>
                    <div className="py-2.5">
                      <span className="font-bold text-emerald-700 block">Morning Shift Complete</span>
                      <span className="text-slate-600 text-[11px] block mt-0.5">
                        398.5 Liters logged at avg 3.92% Fat.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div
                className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                title="Dr. Imran Qureshi (Lead Veterinarian)"
              >
                IQ
              </div>
              <div className="hidden xl:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">Dr. Imran</span>
                <span className="text-[10px] text-slate-400 block">Farm Manager</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
