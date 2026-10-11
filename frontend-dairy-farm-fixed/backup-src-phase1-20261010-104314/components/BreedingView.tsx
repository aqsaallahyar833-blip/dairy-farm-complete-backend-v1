import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Baby,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  LayoutGrid,
  List,
  ChevronRight,
  User,
  ShieldAlert,
  Sparkles,
  Filter,
  Check,
  ArrowRight,
  X,
  Stethoscope,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { breedingService, animalService, pregnancyService } from '../services';
import { calvingApi } from '../services/api/apiClient';
import { useAuth } from '../context/AuthContext';
import type { BreedingEventType } from '../services/api/apiClient';
import { PregnancyRecord } from '../types';
import { Animal, BreedingRecord, CalvingRecord, CreateBreedingInput, CreateCalvingInput } from '../types';

/**
 * Finds the real animal a pregnancy belongs to.
 *
 * Both sides are compared as STRINGS because `PregnancyRecord.animalId` is the
 * string form of the DB id. No `.toLowerCase()` is called on a possibly-non-string
 * value, so the previous `selectedAnimalId.toLowerCase is not a function` class
 * of error cannot occur.
 */
function eligibleOrNull(cows: Animal[], animalId: string | undefined): Animal | null {
  if (!animalId) return null;
  const key = String(animalId);
  return cows.find((c) => String(c.id) === key) ?? null;
}

