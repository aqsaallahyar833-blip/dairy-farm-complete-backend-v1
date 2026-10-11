import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Calendar,
  Tag,
  MapPin,
  Users,
  AlertCircle,
  Clock,
  Droplets,
  Heart,
  Stethoscope,
  Wheat,
  FileText,
  Printer,
  Edit,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Camera,
  QrCode,
} from 'lucide-react';
import { AnimalImageUpload } from './AnimalImageUpload';
import { AnimalQrCard } from './AnimalQrCard';
import { useAuth } from '../../context/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { animalService, milkService, breedingService, healthService } from '../../services';
import { animalWritesApi } from '../../services/api/apiClient';
import {
  Animal,
  MilkRecord,
  BreedingRecord,
  HealthRecord,
  TreatmentRecord,
  LactationRecord,
  CalvingRecord,
} from '../../types';

interface AnimalProfileViewProps {
  animalId: string;
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

export const AnimalProfileView: React.FC<AnimalProfileViewProps> = ({
  animalId,
  onBack,
  onNavigate,
}) => {
  const { farmId } = useAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [lactations, setLactations] = useState<LactationRecord[]>([]);
  const [calvings, setCalvings] = useState<CalvingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: Overview, QR Code, Milk Record, Breeding, Health, Feed, Lactation, Calves, History
  const [activeTab, setActiveTab] = useState<
    'overview' | 'qr' | 'milk' | 'breeding' | 'health' | 'feed' | 'lactation' | 'calves' | 'history'
  >('overview');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  // Modals
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  /**
   * Phase 2A: the photo is now a File uploaded as binary, not a base64 string
   * written into `animals.photo` (varchar(500), which cannot hold an image).
   * `quickPhotoUrl` is kept only as the local preview of the current selection.
   */
  const [quickPhotoFile, setQuickPhotoFile] = useState<File | null>(null);
  const [quickPhotoUrl, setQuickPhotoUrl] = useState<string>('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    earTag: '',
    rfid: '',
    breed: '',
    status: '',
    location: '',
    dateOfBirth: '',
    photoUrl: '',
  });
  /** Selected file for the edit-modal uploader. */
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnimalData();
  }, [animalId]);

  const loadAnimalData = async () => {
    setLoading(true);
    try {
      // Find animal
      const aRes = await animalService.getById(animalId);
      setAnimal(aRes.data);
      setQuickPhotoUrl(aRes.data.photoUrl || '');
      setEditForm({
        name: aRes.data.name || '',
        earTag: aRes.data.earTag || aRes.data.animalId,
        rfid: aRes.data.rfid || '',
        breed: aRes.data.breed || 'Holstein Friesian',
        status: aRes.data.status || 'Lactating',
        location: aRes.data.location || 'Shed 1',
        dateOfBirth: aRes.data.dateOfBirth || '',
        photoUrl: aRes.data.photoUrl || '',
      });

      // Fetch all related records for this specific animal
      const [mRes, bRes, hRes, tRes, lRes, cRes] = await Promise.all([
        milkService.list(farmId, { animalId: aRes.data.id, pageSize: 50 }),
        breedingService.list(farmId, { animalId: aRes.data.id }),
        healthService.listHealth(farmId),
        healthService.listTreatments(farmId),
        animalService.listLactations(aRes.data.id),
        animalService.listCalvings(aRes.data.id),
      ]);

      setMilkRecords(Array.isArray(mRes?.data) ? mRes.data : []);
      setBreedingRecords(Array.isArray(bRes?.data) ? bRes.data : []);
      setHealthRecords(Array.isArray(hRes?.data) ? hRes.data : []);
      setTreatments(Array.isArray(tRes?.data) ? tRes.data : []);
      setLactations(Array.isArray(lRes?.data) ? lRes.data : []);
      setCalvings(Array.isArray(cRes?.data) ? cRes.data : []);
    } catch (err) {
      console.error('Failed to load animal profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * Phase 2B - rotates the QR token through the REAL backend endpoint
   * POST /api/animals/{numericId}/qr/rotate.
   *
   * The previous implementation called the RETIRED Express route
   * `/api/animals/${animal.animalId}/regenerate-qr` - wrong host, retired path,
   * and `animal.animalId` is now the human-readable code (AN-001) rather than a
   * numeric id. It then fell back to the mock layer, which only mutated an
   * in-memory object and showed a fabricated token.
   *
   * There is no mock fallback here: a failure is reported to the operator.
   */
  const handleRegenerateQrToken = async () => {
    if (!animal) return;

    const numericId = Number(animal.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      showToast('This animal has no valid database identifier.');
      return;
    }

    setIsRegeneratingToken(true);
    try {
      const res = await animalWritesApi.rotateQrToken(numericId);

      if (!res.success) {
        const message = res.message || '';
        if (/session has expired|sign in|401/i.test(message)) {
          showToast('Sign in required to regenerate the QR token.');
        } else if (/not found|404/i.test(message)) {
          showToast('Animal not found.');
        } else {
          showToast(message || 'Failed to rotate the QR token.');
        }
        return;
      }

      if (res.data?.token) {
        setAnimal((prev) => (prev ? { ...prev, qrToken: res.data!.token } : prev));
        showToast('QR token rotated. The previous printed tag no longer resolves.');
      } else {
        showToast('The server did not return a new QR token.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate the QR token.');
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  const handleExportDossierPdf = async () => {
    if (!animal) return;
    setIsExportingPdf(true);
    try {
      const { exportAnimalProfilePdf } = await import('../../utils/pdfExport');
      await exportAnimalProfilePdf({
        animal,
        farmName: 'Green Dairy Farm',
        shedName: animal.location || 'Shed 1',
        groupName: 'High Milking Group',
        milkRecords,
        breedingRecords,
        healthRecords,
        treatments,
        generatedBy: 'Central Farm Management System',
      });
      showToast(`Exported PDF Dossier for Animal ${animal.animalId}`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('Error exporting PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading || !animal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading cow digital dossier ({animalId})...</p>
        </div>
      </div>
    );
  }

  // Calculate 7-day milk data for chart
  const recentMilkChartData = (milkRecords || []).slice(0, 7).reverse().map((m) => ({
    date: (m?.date || '').slice(5) || '—',
    session: m?.session || 'Morning',
    liters: m?.quantityLiters || 0,
  }));

  const activeTreatment = treatments.find((t) => t.isWithdrawalActive);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportDossierPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[44px] disabled:opacity-50"
            title="Export Official PDF Dossier"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">{isExportingPdf ? 'Exporting...' : 'PDF Dossier'}</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 border rounded-lg text-xs font-semibold shadow-2xs transition min-h-[44px] ${
              activeTab === 'qr'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="View Live QR Code & Print Tag"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Tag</span>
          </button>
          <button
            onClick={() => {
              setQuickPhotoUrl(animal.photoUrl || '');
              setShowPhotoModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[44px]"
            title="Upload or Change Animal Photo"
          >
            <Camera className="w-4 h-4 text-emerald-700" />
            <span>Photo</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[44px]"
            title="Edit Animal Record"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center hidden sm:flex border border-slate-200 bg-white"
            title="Print Profile Dossier"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Hero Animal Profile Card (Matching Screen 3) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Cow Photo & Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full lg:w-auto">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0 shadow-xs group">
              <img
                src={animal.photoUrl || '/holstein_cow.jpg'}
                alt={animal.earTag || animal.animalId}
                className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/holstein_cow.jpg';
                }}
              />
              <button
                onClick={() => {
                  setQuickPhotoUrl(animal.photoUrl || '');
                  setShowPhotoModal(true);
                }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition cursor-pointer"
                title="Change Animal Photo"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span>Upload</span>
              </button>
              <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
                {animal.breed.split(' ')[0]}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {animal.animalId}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    animal.status === 'Lactating'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : animal.status === 'Pregnant'
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : animal.status === 'Dry'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {animal.status}
                </span>
                {animal.isWithdrawalActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                    <AlertTriangle className="w-3 h-3" /> Withdrawal Active
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {animal.sex} • {animal.breed} • Born: {animal.dateOfBirth} • ID: <span className="font-mono text-slate-700">{animal.animalId}</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Ear Tag</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{animal.earTag}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">RFID</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{animal.rfid || 'Not Assigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Dam / Sire:</span>
                  <span className="font-medium text-slate-700">
                    {animal.damTag || 'HF-011'} / {animal.sireTag || 'Bull-04'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Group:</span>
                  <span className="font-medium text-slate-700">High Milking Group</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">Location:</span>
                  <span className="font-medium text-slate-700">Shed 1 - Row A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics - All 6 summary metrics per Document 02 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 w-full lg:w-[420px] shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Lactation No.</span>
              <span className="text-lg font-bold text-slate-900">{animal.lactationNumber || 3}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">DIM</span>
              <span className="text-lg font-bold text-slate-900">{animal.daysInMilk || 216} d</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Avg Milk (7d)</span>
              <span className="text-lg font-bold text-emerald-700">{animal.dailyAvgMilk || 28.2} L</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Today's Milk</span>
              <span className="text-lg font-bold text-emerald-700">{animal.todayMilk || 28.7} L</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pregnancy</span>
              <span className="text-xs font-bold text-sky-800 block truncate mt-1">
                {animal.pregnancyStatus || (animal.status === 'Pregnant' ? 'Confirmed (PD+)' : 'Open / Inseminated')}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Exp. Calving</span>
              <span className="text-xs font-bold text-slate-800 font-mono block truncate mt-1">
                {animal.expectedCalvingDate || '25 Sep 2024'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'qr', label: 'Live QR Code', icon: QrCode },
            { id: 'milk', label: 'Milk Record', icon: Droplets },
            { id: 'breeding', label: 'Breeding', icon: Heart },
            { id: 'health', label: 'Health', icon: Stethoscope },
            { id: 'feed', label: 'Feed', icon: Wheat },
            { id: 'lactation', label: 'Lactation', icon: Clock },
            { id: 'calves', label: 'Calves', icon: Users },
            { id: 'history', label: 'History', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition min-h-[40px] ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: OVERVIEW (Matching Screen 3) */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Active Withdrawal Banner if applicable */}
          {activeTreatment && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-amber-900">
                    Active Antimicrobial Milk Hold: {activeTreatment.medicineName}
                  </h4>
                  <p className="text-amber-800 mt-0.5">
                    Treated for {activeTreatment.problem}. Milk cannot be supplied to bulk tank until {activeTreatment.milkUsableDate}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('health')}
                className="w-full sm:w-auto px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-semibold rounded-lg transition"
              >
                View Withdrawal Details
              </button>
            </div>
          )}

          {/* Live QR Quick Access Banner (Clicking opens full Live QR Code) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    Animal Digital Identity &amp; Live QR Code
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-semibold">
                    {animal.animalId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scan tag in milking parlor or paddock for instant veterinary, milk, and breeding dossier
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-view-live-qr"
              onClick={() => setActiveTab('qr')}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-emerald-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 min-h-[38px]"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Live QR Code</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* 3 Summary Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status & Reproduction Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Reproduction Status
                </span>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                  Confirmed
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-slate-900">Pregnant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pregnancy Diagnosis:</span>
                  <span className="font-bold text-emerald-700">Positive (Ultrasound)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Calving:</span>
                  <span className="font-semibold text-slate-800">25 Sep 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Days to Calving:</span>
                  <span className="font-bold text-sky-800 font-mono">134 Days</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('breeding')}
                className="w-full text-center text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2 border-t border-slate-100 block"
              >
                View Breeding Timeline →
              </button>
            </div>

            {/* Today's Milk Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-600" /> Today's Milk
                </span>
                <span className="text-xs font-bold text-emerald-700 font-mono">28.7 L Total</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Morning Session:</span>
                  <span className="font-semibold text-slate-800 font-mono">14.5 L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evening Session:</span>
                  <span className="font-semibold text-slate-800 font-mono">14.2 L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fat % / SNF %:</span>
                  <span className="font-medium text-slate-700">3.8% / 8.9%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">7-Day Consistency:</span>
                  <span className="font-semibold text-emerald-700">Stable (±0.4 L)</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('milk')}
                className="w-full text-center text-xs text-emerald-700 hover:text-emerald-800 font-semibold pt-2 border-t border-slate-100 block"
              >
                View Milk History →
              </button>
            </div>

            {/* Recent Alerts Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Recent Alerts
                </span>
                <span className="text-[10px] text-slate-400">3 active</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-amber-50/70 border border-amber-100 rounded-lg flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-amber-900 text-[11px]">Pregnancy Diagnosis due</p>
                    <p className="text-[10px] text-amber-700">06 May 2024</p>
                  </div>
                </div>

                <div className="p-2 bg-sky-50/70 border border-sky-100 rounded-lg flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1"></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sky-900 text-[11px]">Vaccination due in 7 days</p>
                    <p className="text-[10px] text-sky-700">FMD Booster • 21 May 2024</p>
                  </div>
                </div>

                <div className="p-2 bg-rose-50/70 border border-rose-100 rounded-lg flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-rose-900 text-[11px]">Milk dropped by 12%</p>
                    <p className="text-[10px] text-rose-700">13 May 2024 (Resolved)</p>
                  </div>
                </div>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('alerts')}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold pt-1 block"
                >
                  View All Alerts →
                </button>
              )}
            </div>
          </div>

          {/* 7-Day Production Trend Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">7-Day Milk Yield Trajectory (Liters)</h3>
                <p className="text-xs text-slate-500">Morning and evening yield consistency</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Avg 28.2 L/Day
              </span>
            </div>
            {/* FIX: Add min-w-0 to resolve chart width=0 error */}
            <div className="h-48 w-full min-w-0">
              {recentMilkChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentMilkChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="liters" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: '#059669' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">Unavailable without milk records</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MILK RECORD */}
      {activeTab === 'milk' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Individual Milking History ({animal.animalId})</h3>
            <span className="text-xs text-slate-500">{milkRecords.length} recorded sessions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Milking Session</th>
                  <th className="px-4 py-3">Quantity (Liters)</th>
                  <th className="px-4 py-3">Price / Liter</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milkRecords.map((r) => {
                  const unitPrice = r.pricePerLiter ?? 150;
                  const total = r.totalAmount !== undefined ? r.totalAmount : Math.round((r.quantityLiters ?? 0) * unitPrice);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.date}</td>
                      <td className="px-4 py-3">{r.session}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">{(r.quantityLiters ?? 0).toFixed(1)} L</td>
                      <td className="px-4 py-3 font-mono text-slate-700">Rs {unitPrice} / L</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {r.qualityStatus === 'Rejected' ? (
                          <span className="line-through text-slate-400">Rs 0</span>
                        ) : (
                          `Rs ${total.toLocaleString()}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.qualityStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.qualityStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.remarks || 'Standard milking'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: BREEDING & REPRODUCTION */}
      {activeTab === 'breeding' && (
        <div className="space-y-4">
          {/* Stepper Timeline (Matching Screen 5) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Reproduction Progression Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl relative">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Step 1</span>
                <h4 className="font-bold text-emerald-950 text-xs mt-1">Heat Detected</h4>
                <p className="text-xs text-emerald-800 mt-1 font-mono">12 Mar 2024</p>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Observed: Farm Staff</span>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl relative">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Step 2</span>
                <h4 className="font-bold text-emerald-950 text-xs mt-1">AI Performed</h4>
                <p className="text-xs text-emerald-800 mt-1 font-mono">13 Mar 2024</p>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Semen: Bull XYZ-123</span>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl relative">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Step 3</span>
                <h4 className="font-bold text-emerald-950 text-xs mt-1">Pregnancy Check</h4>
                <p className="text-xs text-emerald-800 mt-1 font-mono">04 Apr 2024</p>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Positive (30 Days)</span>
              </div>

              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl relative">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">Step 4 (Due)</span>
                <h4 className="font-bold text-sky-950 text-xs mt-1">Expected Calving</h4>
                <p className="text-xs text-sky-800 mt-1 font-mono font-bold">25 Sep 2024</p>
                <span className="text-[10px] text-sky-600 block mt-0.5">In 134 Days</span>
              </div>
            </div>
          </div>

          {/* Breeding History List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Breeding & AI Event Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[650px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Heat Date</th>
                    <th className="px-4 py-3">Service Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Bull / Semen Code</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Pregnancy Result</th>
                    <th className="px-4 py-3">Expected Calving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breedingRecords.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{b.heatDate}</td>
                      <td className="px-4 py-3">{b.serviceDate || '—'}</td>
                      <td className="px-4 py-3">{b.method}</td>
                      <td className="px-4 py-3 font-mono">{b.semenCode || b.bullTag || 'Bull XYZ-123'}</td>
                      <td className="px-4 py-3">{b.technician || 'Ali Hassan'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {b.pregnancyResult || 'Positive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {b.expectedCalvingDate || '25 Sep 2024'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: HEALTH & TREATMENTS */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          {/* Active Withdrawal Banner (Matching Screen 6) */}
          <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
                <h4 className="font-bold text-rose-950 text-sm">Withdrawal Information (Active)</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                HOLD ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Medicine:</span>
                <span className="font-bold text-slate-900">Intramast-DC</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Treatment Period:</span>
                <span className="font-medium text-slate-800">14 May - 16 May 2024</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Withdrawal Period:</span>
                <span className="font-bold text-rose-700">5 Days</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Milk Usable From:</span>
                <span className="font-bold text-emerald-700">21 May 2024</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">Current Status:</span>
                <span className="font-bold text-rose-700">Active Hold</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>Milk from this animal is NOT usable for sale until 21 May 2024.</span>
            </div>
          </div>

          {/* Treatments Table (Matching Screen 6) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Clinical Treatments & Veterinary Ledger</h3>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Problem / Diagnosis</th>
                    <th className="px-4 py-3">Treatment / Medicine</th>
                    <th className="px-4 py-3">Dose</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Vet</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60 bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-slate-900">14 May 2024</td>
                    <td className="px-4 py-3 font-bold text-slate-900">Mastitis (Right Front Quarter)</td>
                    <td className="px-4 py-3 font-medium text-rose-800">Intramast-DC</td>
                    <td className="px-4 py-3 font-mono">10 ml</td>
                    <td className="px-4 py-3">3 Days</td>
                    <td className="px-4 py-3">Dr. Imran</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        In Treatment
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">02 Apr 2024</td>
                    <td className="px-4 py-3">Tick Fever</td>
                    <td className="px-4 py-3">Tolfenamic Acid</td>
                    <td className="px-4 py-3 font-mono">20 ml</td>
                    <td className="px-4 py-3">3 Days</td>
                    <td className="px-4 py-3">Dr. Imran</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Recovered
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">15 Feb 2024</td>
                    <td className="px-4 py-3">Worms (Internal Parasites)</td>
                    <td className="px-4 py-3">Albendazole</td>
                    <td className="px-4 py-3 font-mono">100 ml</td>
                    <td className="px-4 py-3">1 Day</td>
                    <td className="px-4 py-3">Dr. Imran</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Recovered
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">10 Jan 2024</td>
                    <td className="px-4 py-3">FMD Vaccine Routine</td>
                    <td className="px-4 py-3">FMD Vaccine</td>
                    <td className="px-4 py-3 font-mono">2 ml</td>
                    <td className="px-4 py-3">1 Day</td>
                    <td className="px-4 py-3">Vet Team</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                        Vaccination
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: FEED & RATIONS */}
      {activeTab === 'feed' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Assigned Total Mixed Ration (TMR)</h3>
              <p className="text-xs text-slate-500">Formulated for High Milking Cows (25L+ Daily Target)</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Active Diet
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Maize Silage Intake:</span>
              <span className="font-bold text-slate-900 text-sm">25.0 kg / day</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Supreme Dairy Wanda:</span>
              <span className="font-bold text-slate-900 text-sm">9.5 kg / day</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Alfalfa Hay & Minerals:</span>
              <span className="font-bold text-slate-900 text-sm">4.0 kg + 250g premix</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 flex justify-between items-center">
            <span>Daily Feed Cost for this cow:</span>
            <span className="font-bold font-mono text-sm">Rs 1,020 / cow / day</span>
          </div>
        </div>
      )}

      {/* Tab 6: LACTATION */}
      {activeTab === 'lactation' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Historical Lactation Records</h3>
            <span className="text-xs text-slate-500">{lactations.length} cycle(s) recorded</span>
          </div>
          {lactations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No lactation records found for this animal.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[650px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Lactation #</th>
                    <th className="px-4 py-3">Calving Date</th>
                    <th className="px-4 py-3">Days In Milk (DIM)</th>
                    <th className="px-4 py-3">Peak Yield</th>
                    <th className="px-4 py-3">Current / End Yield</th>
                    <th className="px-4 py-3">Total Lactation Milk</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lactations.map((lac, index) => (
                    <tr
                      key={lac.id || index}
                      className={lac.status === 'In Milk' ? 'hover:bg-slate-50/60 bg-emerald-50/30' : 'hover:bg-slate-50/60'}
                    >
                      <td className="px-4 py-3 font-bold text-slate-900">
                        Lactation {lac.lactationNumber} {lac.status === 'In Milk' ? '(Current)' : ''}
                      </td>
                      <td className="px-4 py-3 font-medium">{lac.calvingDate}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                        {lac.daysInMilk || 0} Days
                      </td>
                      <td className="px-4 py-3 font-mono">{lac.peakYield ? `${lac.peakYield} L` : '-'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                        {lac.endYield ? `${lac.endYield} L` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {lac.totalMilkLiters ? `${lac.totalMilkLiters.toLocaleString()} L` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lac.status === 'In Milk'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {lac.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: CALVES */}
      {activeTab === 'calves' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Offspring & Calving History</h3>
              <p className="text-xs text-slate-500">Direct progeny registered in cattle master</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {calvings.length} Delivered
            </span>
          </div>

          {calvings.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No offspring/calves registered for this animal yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {calvings.map((c, idx) => (
                <div key={c.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-xs font-mono">
                      {c.calfTag || `Calf #${idx + 1}`}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.calfSex === 'Female'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {c.calfSex}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    DOB: {c.calvingDate} • Birth Wt: {c.birthWeightKg || 38} kg
                  </p>
                  <div className="text-[11px] text-slate-600">
                    Sire: {c.sireTag || 'Artificial Insemination Bull'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Delivery: {c.difficulty || 'Normal / Unassisted'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 8: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Audit Trail & Event Log (Ear Tag: {animal.earTag || animal.animalId})
          </h3>
          <div className="space-y-3 text-xs">
            {/* Combine available records into a live feed */}
            {(() => {
              const events: {
                id: string;
                title: string;
                detail: string;
                date: string;
                color: string;
              }[] = [];

              if (milkRecords.length > 0) {
                const latestMilk = milkRecords[0];
                events.push({
                  id: `milk-${latestMilk.id}`,
                  title: `Milking Recorded: ${latestMilk.quantityLiters} L (${latestMilk.session})`,
                  detail: `Date: ${latestMilk.date} • Quality: ${latestMilk.qualityStatus} • Fat: ${latestMilk.fatPercent || 3.8}%`,
                  date: latestMilk.date,
                  color: 'bg-emerald-500',
                });
              }

              treatments.forEach((t) => {
                events.push({
                  id: `treatment-${t.id}`,
                  title: `Treatment: ${t.medicineName} (${t.problem})`,
                  detail: `Administered by ${t.veterinarian} • Dose: ${t.dose} • Status: ${t.status}`,
                  date: t.date,
                  color: t.isWithdrawalActive ? 'bg-amber-500' : 'bg-slate-500',
                });
              });

              breedingRecords.forEach((b) => {
                events.push({
                  id: `breeding-${b.id}`,
                  title: `Breeding: AI Service (${b.pregnancyResult})`,
                  detail: `Heat Date: ${b.heatDate} • Technician: ${b.technician || 'Vet Staff'} • Method: ${b.method}`,
                  date: b.serviceDate || b.heatDate,
                  color: 'bg-sky-500',
                });
              });

              healthRecords.forEach((h) => {
                events.push({
                  id: `health-${h.id}`,
                  title: `Health Checkup: ${h.problem}`,
                  detail: `Diagnosis: ${h.diagnosis} • Attended by: ${h.veterinarian} • Status: ${h.status}`,
                  date: h.date,
                  color: 'bg-teal-500',
                });
              });

              calvings.forEach((c) => {
                events.push({
                  id: `calving-${c.id}`,
                  title: `Calving Event: Delivered ${c.calfSex} Calf (${c.calfTag || 'Calf'})`,
                  detail: `Calving Date: ${c.calvingDate} • Difficulty: ${c.difficulty}`,
                  date: c.calvingDate,
                  color: 'bg-purple-500',
                });
              });

              // Sort by date descending
              events.sort((a, b) => b.date.localeCompare(a.date));

              if (events.length === 0) {
                return (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No logged audit events recorded for this cow yet.
                  </div>
                );
              }

              return events.slice(0, 15).map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50">
                  <span className={`w-2 h-2 rounded-full ${e.color} shrink-0 mt-1.5`}></span>
                  <div>
                    <span className="font-bold text-slate-800">{e.title}</span>
                    <p className="text-slate-500 text-[11px]">{e.detail}</p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Tab: QR CODE MANAGEMENT & LIVE DIGITAL PASSPORT */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          <AnimalQrCard
            animal={animal}
            onRegenerateToken={handleRegenerateQrToken}
            isRegenerating={isRegeneratingToken}
          />

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Farm Network & Phone Scanning Guide</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  How workers, veterinarians, and buyers use live animal QR codes on Windows LAN
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                LAN Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">1</span>
                  Print Tag or Shed Placard
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Click "Print QR Tag" to create a laminated card for the cow ear tag, neck collar, or stall pen post.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">2</span>
                  Point Mobile Camera
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Open default camera on any Android or iPhone connected to the farm Wi-Fi. Tap the detected URL notification.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">3</span>
                  Instant Live Database Record
                </div>
                <p className="text-slate-600 leading-relaxed">
                  The phone browser loads live milk production, antibiotic withdrawal holds, pregnancy status, and pedigree in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Quick Event for {animal.animalId}</h3>
              <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  onNavigate && onNavigate('milk');
                }}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-emerald-900">Record Milking Session</div>
                    <div className="text-[11px] text-slate-500">Log morning or evening liters & quality metrics</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </button>

              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  onNavigate && onNavigate('breeding');
                }}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-rose-900">Log Breeding / AI Event</div>
                    <div className="text-[11px] text-slate-500">Record heat standing, insemination, or pregnancy test</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-700" />
              </button>

              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  onNavigate && onNavigate('health');
                }}
                className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-sky-900">Add Clinical Treatment</div>
                    <div className="text-[11px] text-slate-500">Log symptoms, antibiotics, vaccines & withdrawal hold</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAddEventModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Animal Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Animal: {animal.animalId}</h3>
                <p className="text-xs text-slate-500">Update identification, classification and herd location</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingEdit(true);
                try {
                  // Status is intentionally NOT sent here. It is excluded from
                  // the update payload because the server rejects it with a 400
                  // and requires PATCH /api/animals/{id}/status, which is what
                  // writes the change to status history.
                  const res = await animalService.update(animal.id, {
                    name: editForm.name,
                    earTag: editForm.earTag,
                    rfid: editForm.rfid,
                    breed: editForm.breed,
                    location: editForm.location,
                    dateOfBirth: editForm.dateOfBirth,
                  });

                  if (!res.success) {
                    showToast(res.message || 'Failed to update animal');
                    return;
                  }

                  // The photo is a separate binary upload, not a field update.
                  if (editPhotoFile) {
                    const photoRes = await animalWritesApi.uploadPhoto(
                      Number(animal.id),
                      editPhotoFile
                    );
                    if (!photoRes.success) {
                      showToast(photoRes.message || 'Details saved, but the photo failed to upload.');
                    }
                  }

                  setAnimal((prev) =>
                    prev
                      ? {
                          ...prev,
                          ...editForm,
                          status: editForm.status as any,
                          photoUrl: animalWritesApi.photoUrl(Number(animal.id)),
                        }
                      : prev
                  );
                  setEditPhotoFile(null);
                  setShowEditModal(false);
                  showToast(`Successfully updated details for ${animal.animalId}`);
                } catch (err: any) {
                  showToast(err.message || 'Failed to update animal');
                } finally {
                  setSavingEdit(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Photo Upload with Max MB Space */}
              <div>
                <AnimalImageUpload
                  value={editForm.photoUrl}
                  onChange={(file, previewUrl) => {
                    setEditPhotoFile(file);
                    setEditForm((prev) => ({ ...prev, photoUrl: previewUrl || prev.photoUrl }));
                  }}
                  defaultMaxMb={2}
                  label="Animal Profile Picture"
                  helperText="Upload or change the animal's profile photo. Maximum 2 MB (JPEG, PNG, WebP)."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ear Tag ID *</label>
                  <input
                    type="text"
                    required
                    value={editForm.earTag}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, earTag: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">RFID / Electronic Tag</label>
                  <input
                    type="text"
                    value={editForm.rfid}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, rfid: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Animal Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Breed</label>
                  <select
                    value={editForm.breed}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, breed: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Holstein Friesian (HF)">Holstein Friesian (HF)</option>
                    <option value="HF Cross (Australian)">HF Cross (Australian)</option>
                    <option value="Jersey">Jersey</option>
                    <option value="Sahiwal">Sahiwal</option>
                    <option value="Cholistani">Cholistani</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Current Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Lactating">Lactating</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Dry">Dry</option>
                    <option value="Heifer">Heifer</option>
                    <option value="Calf">Calf</option>
                    <option value="Sick">Sick / Treatment</option>
                    <option value="Quarantine">Quarantine</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location / Shed</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Quick Animal Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Photo: {animal.animalId}</h3>
                  <p className="text-xs text-slate-500">Ear Tag #{animal.earTag} • {animal.breed}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <AnimalImageUpload
                value={quickPhotoUrl}
                onChange={(url) => setQuickPhotoUrl(url)}
                defaultMaxMb={5}
                label="Animal Image"
                helperText="Upload a sharp photo from camera or disk. Enforces maximum MB limit."
              />

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingPhoto}
                  onClick={async () => {
                    if (!quickPhotoFile) {
                      showToast('Choose an image first.');
                      return;
                    }
                    setSavingPhoto(true);
                    try {
                      // Binary upload to animal_photos. The base64 string is
                      // never sent: animals.photo is varchar(500) and cannot
                      // hold image data.
                      const res = await animalWritesApi.uploadPhoto(
                        Number(animal.id),
                        quickPhotoFile
                      );

                      if (!res.success) {
                        showToast(res.message || 'Failed to upload photo');
                        return;
                      }

                      // Point the UI at the stored image served by the API.
                      const storedUrl = animalWritesApi.photoUrl(Number(animal.id));
                      setAnimal((prev) => (prev ? { ...prev, photoUrl: storedUrl } : prev));
                      setEditForm((prev) => ({ ...prev, photoUrl: storedUrl }));
                      setQuickPhotoFile(null);
                      setShowPhotoModal(false);
                      showToast(`Photo updated for ${animal.animalId}`);
                    } catch (err: any) {
                      showToast(err.message || 'Failed to update photo');
                    } finally {
                      setSavingPhoto(false);
                    }
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 text-xs flex items-center gap-1.5"
                >
                  {savingPhoto ? 'Saving...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
