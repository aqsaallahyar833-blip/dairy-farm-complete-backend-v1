import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, DollarSign, Package } from 'lucide-react';
import { FeedItem, Medicine, VaccineStock, SemenStraw, Warehouse, InventoryTransaction } from '../../types';

// =========================================================================
// 1. FEED MODAL (Add / Edit)
// =========================================================================
interface FeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (feed: Partial<FeedItem>) => Promise<void>;
  initialData?: FeedItem | null;
  warehouses: Warehouse[];
}

export const FeedModal: React.FC<FeedModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  warehouses,
}) => {
  const [formData, setFormData] = useState<Partial<FeedItem>>({
    name: '',
    category: 'Concentrate',
    currentStockKg: 1000,
    unit: 'kg',
    minStockThresholdKg: 500,
    unitPrice: 25,
    dryMatterPercent: 88,
    crudeProteinPercent: 16,
    supplier: 'Supreme Feeds',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '2025-06-30',
    warehouseId: 'warehouse-002',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        currentStockKg: initialData.currentStockKg ?? initialData.currentStock ?? 0,
        minStockThresholdKg: initialData.minStockThresholdKg ?? initialData.minAlertLevel ?? 500,
      });
    } else {
      setFormData({
        name: '',
        category: 'Concentrate',
        currentStockKg: 1000,
        unit: 'kg',
        minStockThresholdKg: 500,
        unitPrice: 25,
        dryMatterPercent: 88,
        crudeProteinPercent: 16,
        supplier: 'Supreme Feeds',
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '2025-06-30',
        warehouseId: warehouses[0]?.id || 'warehouse-002',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, isOpen, warehouses]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Feed Name is required (minimum 2 characters).');
      return;
    }
    if ((Number(formData.currentStockKg) || 0) < 0) {
      setError('Current Stock cannot be negative.');
      return;
    }
    if ((Number(formData.unitPrice) || 0) < 0) {
      setError('Unit price cannot be negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const wh = warehouses.find((w) => w.id === formData.warehouseId);
      await onSave({
        ...formData,
        warehouseName: wh ? wh.name : formData.warehouseName,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save feed record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-700" />
              <span>{initialData ? 'Edit Feed & Fodder Stock' : 'Add New Feed & Fodder Stock'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Feed Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maize Silage, Cottonseed Cake, Wanda"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category || 'Concentrate'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
              >
                <option value="Silage">Silage</option>
                <option value="Concentrate">Concentrate</option>
                <option value="Fodder">Fodder</option>
                <option value="Straw">Straw</option>
                <option value="Mineral/Supplement">Mineral/Supplement</option>
                <option value="Hay">Hay</option>
                <option value="Grain">Grain</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={formData.unit || 'kg'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
              >
                <option value="kg">kg</option>
                <option value="bag">bag</option>
                <option value="bale">bale</option>
                <option value="ton">ton</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Current Stock ({formData.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.currentStockKg ?? ''}
                onChange={(e) => setFormData({ ...formData, currentStockKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimum Alert Level ({formData.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.minStockThresholdKg ?? ''}
                onChange={(e) => setFormData({ ...formData, minStockThresholdKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unit Price (Rs / {formData.unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.unitPrice ?? ''}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dry Matter % (DM)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={formData.dryMatterPercent ?? ''}
                onChange={(e) => setFormData({ ...formData, dryMatterPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                placeholder="e.g. National Silage Farms"
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse / Silo</label>
              <select
                value={formData.warehouseId || ''}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Quality Specifications</label>
            <textarea
              rows={2}
              placeholder="e.g. Fermentation smell sweet, fungal inspection negative..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Feed' : 'Save Feed Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 2. MEDICINE MODAL (Add / Edit)
// =========================================================================
interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (med: Partial<Medicine>) => Promise<void>;
  initialData?: Medicine | null;
  warehouses: Warehouse[];
}

export const MedicineModal: React.FC<MedicineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  warehouses,
}) => {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    batchNumber: '',
    category: 'Antibiotic',
    stockQuantity: 10,
    unit: 'vial',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '2025-12-31',
    withdrawalDays: 5,
    supplier: 'Al-Faisal Veterinary Pharma',
    cost: 1500,
    warehouseId: 'warehouse-003',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        stockQuantity: initialData.stockQuantity ?? initialData.currentStock ?? initialData.quantity ?? 0,
        cost: initialData.cost ?? initialData.unitPrice ?? 0,
        withdrawalDays: initialData.withdrawalDays ?? initialData.withdrawalDaysMilk ?? 0,
      });
    } else {
      setFormData({
        name: '',
        batchNumber: `MED-${Date.now().toString().slice(-4)}`,
        category: 'Antibiotic',
        stockQuantity: 10,
        unit: 'vial',
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '2025-12-31',
        withdrawalDays: 5,
        supplier: 'Al-Faisal Veterinary Pharma',
        cost: 1500,
        warehouseId: 'warehouse-003',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Medicine Name is required.');
      return;
    }
    if (!formData.batchNumber || formData.batchNumber.trim().length < 1) {
      setError('Batch Number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const wh = warehouses.find((w) => w.id === formData.warehouseId);
      await onSave({
        ...formData,
        warehouseName: wh ? wh.name : formData.warehouseName,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-700" />
              <span>{initialData ? 'Edit Veterinary Medicine' : 'Add Veterinary Medicine Stock'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Medicine Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oxytetracycline 20%"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BATCH-9901"
                value={formData.batchNumber || ''}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category || 'Antibiotic'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 bg-white"
              >
                <option value="Antibiotic">Antibiotic</option>
                <option value="Anti-inflammatory">Anti-inflammatory</option>
                <option value="Anthelmintic">Anthelmintic (Dewormer)</option>
                <option value="Vitamin">Vitamin / Tonic</option>
                <option value="Hormone">Hormone</option>
                <option value="Topical">Topical</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Packaging Unit</label>
              <select
                value={formData.unit || 'vial'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 bg-white"
              >
                <option value="vial">vial</option>
                <option value="bottle">bottle</option>
                <option value="bolus">bolus</option>
                <option value="tube">tube</option>
                <option value="ml">ml</option>
                <option value="pack">pack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockQuantity ?? ''}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.cost ?? ''}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Withdrawal (Days)</label>
              <input
                type="number"
                min="0"
                value={formData.withdrawalDays ?? ''}
                onChange={(e) => setFormData({ ...formData, withdrawalDays: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 font-mono font-bold text-amber-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                placeholder="e.g. Al-Faisal Veterinary Pharma"
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse</label>
              <select
                value={formData.warehouseId || 'warehouse-003'}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-blue-600 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. VACCINE MODAL (Add / Edit)
// =========================================================================
interface VaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vac: Partial<VaccineStock>) => Promise<void>;
  initialData?: VaccineStock | null;
  warehouses: Warehouse[];
}

export const VaccineModal: React.FC<VaccineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  warehouses,
}) => {
  const [formData, setFormData] = useState<Partial<VaccineStock>>({
    vaccineName: '',
    manufacturer: 'Veterinary Research Institute (VRI)',
    batchNumber: '',
    expiryDate: '2025-06-30',
    quantity: 100,
    storageTemperature: '2°C - 8°C (Cold Chain)',
    warehouseId: 'warehouse-003',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        vaccineName: '',
        manufacturer: 'Veterinary Research Institute (VRI)',
        batchNumber: `VAC-${Date.now().toString().slice(-4)}`,
        expiryDate: '2025-06-30',
        quantity: 100,
        storageTemperature: '2°C - 8°C (Cold Chain)',
        warehouseId: 'warehouse-003',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vaccineName) {
      setError('Vaccine Name is required.');
      return;
    }
    if (!formData.batchNumber) {
      setError('Batch Number is required.');
      return;
    }

    try {
      const wh = warehouses.find((w) => w.id === formData.warehouseId);
      await onSave({
        ...formData,
        warehouseName: wh ? wh.name : 'Central Veterinary Pharmacy & Cold Room',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save vaccine record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-700" />
              <span>{initialData ? 'Edit Cold Chain Vaccine' : 'Add New Vaccine Stock'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vaccine Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. FMD Quadrivalent Vaccine, HS Alum Vaccine"
              value={formData.vaccineName || ''}
              onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Manufacturer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber || ''}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doses (Quantity)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity ?? ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Storage Temperature</label>
            <input
              type="text"
              value={formData.storageTemperature || '2°C - 8°C (Cold Chain)'}
              onChange={(e) => setFormData({ ...formData, storageTemperature: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition font-semibold shadow-xs"
            >
              {initialData ? 'Update Vaccine' : 'Save Vaccine Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 4. SEMEN STRAW MODAL (Add / Edit)
// =========================================================================
interface SemenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (straw: Partial<SemenStraw>) => Promise<void>;
  initialData?: SemenStraw | null;
}

export const SemenModal: React.FC<SemenModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<SemenStraw>>({
    bullName: '',
    breed: 'Holstein Friesian',
    strawCode: '',
    quantity: 25,
    collectionDate: new Date().toISOString().split('T')[0],
    tankNumber: 'Tank 1 (MVE-XC33)',
    canisterNumber: 'Canister 1',
    position: 'Upper Rack P-01',
    nitrogenLevel: 86,
    unitCost: 3500,
    conceptionRate: '70%',
    supplier: 'Alta Genetics',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        bullName: '',
        breed: 'Holstein Friesian',
        strawCode: `SEM-HF-${Date.now().toString().slice(-4)}`,
        quantity: 25,
        collectionDate: new Date().toISOString().split('T')[0],
        tankNumber: 'Tank 1 (MVE-XC33)',
        canisterNumber: 'Canister 1',
        position: 'Upper Rack P-01',
        nitrogenLevel: 86,
        unitCost: 3500,
        conceptionRate: '70%',
        supplier: 'Alta Genetics',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bullName) {
      setError('Bull Name is required.');
      return;
    }
    if (!formData.strawCode) {
      setError('Straw Code is required.');
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save semen straw record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-700" />
              <span>{initialData ? 'Edit Semen Straw Bank' : 'Add Semen Straw to Liquid Nitrogen Bank'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bull Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AltaSpring-77"
                value={formData.bullName || ''}
                onChange={(e) => setFormData({ ...formData, bullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Breed</label>
              <select
                value={formData.breed || 'Holstein Friesian'}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 bg-white"
              >
                <option value="Holstein Friesian">Holstein Friesian</option>
                <option value="Jersey">Jersey</option>
                <option value="Sahiwal">Sahiwal</option>
                <option value="Crossbred">Crossbred</option>
                <option value="Red Sindhi">Red Sindhi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Straw Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.strawCode || ''}
                onChange={(e) => setFormData({ ...formData, strawCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity (Straws)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity ?? ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tank Number</label>
              <input
                type="text"
                value={formData.tankNumber || ''}
                onChange={(e) => setFormData({ ...formData, tankNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Canister Number</label>
              <input
                type="text"
                value={formData.canisterNumber || ''}
                onChange={(e) => setFormData({ ...formData, canisterNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Position / Rack</label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Liquid Nitrogen Level (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.nitrogenLevel ?? ''}
                onChange={(e) => setFormData({ ...formData, nitrogenLevel: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 font-mono"
              />
              <span className="text-[10px] text-slate-400">Warning if &lt; 25%</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Collection Date</label>
              <input
                type="date"
                value={formData.collectionDate || ''}
                onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Cost (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.unitCost ?? ''}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Genetics Supplier</label>
              <input
                type="text"
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-purple-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition font-semibold shadow-xs"
            >
              {initialData ? 'Update Straw' : 'Save Semen Straw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 5. PURCHASE / STOCK IN ENTRY MODAL
// =========================================================================
interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordPurchase: (input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => Promise<void>;
  feedItems: FeedItem[];
  medicines: Medicine[];
  vaccines: VaccineStock[];
  semenStraws: SemenStraw[];
  warehouses: Warehouse[];
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  onRecordPurchase,
  feedItems,
  medicines,
  vaccines,
  semenStraws,
  warehouses,
}) => {
  const [itemType, setItemType] = useState<'Feed' | 'Medicine' | 'Vaccine' | 'Semen'>('Feed');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<number>(20);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // default selection
    if (itemType === 'Feed' && feedItems.length > 0) {
      setSelectedItemId(feedItems[0].id);
      setUnitPrice(feedItems[0].unitPrice || 20);
      setWarehouseId(feedItems[0].warehouseId || warehouses[0]?.id || '');
      setSupplier(feedItems[0].supplier || '');
    } else if (itemType === 'Medicine' && medicines.length > 0) {
      setSelectedItemId(medicines[0].id);
      setUnitPrice(medicines[0].cost || 1500);
      setWarehouseId(medicines[0].warehouseId || 'warehouse-003');
      setSupplier(medicines[0].supplier || '');
    } else if (itemType === 'Vaccine' && vaccines.length > 0) {
      setSelectedItemId(vaccines[0].id);
      setUnitPrice(vaccines[0].unitPrice || 250);
      setWarehouseId(vaccines[0].warehouseId || 'warehouse-003');
      setSupplier(vaccines[0].supplier || '');
    } else if (itemType === 'Semen' && semenStraws.length > 0) {
      setSelectedItemId(semenStraws[0].id);
      setUnitPrice(semenStraws[0].unitCost || 3500);
      setWarehouseId('warehouse-004');
      setSupplier(semenStraws[0].supplier || '');
    }
  }, [itemType, feedItems, medicines, vaccines, semenStraws, warehouses, isOpen]);

  if (!isOpen) return null;

  const totalCost = Math.round(quantity * unitPrice * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    let itemName = '';
    let unit = 'kg';

    if (itemType === 'Feed') {
      const f = feedItems.find((i) => i.id === selectedItemId);
      itemName = f ? f.name : 'Feed Item';
      unit = f ? f.unit : 'kg';
    } else if (itemType === 'Medicine') {
      const m = medicines.find((i) => i.id === selectedItemId);
      itemName = m ? m.name : 'Medicine';
      unit = m ? m.unit : 'vial';
    } else if (itemType === 'Vaccine') {
      const v = vaccines.find((i) => i.id === selectedItemId);
      itemName = v ? v.vaccineName : 'Vaccine';
      unit = v ? v.unit : 'doses';
    } else if (itemType === 'Semen') {
      const s = semenStraws.find((i) => i.id === selectedItemId);
      itemName = s ? `${s.bullName} (${s.strawCode})` : 'Semen Straw';
      unit = 'straw';
    }

    const wh = warehouses.find((w) => w.id === warehouseId);

    try {
      setIsSubmitting(true);
      setError(null);
      await onRecordPurchase({
        itemType,
        itemId: selectedItemId,
        itemName,
        warehouseId,
        warehouseName: wh ? wh.name : 'Main Warehouse',
        transactionType: 'Purchase',
        quantity,
        unit,
        unitPrice,
        totalCost,
        supplier,
        invoiceNo,
        date: purchaseDate,
        reason: 'Restock / Inward Purchase',
        activity: 'Stock In',
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <span>Stock In / Purchase Voucher Entry</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Item Classification</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(['Feed', 'Medicine', 'Vaccine', 'Semen'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setItemType(t)}
                  className={`py-1.5 rounded-md font-semibold text-center transition ${
                    itemType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Item <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                if (itemType === 'Feed') {
                  const f = feedItems.find((i) => i.id === e.target.value);
                  if (f) setUnitPrice(f.unitPrice || 0);
                } else if (itemType === 'Medicine') {
                  const m = medicines.find((i) => i.id === e.target.value);
                  if (m) setUnitPrice(m.cost || 0);
                } else if (itemType === 'Vaccine') {
                  const v = vaccines.find((i) => i.id === e.target.value);
                  if (v) setUnitPrice(v.unitPrice || 0);
                } else if (itemType === 'Semen') {
                  const s = semenStraws.find((i) => i.id === e.target.value);
                  if (s) setUnitPrice(s.unitCost || 0);
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white font-medium"
            >
              {itemType === 'Feed' &&
                feedItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Cur: {f.currentStockKg} {f.unit})
                  </option>
                ))}
              {itemType === 'Medicine' &&
                medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - Batch {m.batchNumber} (Cur: {m.stockQuantity} {m.unit})
                  </option>
                ))}
              {itemType === 'Vaccine' &&
                vaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vaccineName} (Cur: {v.quantity} doses)
                  </option>
                ))}
              {itemType === 'Semen' &&
                semenStraws.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.bullName} - {s.strawCode} (Cur: {s.quantity} straws)
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purchase Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Price (PKR)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
          </div>

          {/* Auto Calculation Banner */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <span className="font-semibold text-emerald-900">Total Purchase Value:</span>
            <span className="font-mono text-base font-bold text-emerald-800">
              Rs {totalCost.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receiving Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice / Reference No.</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Purchase Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Weighbridge slip verified, quality tested..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Purchase & Update Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 6. CONSUMPTION / STOCK OUT ENTRY MODAL
// =========================================================================
interface ConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordConsumption: (input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => Promise<void>;
  feedItems: FeedItem[];
  medicines: Medicine[];
  vaccines: VaccineStock[];
  semenStraws: SemenStraw[];
  warehouses: Warehouse[];
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({
  isOpen,
  onClose,
  onRecordConsumption,
  feedItems,
  medicines,
  vaccines,
  semenStraws,
  warehouses,
}) => {
  const [itemType, setItemType] = useState<'Feed' | 'Medicine' | 'Vaccine' | 'Semen'>('Feed');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(50);
  const [reason, setReason] = useState('Daily TMR Feeding');
  const [activity, setActivity] = useState('Daily Herd Feeding');
  const [targetEntity, setTargetEntity] = useState('Pen 1 (High-Yield Lactating)');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemType === 'Feed' && feedItems.length > 0) {
      setSelectedItemId(feedItems[0].id);
      setReason('Daily TMR Mixing');
      setActivity('Herd Feeding');
    } else if (itemType === 'Medicine' && medicines.length > 0) {
      setSelectedItemId(medicines[0].id);
      setReason('Clinical Mastitis Treatment');
      setActivity('Cow Individual Treatment');
    } else if (itemType === 'Vaccine' && vaccines.length > 0) {
      setSelectedItemId(vaccines[0].id);
      setReason('Herd Seasonal Vaccination Campaign');
      setActivity('Vaccine Administration');
    } else if (itemType === 'Semen' && semenStraws.length > 0) {
      setSelectedItemId(semenStraws[0].id);
      setReason('Artificial Insemination');
      setActivity('AI Service Insemination');
    }
  }, [itemType, feedItems, medicines, vaccines, semenStraws, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Consumption quantity must be greater than zero.');
      return;
    }

    let itemName = '';
    let unit = 'kg';
    let warehouseId = '';
    let warehouseName = '';

    if (itemType === 'Feed') {
      const f = feedItems.find((i) => i.id === selectedItemId);
      if (!f) return;
      if (f.currentStockKg < quantity) {
        setError(`Cannot consume ${quantity} ${f.unit}. Only ${f.currentStockKg} ${f.unit} in stock.`);
        return;
      }
      itemName = f.name;
      unit = f.unit;
      warehouseId = f.warehouseId || '';
      warehouseName = f.warehouseName || '';
    } else if (itemType === 'Medicine') {
      const m = medicines.find((i) => i.id === selectedItemId);
      if (!m) return;
      if (m.stockQuantity < quantity) {
        setError(`Cannot consume ${quantity} ${m.unit}. Only ${m.stockQuantity} ${m.unit} in stock.`);
        return;
      }
      itemName = m.name;
      unit = m.unit;
      warehouseId = m.warehouseId || '';
      warehouseName = m.warehouseName || '';
    } else if (itemType === 'Vaccine') {
      const v = vaccines.find((i) => i.id === selectedItemId);
      if (!v) return;
      if (v.quantity < quantity) {
        setError(`Cannot consume ${quantity} doses. Only ${v.quantity} doses in stock.`);
        return;
      }
      itemName = v.vaccineName;
      unit = v.unit;
      warehouseId = v.warehouseId || '';
      warehouseName = v.warehouseName || '';
    } else if (itemType === 'Semen') {
      const s = semenStraws.find((i) => i.id === selectedItemId);
      if (!s) return;
      if (s.quantity < quantity) {
        setError(`Cannot consume ${quantity} straws. Only ${s.quantity} available.`);
        return;
      }
      itemName = `${s.bullName} (${s.strawCode})`;
      unit = 'straw';
      warehouseId = 'warehouse-004';
      warehouseName = 'Cryogenic Liquid Nitrogen Semen Bank';
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onRecordConsumption({
        itemType,
        itemId: selectedItemId,
        itemName,
        warehouseId,
        warehouseName,
        transactionType: 'Consumption',
        quantity,
        unit,
        date,
        reason,
        activity,
        animalTag: targetEntity,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record consumption entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-700" />
              <span>Stock Out / Consumption Record</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Item Category</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(['Feed', 'Medicine', 'Vaccine', 'Semen'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setItemType(t)}
                  className={`py-1.5 rounded-md font-semibold text-center transition ${
                    itemType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Item <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600 bg-white font-medium"
            >
              {itemType === 'Feed' &&
                feedItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Available: {f.currentStockKg} {f.unit})
                  </option>
                ))}
              {itemType === 'Medicine' &&
                medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Available: {m.stockQuantity} {m.unit})
                  </option>
                ))}
              {itemType === 'Vaccine' &&
                vaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vaccineName} (Available: {v.quantity} doses)
                  </option>
                ))}
              {itemType === 'Semen' &&
                semenStraws.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.bullName} ({s.strawCode}) (Available: {s.quantity} straws)
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Quantity Consumed <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consumption Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Purpose</label>
              <input
                type="text"
                placeholder="e.g. Daily TMR Feeding, Mastitis injection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Cow / Pen / Barn</label>
              <input
                type="text"
                placeholder="e.g. Pen 1 or Cow AN-001"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dispensing Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Administered by assistant vet, no adverse reactions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-amber-600"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Consumption & Decrement Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
