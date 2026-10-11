import React, { useState } from 'react';
import {
  LayoutDashboard,
  Tag,
  Droplets,
  Heart,
  Stethoscope,
  Wheat,
  DollarSign,
  BarChart3,
  Package,
  CheckSquare,
  Bell,
  Settings,
  Building2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { mockConfig, mockStorage } from '../../services';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onDataRefresh: () => void;
}

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'validation', label: 'Audit & Validation', icon: ShieldAlert },
  { id: 'animals', label: 'Cattle & Herd', icon: Tag },
  { id: 'milk', label: 'Daily Milk', icon: Droplets },
  { id: 'breeding', label: 'Breeding & AI', icon: Heart },
  { id: 'health', label: 'Health & Vet', icon: Stethoscope },
  { id: 'feed', label: 'Feed & Rations', icon: Wheat },
  { id: 'inventory', label: 'Inventory & Stock', icon: Package },
  { id: 'finance', label: 'Finance & Ledger', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'tasks', label: 'Tasks & Schedule', icon: CheckSquare },
  { id: 'alerts', label: 'Alerts & Notices', icon: Bell },
  { id: 'settings', label: 'Farm Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, onDataRefresh }) => {
  const [latency, setLatency] = useState(mockConfig.latencyMs);
  const [showSettings, setShowSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleLatencyChange = (val: number) => {
    setLatency(val);
    mockConfig.latencyMs = val;
  };

  const handleResetDb = () => {
    if (window.confirm('Reset all mock data to initial seed state? Any added animals, milk records, or transactions will be reset.')) {
      setIsResetting(true);
      mockStorage.reset();
      setTimeout(() => {
        setIsResetting(false);
        onDataRefresh();
      }, 300);
    }
  };

  return (
    <aside
      id="desktop-sidebar"
      className="hidden lg:flex lg:flex-col w-64 xl:w-72 bg-emerald-950 text-white border-r border-emerald-800/70 shrink-0 sticky top-0 h-screen overflow-y-auto select-none"
      aria-label="Main Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-emerald-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center font-bold text-xl shadow-inner border border-emerald-600 shrink-0">
            🐄
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-white truncate">Punjab Pure Dairy</h1>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-300 mt-0.5">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Farm 1, Pattoki</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-emerald-900/80 border border-emerald-800 text-[11px] text-emerald-200">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Herd Operations Active
          </span>
          <span className="text-[10px] text-emerald-300">Phase 1</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary Navigation">
        <div className="px-3 pb-2 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
          Operations Modules
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                  : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white scale-105' : 'text-emerald-300 group-hover:text-white'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'validation' && (
                <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                  9
                </span>
              )}
              {isActive && item.id !== 'validation' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Developer & Latency Controls */}
      <div className="p-4 border-t border-emerald-800/80 bg-emerald-950/90 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-300 hover:text-white transition"
            title="Configure REST Latency Simulation"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sim Latency: {latency}ms</span>
          </button>

          <button
            onClick={handleResetDb}
            disabled={isResetting}
            className="flex items-center space-x-1 px-2 py-1 text-[10px] font-semibold bg-emerald-900 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded border border-emerald-700 transition"
            title="Reset database to seed records"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin text-white' : ''}`} />
            <span>Reset DB</span>
          </button>
        </div>

        {showSettings && (
          <div className="p-3 bg-emerald-900/90 rounded-lg border border-emerald-700 text-emerald-100 text-[11px] space-y-2">
            <div className="font-semibold text-white">Simulated REST Delay</div><input
              type="range"
              min="0"
              max="600"
              step="50"
              value={latency}
              onChange={(e) => handleLatencyChange(Number(e.target.value))}
              className="w-full h-1.5 bg-emerald-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-emerald-300">
              <span>0ms</span>
              <span>300ms</span>
              <span>600ms</span>
            </div>
          </div>
        )}

        {/* Manager Dossier */}
        <div className="pt-2 border-t border-emerald-900 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold border border-emerald-600 text-emerald-200 shrink-0">
            IQ
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-xs truncate">Dr. Imran Qureshi</div>
            <div className="text-[10px] text-emerald-300 truncate">Lead Veterinarian</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