export const BreedingView: React.FC = () => {
  // Farm scope comes from the AUTHENTICATED identity, never hardcoded.
  const { farmId } = useAuth();

  // Page Tab: 'breeding' (Section 8) | 'calving' (Section 9)
  const [activeTab, setActiveTab] = useState<'breeding' | 'calving'>('breeding');

  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [calvingRecords, setCalvingRecords] = useState<CalvingRecord[]>([]);
  const [eligibleCows, setEligibleCows] = useState<Animal[]>([]);
  // Persisted pregnancies, sourced from the real `/api/pregnancies`. This is NOT
// derived from Animal.status === 'Pregnant': animal status is a herd label, a
// pregnancy is its own row.
const [pregnancies, setPregnancies] = useState<PregnancyRecord[]>([]);

  // Confirmed pregnancies, ordered by the database's own expected calving date.
  // Pregnancies with no expected date sort last rather than receiving a fake one.
  const activePregnancies = useMemo(
    () =>
      pregnancies
        .filter((p) => p.status === 'CONFIRMED')
        .sort((a, b) => {
          const da = a.expectedCalvingDate ? new Date(a.expectedCalvingDate).getTime() : Infinity;
          const db = b.expectedCalvingDate ? new Date(b.expectedCalvingDate).getTime() : Infinity;
          return da - db;
        }),
    [pregnancies]
  );
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Mobile View Toggle: 'card' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Sorting for Insemination & Breeding Registry (Default: Animal ID Ascending)
  const [sortField, setSortField] = useState<
    'animalId' | 'serviceDate' | 'method' | 'semenStrawCode' | 'inseminatorName' | 'pregnancyResult' | 'expectedCalvingDate'
  >('animalId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Modals
  const [showHeatModal, setShowHeatModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPdModal, setShowPdModal] = useState(false);
  const [showCalvingModal, setShowCalvingModal] = useState(false);
  const [showCalvingSuccessModal, setShowCalvingSuccessModal] = useState<{
    damTag: string;
    calfTag: string;
    calfSex: string;
    birthWeight: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forms state
  // Forms state.
// Dates default to TODAY (not a fabricated historical date). People, straw
// codes and notes start EMPTY: nothing about a real animal is known up front,
// so nothing is pre-filled as if it were observed fact.
const TODAY = new Date().toISOString().slice(0, 10);

const [heatForm, setHeatForm] = useState({
    animalId: '',
    heatDate: TODAY,
    heatIntensity: 'Standing' as 'Mild' | 'Moderate' | 'Standing',
    observedBy: '',
    notes: '',
  });

  const [aiForm, setAiForm] = useState<CreateBreedingInput>({
    animalId: '',
    heatDate: TODAY,
    heatIntensity: 'Standing',
    observedBy: '',
    serviceDate: TODAY,
    method: 'AI',
    semenStrawCode: '',
    inseminatorName: '',
    cost: 0,
    pregnancyResult: 'Pending',
    notes: '',
  });

  const [pdForm, setPdForm] = useState({
    animalId: '',
    pdDate: TODAY,
    result: 'Positive' as 'Positive' | 'Negative' | 'Pending',
    method: 'Ultrasound',
    daysPregnant: 0,
    vetName: '',
    notes: '',
  });

  const [calvingForm, setCalvingForm] = useState({
    damId: '',
    calvingDate: TODAY,
    calvingTime: '04:30',
    // Only difficulties that map to a real `calving_type` ENUM value.
    difficulty: 'Normal' as CalvingRecord['difficulty'],
    calfCount: 'Single',
    // NOTE: the calf fields below are NOT persisted by the current backend.
    // They are kept so the form still compiles and renders, but they start
    // EMPTY (never a fabricated example) and the UI states they are not saved.
    calfSex: 'Female' as 'Female' | 'Male',
    birthWeightKg: 0,
    calfTag: '',
    calfName: '',
    colostrumFedLiters: 0,
    colostrumFedHoursPostBirth: 0,
    complications: '',
    notes: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [breedRes, cowsRes, calvRes, pregRes] = await Promise.all([
        breedingService.list(farmId, { pageSize: 50 }),
        animalService.list({ pageSize: 100 }),
        // Real persisted calving rows from GET /api/calvings?farmId=...
        // NOT animalService.listCalvings(), which is the animal-history mock.
        calvingApi.list(farmId),
        pregnancyService.list(farmId),
      ]);
      setBreedingRecords(breedRes.data);
      setPregnancies(pregRes.data);
      // An empty API response is a legitimate empty state, not a failure.
      setCalvingRecords(calvRes.data ?? []);

      const femaleCows = cowsRes.data.filter((a) => a.sex === 'Female');
      setEligibleCows(femaleCows);

      // Active pregnancies = real persisted rows. Sorted by the expected calving date
      // the DATABASE holds; a pregnancy with no expected date sorts last. No date
      // is invented for display.
      const activePregnancies = pregRes.data
        .filter((p) => p.status === 'CONFIRMED')
        .sort((a, b) => {
          const da = a.expectedCalvingDate ? new Date(a.expectedCalvingDate).getTime() : Infinity;
          const db = b.expectedCalvingDate ? new Date(b.expectedCalvingDate).getTime() : Infinity;
          return da - db;
        });

      if (femaleCows.length > 0) {
        if (!selectedAnimalId) setSelectedAnimalId(femaleCows[0].id);
        if (!heatForm.animalId) setHeatForm((prev) => ({ ...prev, animalId: femaleCows[0].id }));
        if (!aiForm.animalId) setAiForm((prev) => ({ ...prev, animalId: femaleCows[0].id }));
        if (!pdForm.animalId) setPdForm((prev) => ({ ...prev, animalId: femaleCows[0].id }));
        if (!calvingForm.damId) {
          // Prefer a dam that genuinely has a persisted pregnancy, matched by
          // the REAL animal id. Falls back to the first real female.
          const confirmed = activePregnancies[0];
          const pregnantCow = confirmed
            ? eligibleOrNull(femaleCows, confirmed.animalId)
            : null;
          const dam = pregnantCow || femaleCows[0];
          setCalvingForm((prev) => ({ ...prev, damId: dam.id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Selected animal data & timeline
  const selectedAnimal = useMemo(() => {
    return eligibleCows.find((c) => c.id === selectedAnimalId) || eligibleCows[0] || null;
  }, [eligibleCows, selectedAnimalId]);

  const selectedAnimalBreeding = useMemo(() => {
    if (!selectedAnimal) return null;
    return breedingRecords.find((b) => b.animalId === selectedAnimal.id) || null;
  }, [breedingRecords, selectedAnimal]);

  // Memoized sorted breeding records (Default: Animal ID Ascending)
  const sortedBreedingRecords = useMemo(() => {
    return [...breedingRecords].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'animalId') {
        cmp = (a.animalId || '').localeCompare(b.animalId || '', undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'serviceDate') {
        const da = a.serviceDate || a.heatDate || '';
        const db = b.serviceDate || b.heatDate || '';
        cmp = da.localeCompare(db);
      } else if (sortField === 'method') {
        cmp = (a.method || '').localeCompare(b.method || '');
      } else if (sortField === 'semenStrawCode') {
        const sa = a.semenStrawCode || a.semenCode || a.bullTag || '';
        const sb = b.semenStrawCode || b.semenCode || b.bullTag || '';
        cmp = sa.localeCompare(sb);
      } else if (sortField === 'inseminatorName') {
        const ia = a.inseminatorName || a.technician || a.observedBy || '';
        const ib = b.inseminatorName || b.technician || b.observedBy || '';
        cmp = ia.localeCompare(ib);
      } else if (sortField === 'pregnancyResult') {
        const pa = a.pregnancyResult || 'Pending';
        const pb = b.pregnancyResult || 'Pending';
        cmp = pa.localeCompare(pb);
      } else if (sortField === 'expectedCalvingDate') {
        const ca = a.expectedCalvingDate || '';
        const cb = b.expectedCalvingDate || '';
        cmp = ca.localeCompare(cb);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [breedingRecords, sortField, sortDirection]);

  // Form submit handlers
  const handleHeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const sDate = heatForm.heatDate;
      // One heat observation == ONE backend HEAT event. heatIntensity and
      // observedBy have no column in breeding_events and are not persisted.
      await breedingService.create(
        farmId,
        {
          animalId: heatForm.animalId,
          heatDate: sDate,
          serviceDate: sDate,
          method: 'AI',
          inseminatorName: heatForm.observedBy,
          technician: heatForm.observedBy,
          pregnancyResult: 'Pending',
          notes: `[Heat Observation]: ${heatForm.notes}`,
        },
        'HEAT' as BreedingEventType,
        sDate
      );
      setShowHeatModal(false);
      showToast('Standing heat observation recorded');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save heat observation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const sDate = aiForm.serviceDate || aiForm.heatDate;

      if (!sDate) {
        setErrorMsg('Please provide a service date before saving.');
        return;
      }

      // One insemination == ONE backend AI / NATURAL_SERVICE event.
      await breedingService.create(
        farmId,
        {
          ...aiForm,
          serviceDate: sDate,
          inseminatorName: aiForm.inseminatorName,
          technician: aiForm.technician,
          pregnancyResult: aiForm.pregnancyResult || 'Pending',
        },
        (aiForm.method === 'Natural' || aiForm.method === 'Natural Service'
          ? 'NATURAL_SERVICE'
          : 'AI') as BreedingEventType,
        sDate
      );
      setShowAiModal(false);
      showToast(`Insemination logged for ${aiForm.animalId}`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save breeding record');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Find existing record or build clean fallback
      const existing = breedingRecords.find((b) => b.animalId === pdForm.animalId);
      const sDate = pdForm.pdDate;

      let expectedCalving = existing?.expectedCalvingDate;
      if (pdForm.result === 'Positive' && !expectedCalving && sDate) {
        const d = new Date(sDate);
        d.setDate(d.getDate() + 282);
        expectedCalving = d.toISOString().split('T')[0];
      }

      // 1) The PREGNANCY_CHECK event is created FIRST and must succeed.
      const pdEvent = await breedingService.create(
        farmId,
        {
          animalId: pdForm.animalId,
          heatDate: existing?.heatDate || sDate,
          serviceDate: sDate,
          method: existing?.method || 'AI',
          inseminatorName: pdForm.vetName,
          technician: pdForm.vetName,
          pregnancyResult: pdForm.result,
          expectedCalvingDate: expectedCalving,
          notes: `[PD Check by ${pdForm.vetName}]: ${pdForm.notes}`,
        },
        'PREGNANCY_CHECK' as BreedingEventType,
        sDate
      );

      if (!pdEvent.success || !pdEvent.data) {
        setErrorMsg(pdEvent.message || 'Failed to record the pregnancy check.');
        return;
      }

      // 2) Only now, using the REAL persisted breeding event id, do we create the
      //    pregnancy row. A failure here is reported plainly - no local state is
      //    faked and no "saved" message is shown.
      if (pdForm.result === 'Positive') {
        const preg = await pregnancyService.create(farmId, {
          animalId: pdForm.animalId,
          status: 'CONFIRMED',
          breedingEventId: pdEvent.data.id,
          // conception_date only from a genuine persisted service date.
          conceptionDate: existing?.serviceDate,
          confirmationDate: pdForm.pdDate,
          expectedCalvingDate: expectedCalving,
          notes: pdForm.notes || undefined,
        });
        if (!preg.success) {
          setErrorMsg(
            `Pregnancy check was saved, but the pregnancy record was not: ${
              preg.message || 'unknown error'
            }`
          );
          return;
        }
      }

      setShowPdModal(false);
      showToast(`Pregnancy Diagnosis recorded: ${pdForm.result}`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save pregnancy diagnosis');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalvingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1) Validate only genuinely required, genuinely persistable fields.
    if (!calvingForm.damId) {
      setErrorMsg('Please select the dam (animal) for this calving.');
      return;
    }
    if (!calvingForm.calvingDate) {
      setErrorMsg('Please enter the calving date.');
      return;
    }

    setSubmitting(true);
    try {
      // 2) The REAL persisted pregnancy id for this dam, from Step 2B data.
      //    Never derived from Animal.status === 'Pregnant'.
      const damPregnancy = activePregnancies.find(
        (p) => String(p.animalId) === String(calvingForm.damId)
      );

      const input: CreateCalvingInput = {
        damId: calvingForm.damId,
        pregnancyId: damPregnancy?.id,
        calvingDate: calvingForm.calvingDate,
        difficulty: calvingForm.difficulty,
        calfCount: 1,
        veterinarianName: pdForm.vetName || undefined,
        // Calf attributes are intentionally NOT sent - the backend records the
        // calf itself from calfCount and has no path for sex/weight/tag.
        calfSex: calvingForm.calfSex,
        birthWeightKg: calvingForm.birthWeightKg,
        createCalfRecord: true,
        calfTag: calvingForm.calfTag,
        calfName: calvingForm.calfName,
        notes: calvingForm.notes,
      };

      // 3) Call the real API and inspect the ACTUAL result.
      const res = await breedingService.recordCalving(farmId, input);

      if (!res.success || !res.data) {
        // Failure: show the real error. No success state, no local mutation.
        setErrorMsg(res.message || 'Failed to record the calving event.');
        return;
      }

      // 4) Success: build the confirmation from the SERVER's returned record.
      const saved = res.data;
      setShowCalvingModal(false);
      const damObj = eligibleCows.find((c) => String(c.id) === String(calvingForm.damId));
      setShowCalvingSuccessModal({
        damTag: damObj?.earTag || saved.damId,
        // These are NOT from the server, because the backend does not persist
        // them. They are shown as unavailable rather than implied to be saved.
        calfTag: 'Not currently saved',
        calfSex: 'Not currently saved',
        birthWeight: 'Not currently saved',
      });

      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record calving event');
    } finally {
      setSubmitting(false);
    }
  };

  const pregnantCount = breedingRecords.filter((b) => b.pregnancyResult === 'Positive').length;
  const pendingCheckCount = breedingRecords.filter((b) => b.pregnancyResult === 'Pending').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <span>Breeding, AI &amp; Calving Management</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Estrus detection &bull; Semen straw tracking &bull; Pregnancy diagnosis &bull; Calving &amp; calf registration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHeatModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Record Heat</span>
          </button>

          <button
            id="btn-log-heat"
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Heart className="w-4 h-4" />
            <span>Record AI</span>
          </button>

          <button
            onClick={() => setShowPdModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <Stethoscope className="w-4 h-4 text-sky-600" />
            <span>Record PD</span>
          </button>

          <button
            id="btn-log-calving"
            onClick={() => setShowCalvingModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Baby className="w-4 h-4" />
            <span>Record Calving</span>
          </button>
        </div>
      </div>

      {/* Two Main Tabs: Section 8 & Section 9 */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex space-x-2">
        <button
          onClick={() => setActiveTab('breeding')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 min-h-[38px] ${
            activeTab === 'breeding'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-400" />
          <span>Breeding &amp; Heat Page (Sec. 8)</span>
        </button>

        <button
          onClick={() => setActiveTab('calving')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 min-h-[38px] ${
            activeTab === 'calving'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Baby className="w-4 h-4 text-blue-400" />
          <span>Calving Page (Sec. 9)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 8: BREEDING & HEAT PAGE                                           */}
      {/* ========================================================================= */}
      {activeTab === 'breeding' && (
        <div className="space-y-4">
          {/* Animal Selector Strip */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-slate-500" />
              <div>
                <label className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                  Select Cow for Timeline
                </label>
                <select
                  value={selectedAnimalId}
                  onChange={(e) => setSelectedAnimalId(e.target.value)}
                  className="text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-0.5"
                >
                  {eligibleCows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.earTag || cow.animalId} — {cow.name || 'Unnamed'} ({cow.status} &bull; Parity {cow.lactationNumber || 1})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAnimal && (
              <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Status</span>
                  <span className="font-bold text-slate-800">{selectedAnimal.status}</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-slate-400 block text-[10px]">DIM / Parity</span>
                  <span className="font-bold text-slate-800">{selectedAnimal.daysInMilk || 0}d / L{selectedAnimal.lactationNumber || 1}</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <span className="font-bold text-slate-800">{selectedAnimal.location || 'Shed 1'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline: Heat Detected -> AI -> Pregnancy Check -> Expected Calving */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                Reproduction Lifecycle Timeline: {selectedAnimal?.earTag || selectedAnimalId}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Standard 280-day gestation model</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {/* Step 1: Heat Detected */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Step 1: Heat
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedAnimalBreeding?.heatDate || '14 Apr 2024'}
                </div>
                <p className="text-[11px] text-slate-600">
                  Standing heat observed &bull; Intensity: {selectedAnimalBreeding?.heatIntensity || 'Standing'}
                </p>
                <div className="text-[10px] text-slate-400 font-mono">Observer: {heatForm.observedBy || '—'}</div>
              </div>

              {/* Step 2: AI / Insemination */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    Step 2: AI Service
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedAnimalBreeding?.serviceDate || '14 Apr 2024'}
                </div>
                <p className="text-[11px] text-slate-600">
                  Sire Straw: <span className="font-mono font-bold text-blue-950">{selectedAnimalBreeding?.semenStrawCode || 'ALTA-HF-SUPERSTAR'}</span>
                </p>
                <div className="text-[10px] text-slate-400">Tech: {aiForm.inseminatorName || '—'}</div>
              </div>

              {/* Step 3: Pregnancy Check */}
              <div className={`rounded-xl p-3.5 space-y-2 border ${
                selectedAnimalBreeding?.pregnancyResult === 'Positive'
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    selectedAnimalBreeding?.pregnancyResult === 'Positive'
                      ? 'text-emerald-800 bg-emerald-100'
                      : 'text-slate-600 bg-slate-200'
                  }`}>
                    Step 3: PD Check
                  </span>
                  {selectedAnimalBreeding?.pregnancyResult === 'Positive' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedAnimalBreeding?.pregnancyCheckDate || '—'}
                </div>
                <p className="text-[11px] text-slate-600">
                  Result: <strong className="text-emerald-800">{selectedAnimalBreeding?.pregnancyResult || '—'}</strong>
                </p>
                <div className="text-[10px] text-slate-400">Ultrasound confirmation</div>
              </div>

              {/* Step 4: Expected Calving */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    Step 4: Calving
                  </span>
                  <Baby className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {activePregnancies.find((p) => String(p.animalId) === String(selectedAnimal?.id))?.expectedCalvingDate || '—'}
                </div>
                <p className="text-[11px] text-slate-600">
                  Gestation 280 Days &bull; Countdown: <strong className="text-purple-800">45 Days Left</strong>
                </p>
                <div className="text-[10px] text-purple-600 font-semibold">Dry-off date: 20 Nov 2024</div>
              </div>
            </div>
          </div>

          {/* Upcoming Breeding Tasks List */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Upcoming Herd Breeding Tasks
              </h3>
              <span className="text-xs text-slate-500 font-medium">Next 14 Days</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Estrus Re-check (Day 21)</span>
                  <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded">Tomorrow</span>
                </div>
                <p className="text-[11px] text-slate-600">HF-082 (Daisy) &bull; Monitor morning activity</p>
              </div>

              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span>1st PD Check (Day 35)</span>
                  <span className="text-[10px] bg-sky-200 px-1.5 py-0.5 rounded">In 3 Days</span>
                </div>
                <p className="text-[11px] text-slate-600">HF-104 (Ruby) &bull; Ultrasound scan with Dr. Imran</p>
              </div>

              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                  <span>Dry-Off Protocol (Day 220)</span>
                  <span className="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded">In 6 Days</span>
                </div>
                <p className="text-[11px] text-slate-600">HF-063 (Hazel) &bull; Cephalonium dry tube infusion</p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Transfer to Maternity Pen</span>
                  <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded">In 8 Days</span>
                </div>
                <p className="text-[11px] text-slate-600">HF-051 (Molly) &bull; Calving pen A disinfection</p>
              </div>
            </div>
          </div>

          {/* Breeding Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  Insemination &amp; Breeding Registry ({breedingRecords.length} records)
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
                  Sorted by: <strong className="capitalize">{sortField === 'animalId' ? 'Animal ID' : sortField.replace(/([A-Z])/g, ' $1')}</strong> ({sortDirection.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMobileViewMode('card')}
                  title="Card View (Mobile)"
                  className={`p-1.5 rounded md:hidden ${mobileViewMode === 'card' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'text-slate-400'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMobileViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded md:hidden ${mobileViewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'text-slate-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Card List */}
            {mobileViewMode === 'card' && (
              <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2">
                {sortedBreedingRecords.map((rec) => {
                  const straw = rec.semenStrawCode || rec.semenCode || rec.bullTag || '—';
                  const tech = rec.inseminatorName || rec.technician || rec.observedBy || '—';
                  const sDate = rec.serviceDate || rec.heatDate || '—';
                  const preg = rec.pregnancyResult || 'Pending';

                  return (
                    <div key={rec.id} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 font-mono text-sm">{rec.animalId}</span>
                          {rec.animalTag && rec.animalTag !== rec.animalId && (
                            <span className="text-[11px] text-slate-500 font-sans">({rec.animalTag})</span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            preg === 'Positive'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : preg === 'Negative'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            preg === 'Positive' ? 'bg-emerald-600' : preg === 'Negative' ? 'bg-rose-600' : 'bg-amber-600'
                          }`} />
                          {preg}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Service Date</span>
                          <span className="font-mono text-slate-800 font-medium">{sDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Method</span>
                          <span className="font-semibold text-slate-800">{rec.method || 'AI'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sire Straw Code</span>
                          <span className="font-mono text-blue-900 font-medium">{straw}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Inseminator</span>
                          <span className="text-slate-700 font-medium">{tech}</span>
                        </div>
                      </div>

                      {rec.expectedCalvingDate && (
                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">Exp. Calving:</span>
                          <span className="font-mono font-bold text-emerald-800">{rec.expectedCalvingDate}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Desktop / Full Table View */}
            <div className={`overflow-x-auto w-full ${mobileViewMode === 'card' ? 'hidden md:block' : 'block'}`}>
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('animalId')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Animal ID</span>
                        {sortField === 'animalId' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('serviceDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Service Date</span>
                        {sortField === 'serviceDate' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('method')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Method</span>
                        {sortField === 'method' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('semenStrawCode')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Sire Straw Code</span>
                        {sortField === 'semenStrawCode' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('inseminatorName')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Inseminator</span>
                        {sortField === 'inseminatorName' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('pregnancyResult')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Pregnancy Result</span>
                        {sortField === 'pregnancyResult' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('expectedCalvingDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Exp. Calving</span>
                        {sortField === 'expectedCalvingDate' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedBreedingRecords.map((rec) => {
                    const straw =
                      rec.semenStrawCode ||
                      rec.semenCode ||
                      rec.bullTag ||
                      '—';
                    const tech = rec.inseminatorName || rec.technician || rec.observedBy || '—';
                    const sDate = rec.serviceDate || rec.heatDate || '—';
                    const preg = rec.pregnancyResult || 'Pending';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-900 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span>{rec.animalId}</span>
                            {rec.animalTag && rec.animalTag !== rec.animalId && (
                              <span className="text-[11px] text-slate-500 font-sans font-normal">
                                ({rec.animalTag})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{sDate}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rec.method === 'Natural Service' || rec.method === 'Natural'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {rec.method || 'AI'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-blue-900 font-medium">
                          {straw}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{tech}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              preg === 'Positive'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : preg === 'Negative'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                preg === 'Positive'
                                  ? 'bg-emerald-600'
                                  : preg === 'Negative'
                                  ? 'bg-rose-600'
                                  : 'bg-amber-600'
                              }`}
                            />
                            {preg}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-600">
                          {rec.expectedCalvingDate || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: CALVING PAGE                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'calving' && (
        <div className="space-y-4">
          {/* Top Info Banner */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">Maternity &amp; Calving Registry</h3>
                <p className="text-xs text-blue-700">
                  {activePregnancies.length} cows confirmed pregnant &bull; Sorted chronologically by expected delivery date
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCalvingModal(true)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              + Record New Calving Event
            </button>
          </div>

          {/* Pregnant Animals Sorted by Expected Calving Date (Section 9) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">
                Pregnant Animals Sorted by Expected Calving Date ({activePregnancies.length} Animals)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Automatic 280-day countdown</span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Dam ID / Ear Tag</th>
                    <th className="px-4 py-3">Name &amp; Breed</th>
                    <th className="px-4 py-3">Lactation No.</th>
                    <th className="px-4 py-3">Expected Calving Date</th>
                    <th className="px-4 py-3">Gestation Progress</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePregnancies.map((preg) => {
                    // Resolve the REAL animal; skip the row if that animal is gone.
                    const cow = eligibleOrNull(eligibleCows, preg.animalId);
                    if (!cow) return null;
                    // Days-to-calving is computed from the persisted expected date,
                    // or shown as unavailable. Never fabricated from the row index.
                    const daysLeft = preg.expectedCalvingDate
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(preg.expectedCalvingDate).getTime() - Date.now()) / 86400000
                          )
                        )
                      : null;
                    return (
                      <tr key={preg.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                          {cow.earTag || cow.animalId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{cow.name || '—'}</div>
                          <div className="text-[10px] text-slate-400">{cow.breed || '—'}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          Lactation {cow.lactationNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-purple-900">
                            {preg.expectedCalvingDate || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            daysLeft != null && daysLeft <= 14 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {daysLeft != null ? `${daysLeft} Days Remaining` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{cow.location || 'Maternity Shed'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setCalvingForm((prev) => ({ ...prev, damId: cow.id }));
                              setShowCalvingModal(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold transition"
                          >
                            Log Calving
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Calving Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Registered Calving History ({calvingRecords.length} records)
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Calving Date</th>
                    <th className="px-4 py-3">Dam</th>
                    <th className="px-4 py-3">Calves</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Veterinarian</th>
                    <th className="px-4 py-3">Colostrum (h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calvingRecords.map((c) => {
                    // Resolve the dam from REAL animal data already loaded.
                    // String-to-string compare; no .toLowerCase() on ids.
                    const dam = eligibleOrNull(eligibleCows, c.damId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{c.calvingDate}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                          {dam ? dam.earTag || dam.animalId : c.damId}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                          {c.calfCount ?? 0}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                            {c.difficulty || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {c.calvingStatus || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-emerald-700">
                          {c.veterinarianName || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">
                          {c.colostrumTimeHours != null ? `${c.colostrumTimeHours} h` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD HEAT FORM                                                 */}
      {/* ========================================================================= */}
      {showHeatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Heat Observation</h3>
              <button onClick={() => setShowHeatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHeatSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cow *</label>
                <select
                  required
                  value={heatForm.animalId}
                  onChange={(e) => setHeatForm((prev) => ({ ...prev, animalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {eligibleCows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.earTag || c.animalId} — {c.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Observation Date</label>
                  <input
                    type="date"
                    required
                    value={heatForm.heatDate}
                    onChange={(e) => setHeatForm((prev) => ({ ...prev, heatDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Intensity</label>
                  <select
                    value={heatForm.heatIntensity}
                    onChange={(e) => setHeatForm((prev) => ({ ...prev, heatIntensity: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Standing">Standing Heat (Primary)</option>
                    <option value="Moderate">Moderate (Mounting)</option>
                    <option value="Mild">Mild (Restless)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observed By</label>
                <input
                  type="text"
                  value={heatForm.observedBy}
                  onChange={(e) => setHeatForm((prev) => ({ ...prev, observedBy: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinical Heat Signs &amp; Notes</label>
                <textarea
                  rows={2}
                  value={heatForm.notes}
                  onChange={(e) => setHeatForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHeatModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Heat Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD AI / INSEMINATION FORM                                    */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record AI Service</h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAiSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cow *</label>
                <select
                  required
                  value={aiForm.animalId}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, animalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {eligibleCows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.earTag || c.animalId} — {c.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Service Date *</label>
                  <input
                    type="date"
                    required
                    value={aiForm.serviceDate}
                    onChange={(e) => setAiForm((prev) => ({ ...prev, serviceDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Method</label>
                  <select
                    value={aiForm.method}
                    onChange={(e) => {
                      const m = e.target.value as any;
                      setAiForm((prev) => ({
                        ...prev,
                        method: m,
                        // Switching method must NOT invent a straw code or a person.
                        semenStrawCode: prev.semenStrawCode || '',
                        inseminatorName: prev.inseminatorName || '',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="AI">AI (Artificial Insemination)</option>
                    <option value="Natural">Natural Bull Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {aiForm.method === 'Natural' ? 'Sire Bull Code / Name *' : 'Semen Straw Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={aiForm.method === 'Natural' ? 'e.g. BULL-01 (Sultan)' : 'e.g. SEM-HF-9901'}
                    value={aiForm.semenStrawCode}
                    onChange={(e) => setAiForm((prev) => ({ ...prev, semenStrawCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Straw Cost (PKR)</label>
                  <input
                    type="number"
                    value={aiForm.cost}
                    onChange={(e) => setAiForm((prev) => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {aiForm.method === 'Natural' ? 'Handler / Mating Observer *' : 'Inseminator / Vet Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={aiForm.method === 'Natural' ? 'e.g. Bashir Ahmed' : 'e.g. Dr. Imran Qureshi'}
                  value={aiForm.inseminatorName}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, inseminatorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save AI Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD PREGNANCY DIAGNOSIS (PD) FORM                             */}
      {/* ========================================================================= */}
      {showPdModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Pregnancy Diagnosis</h3>
              <button onClick={() => setShowPdModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePdSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cow *</label>
                <select
                  required
                  value={pdForm.animalId}
                  onChange={(e) => setPdForm((prev) => ({ ...prev, animalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {eligibleCows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.earTag || c.animalId} — {c.name || 'Unnamed'} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Check Date</label>
                  <input
                    type="date"
                    required
                    value={pdForm.pdDate}
                    onChange={(e) => setPdForm((prev) => ({ ...prev, pdDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Result *</label>
                  <select
                    value={pdForm.result}
                    onChange={(e) => setPdForm((prev) => ({ ...prev, result: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="Positive">Positive (Pregnant PD+)</option>
                    <option value="Negative">Negative (Open)</option>
                    <option value="Pending">Re-check Required</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Method</label>
                  <select
                    value={pdForm.method}
                    onChange={(e) => setPdForm((prev) => ({ ...prev, method: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Ultrasound">Transrectal Ultrasound</option>
                    <option value="Manual Palpation">Manual Rectal Palpation</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Examining Vet</label>
                  <input
                    type="text"
                    value={pdForm.vetName}
                    onChange={(e) => setPdForm((prev) => ({ ...prev, vetName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={pdForm.notes}
                  onChange={(e) => setPdForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPdModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CALVING FORM (Section 9 Full Specification)                     */}
      {/* ========================================================================= */}
      {showCalvingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Calving &amp; Register Calf</h3>
                <p className="text-xs text-slate-500">Section 9 specification &bull; Updates dam and creates calf record</p>
              </div>
              <button onClick={() => setShowCalvingModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCalvingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dam (Mother Cow) *</label>
                <select
                  required
                  value={calvingForm.damId}
                  onChange={(e) => setCalvingForm((prev) => ({ ...prev, damId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  // Options come from REAL persisted pregnancies, resolved against real animals.
                  {activePregnancies.map((preg) => {
                    const cow = eligibleOrNull(eligibleCows, preg.animalId);
                    if (!cow) return null;
                    return (
                      <option key={preg.id} value={cow.id}>
                        {cow.earTag || cow.animalId} — {cow.name || '—'} (Exp:{' '}
                        {preg.expectedCalvingDate || '—'})
                      </option>
                    );
                  })}
                  {eligibleCows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.earTag || cow.animalId} — {cow.name || 'Unnamed'} ({cow.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calving Date *</label>
                  <input
                    type="date"
                    required
                    value={calvingForm.calvingDate}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, calvingDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Time of Birth</label>
                  <input
                    type="time"
                    value={calvingForm.calvingTime}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, calvingTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={calvingForm.difficulty}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, difficulty: e.target.value as CalvingRecord['difficulty'] }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {/* Only options with a real `calving_type` ENUM value. */}
                    <option value="Normal / Unassisted">Normal / Unassisted</option>
                    <option value="Easy Assist">Easy Assist</option>
                    <option value="Hard Assist">Hard Assist</option>
                    <option value="Caesarean">Caesarean (Dystocia)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calf Count</label>
                  <select
                    value={calvingForm.calfCount}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, calfCount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Single">Single Calf</option>
                    <option value="Twin">Twins</option>
                  </select>
                </div>
              </div>

              {/* Newly Created Calf Fields */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2.5">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  New Calf Registration Details — Not Currently Saved
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The backend records the calf automatically from the calf count, and has no
                  writable field for calf tag, name, sex or birth weight. These inputs are
                  displayed for reference only and are NOT persisted.
                </p>

                <div className="grid grid-cols-2 gap-3 opacity-60">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">New Calf Tag / ID *</label>
                    <input
                      type="text"
                      required
                      value={calvingForm.calfTag}
                      onChange={(e) => setCalvingForm((prev) => ({ ...prev, calfTag: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Calf Name</label>
                    <input
                      type="text"
                      value={calvingForm.calfName}
                      onChange={(e) => setCalvingForm((prev) => ({ ...prev, calfName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sex</label>
                    <select
                      value={calvingForm.calfSex}
                      onChange={(e) => setCalvingForm((prev) => ({ ...prev, calfSex: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-semibold"
                    >
                      <option value="Female">Female (Heifer Calf)</option>
                      <option value="Male">Male (Bull Calf)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Birth Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={calvingForm.birthWeightKg}
                      onChange={(e) => setCalvingForm((prev) => ({ ...prev, birthWeightKg: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Colostrum & Complications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Colostrum Fed (Liters)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calvingForm.colostrumFedLiters}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, colostrumFedLiters: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hours Post-Birth Fed</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calvingForm.colostrumFedHoursPostBirth}
                    onChange={(e) => setCalvingForm((prev) => ({ ...prev, colostrumFedHoursPostBirth: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Complications</label>
                <select
                  value={calvingForm.complications}
                  onChange={(e) => setCalvingForm((prev) => ({ ...prev, complications: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="None">None - Clean Delivery</option>
                  <option value="Retained Placenta">Retained Placenta (Hold)</option>
                  <option value="Milk Fever">Milk Fever / Hypocalcemia</option>
                  <option value="Uterine Prolapse">Uterine Prolapse</option>
                  <option value="Dystocia">Severe Dystocia</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={calvingForm.notes}
                  onChange={(e) => setCalvingForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalvingModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save & Register Calf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: POST-CALVING SUCCESS CONFIRMATION (Section 9 Specification)     */}
      {/* ========================================================================= */}
      {showCalvingSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Calving Confirmed &amp; Calf Created!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Both mother cow status and new calf herd record have been synchronized.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Mother Cow (Dam):</span>
                <span className="font-bold text-slate-900 font-mono">{showCalvingSuccessModal.damTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dam Status:</span>
                <span className="font-bold text-emerald-700">Fresh / Lactating (DIM 0)</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">New Calf Tag:</span>
                <span className="font-bold text-blue-900 font-mono">{showCalvingSuccessModal.calfTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calf Sex &amp; Weight:</span>
                <span className="font-bold text-slate-900">
                  {showCalvingSuccessModal.calfSex} &bull; {showCalvingSuccessModal.birthWeight} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Herd Category:</span>
                <span className="font-bold text-purple-700">Pre-weaned Calf Pen</span>
              </div>
            </div>

            <button
              onClick={() => setShowCalvingSuccessModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Continue to Herd
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
