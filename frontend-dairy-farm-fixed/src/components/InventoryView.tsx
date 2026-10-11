import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Wheat,
  Stethoscope,
  ShieldAlert,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  DollarSign,
  Thermometer,
  Clock,
  Sparkles,
} from 'lucide-react';
import { inventoryService, inventoryCalculationService } from '../services';
import { AppApiError } from '../services/api/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  FeedItem,
  Medicine,
  VaccineStock,
  SemenStraw,
  Warehouse,
  InventoryTransaction,
} from '../types';
import { InventoryMetricsCards } from './inventory/InventoryMetricsCards';
import { InventoryVisualWidgets } from './inventory/InventoryVisualWidgets';
import {
  FeedModal,
  MedicineModal,
  VaccineModal,
  SemenModal,
  PurchaseModal,
  ConsumptionModal,
} from './inventory/InventoryModals';
import { WarehouseModal, DeleteConfirmModal } from './inventory/WarehouseAndOtherModals';

type TabType =
  | 'feed'
  | 'medicines'
  | 'vaccines'
  | 'semen'
  | 'warehouses'
  | 'transactions'
  | 'alerts';

export const InventoryView: React.FC = () => {
  // Farm scope for the real Feed API calls below.
  const { farmId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<string>('all');

  // Main Datasets
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [vaccines, setVaccines] = useState<VaccineStock[]>([]);
  const [semenStraws, setSemenStraws] = useState<SemenStraw[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // Live Summary Metrics
  const [metrics, setMetrics] = useState({
    totalWarehouses: null as number | null,
    totalFeedStock: 0,
    totalMedicines: 0,
    totalVaccines: null as number | null,
    totalSemenStraws: null as number | null,
    inventoryValue: null as number | null,
    expiringMedicines: null as number | null,
    lowStockItems: 0,
  });

  // Modal States
  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedItem | null>(null);

  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);

  const [vacModalOpen, setVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<VaccineStock | null>(null);

  const [semenModalOpen, setSemenModalOpen] = useState(false);
  const [editingSemen, setEditingSemen] = useState<SemenStraw | null>(null);

  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [consumptionModalOpen, setConsumptionModalOpen] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'feed' | 'medicine' | 'vaccine' | 'semen' | 'warehouse' | 'transaction';
    name: string;
  } | null>(null);

  // Banner Message
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  const showBanner = (text: string, type: 'success' | 'error' = 'success') => {
    setBannerMessage({ text, type });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  const loadAllInventoryData = async () => {
    setLoading(true);
    try {
      // Sections with no backend support are intentionally empty. Mutations for
      // those sections are disabled in the UI rather than pretending to persist.
      const read = async <T,>(p: Promise<{ success: boolean; data: T[] }>, label: string): Promise<T[]> => {
        try {
          const r = await p;
          return r.success ? (r.data ?? []) : [];
        } catch (error) {
          if (!(error instanceof AppApiError && error.code === 'UNSUPPORTED')) {
            console.error(`[Inventory] Failed to load ${label}.`, error);
          }
          return [];
        }
      };

      const [feedRes, medRes, vacRes, semenRes, whRes, txRes] = await Promise.all([
        inventoryService.listFeed(farmId),
        inventoryService.listMedicines(),
        read<VaccineStock>(inventoryService.listVaccines(), 'Vaccines'),
        read<SemenStraw>(inventoryService.listSemen(), 'Semen straws'),
        read<Warehouse>(inventoryService.listWarehouses(), 'Warehouses'),
        inventoryService.listTransactions(farmId),
      ]);

      setFeedItems(feedRes.data || []);
      setMedicines(medRes.data || []);
      setVaccines(vacRes || []);
      setSemenStraws(semenRes || []);
      setWarehouses(whRes || []);

      const txs = txRes.data || [];
      // Join the real transaction ledger onto item names using real feed items.
      const nameById = new Map((feedRes.data || []).map((f) => [String(f.id), f.name]));
      setTransactions(txs.map((t) => ({ ...t, itemName: nameById.get(String(t.itemId)) ?? '' })));

      // No backend aggregate endpoint exists for inventory metrics, so derive
      // ONLY what the loaded rows actually support. Nothing is invented.
      const items = feedRes.data || [];
      const stock = items.reduce((s, f) => s + (f.currentStockKg || 0), 0);
      const lowStock = items.filter((f) => f.minStockThresholdKg > 0 && (f.currentStockKg || 0) <= f.minStockThresholdKg).length;
      setMetrics({
        totalWarehouses: null,
        totalFeedStock: stock,
        totalMedicines: medicines.length,
        totalVaccines: null,
        totalSemenStraws: null,
        inventoryValue: null,
        expiringMedicines: null,
        lowStockItems: lowStock,
      });
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      showBanner(err.message || 'Failed to load inventory records', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- SAVE / EDIT HANDLERS ---
  const handleSaveFeed = async (input: Partial<FeedItem>) => {
    if (editingFeed) {
      await inventoryService.updateFeed(editingFeed.id, input);
      showBanner(`Feed item "${input.name}" updated successfully.`);
    } else {
      await inventoryService.createFeed(farmId, input);
      showBanner(`New feed stock "${input.name}" added to inventory.`);
    }
    await loadAllInventoryData();
  };

  const handleSaveMedicine = async (input: Partial<Medicine>) => {
    if (editingMed) {
      await inventoryService.updateMedicine(editingMed.id, input);
      showBanner(`Medicine "${input.name}" updated successfully.`);
    } else {
      await inventoryService.createMedicine(input);
      showBanner(`New medicine "${input.name}" added to veterinary pharmacy.`);
    }
    await loadAllInventoryData();
  };

  const handleSaveVaccine = async (input: Partial<VaccineStock>) => {
    if (editingVac) {
      await inventoryService.updateVaccine(editingVac.id, input);
      showBanner(`Vaccine "${input.vaccineName || input.name}" updated successfully.`);
    } else {
      await inventoryService.createVaccine(input);
      showBanner(`Cold chain vaccine "${input.vaccineName || input.name}" registered.`);
    }
    await loadAllInventoryData();
  };

  const handleSaveSemen = async (input: Partial<SemenStraw>) => {
    if (editingSemen) {
      await inventoryService.updateSemen(editingSemen.id, input);
      showBanner(`Semen straw "${input.bullName}" updated.`);
    } else {
      await inventoryService.createSemen(input);
      showBanner(`Semen straws for "${input.bullName}" stored in tank.`);
    }
    await loadAllInventoryData();
  };

  const handleSaveWarehouse = async (input: Partial<Warehouse>) => {
    if (editingWarehouse) {
      await inventoryService.updateWarehouse(editingWarehouse.id, input);
      showBanner(`Warehouse facility "${input.name}" updated.`);
    } else {
      await inventoryService.createWarehouse(input);
      showBanner(`New warehouse "${input.name}" registered.`);
    }
    await loadAllInventoryData();
  };

  const handleRecordPurchase = async (input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => {
    await inventoryService.recordPurchase(input);
    showBanner(`Purchase recorded: ${input.quantity} ${input.unit} added to ${input.warehouseName}. Stock balance updated!`);
    await loadAllInventoryData();
  };

  const handleRecordConsumption = async (input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => {
    await inventoryService.recordConsumption(input);
    showBanner(`Consumption recorded: ${input.quantity} ${input.unit} dispensed. Stock balance decremented.`);
    await loadAllInventoryData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'feed') {
        await inventoryService.deleteFeed(farmId, deleteTarget.id);
      } else if (deleteTarget.type === 'medicine') {
        await inventoryService.deleteMedicine(deleteTarget.id);
      } else if (deleteTarget.type === 'vaccine') {
        await inventoryService.deleteVaccine(deleteTarget.id);
      } else if (deleteTarget.type === 'semen') {
        await inventoryService.deleteSemen(deleteTarget.id);
      } else if (deleteTarget.type === 'warehouse') {
        await inventoryService.deleteWarehouse(deleteTarget.id);
      } else if (deleteTarget.type === 'transaction') {
        await inventoryService.deleteTransaction(deleteTarget.id);
      }
      showBanner(`Record "${deleteTarget.name}" deleted.`);
      await loadAllInventoryData();
    } catch (err: any) {
      showBanner(err.message || 'Failed to delete record', 'error');
    }
  };

  // Helper for Status Badge Color
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'Optimal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Optimal
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Low Stock
          </span>
        );
      case 'Reorder':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Reorder
          </span>
        );
      case 'Expired':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-rose-700" /> Expired
          </span>
        );
      case 'Out of Stock':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Out of Stock
          </span>
        );
    }
  };

  // Filtered Feeds
  const filteredFeeds = feedItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.supplier && item.supplier.toLowerCase().includes(q));
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchWh = selectedWarehouseFilter === 'all' || item.warehouseId === selectedWarehouseFilter;
    const matchStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;
    return matchSearch && matchCat && matchWh && matchStatus;
  });

  // Filtered Medicines
  const filteredMedicines = medicines.filter((med) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      med.name.toLowerCase().includes(q) ||
      med.batchNumber.toLowerCase().includes(q) ||
      med.category.toLowerCase().includes(q);
    const matchWh = selectedWarehouseFilter === 'all' || med.warehouseId === selectedWarehouseFilter;
    const matchStatus = selectedStatusFilter === 'all' || med.status === selectedStatusFilter;

    let matchExpiry = true;
    if (selectedExpiryFilter !== 'all') {
      const exp = inventoryCalculationService.calculateMedicineExpiry(med.expiryDate);
      if (selectedExpiryFilter === 'expired') matchExpiry = exp.isExpired;
      if (selectedExpiryFilter === 'soon-30') matchExpiry = exp.isExpiringSoon || exp.isExpired;
      if (selectedExpiryFilter === 'warn-60') matchExpiry = exp.isWarning || exp.isExpired;
    }

    return matchSearch && matchWh && matchStatus && matchExpiry;
  });

  // Filtered Vaccines
  const filteredVaccines = vaccines.filter((vac) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      vac.vaccineName.toLowerCase().includes(q) ||
      vac.batchNumber.toLowerCase().includes(q) ||
      vac.manufacturer.toLowerCase().includes(q);
    const matchStatus = selectedStatusFilter === 'all' || vac.status === selectedStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered Semen
  const filteredSemen = semenStraws.filter((straw) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      straw.bullName.toLowerCase().includes(q) ||
      straw.breed.toLowerCase().includes(q) ||
      straw.strawCode.toLowerCase().includes(q) ||
      straw.tankNumber.toLowerCase().includes(q);
    return matchSearch;
  });

  // Filtered Warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    const q = search.toLowerCase();
    return !q || wh.name.toLowerCase().includes(q) || wh.code.toLowerCase().includes(q) || wh.type.toLowerCase().includes(q);
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      !q ||
      tx.itemName.toLowerCase().includes(q) ||
      tx.transactionType.toLowerCase().includes(q) ||
      (tx.supplier && tx.supplier.toLowerCase().includes(q)) ||
      (tx.reason && tx.reason.toLowerCase().includes(q)) ||
      (tx.invoiceNo && tx.invoiceNo.toLowerCase().includes(q))
    );
  });

  // Low stock & Alert items list
  const alertItems = [
    ...feedItems
      .filter((f) => (f.currentStockKg || 0) <= (f.minStockThresholdKg || 0))
      .map((f) => ({
        type: 'Feed',
        name: f.name,
        current: `${(f.currentStockKg || 0).toLocaleString()} ${f.unit}`,
        min: `${(f.minStockThresholdKg || 0).toLocaleString()} ${f.unit}`,
        warehouse: f.warehouseName || 'Feed Shed',
        status: f.status || 'Reorder',
        daysExpiry: 'N/A',
      })),
    ...medicines
      .filter((m) => (m.stockQuantity || 0) <= (m.lowStockThreshold || 0) || inventoryCalculationService.calculateMedicineExpiry(m.expiryDate).isWarning)
      .map((m) => {
        const exp = inventoryCalculationService.calculateMedicineExpiry(m.expiryDate);
        return {
          type: 'Medicine',
          name: `${m.name} (Batch: ${m.batchNumber})`,
          current: `${m.stockQuantity} ${m.unit}`,
          min: `${m.lowStockThreshold} ${m.unit}`,
          warehouse: m.warehouseName || 'Pharmacy',
          status: exp.isExpired ? 'Expired' : m.status || 'Reorder',
          daysExpiry: exp.label,
        };
      }),
    ...vaccines
      .filter((v) => v.minStockLevel !== undefined && (v.quantity || 0) <= v.minStockLevel || inventoryCalculationService.calculateMedicineExpiry(v.expiryDate).isWarning)
      .map((v) => {
        const exp = inventoryCalculationService.calculateMedicineExpiry(v.expiryDate);
        return {
          type: 'Vaccine',
          name: `${v.vaccineName} (${v.batchNumber})`,
          current: `${v.quantity} doses`,
          min: v.minStockLevel === undefined ? '—' : `${v.minStockLevel} doses`,
          warehouse: v.warehouseName || 'Cold Room',
          status: exp.isExpired ? 'Expired' : v.status || 'Reorder',
          daysExpiry: exp.label,
        };
      }),
    ...semenStraws
      .filter((s) => s.nitrogenStatus === 'Alert')
      .map((s) => ({
        type: 'Semen',
        name: `${s.bullName} (${s.strawCode})`,
        current: `${s.quantity} straws`,
        min: '—',
        warehouse: `${s.tankNumber} (LN2: ${s.nitrogenLevel}%)`,
        status: s.nitrogenStatus === 'Alert' ? 'Reorder' : 'Low',
        daysExpiry: s.nitrogenStatus === 'Alert' ? 'LN2 Refill Needed' : 'Normal',
      })),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Banner */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-700" />
              <span>Supplies & Warehouse Stock</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Authenticated farm inventory • Feed stock and transaction data are loaded from the backend
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Stock In / Purchase Button */}
          <button
            onClick={() => setPurchaseModalOpen(true)}
            disabled
            title="Inventory purchase recording is not supported by the backend"
            className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center space-x-1.5 shadow-2xs"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Stock In (Purchase)</span>
          </button>

          {/* Stock Out / Consumption Button */}
          <button
            onClick={() => setConsumptionModalOpen(true)}
            disabled
            title="Inventory consumption recording is not supported by the backend"
            className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center space-x-1.5 shadow-2xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Stock Out (Consume)</span>
          </button>

          {/* Add Item Trigger depending on active tab */}
          {activeTab === 'feed' && (
            <button
              onClick={() => {
                setEditingFeed(null);
                setFeedModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Feed</span>
            </button>
          )}

          {activeTab === 'medicines' && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              Global catalogue (read-only)
            </span>
          )}

          {activeTab === 'vaccines' && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              Backend support unavailable
            </span>
          )}

          {activeTab === 'semen' && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              Backend support unavailable
            </span>
          )}

          {activeTab === 'warehouses' && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              Backend support unavailable
            </span>
          )}

          <button
            onClick={loadAllInventoryData}
            title="Reload Inventory"
            className="p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Dashboard Statistics Cards (Requirement 4) */}
      <InventoryMetricsCards
        metrics={metrics}
        onFilterClick={(type) => {
          if (type === 'feed') setActiveTab('feed');
          if (type === 'medicines') setActiveTab('medicines');
          if (type === 'vaccines') setActiveTab('vaccines');
          if (type === 'semen') setActiveTab('semen');
          if (type === 'warehouses') setActiveTab('warehouses');
          if (type === 'expiring' || type === 'low-stock') setActiveTab('alerts');
        }}
      />

      {/* Visual Silos, LN2 Tanks & Warehouse Utilization Meters (Requirement 8) */}
      <InventoryVisualWidgets
        warehouses={warehouses}
        feedItems={feedItems}
        semenStraws={semenStraws}
        onSelectWarehouse={(whId) => {
          setSelectedWarehouseFilter(whId);
        }}
      />

      {/* Navigation Tabs (Requirement 1 & 2) */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('feed');
            setSelectedCategory('all');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'feed'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wheat className="w-3.5 h-3.5" />
          <span>Feed & Fodder Stocks</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('medicines');
            setSelectedCategory('all');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'medicines'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Veterinary Pharmacy</span>
        </button>

        <button
          disabled
          title="Vaccine inventory is not supported by the backend"
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'vaccines'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Vaccines & Cold Chain</span>
        </button>

        <button
          disabled
          title="Semen inventory is not supported by the backend"
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'semen'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Liquid Nitrogen Semen Bank</span>
        </button>

        <button
          disabled
          title="Warehouse inventory is not supported by the backend"
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'warehouses'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <WarehouseIcon className="w-3.5 h-3.5" />
          <span>Inventory Warehouses ({warehouses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'transactions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Stock Transactions Log</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'alerts'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock & Expiry ({alertItems.length})</span>
        </button>
      </div>

      {/* Multi-Filters & Search Bar (Requirement 5) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, category, batch, bull code, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
          {/* Warehouse Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 text-[11px] font-medium">Warehouse:</span>
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-emerald-600"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 text-[11px] font-medium">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-emerald-600"
            >
              <option value="all">All Statuses</option>
              <option value="Optimal">Optimal</option>
              <option value="Low">Low Stock</option>
              <option value="Reorder">Reorder</option>
              <option value="Expired">Expired</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Expiry Filter for Medicines */}
          {(activeTab === 'medicines' || activeTab === 'vaccines') && (
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 text-[11px] font-medium">Expiry:</span>
              <select
                value={selectedExpiryFilter}
                onChange={(e) => setSelectedExpiryFilter(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-emerald-600"
              >
                <option value="all">All Dates</option>
                <option value="soon-30">Expiring &le; 30 Days</option>
                <option value="warn-60">Expiring &le; 60 Days</option>
                <option value="expired">Already Expired</option>
              </select>
            </div>
          )}

          {(search || selectedWarehouseFilter !== 'all' || selectedStatusFilter !== 'all' || selectedExpiryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedWarehouseFilter('all');
                setSelectedStatusFilter('all');
                setSelectedExpiryFilter('all');
                setSelectedCategory('all');
              }}
              className="text-[11px] text-rose-600 hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FEED & FODDER STOCKS (Requirement 2 & 9) */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Feed Stock Balances</h3>
              <p className="text-xs text-slate-500">
                Displaying {filteredFeeds.length} of {feedItems.length} registered feed items
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFeed(null);
                setFeedModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Feed Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Feed Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Minimum Stock</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Unit Price (PKR)</th>
                  <th className="px-4 py-3">Dry Matter %</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeeds.map((item) => {
                  const stock = item.currentStockKg ?? item.currentStock ?? 0;
                  const min = item.minStockThresholdKg ?? item.minAlertLevel ?? 0;
                  const price = item.unitPrice ?? 0;
                  const totalVal = inventoryCalculationService.calculateFeedTotalValue(stock, price);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.warehouseName || 'Main Silo Yard'} • Supplier: {item.supplier || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {stock.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {min.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 font-mono text-slate-900">
                        Rs {price.toFixed(1)} / {item.unit}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                        {item.dryMatterPercent == null ? '—' : `${item.dryMatterPercent}%`}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        Rs {totalVal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(item.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingFeed(item);
                              setFeedModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                            title="Edit Feed"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({ id: item.id, type: 'feed', name: item.name });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                            title="Delete Feed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredFeeds.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No feed records matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VETERINARY PHARMACY & MEDICINES (Requirement 2) */}
      {/* ========================================================================= */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Veterinary Pharmacy & Medicines</h3>
              <p className="text-xs text-slate-500">Statutory milk & meat withdrawal tracking and batch verification</p>
            </div>
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              Global catalogue (read-only)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Medicine Name</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Withdrawal Days</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Cost (PKR)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((med) => {
                  const exp = inventoryCalculationService.calculateMedicineExpiry(med.expiryDate);
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {med.category} • {med.manufacturer || 'Licensed Vet Supply'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-800 font-semibold">{med.batchNumber}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {med.stockQuantity} {med.unit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{med.expiryDate}</div>
                        <div className={`text-[10px] font-bold ${exp.isExpired ? 'text-rose-700' : exp.isExpiringSoon ? 'text-amber-700' : 'text-slate-400'}`}>
                          {exp.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-amber-800 font-mono">
                          {med.withdrawalDaysMilk > 0 ? `${med.withdrawalDaysMilk} Days Milk` : '0 Days (Milk Safe)'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Meat: {med.withdrawalDaysMeat == null ? '—' : `${med.withdrawalDaysMeat} Days`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {med.warehouseName || 'Central Veterinary Pharmacy'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {med.cost == null && med.unitPrice == null ? '—' : `Rs ${(med.cost ?? med.unitPrice).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(med.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            disabled
                            className="p-1.5 text-slate-300 rounded cursor-not-allowed"
                            title="Medicine catalogue is read-only"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled
                            className="p-1.5 text-slate-300 rounded cursor-not-allowed"
                            title="Medicine catalogue is read-only"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredMedicines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No medicine records matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VACCINES & COLD CHAIN */}
      {/* ========================================================================= */}
      {activeTab === 'vaccines' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vaccine Cold Chain Stocks</h3>
              <p className="text-xs text-slate-500">2°C to 8°C biological inventory for herd immunization campaigns</p>
            </div>
            <button
              onClick={() => {
                setEditingVac(null);
                setVacModalOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vaccine</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Vaccine Name</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Quantity (Doses)</th>
                  <th className="px-4 py-3">Storage Temperature</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVaccines.map((vac) => {
                  const exp = inventoryCalculationService.calculateMedicineExpiry(vac.expiryDate);
                  return (
                    <tr key={vac.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{vac.vaccineName || vac.name}</div>
                        <div className="text-[10px] text-slate-400">Target: {vac.targetDisease || 'Herd Prophylaxis'}</div>
                      </td>
                      <td className="px-4 py-3">{vac.manufacturer}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{vac.batchNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{vac.expiryDate}</div>
                        <div className={`text-[10px] font-bold ${exp.isExpired ? 'text-rose-700' : 'text-slate-400'}`}>
                          {exp.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700 text-sm">
                        {vac.quantity} doses
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit">
                          <Thermometer className="w-3 h-3 text-blue-600" />
                          {vac.storageTemperature}
                        </span>
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(vac.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingVac(vac);
                              setVacModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({ id: vac.id, type: 'vaccine', name: vac.vaccineName || vac.name });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
      {/* TAB 4: SEMEN STRAW LIQUID NITROGEN BANK (Requirement 2 & 3) */}
      {/* ========================================================================= */}
      {activeTab === 'semen' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Liquid Nitrogen Semen Straw Bank</h3>
              <p className="text-xs text-slate-500">Cryogenic tanks monitored at -196°C with automated nitrogen warning levels</p>
            </div>
            <button
              onClick={() => {
                setEditingSemen(null);
                setSemenModalOpen(true);
              }}
              className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Semen Straw</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Bull Name</th>
                  <th className="px-4 py-3">Breed</th>
                  <th className="px-4 py-3">Straw Code</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Tank & Canister</th>
                  <th className="px-4 py-3">Liquid Nitrogen Level</th>
                  <th className="px-4 py-3">Nitrogen Status</th>
                  <th className="px-4 py-3">Unit Cost (PKR)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSemen.map((straw) => {
                  const nitr = inventoryCalculationService.calculateNitrogenStatus(
                    straw.nitrogenLevel,
                    straw.minNitrogenLevel || 25
                  );
                  return (
                    <tr key={straw.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{straw.bullName}</div>
                        <div className="text-[10px] text-slate-400">
                          Supplier: {straw.supplier} • Conception: {straw.conceptionRate || '70%'}
                        </div>
                      </td>
                      <td className="px-4 py-3">{straw.breed}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{straw.strawCode}</td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 text-sm">
                        {straw.quantity} straws
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{straw.tankNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {straw.canisterNumber} ({straw.position})
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className={nitr.isAlert ? 'text-rose-700' : 'text-slate-900'}>
                          {straw.nitrogenLevel}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {nitr.isAlert ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> LN2 Alert (&lt; 25%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">Rs {(straw.unitCost || straw.unitPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingSemen(straw);
                              setSemenModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({ id: straw.id, type: 'semen', name: `${straw.bullName} (${straw.strawCode})` });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
      {/* TAB 5: INVENTORY WAREHOUSES & SILOS (Requirement 2 & 3) */}
      {/* ========================================================================= */}
      {activeTab === 'warehouses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Warehouses & Silo Facilities</h3>
              <p className="text-xs text-slate-500">Live capacity utilization calculated from real-time stored item weights</p>
            </div>
            <button
              onClick={() => {
                setEditingWarehouse(null);
                setWarehouseModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Warehouse</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Warehouse Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Current Utilization</th>
                  <th className="px-4 py-3">Total Items</th>
                  <th className="px-4 py-3">Location & Manager</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWarehouses.map((wh) => {
                  const utilization = inventoryCalculationService.calculateWarehouseUtilization(
                    wh.currentStock,
                    wh.capacity
                  );
                  return (
                    <tr key={wh.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{wh.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{wh.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {wh.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {wh.capacity.toLocaleString()} {wh.type.includes('Shed') || wh.type.includes('Bunker') || wh.type.includes('Store') ? 'kg' : 'units'}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {wh.currentStock.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                utilization >= 85 ? 'bg-rose-500' : utilization >= 50 ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            {utilization.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                        {wh.totalItems} SKUs
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{wh.location}</div>
                        <div className="text-[10px] text-slate-400">Mgr: {wh.manager}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingWarehouse(wh);
                              setWarehouseModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({ id: wh.id, type: 'warehouse', name: wh.name });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
      {/* TAB 6: STOCK TRANSACTIONS (Purchases & Consumptions History) */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Stock Transactions</h3>
              <p className="text-xs text-slate-500">Audited Purchases, Inward receipts, and Dispensed Consumptions</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPurchaseModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center space-x-1"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Record Purchase</span>
              </button>
              <button
                onClick={() => setConsumptionModalOpen(true)}
                className="px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Record Consumption</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Party / Reason</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{tx.date}</td>
                    <td className="px-4 py-3">
                      {tx.transactionType === 'Purchase' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                          <ArrowDownRight className="w-3 h-3" /> Stock In
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                          <ArrowUpRight className="w-3 h-3" /> Consumed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{tx.itemName}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.itemType}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {tx.quantity.toLocaleString()} {tx.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tx.warehouseName || 'Main Store'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium">
                        {tx.supplier || tx.reason || tx.activity}
                      </div>
                      {tx.invoiceNo && (
                        <div className="text-[10px] text-slate-400 font-mono">Inv: {tx.invoiceNo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {tx.totalCost ? `Rs ${tx.totalCost.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setDeleteTarget({ id: tx.id, type: 'transaction', name: `${tx.transactionType} ${tx.itemName}` });
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LOW STOCK & EXPIRY ALERTS CENTER (Requirement 1, 8 & 9) */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Low Stock & Expiration Warnings Center</span>
              </h3>
              <p className="text-xs text-slate-500">
                Action required: Items with stock below buffer thresholds or pharmaceuticals near expiration
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs">
              {alertItems.length} Active Farm Warnings
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Item Category</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Threshold Level</th>
                  <th className="px-4 py-3">Warehouse / Preserved In</th>
                  <th className="px-4 py-3">Expiry / LN2 Status</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertItems.map((alert, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-700">{alert.type}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{alert.name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">{alert.current}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{alert.min}</td>
                    <td className="px-4 py-3 text-slate-600">{alert.warehouse}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {alert.daysExpiry}
                      </span>
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(alert.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPurchaseModalOpen(true)}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded text-[11px] font-semibold hover:bg-emerald-800 transition"
                      >
                        Restock In
                      </button>
                    </td>
                  </tr>
                ))}

                {alertItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-emerald-700 font-semibold">
                      All inventory stock levels and pharmaceutical expiration dates are optimal!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALL MODALS (Add/Edit Feed, Meds, Vaccines, Semen, Warehouse, Purchase, Consumption, Delete) */}
      <FeedModal
        isOpen={feedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        onSave={handleSaveFeed}
        initialData={editingFeed}
        warehouses={warehouses}
      />

      <MedicineModal
        isOpen={medModalOpen}
        onClose={() => setMedModalOpen(false)}
        onSave={handleSaveMedicine}
        initialData={editingMed}
        warehouses={warehouses}
      />

      <VaccineModal
        isOpen={vacModalOpen}
        onClose={() => setVacModalOpen(false)}
        onSave={handleSaveVaccine}
        initialData={editingVac}
        warehouses={warehouses}
      />

      <SemenModal
        isOpen={semenModalOpen}
        onClose={() => setSemenModalOpen(false)}
        onSave={handleSaveSemen}
        initialData={editingSemen}
      />

      <WarehouseModal
        isOpen={warehouseModalOpen}
        onClose={() => setWarehouseModalOpen(false)}
        onSave={handleSaveWarehouse}
        initialData={editingWarehouse}
      />

      <PurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onRecordPurchase={handleRecordPurchase}
        feedItems={feedItems}
        medicines={medicines}
        vaccines={vaccines}
        semenStraws={semenStraws}
        warehouses={warehouses}
      />

      <ConsumptionModal
        isOpen={consumptionModalOpen}
        onClose={() => setConsumptionModalOpen(false)}
        onRecordConsumption={handleRecordConsumption}
        feedItems={feedItems}
        medicines={medicines}
        vaccines={vaccines}
        semenStraws={semenStraws}
        warehouses={warehouses}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? Inventory records and financial balances will be updated.`}
      />
    </div>
  );
};
