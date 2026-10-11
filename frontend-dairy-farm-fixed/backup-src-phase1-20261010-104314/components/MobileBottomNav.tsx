import React from 'react';
import {
  LayoutDashboard,
  Tag,
  Droplets,
  Bell,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenDrawer,
}) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'animals', label: 'Animals', icon: Tag },
    { id: 'milk', label: 'Milk', icon: Droplets },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition min-h-[48px] min-w-[56px] relative ${
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
            )}
            {item.id === 'alerts' && (
              <span className="absolute top-1.5 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
        );
      })}

      {/* More Button to trigger Drawer */}
      <button
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-900 font-medium transition min-h-[48px] min-w-[56px]"
      >
        <Menu className="w-5 h-5 stroke-2" />
        <span className="text-[10px] mt-0.5 tracking-tight">More</span>
      </button>
    </nav>
  );
};
