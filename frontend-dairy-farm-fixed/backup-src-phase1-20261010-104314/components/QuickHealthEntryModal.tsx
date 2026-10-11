function toLocalISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}--`;
}
import React, { useState } from 'react';
import {
  Stethoscope,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { healthService } from '../services';
import { localToday } from './health/HealthModals';
import { useAuth } from '../context/AuthContext';

interface QuickHealthEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickHealthEntryModal: React.FC<QuickHealthEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { farmId } = useAuth();
  // No fabricated animal id / diagnosis defaults: both come from the operator.
  const [animalId, setAnimalId] = useState('');
  const [problem, setProblem] = useState('');
  const [medicineName, setMedicineName] = useState('Intramast-DC');
  const [dose, setDose] = useState('10 ml');
  const [duration, setDuration] = useState('3 Days');
  const [withdrawalDays, setWithdrawalDays] = useState('5');
  const [vetName, setVetName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Calculate milk usable date based on withdrawal days
  const today = new Date();
  const daysNum = parseInt(withdrawalDays) || 0;
  const usableDate = new Date(today.getTime() + (daysNum + 2) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await healthService.createTreatment(farmId, {
        animalId,
        date: localToday(),
        problem,
        medicineId: 'med-01',
        medicineName,
        dose,
        durationDays: 3,
        veterinarian: vetName,
        status: 'In Treatment',
        withdrawalStartDate: '',
        withdrawalEndDate: usableDate,
        milkUsableDate: usableDate,
        isWithdrawalActive: daysNum > 0,
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom-5 max-h-[90vh] overflow-y-auto">
        {/* Header (Matching Screen 11 in mockup) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mobile Fast Health Entry</h3>
              <p className="text-[11px] text-slate-500">Record diagnosis & medicine administration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Target Animal *</label>
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white font-medium"
            >
              <option value="">Select an animal…</option>
              <option value="HF-031">HF-031 (Daisy) - Lactating</option>
              <option value="HF-014">HF-014 (Molly) - Lactating</option>
              <option value="HF-021">HF-021 (Lucy) - Lactating</option>
              <option value="HF-045">HF-045 (Zara) - Dry Cow</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Problem / Clinical Diagnosis *</label>
            <select
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="Mastitis">Mastitis (Clinical Udder Infection)</option>
              <option value="Tick Fever">Tick Fever / Theileriosis</option>
              <option value="Foot Rot / Lameness">Foot Rot / Lameness</option>
              <option value="Ketosis">Ketosis / Metabolic Disorder</option>
              <option value="Milk Fever">Milk Fever (Hypocalcemia)</option>
              <option value="Respiratory Disease">Pneumonia / Respiratory</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Medicine Name *</label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Dosage</label>
              <input
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Antimicrobial Withdrawal Calculation */}
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Milk Withdrawal Hold (Days)
              </span>
              <input
                type="number"
                min="0"
                value={withdrawalDays}
                onChange={(e) => setWithdrawalDays(e.target.value)}
                className="w-16 text-center font-bold px-2 py-1 border border-amber-300 rounded-lg bg-white"
              />
            </div>
            {daysNum > 0 ? (
              <p className="text-[11px] text-amber-800">
                ⚠️ Milk will be locked from bulk tank until{' '}
                <strong className="text-amber-950 underline">{usableDate}</strong>.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-800">
                ✓ Zero milk withdrawal (Safe for immediate milking).
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Attending Veterinarian</label>
            <input
              type="text"
              value={vetName}
              onChange={(e) => setVetName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold min-h-[46px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold shadow-xs transition min-h-[46px]"
            >
              {saving ? 'Recording Treatment...' : 'Record Health Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
