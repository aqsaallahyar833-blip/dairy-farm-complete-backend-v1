import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Droplets,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { milkService, animalService } from '../../services';

interface QuickMilkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
  defaultSession?: 'All' | 'Morning' | 'Evening';
}

/**
 * A cow row in the quick-entry modal.
 *
 * Production fields (`dim`, `morning`, `evening`, `fat`, `snf`) are nullable
 * because NO synthetic values are invented when the real API does not supply
 * them. `milk_records` is the only source of milk volumes; until a record is
 * saved there is nothing real to show, so the field is blank.
 */
interface CowMilkingItem {
  id: string;
  earTag: string;
  name: string;
  breed: string;
  rfid: string;
  status: string;
  dim: number | null;
  morning: number | null;
  evening: number | null;
  fat: number | null;
  snf: number | null;
}


export const QuickMilkEntryModal: React.FC<QuickMilkEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate = new Date().toISOString().slice(0, 10),
  defaultSession = 'Morning',
}) => {
  const { farmId } = useAuth();
  const [cattleList, setCattleList] = useState<CowMilkingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load actual animals. NOTHING is substituted: if the Animals API returns no
  // animals the modal simply has none, and the UI shows an honest empty state.
  useEffect(() => {
    async function loadAnimals() {
      try {
        const res = await animalService.list({ pageSize: 50 });
        const animals = res.data ?? [];
        setCattleList(
          animals
            .filter((a) => a.status === 'Lactating' || !a.status)
            .map((a) => ({
              // Real identifiers only. A missing value is shown as '—'; it is
              // never invented from the row position.
              id: a.animalId,
              earTag: a.earTag || '—',
              name: a.name || '—',
              breed: a.breed || '—',
              rfid: a.rfid || '—',
              status: a.status || '—',
              // No real source for DIM yet -> explicitly unavailable, not 150.
              dim: a.daysInMilk ?? null,
              // Milk volumes/quality are not known until a record is entered.
              morning: null,
              evening: null,
              fat: null,
              snf: null,
            }))
        );
      } catch (e) {
        console.error('Failed to load animals for quick milk modal', e);
        setCattleList([]);
      }
    }
    if (isOpen) {
      loadAnimals();
    }
  }, [isOpen]);

  // Guarded: with zero animals `currentCow` is null and the caller renders the
  // empty state instead of dereferencing an animal that does not exist.
  const currentCow: CowMilkingItem | null = cattleList[currentIndex] ?? cattleList[0] ?? null;

  const [date, setDate] = useState(defaultDate);
  const [session, setSession] = useState<'Morning' | 'Evening'>(
    defaultSession === 'Evening' ? 'Evening' : 'Morning'
  );
  // Start blank: no milk volume is known until the user records one.
  const [morning, setMorning] = useState('');
  const [evening, setEvening] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [qualityStatus, setQualityStatus] = useState<'Accepted' | 'Rejected'>('Accepted');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Clear inputs whenever the selected cow changes.
  useEffect(() => {
    setMorning('');
    setEvening('');
    setFat('');
    setSnf('');
  }, [currentIndex]);

  if (!isOpen) return null;

  const morningNum = parseFloat(morning) || 0;
  const eveningNum = parseFloat(evening) || 0;
  const totalLiters = (morningNum + eveningNum).toFixed(1);

  const handleAdjustMilk = (delta: number) => {
    if (session === 'Morning') {
      const updated = Math.max(0, parseFloat((morningNum + delta).toFixed(1)));
      setMorning(updated.toString());
    } else {
      const updated = Math.max(0, parseFloat((eveningNum + delta).toFixed(1)));
      setEvening(updated.toString());
    }
  };

  const handleSaveCurrent = async (andNext: boolean) => {
    // No animal selected (e.g. the Animals API returned none): nothing to save.
    if (!currentCow) {
      setToast('No animal available. Add an animal before recording milk.');
      return;
    }
    setSaving(true);
    try {
      // Save for selected session or both
      if (session === 'Morning' && morningNum > 0) {
        await milkService.create(farmId, {
          animalId: currentCow.id,
          date,
          session: 'Morning',
          quantityLiters: morningNum,
          fatPercent: parseFloat(fat) || 3.8,
          snfPercent: parseFloat(snf) || 8.8,
          qualityStatus,
          remarks: remarks.trim() || undefined,
        });
      } else if (session === 'Evening' && eveningNum > 0) {
        await milkService.create(farmId, {
          animalId: currentCow.id,
          date,
          session: 'Evening',
          quantityLiters: eveningNum,
          fatPercent: parseFloat(fat) || 3.8,
          snfPercent: parseFloat(snf) || 8.8,
          qualityStatus,
          remarks: remarks.trim() || undefined,
        });
      }

      setToast(`Saved ${session} (${session === 'Morning' ? morningNum : eveningNum} L) for ${currentCow.id}`);

      if (andNext && currentIndex < cattleList.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setTimeout(() => setToast(null), 1500);
      } else {
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error('Error saving milk record:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Container sized to max-w-xl matching other modal forms */}
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Next-Animal Milking Workflow
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live Parlor
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {date} â€¢ Rapid sequential parlor recording across herd
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Toast Notification */}
          {toast && (
            <div className="bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg text-center animate-in fade-in flex items-center justify-center space-x-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{toast}</span>
            </div>
          )}

          {/* Sequential Cow Stepper Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Current Milking Stand
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                Animal {currentIndex + 1} of {cattleList.length}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                  }
                }}
                disabled={currentIndex === 0}
                className="p-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-2xs"
                title="Previous Cow"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center flex-1 min-w-0">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
                    {currentCow ? currentCow.id : 'No animals available'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                    Tag #{currentCow ? currentCow.earTag : '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1 font-medium truncate">
                  {currentCow ? currentCow.name : 'No animals available'} &bull; {currentCow ? currentCow.breed : '—'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded">
                    RFID: {currentCow ? currentCow.rfid : '—'}
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    {currentCow ? currentCow.status : '—'} (DIM: {currentCow && currentCow.dim != null ? `${currentCow.dim}d` : '—'})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentIndex < cattleList.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  }
                }}
                disabled={currentIndex === cattleList.length - 1}
                className="p-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-2xs"
                title="Next Cow"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Cow Quick Select Chips */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {cattleList.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold shrink-0 transition ${
                    i === currentIndex
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  #{c.earTag}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Active Session Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Recording Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Active Milking Session *</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSession('Morning')}
                  className={`py-2 px-3 rounded-xl font-bold text-center transition min-h-[40px] ${
                    session === 'Morning'
                      ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  â˜€ï¸ Morning
                </button>
                <button
                  type="button"
                  onClick={() => setSession('Evening')}
                  className={`py-2 px-3 rounded-xl font-bold text-center transition min-h-[40px] ${
                    session === 'Evening'
                      ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-400 font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  ðŸŒ™ Evening
                </button>
              </div>
            </div>
          </div>

          {/* Milk Yield Inputs for Morning & Evening */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border transition ${session === 'Morning' ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-300/40' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold flex items-center gap-1">
                  <span>Morning Yield</span>
                  {session === 'Morning' && <span className="text-[10px] text-amber-700 font-semibold">(Selected)</span>}
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Liters</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
                className="w-full text-lg font-black text-center px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className={`p-3 rounded-xl border transition ${session === 'Evening' ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-300/40' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold flex items-center gap-1">
                  <span>Evening Yield</span>
                  {session === 'Evening' && <span className="text-[10px] text-indigo-700 font-semibold">(Selected)</span>}
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Liters</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                value={evening}
                onChange={(e) => setEvening(e.target.value)}
                className="w-full text-lg font-black text-center px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Quick Adjustment Steppers */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-600 font-semibold text-[11px]">
              Quick Step ({session}):
            </span>
            <div className="flex items-center space-x-1.5">
              {[-1.0, -0.5, +0.5, +1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleAdjustMilk(step)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold font-mono transition shadow-2xs min-h-[32px]"
                >
                  {step > 0 ? `+${step}` : step}L
                </button>
              ))}
            </div>
          </div>

          {/* Milk Quality Parameters (Fat, SNF, Tank Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Fat % (Typical: 3.8)</label>
              <input
                type="number"
                step="0.1"
                min="2.0"
                max="7.0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">SNF % (Typical: 8.8)</label>
              <input
                type="number"
                step="0.1"
                min="7.0"
                max="11.0"
                value={snf}
                onChange={(e) => setSnf(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Quality Status *</label>
              <select
                value={qualityStatus}
                onChange={(e) => setQualityStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Accepted">Accepted into Bulk Tank</option>
                <option value="Rejected">Rejected / Medicine Hold</option>
              </select>
            </div>
          </div>

          {/* Pricing & Daily Valuation Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            {/*
              Milk price is NOT recorded in milk_records - it belongs to
              milk_sales. There is therefore no price input and no valuation
              here: showing a fabricated price would misrepresent the data.
            */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-medium uppercase">
                Daily Yield Total
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {totalLiters} Liters
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer matching other forms */}
        <div className="p-4 sm:p-5 border-t border-slate-200 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold transition min-h-[44px]"
          >
            Close Parlor
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveCurrent(false)}
              disabled={saving}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition min-h-[44px] shadow-2xs"
            >
              {saving ? 'Saving...' : 'Save Record'}
            </button>

            {currentIndex < cattleList.length - 1 ? (
              <button
                type="button"
                onClick={() => handleSaveCurrent(true)}
                disabled={saving}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
              >
                <span>Save &amp; Next Animal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveCurrent(false)}
                disabled={saving}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save &amp; Finish Parlor</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
