import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Warehouse as WarehouseIcon, Trash2 } from 'lucide-react';
import { Warehouse } from '../../types';

// =========================================================================
// WAREHOUSE MODAL (Add / Edit)
// =========================================================================
interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wh: Partial<Warehouse>) => Promise<void>;
  initialData?: Warehouse | null;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Warehouse>>({
    name: '',
    code: '',
    type: 'Silage Bunker',
    capacity: 50000,
    location: 'Main Yard',
    manager: 'Muhammad Akram',
    temperatureControlled: false,
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        name: '',
        code: `WH-${Date.now().toString().slice(-4)}`,
        type: 'Silage Bunker',
        capacity: 50000,
        location: 'Main Yard',
        manager: 'Muhammad Akram',
        temperatureControlled: false,
        notes: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Warehouse Name is required.');
      return;
    }
    if ((Number(formData.capacity) || 0) <= 0) {
      setError('Capacity must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save warehouse');
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
              <WarehouseIcon className="w-5 h-5 text-emerald-700" />
              <span>{initialData ? 'Edit Warehouse / Silo Facility' : 'Add New Inventory Warehouse / Silo'}</span>
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
                Warehouse Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Silo Bunker B, Feed Shed 2"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Code</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse Type</label>
              <select
                value={formData.type || 'Silage Bunker'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
              >
                <option value="Silage Bunker">Silage Bunker</option>
                <option value="Dry Feed Shed">Dry Feed Shed</option>
                <option value="Veterinary Pharmacy">Veterinary Pharmacy</option>
                <option value="Cryogenic Semen Bank">Cryogenic Semen Bank</option>
                <option value="General Store">General Store</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Capacity (kg or units) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity ?? ''}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Location</label>
              <input
                type="text"
                placeholder="e.g. North East Yard"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manager / Custodian</label>
              <input
                type="text"
                value={formData.manager || ''}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
            <input
              type="checkbox"
              id="tempControlled"
              checked={Boolean(formData.temperatureControlled)}
              onChange={(e) => setFormData({ ...formData, temperatureControlled: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="tempControlled" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Temperature Controlled Facility (Cold Room or Cryo Storage)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Operating Guidelines</label>
            <textarea
              rows={2}
              placeholder="e.g. Moisture sealing verified, pest control active..."
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
              {isSubmitting ? 'Saving...' : initialData ? 'Update Warehouse' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// DELETE CONFIRMATION MODAL
// =========================================================================
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

export const DeleteConfirmModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 mb-5">{message}</p>
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
