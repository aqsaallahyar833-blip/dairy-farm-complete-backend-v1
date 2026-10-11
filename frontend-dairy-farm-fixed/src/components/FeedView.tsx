import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { localToday } from './health/HealthModals';
import { deriveFeedStock, FeedConsumptionApiDto } from '../services/api/apiClient';
import {
  Plus,
  AlertTriangle,
  X,
  LayoutGrid,
  List,
  Wheat,
  Scale,
  DollarSign,
  Package,
  Calendar,
  Warehouse,
  Check,
  TrendingDown,
  Info,
} from 'lucide-react';
import { feedService } from '../services';
import { FeedItem, Ration, FeedInventoryTransaction } from '../types';

interface DailyFeedingRecord {
  id: string;
  date: string;
  group: string;
  rationName: string;
  cowCount: number | null;
  quantityFedKg: number;
  refusalsKg: number | null;
  netConsumedKg: number;
  dryMatterPercent: number | null;
  dmiKgPerCow: number | null;
  costPkr: number | null;
  feederName: string;
}

export const FeedView: React.FC = () => {
  // Farm scope comes from the AUTHENTICATED identity, never hardcoded.
  const { farmId } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [rations, setRations] = useState<Ration[]>([]);
  const [transactions, setTransactions] = useState<FeedInventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile View Toggle: 'card' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Sub-tabs per Section 11: Feed Inventory, Rations / Diets, Daily Feeding Log
  const [activeTab, setActiveTab] = useState<'inventory' | 'rations' | 'feeding-log' | 'transactions'>('inventory');

  const [feedingLogs, setFeedingLogs] = useState<DailyFeedingRecord[]>([]);

  // Modal 1: Receive Feed Form (Section 11)
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    feedItemId: '',
    supplier: '',
    quantityKg: 0,
    unitPrice: 0,
    totalCost: 0,
    batch: '',
    expiryDate: '',
    storageLocation: '',
    date: localToday(),
  });

  // Modal 2: Daily Feeding Log Form (Section 11)
  const [showFeedingModal, setShowFeedingModal] = useState(false);
  const [feedingForm, setFeedingForm] = useState({
    date: localToday(),
    group: '',
    feedItemId: '',
    rationId: '',
    cowCount: 0,
    quantityFedKg: 0,
    refusalsKg: 0,
    dryMatterPercent: 0,
    feederName: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadFeedData();
  }, []);

  const loadFeedData = async () => {
    setLoading(true);
    try {
      const [fRes, rRes, tRes, cRes] = await Promise.all([
        feedService.listFeedItems(farmId),
        feedService.listRations(farmId),
        feedService.listTransactions(farmId),
        feedService.listConsumption(farmId),
      ]);
      // Only a SUCCESSFUL response replaces the collection, so an API failure
      // is never mistaken for "no records".
      if (fRes.success) setFeedItems(fRes.data || []); else setErrorMsg(fRes.message);
      if (rRes.success) setRations(rRes.data || []); else setErrorMsg(rRes.message);
      if (tRes.success) setTransactions(tRes.data || []); else setErrorMsg(tRes.message);
      if (Array.isArray(cRes.data)) {
        setFeedingLogs((cRes.data || []).map((row: FeedConsumptionApiDto) => ({
          id: String(row.feedConsumptionId),
          date: row.consumptionDate,
          group: row.groupId != null ? `Group ${row.groupId}` : 'Herd group not recorded',
          rationName: row.rationPlanId != null ? `Ration ${row.rationPlanId}` : 'Ration not recorded',
          cowCount: null,
          quantityFedKg: Number(row.quantity),
          refusalsKg: null,
          netConsumedKg: Number(row.quantity),
          dryMatterPercent: null,
          dmiKgPerCow: null,
          costPkr: null,
          feederName: 'Not recorded',
        })));
      }

      if (fRes.data.length > 0 && !receiveForm.feedItemId) {
        const first = fRes.data[0];
        setReceiveForm((prev) => ({
          ...prev,
          feedItemId: first.id,
          unitPrice: first.unitPrice,
          totalCost: prev.quantityKg * first.unitPrice,
          supplier: first.supplierName || '',
        }));
      }
      if (fRes.data.length > 0 && !feedingForm.feedItemId) {
        setFeedingForm((prev) => ({ ...prev, feedItemId: fRes.data[0].id }));
      }

      if (rRes.data.length > 0 && !feedingForm.rationId) {
        setFeedingForm((prev) => ({ ...prev, rationId: rRes.data[0].id }));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load feed data.');
    } finally {
      setLoading(false);
    }
  };

  // When receive item changes, update unit price and total cost
  const handleReceiveItemChange = (itemId: string) => {
    const item = feedItems.find((f) => f.id === itemId);
    if (item) {
      setReceiveForm((prev) => ({
        ...prev,
        feedItemId: itemId,
        unitPrice: item.unitPrice,
        totalCost: prev.quantityKg * item.unitPrice,
        supplier: item.supplierName || prev.supplier,
      }));
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const item = feedItems.find((f) => String(f.id) === String(receiveForm.feedItemId));
      const res = await feedService.recordTransaction(farmId, {
        feedItemId: receiveForm.feedItemId,
        feedItemName: item?.name || '',
        date: receiveForm.date,
        type: 'Purchase',
        quantityKg: Number(receiveForm.quantityKg),
        unitPrice: Number(receiveForm.unitPrice),
        totalCost: Number(receiveForm.totalCost),
        // Only `notes` is persisted. supplier/batch/storageLocation/expiryDate
        // have no columns on feed_transactions and are NOT claimed as saved.
        notes: receiveForm.notes || undefined,
      });
      if (!res.success) {
        setErrorMsg(res.message || 'Failed to record the feed transaction');
        return;
      }

      setShowReceiveModal(false);
      showToast(`Successfully received ${receiveForm.quantityKg}kg ${item?.name} into inventory`);
      loadFeedData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record feed intake');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!feedingForm.feedItemId || Number(feedingForm.quantityFedKg) <= 0) {
        setErrorMsg('Select a persisted feed item and enter a quantity greater than zero.');
        return;
      }
      const res = await feedService.recordConsumption(farmId, {
        feedItemId: feedingForm.feedItemId,
        consumptionDate: feedingForm.date,
        quantity: Number(feedingForm.quantityFedKg),
        rationPlanId: feedingForm.rationId || undefined,
        unit: 'KG',
        notes: feedingForm.feederName || undefined,
      });
      if (!res.success) {
        setErrorMsg(res.message || 'Failed to record feed consumption.');
        return;
      }
      setShowFeedingModal(false);
      showToast('Feed consumption recorded successfully.');
      await loadFeedData();
    } catch (err: any) {
      showToast('Error recording feeding log');
    } finally {
      setSubmitting(false);
    }
  };

  // Stock is DERIVED from the transaction ledger only.
  // `feed_items` has no stock column, and POST /api/feed-consumption does NOT
  // create a transaction or decrement anything, so consumption is excluded.
  // Consumption lives in a separate table and must not be merged into this.
  const stockByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const key = String(t.feedItemId);
      map.set(key, (map.get(key) || 0) + deriveFeedStock([t]));
    }
    return map;
  }, [transactions]);

  const stockFor = (item: { id: string }): number => stockByItem.get(String(item.id)) ?? 0;

  const lowStockItems = feedItems.filter((f) => stockFor(f) <= f.minStockThresholdKg);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wheat className="w-5 h-5 text-emerald-700" />
              <span>Feed Inventory, Diets &amp; Feeding Logistics</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Forage inventory &bull; TMR formulations &bull; Daily feeding &amp; orts &bull; Dry matter intake (DMI)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeedingModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <Scale className="w-4 h-4 text-slate-500" />
            <span>Log Daily Feeding</span>
          </button>

          <button
            id="btn-receive-feed"
            onClick={() => setShowReceiveModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Feed</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts (Section 11) */}
      {lowStockItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Low Stock Alerts ({lowStockItems.length} ingredient(s) below reorder buffer threshold)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => {
              const deficit = item.minStockThresholdKg - stockFor(item);
              return (
                <div
                  key={item.id}
                  className="bg-amber-50/70 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                    <div className="text-[11px] text-amber-900">
                      Stock: <span className="font-mono font-bold">{stockFor(item).toLocaleString()} {item.unit}</span>
                      <span className="text-slate-400 mx-1">|</span>
                      Min: {item.minStockThresholdKg.toLocaleString()} {item.unit}
                    </div>
                    <div className="text-[10px] text-rose-700 font-semibold">
                      Shortfall: {deficit.toLocaleString()} {item.unit} needed
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleReceiveItemChange(item.id);
                      setReceiveForm((prev) => ({
                        ...prev,
                        feedItemId: item.id,
                        quantityKg: deficit > 0 ? deficit : 1000,
                      }));
                      setShowReceiveModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    Receive Stock
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Sub-tabs per Section 11 */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'inventory'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Feed Inventory ({feedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rations')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'rations'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>Rations / Diets ({rations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('feeding-log')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'feeding-log'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Daily Feeding Log ({feedingLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'transactions'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Stock Ledger ({transactions.length})</span>
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex items-center md:hidden border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0 mb-1">
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

      {/* ========================================================================= */}
      {/* SUBTAB 1: FEED INVENTORY TABLE                                            */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              Ingredient Stock, Quality &amp; Storage Godown Status
            </span>
            <span className="text-xs text-slate-500">
              Total items: {feedItems.length} &bull; Total valuation: Rs{' '}
              {feedItems
                .reduce((acc, f) => acc + stockFor(f) * (f.unitPrice || 0), 0)
                .toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Ingredient Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock on Hand</th>
                  <th className="px-4 py-3">Buffer Min</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Nutritive Specs</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedItems.map((item) => {
                  const isLow = stockFor(item) <= item.minStockThresholdKg;
                  return (
                    <tr key={item.id} className={isLow ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {stockFor(item).toLocaleString()} {item.unit}
                        {isLow && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            LOW
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {item.minStockThresholdKg.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-900 font-medium">Rs {item.unitPrice}/kg</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.dryMatterPercent || '—'}% DM &bull; {item.crudeProteinPercent || '—'}% CP
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.supplierName || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            handleReceiveItemChange(item.id);
                            setShowReceiveModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                        >
                          + Receive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: RATIONS / DIETS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'rations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rations.map((ration) => (
            <div key={ration.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{ration.name}</h3>
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Target: {ration.targetGroup}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-slate-900 text-sm">
                    Rs {ration.costPerCowPerDay}/cow/day
                  </div>
                  <div className="text-[10px] text-slate-500">{ration.totalKgPerCow} kg As-Fed Intake</div>
                </div>
              </div>

              {ration.description && <p className="text-xs text-slate-600">{ration.description}</p>}

              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">Diet Composition</span>
                <div className="space-y-1 text-xs">
                  {ration.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-600">
                      <span>{ing.feedItemName}</span>
                      <span className="font-mono text-slate-900 font-medium">
                        {ing.quantityKg} kg (Rs {Math.round(ing.quantityKg * ing.costPerKg)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Status: <strong className="text-emerald-700">Active Herd Formulation</strong></span>
                <button
                  onClick={() => {
                    setFeedingForm((prev) => ({
                      ...prev,
                      group: ration.targetGroup,
                      rationId: ration.id,
                    }));
                    setShowFeedingModal(true);
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                >
                  Log Feeding &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: DAILY FEEDING LOG (Section 11)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'feeding-log' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800">Daily Herd Feeding, Orts &amp; Dry Matter Intake (DMI)</span>
              <p className="text-[11px] text-slate-500">Target DMI for HF lactating cows in Punjab: 21–24 kg DM/head/day</p>
            </div>
            <button
              onClick={() => setShowFeedingModal(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              + Record Group Feeding
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Herd Group</th>
                  <th className="px-4 py-3">Ration Fed</th>
                  <th className="px-4 py-3">Cows</th>
                  <th className="px-4 py-3">Quantity Fed</th>
                  <th className="px-4 py-3">Refusals (Orts)</th>
                  <th className="px-4 py-3">Net Consumed</th>
                  <th className="px-4 py-3">Calculated DMI</th>
                  <th className="px-4 py-3">Est. Cost</th>
                  <th className="px-4 py-3">Feeder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedingLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{log.date}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{log.group}</td>
                    <td className="px-4 py-2.5 text-slate-700">{log.rationName}</td>
                    <td className="px-4 py-2.5 font-mono">{log.cowCount ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{log.quantityFedKg} kg</td>
                    <td className="px-4 py-2.5 font-mono text-amber-700 font-medium">{log.refusalsKg != null ? `${log.refusalsKg} kg` : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 font-bold">{log.netConsumedKg} kg</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-800">
                      {log.dmiKgPerCow != null ? `${log.dmiKgPerCow} kg DM/cow` : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-900">{log.costPkr != null ? `Rs ${log.costPkr.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.feederName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: STOCK TRANSACTIONS / LEDGER                                     */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Feed Inventory Movement &amp; Intake Audit Trail ({transactions.length} transactions)
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total Valuation</th>
                  <th className="px-4 py-3">Remarks / Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{tx.date}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{tx.feedItemName}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'Purchase'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{(tx.quantityKg ?? 0).toLocaleString()} kg</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">
                      Rs {tx.unitPrice ? tx.unitPrice.toFixed(1) : (tx.totalCost && tx.quantityKg ? (tx.totalCost / tx.quantityKg).toFixed(1) : '45.0')}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">
                      Rs {(tx.totalCost || ((tx.quantityKg ?? 0) * 45)).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{tx.notes || 'Routine inventory feed allocation'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECEIVE FEED FORM (Section 11 Exact Specification)               */}
      {/* ========================================================================= */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Receive Feed Consignment</h3>
                <p className="text-xs text-slate-500">Record incoming fodder, silage, concentrate or minerals</p>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Feed Item / Ingredient *</label>
                <select
                  required
                  value={receiveForm.feedItemId}
                  onChange={(e) => handleReceiveItemChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {feedItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category} &bull; Stock: {stockFor(item)} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Supplier (not currently saved)</label>
                <input
                  type="text"
                  required
                  value={receiveForm.supplier}
                  onChange={(e) => setReceiveForm((prev) => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantity (Kg) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiveForm.quantityKg}
                    onChange={(e) => {
                      const qty = parseFloat(e.target.value) || 0;
                      setReceiveForm((prev) => ({
                        ...prev,
                        quantityKg: qty,
                        totalCost: qty * prev.unitPrice,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit Price (PKR/Kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={receiveForm.unitPrice}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      setReceiveForm((prev) => ({
                        ...prev,
                        unitPrice: price,
                        totalCost: prev.quantityKg * price,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total Purchase Cost</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  Rs {(receiveForm.totalCost ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Batch Number (not currently saved)</label>
                  <input
                    type="text"
                    value={receiveForm.batch}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, batch: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Expiry Date (not supported by backend)</label>
                  <input
                    type="date"
                    value={receiveForm.expiryDate}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Storage Location (not currently saved)</label>
                  <input
                    type="text"
                    required
                    value={receiveForm.storageLocation}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, storageLocation: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Silo Bunker 1, Godown 2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={receiveForm.date}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Updating Stock...' : 'Save Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DAILY FEEDING LOG FORM (Section 11 Exact Specification)          */}
      {/* ========================================================================= */}
      {showFeedingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Daily Feeding &amp; Orts</h3>
                <p className="text-xs text-slate-500">Computes net intake and dry matter intake (DMI)</p>
              </div>
              <button onClick={() => setShowFeedingModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedingSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Feeding Date *</label>
                  <input
                    type="date"
                    required
                    value={feedingForm.date}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Herd Group *</label>
                  <select
                    value={feedingForm.group}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, group: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="High-Yielding Lactating (Pen 1)">High-Yielding Lactating (Pen 1)</option>
                    <option value="Fresh Cows & 1st Lactation (Pen 2)">Fresh Cows & 1st Lactation (Pen 2)</option>
                    <option value="Far-Off Dry Cows (Pen 3)">Far-Off Dry Cows (Pen 3)</option>
                    <option value="Growing Heifers (Paddock 4)">Growing Heifers (Paddock 4)</option>
                    <option value="Calf Nursery Shed">Calf Nursery Shed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Feed Item *</label>
                  <select
                    required
                    value={feedingForm.feedItemId}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, feedItemId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    {feedItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ration Formulated *</label>
                  <select
                    value={feedingForm.rationId}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, rationId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    {rations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Animal Count (Head) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={feedingForm.cowCount}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, cowCount: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantity Fed (Kg As-Fed) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={feedingForm.quantityFedKg}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, quantityFedKg: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Refusals / Orts (Kg) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={feedingForm.refusalsKg}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, refusalsKg: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Diet Dry Matter (%)</label>
                  <input
                    type="number"
                    min="20"
                    max="95"
                    value={feedingForm.dryMatterPercent}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, dryMatterPercent: parseFloat(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Feeder Name</label>
                  <input
                    type="text"
                    required
                    value={feedingForm.feederName}
                    onChange={(e) => setFeedingForm((prev) => ({ ...prev, feederName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time DMI preview */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-emerald-950 block">Calculated DMI (Per Cow)</span>
                  <span className="text-[11px] text-emerald-800">
                    Net: {feedingForm.quantityFedKg - feedingForm.refusalsKg} kg As-Fed
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-emerald-900">
                    {(
                      ((feedingForm.quantityFedKg - feedingForm.refusalsKg) * (feedingForm.dryMatterPercent / 100)) /
                      (feedingForm.cowCount || 1)
                    ).toFixed(1)}{' '}
                    kg DM
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedingModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  Save Feeding Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
