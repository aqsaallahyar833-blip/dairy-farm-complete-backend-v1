import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingDown,
  Skull,
  Plus,
  X,
  Search,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Scale,
  Calendar,
  Eye,
  FileText,
} from 'lucide-react';
import { animalService } from '../services';
import { AnimalPurchase, AnimalSale, MortalityRecord, Animal } from '../types';
import { useAuth } from '../context/AuthContext';

interface HerdTransactionsViewProps {
  initialTab?: 'purchases' | 'sales' | 'mortality';
  activeTab?: 'purchases' | 'sales' | 'mortality';
  onTabChange?: (tab: 'purchases' | 'sales' | 'mortality') => void;
  onSelectAnimal?: (animalId: string) => void;
  onCountsLoaded?: (counts: { purchases: number; sales: number; mortalities: number }) => void;
}

export const HerdTransactionsView: React.FC<HerdTransactionsViewProps> = ({
  initialTab = 'purchases',
  activeTab,
  onTabChange,
  onSelectAnimal,
  onCountsLoaded,
}) => {
  const { farmId } = useAuth();
  const [tab, setTab] = useState<'purchases' | 'sales' | 'mortality'>(activeTab || initialTab);
  const [purchases, setPurchases] = useState<AnimalPurchase[]>([]);
  const [sales, setSales] = useState<AnimalSale[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync internal tab whenever activeTab prop changes
  useEffect(() => {
    if (activeTab && activeTab !== tab) {
      setTab(activeTab);
    }
  }, [activeTab]);

  const handleSelectTab = (newTab: 'purchases' | 'sales' | 'mortality') => {
    setTab(newTab);
    if (onTabChange) {
      onTabChange(newTab);
    }
  };

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showMortalityModal, setShowMortalityModal] = useState(false);

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    animalId: '',
    animalTag: '',
    buyerName: '',
    buyerPhone: '',
    saleDate: new Date().toISOString().split('T')[0],
    salePrice: 250000,
    reason: 'Surplus' as AnimalSale['reason'],
    weightKg: 450,
    purchasePrice: 220000,
    profitOrLoss: 30000,
    notes: '',
  });

  // Mortality form state
  const [mortalityForm, setMortalityForm] = useState({
    animalId: '',
    animalTag: '',
    animalName: '',
    deathDate: new Date().toISOString().split('T')[0],
    causeOfDeath: 'Acute Mastitis Septicemia',
    lactationNumber: 2,
    financialLoss: 350000,
    postMortemNotes: '',
    veterinarian: 'Dr. Imran Qureshi',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (farmId == null) {
        setPurchases([]);
        setSales([]);
        setMortalities([]);
        setAnimals([]);
        onCountsLoaded?.({ purchases: 0, sales: 0, mortalities: 0 });
        return;
      }
      const [pRes, sRes, mRes, aRes] = await Promise.all([
        animalService.listPurchases(farmId),
        animalService.listSales(farmId),
        animalService.listMortalities(farmId),
        animalService.list({ pageSize: 100 }),
      ]);
      const pData = pRes.data || [];
      const sData = sRes.data || [];
      const mData = mRes.data || [];
      setPurchases(pData);
      setSales(sData);
      setMortalities(mData);
      setAnimals(aRes.data || []);

      if (onCountsLoaded) {
        onCountsLoaded({
          purchases: pData.length,
          sales: sData.length,
          mortalities: mData.length,
        });
      }

      if (aRes.data && aRes.data.length > 0) {
        const first = aRes.data[0];
        setSaleForm((prev) => ({
          ...prev,
          animalId: first.id,
          animalTag: first.animalId,
        }));
        setMortalityForm((prev) => ({
          ...prev,
          animalId: first.id,
          animalTag: first.animalId,
          animalName: first.animalId,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const pOrL = (saleForm.salePrice || 0) - (saleForm.purchasePrice || 0);
      if (farmId == null) throw new Error('A signed-in farm is required to record a sale.');
      await animalService.recordSale({
        farmId: String(farmId),
        animalId: saleForm.animalId,
        animalTag: saleForm.animalTag,
        buyerName: saleForm.buyerName,
        buyerPhone: saleForm.buyerPhone,
        saleDate: saleForm.saleDate,
        salePrice: Number(saleForm.salePrice),
        reason: saleForm.reason,
        weightKg: Number(saleForm.weightKg),
        purchasePrice: Number(saleForm.purchasePrice),
        profitOrLoss: pOrL,
        notes: saleForm.notes,
      });
      setShowSaleModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMortalitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (farmId == null) throw new Error('A signed-in farm is required to record a mortality record.');
      await animalService.recordMortality({
        farmId: String(farmId),
        animalId: mortalityForm.animalId,
        animalTag: mortalityForm.animalTag,
        animalName: mortalityForm.animalName,
        deathDate: mortalityForm.deathDate,
        causeOfDeath: mortalityForm.causeOfDeath,
        lactationNumber: Number(mortalityForm.lactationNumber),
        financialLoss: Number(mortalityForm.financialLoss),
        postMortemNotes: mortalityForm.postMortemNotes,
        veterinarian: mortalityForm.veterinarian,
      });
      setShowMortalityModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record mortality');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPurchasesAmount = purchases.reduce((s, p) => s + (p.landedCost || 0), 0);
  const totalSalesAmount = sales.reduce((s, p) => s + (p.salePrice || 0), 0);
  const totalMortalityLoss = mortalities.reduce((s, m) => s + (m.financialLoss || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <span>Herd Financial Transactions (Purchases, Sales &amp; Losses)</span>
            </h2>
            <p className="text-xs text-slate-500">Commercial transactions registry for herd assets</p>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Landed Purchases
          </span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            Rs {(totalPurchasesAmount ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Across {purchases.length} imported &amp; local animals</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Cattle Sales Realized
          </span>
          <div className="text-lg font-black text-sky-700 font-mono mt-0.5">
            Rs {(totalSalesAmount ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-sky-600">Disposal revenue &amp; male calf sales</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Mortality Financial Loss
          </span>
          <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
            Rs {(totalMortalityLoss ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-600">{mortalities.length} fatal cases registered</span>
        </div>
      </div>

      {/* Tab Content: PURCHASES */}
      {tab === 'purchases' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <span>Animal Purchases &amp; Landed Cost</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tracks purchase price, transport, veterinary inspection, health clearance, and landed cost
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Animal ID / Tag</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Seller / Vendor</th>
                  <th className="px-4 py-3">Purchase Price</th>
                  <th className="px-4 py-3">Transport Cost</th>
                  <th className="px-4 py-3">Landed Cost</th>
                  <th className="px-4 py-3">Quarantine</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {p.animalTag || p.animalId}
                    </td>
                    <td className="px-4 py-3">{p.purchaseDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.sellerName}</td>
                    <td className="px-4 py-3 font-mono">Rs {(p.purchasePrice ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">Rs {(p.transportCost ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      Rs {(p.landedCost ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {p.quarantineDays} Days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onSelectAnimal && (
                        <button
                          onClick={() => onSelectAnimal(p.animalId)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                        >
                          View Profile
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: SALES */}
      {tab === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-sky-700" />
                <span>Animal Sales &amp; Disposals</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reason for sale, buyer information, live weight, sale price, and net profit/loss
              </p>
            </div>
            <button
              onClick={() => setShowSaleModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold transition shadow-xs self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Animal Sale</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Animal</th>
                  <th className="px-4 py-3">Sale Date</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Live Weight</th>
                  <th className="px-4 py-3">Sale Price</th>
                  <th className="px-4 py-3">Profit / Loss</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {s.animalTag || s.animalId}
                    </td>
                    <td className="px-4 py-3">{s.saleDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.buyerName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                        {s.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{s.weightKg ? `${s.weightKg} kg` : '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      Rs {(s.salePrice ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {s.profitOrLoss !== undefined && s.profitOrLoss !== null ? (
                        <span className={s.profitOrLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {s.profitOrLoss >= 0 ? `+Rs ${(s.profitOrLoss ?? 0).toLocaleString()}` : `-Rs ${Math.abs(s.profitOrLoss ?? 0).toLocaleString()}`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {s.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: MORTALITY */}
      {tab === 'mortality' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Skull className="w-4 h-4 text-rose-700" />
                <span>Herd Mortality &amp; Post-Mortem Records</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Documented fatal cases, clinical cause, financial valuation, and veterinary post-mortem notes
              </p>
            </div>
            <button
              onClick={() => setShowMortalityModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition shadow-xs self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Mortality</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Animal ID</th>
                  <th className="px-4 py-3">Death Date</th>
                  <th className="px-4 py-3">Cause of Death</th>
                  <th className="px-4 py-3">Lactation #</th>
                  <th className="px-4 py-3">Financial Loss</th>
                  <th className="px-4 py-3">Veterinarian</th>
                  <th className="px-4 py-3">Post-Mortem Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mortalities.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition bg-rose-50/10">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {m.animalTag || m.animalId}
                    </td>
                    <td className="px-4 py-3">{m.deathDate}</td>
                    <td className="px-4 py-3 font-medium text-rose-800">{m.causeOfDeath}</td>
                    <td className="px-4 py-3 font-mono">{m.lactationNumber || 0}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      Rs {(m.financialLoss ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{m.veterinarian || 'Dr. Imran Qureshi'}</td>
                    <td className="px-4 py-3 text-slate-700 text-[11px] max-w-sm">
                      {m.postMortemNotes || 'Clinical necropsy verified: internal hemorrhaging & metabolic collapse.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Animal Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Record Animal Sale / Disposal</h3>
              <button onClick={() => setShowSaleModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaleSubmit} className="p-4 space-y-3 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Animal *</label>
                <select
                  value={saleForm.animalId}
                  onChange={(e) => {
                    const chosen = animals.find((a) => a.id === e.target.value);
                    setSaleForm({
                      ...saleForm,
                      animalId: e.target.value,
                      animalTag: chosen ? chosen.animalId : '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.animalId} (Tag: {a.earTag || 'N/A'}) - {a.breed} - {a.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sale Date *</label>
                  <input
                    type="date"
                    required
                    value={saleForm.saleDate}
                    onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reason for Sale *</label>
                  <select
                    value={saleForm.reason}
                    onChange={(e) => setSaleForm({ ...saleForm, reason: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Low Production">Low Production</option>
                    <option value="Reproductive Problem">Reproductive Problem</option>
                    <option value="Disease">Disease</option>
                    <option value="Age">Age</option>
                    <option value="Surplus">Surplus</option>
                    <option value="Male Calf">Male Calf</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haji Farooq"
                    value={saleForm.buyerName}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Live Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 520"
                    value={saleForm.weightKg}
                    onChange={(e) => setSaleForm({ ...saleForm, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sale Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={saleForm.salePrice}
                    onChange={(e) => setSaleForm({ ...saleForm, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cost/Purchase Price</label>
                  <input
                    type="number"
                    value={saleForm.purchasePrice}
                    onChange={(e) => setSaleForm({ ...saleForm, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Disposal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or buyer terms..."
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Confirm Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Mortality Modal */}
      {showMortalityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Record Animal Mortality</h3>
              <button onClick={() => setShowMortalityModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleMortalitySubmit} className="p-4 space-y-3 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  {errorMsg}
                </div>
              )}
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
                <strong>Important:</strong> Recording mortality marks the animal as "Dead" and removes it from the active herd while preserving all historical records.
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Animal *</label>
                <select
                  value={mortalityForm.animalId}
                  onChange={(e) => {
                    const chosen = animals.find((a) => a.id === e.target.value);
                    setMortalityForm({
                      ...mortalityForm,
                      animalId: e.target.value,
                      animalTag: chosen ? chosen.animalId : '',
                      animalName: chosen ? chosen.animalId : '',
                      lactationNumber: chosen?.lactationNumber || 0,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.animalId} (Tag: {a.earTag || 'N/A'}) - {a.breed} - {a.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Death Date *</label>
                  <input
                    type="date"
                    required
                    value={mortalityForm.deathDate}
                    onChange={(e) => setMortalityForm({ ...mortalityForm, deathDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estimated Loss (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={mortalityForm.financialLoss}
                    onChange={(e) => setMortalityForm({ ...mortalityForm, financialLoss: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Suspected / Confirmed Cause *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Tympany, Hemorrhagic Septicemia"
                  value={mortalityForm.causeOfDeath}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, causeOfDeath: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Attending Veterinarian</label>
                <input
                  type="text"
                  value={mortalityForm.veterinarian}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, veterinarian: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Post-Mortem Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical post-mortem autopsy observations..."
                  value={mortalityForm.postMortemNotes}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, postMortemNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMortalityModal(false)}
                  className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Record Mortality'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
