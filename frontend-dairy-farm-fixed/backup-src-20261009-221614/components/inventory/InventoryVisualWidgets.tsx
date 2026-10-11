import React from 'react';
import { Warehouse, SemenStraw, FeedItem } from '../../types';
import {
  Warehouse as WarehouseIcon,
  Wheat,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Layers,
} from 'lucide-react';
import { inventoryCalculationService } from '../../services';

interface VisualWidgetsProps {
  warehouses: Warehouse[];
  feedItems: FeedItem[];
  semenStraws: SemenStraw[];
  onSelectWarehouse?: (warehouseId: string) => void;
}

export const InventoryVisualWidgets: React.FC<VisualWidgetsProps> = ({
  warehouses,
  feedItems,
  semenStraws,
  onSelectWarehouse,
}) => {
  // Aggregate nitrogen tanks
  const tanks = [
    {
      id: 'Tank 1 (MVE-XC33)',
      name: 'Tank 1 (MVE-XC33)',
      capacity: '33 Liters Cryo Tank',
      level: 86,
      minLevel: 25,
      strawCount: semenStraws.filter((s) => s.tankNumber.includes('Tank 1')).reduce((sum, s) => sum + s.quantity, 0),
      status: 'Optimal',
    },
    {
      id: 'Tank 2 (Cryo-Pro 20L)',
      name: 'Tank 2 (Cryo-Pro 20L)',
      capacity: '20 Liters Field Tank',
      level: 21, // < 25% alert!
      minLevel: 25,
      strawCount: semenStraws.filter((s) => s.tankNumber.includes('Tank 2')).reduce((sum, s) => sum + s.quantity, 0),
      status: 'Alert',
    },
  ];

  // Top Silos / Feed bulk items
  const silageItem = feedItems.find((f) => f.category === 'Silage') || feedItems[0];
  const concentrateItem = feedItems.find((f) => f.category === 'Concentrate') || (feedItems.length > 1 ? feedItems[1] : feedItems[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Warehouse Capacity & Utilization Overview */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <WarehouseIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Warehouse Capacity & Utilization
              </h3>
              <p className="text-[11px] text-slate-500">Live storage occupancy across all facilities</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {warehouses.length} Active Hubs
          </span>
        </div>

        <div className="space-y-3">
          {warehouses.map((wh) => {
            const utilization = inventoryCalculationService.calculateWarehouseUtilization(
              wh.currentStock,
              wh.capacity
            );
            const isHigh = utilization >= 85;
            const isMedium = utilization >= 50;

            const barColor = isHigh
              ? 'bg-rose-500'
              : isMedium
              ? 'bg-amber-500'
              : 'bg-emerald-600';

            return (
              <div
                key={wh.id}
                onClick={() => onSelectWarehouse && onSelectWarehouse(wh.id)}
                className="group p-2.5 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-slate-50/50 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800 group-hover:text-emerald-800 transition">
                      {wh.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                      {wh.code}
                    </span>
                    {wh.temperatureControlled && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <Thermometer className="w-2.5 h-2.5" /> 2-8°C
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-slate-500">
                      {wh.currentStock.toLocaleString()} / {wh.capacity.toLocaleString()}{' '}
                      {wh.type === 'Silage Bunker' || wh.type === 'Dry Feed Shed' || wh.type === 'General Store' ? 'kg' : 'units'}
                    </span>
                    <span className={`font-bold ${isHigh ? 'text-rose-600' : isMedium ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Managed by {wh.manager}</span>
                  <span>{wh.totalItems} cataloged item SKUs</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Liquid Nitrogen Tanks & Silo Meter */}
      <div className="space-y-4">
        {/* Liquid Nitrogen Bank Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Liquid Nitrogen Level
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">-196°C Cryo</span>
          </div>

          <div className="space-y-3">
            {tanks.map((tank) => {
              const isAlert = tank.level < tank.minLevel;
              return (
                <div
                  key={tank.id}
                  className={`p-2.5 rounded-lg border transition ${
                    isAlert ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{tank.name}</span>
                    {isAlert ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> LN2 Alert ({tank.level}%)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Safe ({tank.level}%)
                      </span>
                    )}
                  </div>

                  {/* LN2 Tank Visual Gauge */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden my-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAlert ? 'bg-rose-500 animate-pulse' : 'bg-purple-600'
                      }`}
                      style={{ width: `${tank.level}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{tank.strawCount} straws preserved</span>
                    <span>Min Buffer: {tank.minLevel}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Silo Bunker Visual */}
        {silageItem && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Wheat className="w-3.5 h-3.5 text-emerald-700" />
                <span>Primary Silo Bunker (Maize)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                DM: {silageItem.dryMatterPercent || 32}%
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-16 bg-emerald-50 rounded-lg border border-emerald-200 relative overflow-hidden flex flex-col justify-end p-1 shrink-0">
                <div
                  className="bg-emerald-600 rounded-b w-full transition-all duration-500"
                  style={{ height: `${Math.min(100, ((silageItem.currentStockKg || 0) / 60000) * 100)}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 pointer-events-none">
                  {Math.round(((silageItem.currentStockKg || 0) / 60000) * 100)}%
                </div>
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-slate-900">{silageItem.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Stock: <strong className="text-slate-800">{(silageItem.currentStockKg || 0).toLocaleString()} kg</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Rate: Rs {silageItem.unitPrice} / kg • Val: Rs{' '}
                  {((silageItem.currentStockKg || 0) * (silageItem.unitPrice || 0)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
