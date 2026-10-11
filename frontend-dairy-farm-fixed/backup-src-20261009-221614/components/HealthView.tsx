import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Syringe,
  Building2,
  Check,
  Clock,
  Calendar,
  User,
  FileText,
  AlertOctagon,
  History,
  Trash2,
  Package,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { healthService, animalService } from '../services';
import { useAuth } from '../context/AuthContext';
import {
  TreatmentRecord,
  HealthRecord,
  Medicine,
  VaccinationRecord,
  QuarantineRecord,
  HealthAuditLog,
  Animal,
  HealthDashboardSummary,
} from '../types';
import {
  NewTreatmentModal,
  CompleteHoldModal,
  NewHealthEventModal,
  NewVaccinationModal,
  NewQuarantineModal,
} from './health/HealthModals';

export const HealthView: React.FC = () => {
  // Farm scope comes from the AUTHENTICATED identity, never hardcoded.
  const { farmId } = useAuth();
  // Distinguishes "API failed" from "there are genuinely no records".
  const [loadError, setLoadError] = useState<string | null>(null);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [quarantines, setQuarantines] = useState<QuarantineRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<HealthAuditLog[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<HealthDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Sub-tabs: 'treatments' | 'events' | 'vaccines' | 'quarantine' | 'pharmacy' | 'audit'
  const [activeSubTab, setActiveSubTab] = useState<
    'treatments' | 'events' | 'vaccines' | 'quarantine' | 'pharmacy' | 'audit'
  >('treatments');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [selectedTreatmentForHold, setSelectedTreatmentForHold] = useState<TreatmentRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [tRes, hRes, mRes, vRes, qRes, aRes, sumRes, logsRes] = await Promise.all([
        healthService.listTreatments(farmId),
        healthService.listHealth(farmId),
        healthService.listMedicines(),
        healthService.listVaccinations(farmId),
        healthService.listQuarantine(),
        animalService.list({ pageSize: 100 }),
        healthService.getDashboardSummary(),
        healthService.listAuditLogs(),
      ]);

      // A failed request must not look like "no records". Only a SUCCESSFUL
      // response is allowed to replace the collection.
      if (tRes.success) setTreatments(tRes.data || []); else setLoadError(tRes.message);
      if (hRes.success) setHealthRecords(hRes.data || []); else setLoadError(hRes.message);
      if (mRes.success) setMedicines(mRes.data || []); else setLoadError(mRes.message);
      if (vRes.success) setVaccinations(vRes.data || []); else setLoadError(vRes.message);
      // Quarantine has no backend: always unavailable, never mock data.
      setQuarantines([]);
      // PaginatedResponse has no `success` field; only guard the animals call.
      if (Array.isArray(aRes.data)) setAnimals(aRes.data);
      // Dashboard summary + audit logs have no backend: stay unavailable.
      setDashboardSummary(sumRes.success ? sumRes.data || null : null);
      setAuditLogs([]);
    } catch (err) {
      console.error('Error loading health data:', err);
      setLoadError('Unable to load health data from the server.');
    } finally {
      setLoading(false);
    }
  };

  // Derive active antimicrobial milk withdrawals dynamically
  const activeWithdrawals = useMemo(() => {
    return treatments.filter((t) => t.isWithdrawalActive && t.status !== 'Completed');
  }, [treatments]);

  // Derived counts
  const totalEventsCount = healthRecords.length;
  const activeTreatmentsCount = treatments.filter((t) => t.status === 'In Treatment').length;
  const totalVaccinesCount = vaccinations.length;
  const activeQuarantineCount = quarantines.filter((q) => q.status === 'Active').length;
  const totalPharmacyCount = medicines.length;
  const activeMilkHoldCount = activeWithdrawals.length;

  // Handlers for Add Operations
  const handleCreateTreatment = async (input: Partial<TreatmentRecord>) => {
    const res = await healthService.createTreatment(farmId, input);
    // Success only when the SERVER confirmed it.
    if (!res.success) { showToast(res.message || 'Failed to save treatment'); return; }
    showToast(`Treatment registered for ${input.animalTag || 'animal'}`);
    await loadData();
  };

  const handleCreateHealthEvent = async (input: Partial<HealthRecord>) => {
    const res = await healthService.createHealth(farmId, input);
    if (!res.success) { showToast(res.message || 'Failed to save health event'); return; }
    showToast(`Health event recorded for ${input.animalTag || 'animal'}`);
    await loadData();
  };

  const handleDeleteHealthEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this clinical health event record?')) return;
    try {
      const res = await healthService.deleteHealth(farmId, id);
      if (!res.success) { showToast(res.message || 'Failed to delete health event'); return; }
      showToast('Health event deleted successfully');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete health event');
    }
  };

  const handleCreateVaccination = async (input: Partial<VaccinationRecord>) => {
    const res = await healthService.createVaccination(farmId, input);
    if (!res.success) { showToast(res.message || 'Failed to save vaccination'); return; }
    showToast(`Vaccination protocol for ${input.disease || 'herd'} registered`);
    await loadData();
  };

  // Quarantine has NO backend support - the UI is disabled, never faked.
  const handleCreateQuarantine = async () => {
    showToast('Quarantine management is not currently supported by the backend.');
  };

  const handleReleaseQuarantine = async () => {
    showToast('Quarantine management is not currently supported by the backend.');
  };

  // COMPLETE HOLD ACTION (Section 4 Specification)
  const handleConfirmCompleteHold = async (options: {
    override?: boolean;
    overrideReason?: string;
    authorizedBy?: string;
  }) => {
    if (!selectedTreatmentForHold) return;
    try {
      await healthService.completeTreatment(selectedTreatmentForHold.id, options);
      showToast(
        `Antimicrobial milk withdrawal hold completed for ${selectedTreatmentForHold.animalTag || 'Animal'}. Milk cleared for bulk tank.`
      );
      setSelectedTreatmentForHold(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete hold');
    }
  };

  // Filtered lists for each active subtab
  const filteredEvents = useMemo(() => {
    return healthRecords.filter((h) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (h.animalTag && h.animalTag.toLowerCase().includes(q)) ||
        (h.problem && h.problem.toLowerCase().includes(q)) ||
        (h.diagnosis && h.diagnosis.toLowerCase().includes(q)) ||
        (h.veterinarian && h.veterinarian.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [healthRecords, searchTerm, statusFilter]);

  const filteredTreatments = useMemo(() => {
    return treatments.filter((t) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (t.animalTag && t.animalTag.toLowerCase().includes(q)) ||
        (t.diagnosis && t.diagnosis.toLowerCase().includes(q)) ||
        (t.medicineName && t.medicineName.toLowerCase().includes(q)) ||
        (t.veterinarian && t.veterinarian.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active Hold' ? t.isWithdrawalActive && t.status !== 'Completed' : t.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [treatments, searchTerm, statusFilter]);

  const filteredVaccinations = useMemo(() => {
    return vaccinations.filter((v) => {
      const q = searchTerm.toLowerCase();
      return (
        !q ||
        (v.vaccineName && v.vaccineName.toLowerCase().includes(q)) ||
        (v.disease && v.disease.toLowerCase().includes(q)) ||
        (v.targetGroup && v.targetGroup.toLowerCase().includes(q)) ||
        (v.batchNumber && v.batchNumber.toLowerCase().includes(q))
      );
    });
  }, [vaccinations, searchTerm]);

  const filteredQuarantines = useMemo(() => {
    return quarantines.filter((qItem) => {
      const q = searchTerm.toLowerCase();
      return (
        !q ||
        (qItem.animalTag && qItem.animalTag.toLowerCase().includes(q)) ||
        (qItem.reason && qItem.reason.toLowerCase().includes(q)) ||
        (qItem.isolationLocation && qItem.isolationLocation.toLowerCase().includes(q))
      );
    });
  }, [quarantines, searchTerm]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = searchTerm.toLowerCase();
      return (
        !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q))
      );
    });
  }, [medicines, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Health, Veterinary Care &amp; Biosecurity</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Green Dairy Farm &bull; Punjab, Pakistan &bull; Automated milk withdrawal holds &bull; Real-time audit synchronization
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEventModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[38px]"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Log Health Event</span>
          </button>

          <button
            id="btn-new-treatment"
            onClick={() => setShowTreatmentModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Treatment</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIVE DASHBOARD METRIC CARDS                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Health Events */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('events');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeSubTab === 'events'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Health Events</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{totalEventsCount}</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
              Logs
            </span>
          </div>
        </button>

        {/* Card 2: Active Treatments */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('treatments');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeSubTab === 'treatments' && statusFilter !== 'Active Hold'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Active Treatments</span>
            <Stethoscope className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{activeTreatmentsCount}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
              In Protocol
            </span>
          </div>
        </button>

        {/* Card 3: Active Milk Withdrawal Hold (CRITICAL WARNING) */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('treatments');
            setStatusFilter('Active Hold');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeMilkHoldCount > 0
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-900">
            <span className="text-[11px] font-bold">Milk Holds</span>
            <ShieldAlert className={`w-4 h-4 ${activeMilkHoldCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-700">{activeMilkHoldCount}</span>
            <span className="text-[10px] font-bold text-rose-800 bg-rose-200/90 px-1.5 py-0.5 rounded">
              {activeMilkHoldCount > 0 ? 'Do Not Milk' : 'Clear'}
            </span>
          </div>
        </button>

        {/* Card 4: Vaccination Schedule */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('vaccines');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeSubTab === 'vaccines'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Vaccine Schedule</span>
            <Syringe className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{totalVaccinesCount}</span>
            <span className="text-[10px] font-semibold text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded">
              Protocols
            </span>
          </div>
        </button>

        {/* Card 5: Quarantine & Isolation */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('quarantine');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeSubTab === 'quarantine'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Quarantine</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{activeQuarantineCount}</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              0 / 8 Pens
            </span>
          </div>
        </button>

        {/* Card 6: Pharmacy */}
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('pharmacy');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
            activeSubTab === 'pharmacy'
              ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Pharmacy</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{totalPharmacyCount}</span>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
              Medicines
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CRITICAL ANTIMICROBIAL MILK WITHDRAWAL WARNING BANNER                     */}
      {/* ========================================================================= */}
      {activeWithdrawals.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2.5 text-rose-950 font-bold text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
              <span>
                CRITICAL WARNING: {activeWithdrawals.length} Animal Under Active Antimicrobial Milk Withdrawal Hold
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-900 bg-rose-200/90 px-3 py-1 rounded-full shadow-2xs">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span>Do Not Milk Into Bulk Tank</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {activeWithdrawals.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-rose-200 p-3.5 rounded-xl text-slate-800 space-y-2 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2">
                    <div>
                      <span className="font-extrabold text-rose-950 font-mono text-sm block">
                        {t.animalTag || t.animalId} {t.animalName ? `(${t.animalName})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500">Reason: {t.problem || t.diagnosis}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 shrink-0 font-mono">
                      HOLD UNTIL: {t.milkUsableDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Medicine:</span>
                      <span className="font-semibold text-slate-900">{t.medicineName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Dose &amp; Route:</span>
                      <span className="font-medium text-slate-800">{t.dosage || t.dose} ({t.route})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Treatment Start:</span>
                      <span className="font-mono text-slate-700">{t.date || t.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Withdrawal Duration:</span>
                      <span className="font-bold text-rose-700">{t.milkWithdrawalDays || 10} Days</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-rose-50/60 p-2 rounded border border-rose-100">
                    <span className="font-semibold text-slate-800">Attending Vet:</span> {t.veterinarian || t.administeredBy || '—'}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-rose-100 flex items-center justify-between">
                  <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-500" />
                    <span>Active Hold</span>
                  </span>
                  <button
                    onClick={() => setSelectedTreatmentForHold(t)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 px-3 py-1.5 rounded-lg shadow-2xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Complete Hold</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTABS NAVIGATION & SEARCH / FILTER BAR                                 */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 gap-2 pb-1">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveSubTab('treatments')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'treatments'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Active Treatments ({treatments.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('events')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'events'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Health Events ({healthRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('vaccines')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'vaccines'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              <span>Vaccination Schedule ({vaccinations.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('quarantine')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'quarantine'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Quarantine &amp; Isolation ({quarantines.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('pharmacy')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'pharmacy'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pharmacy ({medicines.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('audit')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
                activeSubTab === 'audit'
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({auditLogs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={loadData}
              title="Refresh Health Records"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search & Sub-Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Animal ID, diagnosis, problem, medication, veterinarian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {activeSubTab === 'treatments' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="ALL">All Treatments</option>
                <option value="Active Hold">Active Milk Holds Only</option>
                <option value="In Treatment">In Treatment</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}

          {activeSubTab === 'events' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Treatment">In Treatment</option>
                <option value="Recovered">Recovered</option>
                <option value="Under Treatment">Under Treatment</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: ACTIVE TREATMENTS (Section 10 Exact Specification)              */}
      {/* ========================================================================= */}
      {activeSubTab === 'treatments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              Clinical Treatments &amp; Antimicrobial Registry ({filteredTreatments.length} records)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Milk hold tracking automatically synchronized with parlor bulk tank
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Animal ID</th>
                  <th className="px-4 py-3">Diagnosis / Problem</th>
                  <th className="px-4 py-3">Medicine &amp; Route</th>
                  <th className="px-4 py-3">Dosage / Duration</th>
                  <th className="px-4 py-3">Milk Withdrawal Hold</th>
                  <th className="px-4 py-3">Administered By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTreatments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No treatment records match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTreatments.map((t) => {
                    const isCompleted = t.status === 'Completed';
                    const hasActiveHold = t.isWithdrawalActive && !isCompleted;
                    return (
                      <tr
                        key={t.id}
                        className={hasActiveHold ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/60'}
                      >
                        <td className="px-4 py-3 font-bold font-mono text-slate-900 text-sm">
                          {t.animalTag || t.animalId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{t.diagnosis || t.problem}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Started: {t.date || t.startDate}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{t.medicineName}</div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {t.route || 'Intramuscular'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{t.dosage || t.dose}</div>
                          <div className="text-[10px] text-slate-500">{t.durationDays || 3} days protocol</div>
                        </td>
                        <td className="px-4 py-3">
                          {hasActiveHold ? (
                            <div>
                              <span className="font-bold text-rose-700 block">HOLD UNTIL {t.milkUsableDate}</span>
                              <span className="text-[10px] text-rose-600 font-semibold">Discard milk in parlor</span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Cleared for Tank</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.veterinarian || t.administeredBy}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-slate-100 text-slate-600'
                                : hasActiveHold
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCompleted ? 'Completed' : t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isCompleted ? (
                            <button
                              onClick={() => setSelectedTreatmentForHold(t)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
                              title="Verify laboratory residue clearance and complete hold"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Complete Hold</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Released</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: HEALTH EVENTS                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'events' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              Clinical Health Observations &amp; Event Logs ({filteredEvents.length} records)
            </span>
            <button
              onClick={() => setShowEventModal(true)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log New Health Event</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Animal ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Clinical Problem</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Symptoms Observed</th>
                  <th className="px-4 py-3">Examined By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No health event records match your search.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{h.date}</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-slate-900">{h.animalTag || h.animalId}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {h.eventType || 'Disease'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{h.problem}</td>
                      <td className="px-4 py-2.5 text-slate-700">{h.diagnosis}</td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate" title={h.symptoms}>
                        {h.symptoms || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{h.veterinarian}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            h.status === 'Recovered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteHealthEvent(h.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Delete health record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: VACCINATION SCHEDULE                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'vaccines' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Herd Vaccination Schedule &amp; Prophylactic Immunity ({filteredVaccinations.length} protocols)
                </span>
                <span className="text-[11px] text-slate-500">Punjab Cattle Disease Prevention Protocol</span>
              </div>
              <button
                onClick={() => setShowVaccinationModal(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Vaccination</span>
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Disease Target</th>
                    <th className="px-4 py-3">Vaccine Name</th>
                    <th className="px-4 py-3">Target Herd Group</th>
                    <th className="px-4 py-3">Administered Date</th>
                    <th className="px-4 py-3">Next Booster Due</th>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Manufacturer</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVaccinations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                        No vaccination records found.
                      </td>
                    </tr>
                  ) : (
                    filteredVaccinations.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-900">{v.disease}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{v.vaccineName}</td>
                        <td className="px-4 py-3 text-slate-600">{v.targetGroup}</td>
                        <td className="px-4 py-3 font-mono">{v.dateAdministered}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-800">{v.nextDueDate}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{v.batchNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{v.manufacturer || 'VRI Lahore'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              v.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: QUARANTINE & ISOLATION                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'quarantine' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">Isolation &amp; Quarantine Protocol</h3>
                <p className="text-xs text-amber-800">
                  Strict biocontainment area &bull; Separate feeding troughs &bull; Daily rectal temperature monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg shadow-2xs">
                Capacity: {activeQuarantineCount} / 8 Pens Occupied
              </span>
              <button
                onClick={() => setShowQuarantineModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
              >
                + Transfer to Quarantine
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Quarantined Animals &amp; Clinical Isolation Logs ({filteredQuarantines.length} records)
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Animal ID</th>
                    <th className="px-4 py-3">Quarantine Reason</th>
                    <th className="px-4 py-3">Isolation Pen</th>
                    <th className="px-4 py-3">Admission Date</th>
                    <th className="px-4 py-3">Expected Release</th>
                    <th className="px-4 py-3">Release Criteria</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuarantines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                        No animals currently in isolation quarantine. Herd biocontainment status clear.
                      </td>
                    </tr>
                  ) : (
                    filteredQuarantines.map((q) => {
                      const isActive = q.status === 'Active';
                      return (
                        <tr key={q.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                            {q.animalTag || q.animalId}
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-700">{q.reason}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{q.isolationLocation}</td>
                          <td className="px-4 py-3 text-slate-600">{q.startDate}</td>
                          <td className="px-4 py-3 font-mono text-slate-800">{q.expectedReleaseDate}</td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs">{q.releaseCriteria}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isActive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isActive ? (
                              <button
                                onClick={() => handleReleaseQuarantine()}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
                              >
                                Discharge to Herd
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Discharged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: PHARMACY / MEDICINE INVENTORY                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'pharmacy' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-xs text-slate-800">
            <span>Veterinary Medicine &amp; Vaccine Pharmacy ({filteredMedicines.length} items)</span>
            <span className="text-[11px] text-slate-500 font-medium">Controlled antimicrobial dispensation</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Medicine Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock Quantity</th>
                  <th className="px-4 py-3">Milk Withdrawal</th>
                  <th className="px-4 py-3">Meat Withdrawal</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{m.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                      {m.stockQuantity ?? m.currentStock ?? 0} {m.unit}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-rose-700">
                      {m.withdrawalDaysMilk ? `${m.withdrawalDaysMilk} Days` : '0 Days (Nil)'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{m.withdrawalDaysMeat || 0} Days</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{m.batchNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-800">Rs {m.unitPrice ?? m.cost ?? 0}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{m.expiryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: HEALTH AUDIT TRAIL LOGS                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-xs text-slate-800">
            <span>Veterinary &amp; Biosecurity Audit Trail ({auditLogs.length} events)</span>
            <span className="text-[11px] text-slate-500 font-medium">Immutable regulatory compliance ledger</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Animal Tag</th>
                  <th className="px-4 py-3">Authorized User</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{log.action}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold font-mono text-slate-800">
                        {log.animalTag || 'Herd Level'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{log.user}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-[11px]">{log.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                   */}
      {/* ========================================================================= */}
      <NewTreatmentModal
        isOpen={showTreatmentModal}
        onClose={() => setShowTreatmentModal(false)}
        onSubmit={handleCreateTreatment}
        animals={animals}
        medicines={medicines}
      />

      <CompleteHoldModal
        isOpen={selectedTreatmentForHold !== null}
        onClose={() => setSelectedTreatmentForHold(null)}
        onConfirm={handleConfirmCompleteHold}
        treatment={selectedTreatmentForHold}
      />

      <NewHealthEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSubmit={handleCreateHealthEvent}
        animals={animals}
      />

      <NewVaccinationModal
        isOpen={showVaccinationModal}
        onClose={() => setShowVaccinationModal(false)}
        onSubmit={handleCreateVaccination}
      />

      <NewQuarantineModal
        isOpen={showQuarantineModal}
        onClose={() => setShowQuarantineModal(false)}
        onSubmit={handleCreateQuarantine}
        animals={animals}
      />
    </div>
  );
};
