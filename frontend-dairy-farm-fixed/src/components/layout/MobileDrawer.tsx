import React, { useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { navigationItems } from './Sidebar';
import { mockConfig, mockStorage } from '../../services';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onDataRefresh: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
  onDataRefresh,
}) => {
  const [latency, setLatency] = React.useState(mockConfig.latencyMs);
  const [showSettings, setShowSettings] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        onClose();
      }, 300);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <div
        ref={drawerRef}
        className="relative w-72 sm:w-80 max-w-[85vw] bg-emerald-950 text-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-250"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center font-bold text-xl shadow-inner border border-emerald-600 shrink-0">
              🐄
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">Punjab Pure Dairy</h2>
              <div className="flex items-center space-x-1 text-[11px] text-emerald-300">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">Farm 1, Pattoki</span>
              </div>
            </div>
          </div>

          <button
            id="mobile-drawer-close-btn"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 transition"
            aria-label="Close navigation menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1" aria-label="Mobile Navigation Links">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            Menu Navigation
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all text-left min-h-[44px] ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-emerald-100/90 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-300'}`} />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-xs"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Developer controls and Manager profile */}
        <div className="p-4 border-t border-emerald-800/80 bg-emerald-950/90 text-xs space-y-3 mt-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-1.5 text-xs font-medium text-emerald-300 hover:text-white py-1 transition min-h-[44px]"
            >
              <Sliders className="w-4 h-4" />
              <span>Sim Latency: {latency}ms</span>
            </button>

            <button
              onClick={handleResetDb}
              disabled={isResetting}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-900 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded-lg border border-emerald-700 transition min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-white' : ''}`} />
              <span>Reset DB</span>
            </button>
          </div>

          {showSettings && (
            <div className="p-3 bg-emerald-900/90 rounded-lg border border-emerald-700 text-emerald-100 text-xs space-y-2">
              <div className="font-semibold text-white">Simulated REST Delay</div>
              <input
                type="range"
                min="0"
                max="600"
                step="50"
                value={latency}
                onChange={(e) => handleLatencyChange(Number(e.target.value))}
                className="w-full h-2 bg-emerald-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[11px] text-emerald-300">
                <span>0ms</span>
                <span>300ms</span>
                <span>600ms</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-900 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold border border-emerald-600 text-emerald-200 shrink-0">
              IQ
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-xs truncate">Dr. Imran Qureshi</div>
              <div className="text-[11px] text-emerald-300 truncate">Lead Veterinarian</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
