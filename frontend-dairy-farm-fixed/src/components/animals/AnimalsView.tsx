import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  LayoutGrid,
  List,
  Radio,
  QrCode,
  Filter,
  ShoppingBag,
  TrendingDown,
  Skull,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { animalService, animalAdapter, AnimalViewModel } from '../../services';
import { animalWritesApi } from '../../services/api/apiClient';
import { Animal, AnimalBreed, AnimalStatus, CreateAnimalInput } from '../../types';
import { HerdTransactionsView } from '../HerdTransactionsView';
import { QrAnimalLookupModal } from './QrAnimalLookupModal';
import { AnimalImageUpload } from './AnimalImageUpload';
import { useAuth } from '../../context/AuthContext';

interface AnimalsViewProps {
  onSelectAnimal?: (animalId: string) => void;
}

export const AnimalsView: React.FC<AnimalsViewProps> = ({ onSelectAnimal }) => {
  const { farmId } = useAuth();
  const [animals, setAnimals] = useState<AnimalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [breedFilter, setBreedFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Section switcher (Active Herd vs Purchases vs Sales vs Mortality)
  const [activeSection, setActiveSection] = useState<'herd' | 'purchases' | 'sales' | 'mortality'>('herd');
  const [transactionCounts, setTransactionCounts] = useState({
    purchases: null as number | null,
    sales: null as number | null,
    mortalities: null as number | null,
  });
  const [showQrModal, setShowQrModal] = useState(false);

  // Advanced Filtering (Requirement 4)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterSex, setFilterSex] = useState<string>('ALL');
  const [filterPregnancy, setFilterPregnancy] = useState<string>('ALL');
  const [filterMinMilk, setFilterMinMilk] = useState<string>('');
  const [filterMaxMilk, setFilterMaxMilk] = useState<string>('');

  // Mobile View Toggle: 'card' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Selected animal for detail drawer
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalViewModel | null>(null);

  // Add Animal Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<CreateAnimalInput>({
    animalId: '',
    earTag: '',
    photoUrl: '',
    breed: 'Holstein Friesian',
    sex: 'Female',
    dateOfBirth: '2022-01-15',
    status: 'Lactating',
    shedId: 'shed-001',
    groupId: 'group-lactating',
    rfid: '',
    sireId: '',
    damId: '',
    remarks: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Phase 2A: the photo is a File, uploaded as binary AFTER the animal row
   * exists (the upload endpoint needs the animal's numeric id).
   */
  const [newAnimalPhotoFile, setNewAnimalPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAnimals();
  }, [farmId, page, statusFilter, breedFilter, filterSex, filterPregnancy, filterMinMilk, filterMaxMilk]);

  const handleOpenAddModal = async () => {
    setFormError(null);
    // The backend allocates the animal code transactionally when it is omitted.
    // Ear tags are optional database fields, so neither value is fabricated here.
    setFormData({
      animalId: '',
      earTag: '',
      photoUrl: '',
      breed: 'Holstein Friesian',
      sex: 'Female',
      dateOfBirth: new Date().toISOString().split('T')[0],
      status: 'Lactating',
      shedId: '',
      groupId: '',
      rfid: '',
      sireId: '',
      damId: '',
      remarks: '',
    });
    setShowAddModal(true);
  };

  const fetchAnimals = async () => {
    setLoading(true);
    try {
      const query: any = {
        page,
        pageSize: 15,
        search: search.trim() || undefined,
        farmId: farmId ? String(farmId) : undefined,
      };
      if (statusFilter !== 'ALL') {
        query.status = statusFilter;
      }
      if (breedFilter !== 'ALL') {
        query.breed = breedFilter;
      }
      if (filterSex !== 'ALL') {
        query.sex = filterSex;
      }
      if (filterPregnancy === 'PREGNANT') {
        query.pregnant = true;
      } else if (filterPregnancy === 'OPEN') {
        query.pregnant = false;
      }
      if (filterMinMilk) {
        query.productionMin = Number(filterMinMilk);
      }
      if (filterMaxMilk) {
        query.productionMax = Number(filterMaxMilk);
      }

      const res = await animalService.list(query);
      const viewModels = animalAdapter.toViewModelList(res.data);
      setAnimals(viewModels);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setAnimals([]);
      setTotalPages(1);
      setTotalCount(0);
      setLoadError(err instanceof Error ? err.message : 'Could not load animal records.');
    } finally {
      setLoading(false);
    }
  };

  // Live badge counts for the Purchases / Sales / Mortality section tabs.
  // Counts stay null (never shown as 0) until the farm is known and loaded.
  const fetchTransactionCounts = async () => {
    if (farmId == null) return;
    try {
      const [pRes, sRes, mRes] = await Promise.all([
        animalService.listPurchases(farmId),
        animalService.listSales(farmId),
        animalService.listMortalities(farmId),
      ]);
      setTransactionCounts({
        purchases: pRes.data?.length ?? 0,
        sales: sRes.data?.length ?? 0,
        mortalities: mRes.data?.length ?? 0,
      });
    } catch (err) {
      console.error('Failed to load herd transaction counts:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAnimals();
  };

  const handleCreateSubmit = async (e?: React.FormEvent, andNext: boolean = false) => {
    if (e) e.preventDefault();
    setFormError(null);
    if (!farmId) {
      setFormError('A valid farm is required to register an animal.');
      return;
    }

    setSubmitting(true);
    try {
      // The animal code is allocated by the SERVER from `animal_code_sequences`
      // unless the operator typed one, so the form's suggested next ID is only
      // a hint. Group values like 'group-lactating' are not numeric ids, so
      // they are dropped rather than sent as a bogus group_id.
      const payload: CreateAnimalInput = {
        ...formData,
        farmId: farmId ? String(farmId) : undefined,
        groupId: /^\d+$/.test(formData.groupId || '') ? formData.groupId : '',
        shedId: '',
        photoUrl: '',
      };

      const res = await animalService.create(payload);

      if (!res.success) {
        setFormError(res.message || 'Failed to create the animal.');
        return;
      }

      // The photo needs the new animal's numeric id, so it is uploaded second.
      const createdId = (res.data as any)?.animalId;
      if (newAnimalPhotoFile && typeof createdId === 'number') {
        const photoRes = await animalWritesApi.uploadPhoto(createdId, newAnimalPhotoFile);
        if (!photoRes.success) {
          // The animal WAS created. Report the photo failure without implying
          // the whole create failed.
          setFormError(
            `Animal created, but the photo was rejected: ${photoRes.message}`
          );
        }
      }
      setNewAnimalPhotoFile(null);

      fetchAnimals();

      if (andNext) {
        // Leave code and tag blank so the server can allocate the next code.
        setFormData((prev) => ({
          ...prev,
          animalId: '',
          earTag: '',
          name: '',
          rfid: '',
          sireId: '',
          damId: '',
          remarks: '',
        }));
      } else {
        setShowAddModal(false);
        // Reset form
        setFormData({
          animalId: '',
          earTag: '',
          name: '',
          breed: 'Holstein Friesian',
          sex: 'Female',
          dateOfBirth: '2022-01-15',
          status: 'Lactating',
          shedId: 'shed-001',
          groupId: 'group-lactating',
          rfid: '',
          sireId: '',
          damId: '',
          remarks: '',
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create animal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Mark this animal as Sold / Inactive in the registry?')) {
      await animalService.archive(id);
      setSelectedAnimal(null);
      fetchAnimals();
    }
  };

  const statusTabs: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All Herd' },
    { key: 'Lactating', label: 'Lactating' },
    { key: 'Dry', label: 'Dry' },
    { key: 'Pregnant', label: 'Pregnant' },
    { key: 'Heifer', label: 'Heifers' },
    { key: 'Calf', label: 'Calves' },
    { key: 'Sick', label: 'Sick / Iso' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Lactating':
        return 'bg-emerald-100 text-emerald-800';
      case 'Dry':
        return 'bg-amber-100 text-amber-800';
      case 'Pregnant':
        return 'bg-sky-100 text-sky-800';
      case 'Sick':
      case 'Quarantine':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getShedName = (shedId: string) => {
    switch (shedId) {
      case 'shed-001': return 'Shed 1';
      case 'shed-002': return 'Shed 2';
      case 'shed-003': return 'Calf Shed';
      case 'shed-004': return 'Maternity';
      default: return 'Hospital';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Cattle Registry &amp; Herd Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {totalCount} registered animals &bull; Ordered ascending by Ear Tag &bull; RFID Identification
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick QR & Tag Scanner (Req 41) */}
          <button
            id="btn-scan-qr"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 shrink-0 text-slate-600" />
            <span>Scan QR / Tag</span>
          </button>

          {/* Register New Animal with Auto Next Sequential Tag */}
          <button
            id="btn-register-animal"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Register Animal</span>
          </button>
        </div>
      </div>

      {/* Top Section Navigation Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveSection('herd')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition flex items-center space-x-1.5 border-b-2 -mb-[1px] ${
            activeSection === 'herd'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Active Herd ({totalCount})</span>
        </button>
        <button
          onClick={() => setActiveSection('purchases')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition flex items-center space-x-1.5 border-b-2 -mb-[1px] ${
            activeSection === 'purchases'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Purchases{transactionCounts.purchases != null ? ` (${transactionCounts.purchases})` : ''}</span>
        </button>
        <button
          onClick={() => setActiveSection('sales')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition flex items-center space-x-1.5 border-b-2 -mb-[1px] ${
            activeSection === 'sales'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Sales &amp; Disposals{transactionCounts.sales != null ? ` (${transactionCounts.sales})` : ''}</span>
        </button>
        <button
          onClick={() => setActiveSection('mortality')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition flex items-center space-x-1.5 border-b-2 -mb-[1px] ${
            activeSection === 'mortality'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Skull className="w-3.5 h-3.5" />
          <span>Mortality Log{transactionCounts.mortalities != null ? ` (${transactionCounts.mortalities})` : ''}</span>
        </button>
      </div>

      {activeSection !== 'herd' ? (
        <HerdTransactionsView
          activeTab={activeSection}
          onTabChange={(newTab) => setActiveSection(newTab)}
          onCountsLoaded={(counts) => setTransactionCounts(counts)}
          onSelectAnimal={onSelectAnimal}
        />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            {/* Status Pill Tabs (Smooth Horizontal Scroll on Mobile) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none w-full min-w-0">
              {statusTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setStatusFilter(t.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition shrink-0 min-h-[36px] ${
                    statusFilter === t.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search input & Breed filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-100">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Tag, Name, Ear Tag, or RFID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 min-h-[42px]"
                />
              </form>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={breedFilter}
                  onChange={(e) => {
                    setBreedFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto min-h-[42px]"
                >
                  <option value="ALL">All Breeds</option>
                  <option value="Holstein Friesian">Holstein Friesian</option>
                  <option value="Sahiwal">Sahiwal</option>
                  <option value="Jersey">Jersey</option>
                  <option value="Crossbred">Crossbred</option>
                  <option value="Cholistani">Cholistani</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`px-3 py-2.5 border text-xs font-semibold rounded-lg transition min-h-[42px] flex items-center space-x-1.5 shrink-0 ${
                    showAdvanced || filterSex !== 'ALL' || filterPregnancy !== 'ALL' || filterMinMilk || filterMaxMilk
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Advanced Multi-Criteria Filtering (Req 4)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Advanced</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    fetchAnimals();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition min-h-[42px] shrink-0"
                >
                  Search
                </button>

                {/* Mobile View Toggle (Card vs Table) */}
                <div className="flex items-center md:hidden border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('card')}
                    className={`p-2 rounded-md ${mobileViewMode === 'card' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                    title="Card View"
                    aria-label="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('table')}
                    className={`p-2 rounded-md ${mobileViewMode === 'table' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                    title="Table View"
                    aria-label="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Multi-Criteria Filter Panel (Requirement 4) */}
            {showAdvanced && (
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Multi-Criteria Criteria Filters (Requirement 4)
                  </span>
                  {(filterSex !== 'ALL' || filterPregnancy !== 'ALL' || filterMinMilk || filterMaxMilk) && (
                    <button
                      onClick={() => {
                        setFilterSex('ALL');
                        setFilterPregnancy('ALL');
                        setFilterMinMilk('');
                        setFilterMaxMilk('');
                        setPage(1);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">Sex</label>
                    <select
                      value={filterSex}
                      onChange={(e) => {
                        setFilterSex(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">All Sexes</option>
                      <option value="Female">Female Only</option>
                      <option value="Male">Male Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">Pregnancy State</label>
                    <select
                      value={filterPregnancy}
                      onChange={(e) => {
                        setFilterPregnancy(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">All States</option>
                      <option value="PREGNANT">Pregnant Only</option>
                      <option value="OPEN">Open (Not Pregnant)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">Min Milk (L/day)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={filterMinMilk}
                      onChange={(e) => {
                        setFilterMinMilk(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">Max Milk (L/day)</label>
                    <input
                      type="number"
                      placeholder="e.g. 20 (cows below)"
                      value={filterMaxMilk}
                      onChange={(e) => {
                        setFilterMaxMilk(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

      {/* Main Container: Mobile Cards or Full Desktop Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Querying animalService.list()...
          </div>
        ) : loadError ? (
          <div className="py-12 px-4 text-center text-sm text-rose-700">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p>{loadError}</p>
            <button
              type="button"
              onClick={fetchAnimals}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : animals.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No animals found matching current filters.
          </div>
        ) : (
          <>
            {/* 1. MOBILE CARD VIEW: Rendered on mobile by default or when Card toggle is selected */}
            <div className={`${mobileViewMode === 'card' ? 'block md:hidden' : 'hidden'} divide-y divide-slate-100`}>
              {animals.map((animal) => (
                <div
                  key={animal.id}
                  onClick={() => setSelectedAnimal(animal)}
                  className="p-3.5 sm:p-4 hover:bg-slate-50 transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                        <img
                          src={animal.photoUrl || '/holstein_cow.jpg'}
                          alt={animal.animalId}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/holstein_cow.jpg';
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{animal.animalId}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadge(animal.status)}`}>
                            {animal.status}
                          </span>
                          {animal.isWithdrawalActive && (
                            <span
                              title="Medicine Withdrawal Active"
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800"
                            >
                              HOLD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          Tag: #{animal.earTag} {animal.rfid ? `• RFID: ${animal.rfid}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* View Dossier Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnimal(animal);
                        }}
                        className="px-3 py-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition min-h-[38px] flex items-center justify-center gap-1.5 font-semibold text-xs border border-emerald-200"
                        title="View Dossier"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Breed & Sex</span>
                      <span className="font-medium text-slate-800">{animal.breed} ({animal.sex})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Age & Pen</span>
                      <span className="font-medium text-slate-800">{animal.displayAge} • {getShedName(animal.shedId)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Lactation / DIM</span>
                      <span className="font-medium text-slate-800">
                        {animal.lactationNumber ? `Lac #${animal.lactationNumber} (${animal.daysInMilk}d)` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Today Milk Yield</span>
                      <span className="font-bold text-emerald-700">
                        {animal.todayMilk ? `${animal.todayMilk.toFixed(1)} L` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. TABLE VIEW: Desktop default, scrollable container for tablet & mobile toggle */}
            <div className={`${mobileViewMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto w-full min-w-0`}>
              <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Animal ID & RFID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Breed / Sex</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3">Lactation & DIM</th>
                    <th className="px-4 py-3">Today Milk</th>
                    <th className="px-4 py-3">Shed / Pen</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {animals.map((animal) => (
                    <tr
                      key={animal.id}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => setSelectedAnimal(animal)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                            <img
                              src={animal.photoUrl || '/holstein_cow.jpg'}
                              alt={animal.animalId}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/holstein_cow.jpg';
                              }}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 font-mono">{animal.animalId}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Tag: #{animal.earTag}
                            </div>
                            {animal.rfid && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {animal.rfid}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusBadge(animal.status)}`}>
                            {animal.status}
                          </span>
                          {animal.isWithdrawalActive && (
                            <span
                              title="Medicine Withdrawal Active"
                              className="w-2 h-2 rounded-full bg-rose-500 animate-ping"
                            ></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{animal.breed}</div>
                        <div className="text-[11px] text-slate-400">{animal.sex}</div>
                      </td>
                      <td className="px-4 py-3">{animal.displayAge}</td>
                      <td className="px-4 py-3">
                        {animal.lactationNumber ? (
                          <div>
                            <span className="font-medium">Lac #{animal.lactationNumber}</span>
                            <div className="text-[11px] text-slate-400">{animal.daysInMilk || 120} DIM</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-medium">
                            {animal.category === 'Calf'
                              ? 'Calf (Pre-Lac)'
                              : animal.category === 'Heifer'
                              ? 'Heifer (0)'
                              : animal.sex === 'Male'
                              ? 'Sire Bull'
                              : 'Dry / Non-Lactating'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {animal.status === 'In Milk' ? (
                          <span className="font-bold text-emerald-700">{(animal.todayMilk ?? 22.4).toFixed(1)} L</span>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            {animal.category === 'Calf'
                              ? 'Nursing / Milk-fed'
                              : animal.status === 'Dry'
                              ? 'Dry Period'
                              : 'N/A (Non-Milker)'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600 font-mono text-[11px]">
                          {getShedName(animal.shedId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Dossier */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnimal(animal);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                            title="View Detailed Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar (Responsive Stack/Wrap) */}
        <div className="px-3.5 sm:px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span className="text-center sm:text-left">
            Showing Page <strong className="text-slate-900">{page}</strong> of{' '}
            <strong className="text-slate-900">{totalPages}</strong> ({totalCount} total cows)
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 flex items-center justify-center gap-1 font-medium transition min-h-[40px]"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 flex items-center justify-center gap-1 font-medium transition min-h-[40px]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Animal Dossier Drawer Modal (Responsive Mobile Overlay) */}
      {selectedAnimal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedAnimal(null)}
            aria-hidden="true"
          />
          <div className="relative w-full sm:max-w-md bg-white h-full shadow-2xl p-4 sm:p-6 overflow-y-auto space-y-5 z-10">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
                  <img
                    src={selectedAnimal.photoUrl || '/holstein_cow.jpg'}
                    alt={selectedAnimal.animalId}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/holstein_cow.jpg';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-mono">{selectedAnimal.animalId}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(selectedAnimal.status)}`}>
                      {selectedAnimal.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">
                    Tag: #{selectedAnimal.earTag}
                  </div>
                  {selectedAnimal.rfid && (
                    <p className="text-xs text-slate-400 font-mono">
                      RFID: {selectedAnimal.rfid}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg transition"
                aria-label="Close animal dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedAnimal.isWithdrawalActive && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start space-x-2 text-xs text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Antibiotic Milk Hold Active!</strong>
                  Milk from this cow is under active veterinary withdrawal. Do not mix into bulk chilling vat.
                </div>
              </div>
            )}

            {/* Vital Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Breed</span>
                <span className="font-semibold text-slate-800">{selectedAnimal.breed}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Sex</span>
                <span className="font-semibold text-slate-800">{selectedAnimal.sex}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                <span className="font-semibold text-slate-800">{selectedAnimal.dateOfBirth} ({selectedAnimal.displayAge})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[11px]">RFID Electronic Tag</span>
                <span className="font-mono text-slate-800 font-bold">{selectedAnimal.rfid || 'Unassigned'}</span>
              </div>
            </div>

            {/* Production Stats if Cow */}
            {selectedAnimal.sex === 'Female' && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Lactation & Production Dossier
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-[10px] text-emerald-800 block">Lactation</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-950">#{selectedAnimal.lactationNumber || 0}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-[10px] text-emerald-800 block">Days In Milk</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-950">{selectedAnimal.daysInMilk || 0} d</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-[10px] text-emerald-800 block">Today Milk</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-950">{selectedAnimal.todayMilk?.toFixed(1) || '0.0'} L</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pedigree */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Pedigree / Lineage</h4>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sire (Father):</span>
                  <span className="font-medium text-slate-800">{selectedAnimal.sireId || 'Alta-HF Genetics'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dam (Mother):</span>
                  <span className="font-medium text-slate-800">{selectedAnimal.damTag || selectedAnimal.damId || 'Pureline Foundation'}</span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {selectedAnimal.remarks && (
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block mb-1">Veterinary / Farm Notes:</span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 leading-relaxed">
                  {selectedAnimal.remarks}
                </p>
              </div>
            )}

            {/* Full Profile Dossier Action */}
            {onSelectAnimal && (
              <button
                onClick={() => {
                  // NUMERIC database id - this flows to GET /api/animals/{id}.
                  // `selectedAnimal.animalId` is the human-readable code.
                  const id = selectedAnimal.id;
                  setSelectedAnimal(null);
                  onSelectAnimal(id);
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Open Complete Animal Profile View →</span>
              </button>
            )}

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                onClick={() => handleArchive(selectedAnimal.id)}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-3 py-2.5 rounded-lg transition min-h-[44px] text-center"
              >
                Mark as Sold / Cull
              </button>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-4 py-2.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition min-h-[44px] text-center"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Animal Modal (Responsive Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">Register New Animal in Herd</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="add-animal-form" onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                {/* Animal Image Upload with Configurable Maximum MB Limit */}
                <AnimalImageUpload
                  value={formData.photoUrl}
                  onChange={(file, previewUrl) => {
                    // The selected File is uploaded AFTER the animal row exists,
                    // because the photo needs the animal's numeric id.
                    setNewAnimalPhotoFile(file);
                    setFormData((prev) => ({ ...prev, photoUrl: previewUrl || prev.photoUrl }));
                  }}
                  defaultMaxMb={2}
                  label="Animal Photo"
                  helperText="Upload animal identification photo (JPEG, PNG, WebP). Maximum 2 MB."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Animal ID (optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank to let the server allocate it"
                      value={formData.animalId}
                      onChange={(e) => setFormData({ ...formData, animalId: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-medium min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ear Tag # (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 026"
                      value={formData.earTag}
                      onChange={(e) => setFormData({ ...formData, earTag: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900 min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">RFID Electronic Tag #</label>
                    <input
                      type="text"
                      placeholder="e.g. 9002150001026"
                      value={formData.rfid || ''}
                      onChange={(e) => setFormData({ ...formData, rfid: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Breed</label>
                    <select
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value as AnimalBreed })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px] bg-white"
                    >
                      <option value="Holstein Friesian">Holstein Friesian</option>
                      <option value="Sahiwal">Sahiwal</option>
                      <option value="Jersey">Jersey</option>
                      <option value="Crossbred">Crossbred</option>
                      <option value="Cholistani">Cholistani</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sex</label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'Female' | 'Male' })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px] bg-white"
                    >
                      <option value="Female">Female (Cow/Heifer)</option>
                      <option value="Male">Male (Bull/Steer)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Birth Date</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as AnimalStatus })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px] bg-white"
                    >
                      <option value="Lactating">Lactating Cow</option>
                      <option value="Dry">Dry Cow</option>
                      <option value="Pregnant">Pregnant</option>
                      <option value="Open">Open</option>
                      <option value="Heifer">Heifer</option>
                      <option value="Calf">Calf</option>
                      <option value="Sick">Sick</option>
                      <option value="Quarantine">Quarantine</option>
                      <option value="Sold">Sold</option>
                      <option value="Dead">Dead</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Animal Source</label>
                    <select
                      value={formData.source || 'Homebred'}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px] bg-white"
                    >
                      <option value="Homebred">Homebred</option>
                      <option value="Imported">Imported (Global)</option>
                      <option value="Local Purchase">Local Purchase</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate || ''}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Purchase Price (PKR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 450000"
                      value={formData.purchasePrice || ''}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Dam (Mother Tag / ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. AN-005 or Pureline"
                      value={formData.damId || ''}
                      onChange={(e) => setFormData({ ...formData, damId: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sire (Father Bull ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. Alta-HF-204"
                      value={formData.sireId || ''}
                      onChange={(e) => setFormData({ ...formData, sireId: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg min-h-[42px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Remarks / Medical History</label>
                  <textarea
                    rows={2}
                    placeholder="Purchased from Pattoki, vaccinated for FMD..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 shrink-0 flex flex-col-reverse sm:flex-row justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCreateSubmit(undefined, true)}
                  disabled={submitting}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold disabled:opacity-50 min-h-[44px] shadow-2xs"
                >
                  Save &amp; Add Next
                </button>
                <button
                  type="submit"
                  form="add-animal-form"
                  disabled={submitting}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold disabled:opacity-50 min-h-[44px]"
                >
                  {submitting ? 'Saving...' : 'Save Animal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code and Animal Tag Scanner Modal (Req 41) */}
      <QrAnimalLookupModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        onSelectAnimal={(id) => {
          if (onSelectAnimal) {
            onSelectAnimal(id);
          }
        }}
      />
    </div>
  );
};
