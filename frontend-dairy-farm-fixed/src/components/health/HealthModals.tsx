import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Building2,
  Syringe,
  FileText,
  Stethoscope,
  Info,
} from 'lucide-react';
import {
  Animal,
  Medicine,
  TreatmentRecord,
  HealthRecord,
  VaccinationRecord,
  QuarantineRecord,
  HealthAuditLog,
} from '../../types';
import { healthCalculationService } from '../../services/calculations/healthCalculationService';

// =========================================================================
// 1. NEW TREATMENT MODAL
// =========================================================================
export interface NewTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TreatmentRecord>) => Promise<void>;
  animals: Animal[];
  medicines: Medicine[];
}

/**
 * Real LOCAL today as YYYY-MM-DD.
 *
 * Deliberately NOT `toISOString().slice(0,10)`: that converts to UTC and can
 * return the previous day for users far from Greenwich around midnight.
 */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adds whole days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  const parts = iso.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export const NewTreatmentModal: React.FC<NewTreatmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  animals,
  medicines,
}) => {
  const [animalId, setAnimalId] = useState(animals[0]?.id || '');
  const [date, setDate] = useState(localToday());
  const [diagnosis, setDiagnosis] = useState('');
  const [medicineId, setMedicineId] = useState(medicines[0]?.id || '');
  const [dosage, setDosage] = useState('1 Syringe Intramammary');
  const [route, setRoute] = useState('Intramammary');
  const [durationDays, setDurationDays] = useState(3);
  const [withdrawalDaysMilk, setWithdrawalDaysMilk] = useState(7);
  const [withdrawalDaysMeat, setWithdrawalDaysMeat] = useState(14);
  const [milkDiscardRequired, setMilkDiscardRequired] = useState(true);
  // Milk-usable date is DERIVED from the real treatment date + withdrawal,
// never a hardcoded date. Empty until the user sets a real date.
  const [milkUsableDate, setMilkUsableDate] = useState('');
  const [cost, setCost] = useState(3500);
  const [administeredBy, setAdministeredBy] = useState('');
  const [notes, setNotes] = useState('Milk discard mandatory. Strip quarter 3x daily into disinfectant bucket.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (animals.length > 0 && !animalId) {
      setAnimalId(animals[0].id);
    }
  }, [animals, animalId]);

  useEffect(() => {
    if (medicines.length > 0 && !medicineId) {
      setMedicineId(medicines[0].id);
    }
  }, [medicines, medicineId]);

  // When medicine changes, auto-populate dosage, route, withdrawal days
  const handleMedicineChange = (id: string) => {
    setMedicineId(id);
    const med = medicines.find((m) => m.id === id);
    if (med) {
      const milkDays = med.withdrawalDaysMilk || 0;
      setWithdrawalDaysMilk(milkDays);
      setWithdrawalDaysMeat(med.withdrawalDaysMeat || 0);
      setMilkDiscardRequired(milkDays > 0);
      if (med.defaultDosage) setDosage(med.defaultDosage);
      if (med.defaultRoute) setRoute(med.defaultRoute);
      if (med.unitPrice) setCost(med.unitPrice);
    }
  };

  // Auto-calculate Milk Hold Until Date = Date + durationDays + withdrawalDaysMilk
  useEffect(() => {
    if (milkDiscardRequired && withdrawalDaysMilk > 0) {
      const totalDays = Number(durationDays || 1) + Number(withdrawalDaysMilk || 0);
      const calculated = healthCalculationService.calculateMilkHoldUntil(date, totalDays);
      setMilkUsableDate(calculated);
    } else {
      setMilkUsableDate(date);
    }
  }, [date, durationDays, withdrawalDaysMilk, milkDiscardRequired]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) {
      setErrorMsg('Please select a target animal');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const selectedAnimal = animals.find((a) => a.id === animalId);
      const selectedMed = medicines.find((m) => m.id === medicineId);

      await onSubmit({
        animalId,
        animalTag: selectedAnimal?.earTag || selectedAnimal?.animalId || animalId,
        animalName: selectedAnimal?.name || 'Unnamed',
        date,
        startDate: date,
        problem: diagnosis,
        diagnosis,
        medicineId,
        medicineName: selectedMed?.name || 'Veterinary Medication',
        medicineBatch: selectedMed?.batchNumber || 'MED-BATCH-01',
        dose: dosage,
        dosage,
        route,
        durationDays: Number(durationDays),
        milkWithdrawalDays: Number(withdrawalDaysMilk),
        meatWithdrawalDays: Number(withdrawalDaysMeat),
        milkUsableDate: milkDiscardRequired ? milkUsableDate : date,
        isWithdrawalActive: milkDiscardRequired && Number(withdrawalDaysMilk) > 0,
        status: 'In Treatment',
        veterinarian: administeredBy,
        administeredBy,
        cost: Number(cost),
        treatmentCost: Number(cost),
        treatmentInstructions: notes,
        remarks: milkDiscardRequired ? `Milk hold until ${milkUsableDate}. Do not milk into bulk tank.` : 'Zero milk withdrawal.',
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record treatment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Veterinary Treatment</h3>
              <p className="text-xs text-slate-500">
                Automated milk withdrawal calculation &amp; parlor synchronization
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Animal */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Animal *</label>
            <select
              required
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.earTag || a.animalId} — {a.name || 'Unnamed'} ({a.status} &bull; {a.breed} &bull; {a.location || 'Main Barn'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Treatment Start Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Diagnosis / Indication *</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Clinical Mastitis, Tick Fever"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Medicine & Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Prescribed Medication *</label>
              <select
                required
                value={medicineId}
                onChange={(e) => handleMedicineChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category} &bull; Milk: {m.withdrawalDaysMilk || 0}d)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Administration Route *</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Intramammary">Intramammary (Teat Canal)</option>
                <option value="Intramuscular">Intramuscular (Deep IM)</option>
                <option value="Subcutaneous">Subcutaneous (Sub-Q)</option>
                <option value="Intravenous">Intravenous (Slow IV)</option>
                <option value="Oral">Oral (Drench / Bolus)</option>
                <option value="Topical">Topical / Wound Spray</option>
              </select>
            </div>
          </div>

          {/* Dosage & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Dosage *</label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 25 ml deep IM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Duration (Days)</label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Est. Cost (Rs)</label>
              <input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Milk Withdrawal Section with Auto-Calculations */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={milkDiscardRequired}
                  onChange={(e) => setMilkDiscardRequired(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Mandatory Antimicrobial Milk Withdrawal Hold</span>
              </label>
              {milkDiscardRequired && withdrawalDaysMilk > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded">
                  Do Not Milk Into Bulk Tank
                </span>
              )}
            </div>

            {milkDiscardRequired && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Milk Withdrawal Days</label>
                  <input
                    type="number"
                    min={0}
                    value={withdrawalDaysMilk}
                    onChange={(e) => setWithdrawalDaysMilk(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Formula: Start Date + Duration + Withdrawal Days
                  </span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calculated Milk Hold Until</label>
                  <div className="px-3 py-2 bg-white border border-rose-300 rounded-lg font-mono font-bold text-rose-800 flex items-center justify-between">
                    <span>{milkUsableDate}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 rounded text-rose-700">Strict Hold</span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">
                    Milk must be dumped/diverted until this date
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Meat Withdrawal (Days)</label>
              <input
                type="number"
                min={0}
                value={withdrawalDaysMeat}
                onChange={(e) => setWithdrawalDaysMeat(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Attending Veterinarian *</label>
              <input
                type="text"
                required
                value={administeredBy}
                onChange={(e) => setAdministeredBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Clinical Instructions &amp; Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Teat dip post-milking, strip into waste bucket, monitoring protocol..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>{submitting ? 'Recording...' : 'Register Treatment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 2. COMPLETE HOLD MODAL (With Clinical/Laboratory Clearance Verification)
// =========================================================================
export interface CompleteHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { override?: boolean; overrideReason?: string; authorizedBy?: string }) => Promise<void>;
  treatment: TreatmentRecord | null;
}

export const CompleteHoldModal: React.FC<CompleteHoldModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  treatment,
}) => {
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [clearanceProtocol, setClearanceProtocol] = useState(
    'Delvotest SP-NT negative (zero antibiotic residue verified in laboratory)'
  );
  const [verifiedConsent, setVerifiedConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !treatment) return null;

  const todayStr = localToday(); // real LOCAL operational date
  const isEarlyRelease = treatment.milkUsableDate > todayStr && treatment.isWithdrawalActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEarlyRelease && !verifiedConsent) {
      setErrorMsg('You must certify veterinary clearance and negative residue verification.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm({
        override: isEarlyRelease,
        overrideReason: clearanceProtocol,
        authorizedBy,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete hold');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Complete Milk Withdrawal Hold</h3>
              <p className="text-xs text-slate-500">Biosecurity &amp; parlor release clearance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Verification Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Target Animal:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {treatment.animalTag || treatment.animalId} {treatment.animalName ? `(${treatment.animalName})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Prescribed Medicine:</span>
            <span className="font-semibold text-slate-900">{treatment.medicineName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Dosage &amp; Route:</span>
            <span className="text-slate-800">{treatment.dosage || treatment.dose} ({treatment.route})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Treatment Started:</span>
            <span className="font-mono text-slate-800">{treatment.date}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="font-semibold text-slate-500">Scheduled Hold Date:</span>
            <span className="font-mono font-bold text-rose-700">{treatment.milkUsableDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Current Farm Date:</span>
            <span className="font-mono font-semibold text-slate-900">{todayStr}</span>
          </div>
        </div>

        {isEarlyRelease ? (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Early Release Protocol (Hold until {treatment.milkUsableDate})</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Completing this hold before {treatment.milkUsableDate} requires laboratory verification that no antibiotic residues remain in the milk. An audit log entry will be created.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Withdrawal Duration Elapsed</span>
            </div>
            <p className="text-emerald-800 text-[11px]">
              The required holding period has passed. Animal milk can safely be reintroduced into bulk tank storage.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Clearance Protocol / Test Basis *</label>
            <select
              value={clearanceProtocol}
              onChange={(e) => setClearanceProtocol(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              <option value="Delvotest SP-NT negative (zero antibiotic residue verified in laboratory)">
                Delvotest SP-NT negative (Zero antibiotic residue verified)
              </option>
              <option value="Charm Tetracycline ROSA strip test negative (<50 ppb)">
                Charm Tetracycline ROSA strip test negative (&lt;50 ppb)
              </option>
              <option value="California Mastitis Test (CMT) negative score & somatic cell count normalized">
                California Mastitis Test (CMT) negative &amp; SCC normalized
              </option>
              <option value="Standard withdrawal duration successfully elapsed without complications">
                Standard withdrawal duration successfully elapsed
              </option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Certifying Veterinarian *</label>
            <input
              type="text"
              required
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            />
          </div>

          {isEarlyRelease && (
            <label className="flex items-start space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                required
                checked={verifiedConsent}
                onChange={(e) => setVerifiedConsent(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-[11px] text-slate-700 leading-tight">
                I certify that a diagnostic residue test has confirmed zero antimicrobial residues in milk from{' '}
                <strong>{treatment.animalTag || treatment.animalId}</strong>, and release this cow for bulk tank collection.
              </span>
            </label>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Verifying...' : 'Authorize & Clear Hold'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. NEW HEALTH EVENT MODAL
// =========================================================================
export interface NewHealthEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<HealthRecord>) => Promise<void>;
  animals: Animal[];
}

export const NewHealthEventModal: React.FC<NewHealthEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  animals,
}) => {
  const [animalId, setAnimalId] = useState(animals[0]?.id || '');
  const [date, setDate] = useState(localToday());
  const [eventType, setEventType] = useState('Disease');
  const [problem, setProblem] = useState('Reduced Rumination & Fever');
  const [diagnosis, setDiagnosis] = useState('Acute Bovine Respiratory Disease');
  const [symptoms, setSymptoms] = useState('Nasal discharge, rectal temp 104.2°F, labored breathing');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Moderate');
  const [veterinarian, setVeterinarian] = useState('');
  const [cost, setCost] = useState(2500);
  const [status, setStatus] = useState<'In Treatment' | 'Under Treatment' | 'Reported' | 'Recovered'>('In Treatment');
  const [remarks, setRemarks] = useState('Isolate in pen 2 and begin supportive electrolyte therapy.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (animals.length > 0 && !animalId) {
      setAnimalId(animals[0].id);
    }
  }, [animals, animalId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) {
      setErrorMsg('Please select an animal');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cow = animals.find((a) => a.id === animalId);
      await onSubmit({
        animalId,
        animalTag: cow?.earTag || cow?.animalId || animalId,
        animalName: cow?.name || 'Unnamed',
        date,
        eventDate: date,
        eventType: eventType as any,
        problem,
        diagnosis,
        symptoms,
        severity,
        veterinarian,
        cost: Number(cost),
        status,
        remarks,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save health event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Clinical Health Event</h3>
              <p className="text-xs text-slate-500">Record veterinary observation, diagnosis &amp; findings</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Animal *</label>
            <select
              required
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.earTag || a.animalId} — {a.name || 'Unnamed'} ({a.breed} &bull; {a.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Observation Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Event Category *</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="Disease">Disease / Clinical Illness</option>
                <option value="Injury">Physical Trauma / Injury</option>
                <option value="Routine Examination">Routine Examination</option>
                <option value="Deworming">Deworming / Parasitology</option>
                <option value="Reproductive Health">Reproductive Health</option>
                <option value="Emergency">Emergency Biosecurity Call</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Clinical Problem *</label>
              <input
                type="text"
                required
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g. Mastitis, Lameness"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Diagnosis *</label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bovine Respiratory Disease"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Symptoms Observed</label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Detailed physical exam findings, temperature, rumen motility, appetite..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Examining Vet *</label>
              <input
                type="text"
                required
                value={veterinarian}
                onChange={(e) => setVeterinarian(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Est. Cost (Rs)</label>
              <input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Clinical Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="In Treatment">In Treatment</option>
                <option value="Under Treatment">Under Treatment</option>
                <option value="Reported">Reported</option>
                <option value="Recovered">Recovered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Treatment Plan / Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Health Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 4. NEW VACCINATION MODAL
// =========================================================================
export interface NewVaccinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<VaccinationRecord>) => Promise<void>;
}

export const NewVaccinationModal: React.FC<NewVaccinationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [disease, setDisease] = useState('Foot and Mouth Disease (FMD)');
  const [vaccineName, setVaccineName] = useState('Aftovaxpur FMD Oil Adjuvant Vaccine');
  const [targetGroup, setTargetGroup] = useState('Whole Herd (Cows & Heifers)');
  const [dateAdministered, setDateAdministered] = useState(localToday());
  const [boosterIntervalMonths, setBoosterIntervalMonths] = useState(6);
  const [nextDueDate, setNextDueDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('Veterinary Research Institute Lahore');
  const [veterinarian, setVeterinarian] = useState('');
  const [dose, setDose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const calculated = healthCalculationService.calculateVaccineNextDueDate(
      dateAdministered,
      Number(boosterIntervalMonths)
    );
    setNextDueDate(calculated);
  }, [dateAdministered, boosterIntervalMonths]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        disease,
        vaccineName,
        targetGroup,
        dateAdministered,
        nextDueDate,
        batchNumber,
        manufacturer,
        veterinarian,
        dose,
        status: 'Completed',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register vaccination');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Herd Vaccination</h3>
              <p className="text-xs text-slate-500">Prophylactic biosecurity &amp; immunity tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Disease *</label>
              <select
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="Foot and Mouth Disease (FMD)">Foot &amp; Mouth Disease (FMD)</option>
                <option value="Hemorrhagic Septicemia (HS)">Hemorrhagic Septicemia (HS - Gal Ghotu)</option>
                <option value="Blackleg (BQ)">Blackleg (BQ - Choki)</option>
                <option value="Lumpy Skin Disease (LSD)">Lumpy Skin Disease (LSD)</option>
                <option value="Anthrax">Anthrax</option>
                <option value="Brucellosis">Brucellosis (Calfhood S19)</option>
                <option value="Enterotoxemia">Enterotoxemia</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Vaccine Brand / Name *</label>
              <input
                type="text"
                required
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Herd Group *</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Whole Herd (Cows & Heifers)">Whole Herd (Cows &amp; Heifers)</option>
                <option value="Lactating Cows Only">Lactating Cows Only</option>
                <option value="Dry Cows Only">Dry Cows Only</option>
                <option value="Pregnant Heifers">Pregnant Heifers</option>
                <option value="Young Calves (3-6 Months)">Young Calves (3-6 Months)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Batch / Lot Number *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Administered Date *</label>
              <input
                type="date"
                required
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Booster Interval</label>
              <select
                value={boosterIntervalMonths}
                onChange={(e) => setBoosterIntervalMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value={6}>6 Months (Biannual)</option>
                <option value={12}>12 Months (Annual)</option>
                <option value={3}>3 Months (Quarterly)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Next Booster Due</label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Dose &amp; Route *</label>
              <input
                type="text"
                required
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supervising Veterinarian *</label>
            <input
              type="text"
              required
              value={veterinarian}
              onChange={(e) => setVeterinarian(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Syringe className="w-3.5 h-3.5" />
              <span>{submitting ? 'Recording...' : 'Register Vaccination'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 5. NEW QUARANTINE MODAL
// =========================================================================
export interface NewQuarantineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QuarantineRecord>) => Promise<void>;
  animals: Animal[];
}

export const NewQuarantineModal: React.FC<NewQuarantineModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  animals,
}) => {
  const [animalId, setAnimalId] = useState(animals[0]?.id || '');
  const [reason, setReason] = useState('Post-Purchase Intake Biosecurity Observation (14 Days)');
  const [isolationLocation, setIsolationLocation] = useState('Isolation Shed - Pen 1');
  const [startDate, setStartDate] = useState(localToday());
  const [expectedReleaseDate, setExpectedReleaseDate] = useState('');
  const [releaseCriteria, setReleaseCriteria] = useState(
    '14 consecutive days afebrile & negative Brucella / FMD antibody screen'
  );
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [notes, setNotes] = useState('Separate feed and water troughs. Disinfect footwear before entry.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (animals.length > 0 && !animalId) {
      setAnimalId(animals[0].id);
    }
  }, [animals, animalId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) {
      setErrorMsg('Please select an animal');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cow = animals.find((a) => a.id === animalId);
      await onSubmit({
        animalId,
        animalTag: cow?.earTag || cow?.animalId || animalId,
        animalName: cow?.name || 'Unnamed',
        reason,
        isolationLocation,
        startDate,
        expectedReleaseDate,
        releaseCriteria,
        responsiblePerson,
        status: 'Active',
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to admit animal to quarantine');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transfer Animal to Quarantine</h3>
              <p className="text-xs text-slate-500">Biocontainment &amp; clinical isolation protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Animal to Isolate *</label>
            <select
              required
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.earTag || a.animalId} — {a.name || 'Unnamed'} ({a.breed} &bull; {a.status} &bull; Current: {a.location || 'Shed 1'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Quarantine / Isolation Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              <option value="Post-Purchase Intake Biosecurity Observation (14 Days)">
                Post-Purchase Intake Biosecurity Observation (14 Days)
              </option>
              <option value="Suspected Contagious Foot Rot / Digital Dermatitis">
                Suspected Contagious Foot Rot / Digital Dermatitis
              </option>
              <option value="Acute High Fever / Infectious Pathogen Isolation">
                Acute High Fever / Infectious Pathogen Isolation
              </option>
              <option value="CMT Grade 3 Clinical Mastitis & Teat Lesion Hold">
                CMT Grade 3 Clinical Mastitis &amp; Teat Lesion Hold
              </option>
              <option value="Post-Calving Metritis Observation & Convalescence">
                Post-Calving Metritis Observation &amp; Convalescence
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Isolation Pen / Shed *</label>
              <select
                value={isolationLocation}
                onChange={(e) => setIsolationLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="Isolation Shed - Pen 1">Isolation Shed - Pen 1</option>
                <option value="Isolation Shed - Pen 2">Isolation Shed - Pen 2</option>
                <option value="Isolation Shed - Pen 3">Isolation Shed - Pen 3</option>
                <option value="North Quarantine Paddock">North Quarantine Paddock</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Admission Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Expected Release Date *</label>
              <input
                type="date"
                required
                value={expectedReleaseDate}
                onChange={(e) => setExpectedReleaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Responsible Veterinarian *</label>
              <input
                type="text"
                required
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Release Criteria *</label>
            <input
              type="text"
              required
              value={releaseCriteria}
              onChange={(e) => setReleaseCriteria(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Biosecurity Instructions / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Transferring...' : 'Confirm Quarantine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
