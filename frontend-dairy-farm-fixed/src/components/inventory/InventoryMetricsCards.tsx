import React from 'react';
import {
  Warehouse as WarehouseIcon,
  Wheat,
  Stethoscope,
  ShieldAlert,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface MetricsProps {
  metrics: {
    totalWarehouses: number | null;
    totalFeedStock: number;
    totalMedicines: number | null;
    totalVaccines: number | null;
    totalSemenStraws: number | null;
    inventoryValue: number | null;
    expiringMedicines: number | null;
    lowStockItems: number;
  };
  onFilterClick?: (filterType: string) => void;
}

export const InventoryMetricsCards: React.FC<MetricsProps> = ({ metrics, onFilterClick }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Warehouses */}
      <div
        onClick={() => onFilterClick && onFilterClick('warehouses')}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Warehouses</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <WarehouseIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
          {metrics.totalWarehouses === null ? '—' : metrics.totalWarehouses}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Silos, Sheds, Pharmacy & Cryo
        </div>
      </div>

      {/* 2. Total Feed Stock */}
      <div
        onClick={() => onFilterClick && onFilterClick('feed')}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Feed Stock</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Wheat className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
          {metrics.totalFeedStock.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">kg</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {metrics.totalFeedStock === 0 ? 'No feed stock reported' : `${(metrics.totalFeedStock / 1000).toFixed(1)} metric tons on hand`}
        </div>
      </div>

      {/* 3. Total Medicines */}
      <div
        onClick={() => onFilterClick && onFilterClick('medicines')}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Medicines</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
          {metrics.totalMedicines === null ? '—' : metrics.totalMedicines.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Vials, bottles & boluses</div>
      </div>

      {/* 4. Total Vaccines */}
      <div
        onClick={() => onFilterClick && onFilterClick('vaccines')}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Total Vaccines</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
          {metrics.totalVaccines === null ? '—' : metrics.totalVaccines.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">doses</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Cold chain protected (2-8°C)</div>
      </div>

      {/* 5. Total Semen Straws */}
      <div
        onClick={() => onFilterClick && onFilterClick('semen')}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Semen Straws</span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
          {metrics.totalSemenStraws === null ? '—' : metrics.totalSemenStraws.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">straws</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Liquid nitrogen bank active</div>
      </div>

      {/* 6. Inventory Value */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Inventory Value</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono truncate">
          {metrics.inventoryValue === null ? '—' : `Rs ${metrics.inventoryValue.toLocaleString()}`}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          {metrics.inventoryValue === null ? 'Not provided by backend' : 'Total combined asset valuation'}
        </div>
      </div>

      {/* 7. Expiring Medicines */}
      <div
        onClick={() => onFilterClick && onFilterClick('expiring')}
        className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer ${
          metrics.expiringMedicines !== null && metrics.expiringMedicines > 0
            ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wider ${metrics.expiringMedicines !== null && metrics.expiringMedicines > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            Expiring Items
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metrics.expiringMedicines !== null && metrics.expiringMedicines > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold font-mono ${metrics.expiringMedicines > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
          {metrics.expiringMedicines === null ? '—' : metrics.expiringMedicines}
        </div>
        <div className={`text-[11px] mt-1 ${metrics.expiringMedicines > 0 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
          {metrics.expiringMedicines === null ? 'Not provided by backend' : metrics.expiringMedicines > 0 ? 'Within 60 days / Action required' : 'No expiring items reported'}
        </div>
      </div>

      {/* 8. Low Stock Items */}
      <div
        onClick={() => onFilterClick && onFilterClick('low-stock')}
        className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer ${
          metrics.lowStockItems > 0
            ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wider ${metrics.lowStockItems > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
            Low Stock Alerts
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metrics.lowStockItems > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold font-mono ${metrics.lowStockItems > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
          {metrics.lowStockItems}
        </div>
        <div className={`text-[11px] mt-1 ${metrics.lowStockItems > 0 ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
          {metrics.lowStockItems > 0 ? 'Below buffer / Reorder threshold' : 'All inventory levels optimal'}
        </div>
      </div>
    </div>
  );
};
