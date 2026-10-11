import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  LayoutGrid,
  List,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Check,
  Milk,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { financeService, animalService, financialCalculationService } from '../services';
import { Expense, Income, Customer, Supplier, Animal, AnimalSale } from '../types';
import { useAuth } from '../context/AuthContext';

export const FinanceView: React.FC = () => {
  const { farmId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalSales, setAnimalSales] = useState<AnimalSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile View Toggle: 'card' or 'table'
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  // Sub-tabs per Section 12: Overview, Milk Sales, Animal Sales, Expenses, Customers & Suppliers
  const [activeTab, setActiveTab] = useState<
    'overview' | 'milk-sales' | 'animal-sales' | 'expenses' | 'parties'
  >('overview');

  // Modal 1: Record Expense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    date: '',
    category: 'Feed' as any,
    amount: 0,
    payee: '',
    paymentMethod: 'Bank Transfer' as any,
    description: '',
  });

  // Modal 2: Milk Sales Entry (Section 12: buyer, date, shift (morning/evening/both), qty, rate/liter, fat bonus/deduction, total)
  const [showMilkSaleModal, setShowMilkSaleModal] = useState(false);
  const [milkSaleForm, setMilkSaleForm] = useState({
    buyer: '',
    date: '',
    shift: 'Both' as 'Morning' | 'Evening' | 'Both',
    quantityLiters: 0,
    ratePerLiter: 0,
    fatBonusDeduction: 0,
    total: 0,
    paymentStatus: 'Received' as 'Received' | 'Pending',
    notes: '',
  });

  // Modal 3: Animal Sales Entry (Section 12: animal ID, buyer, sale date, price, reason)
  const [showAnimalSaleModal, setShowAnimalSaleModal] = useState(false);
  const [animalSaleForm, setAnimalSaleForm] = useState({
    animalId: '',
    buyerName: '',
    buyerPhone: '',
    saleDate: '',
    salePrice: 0,
    saleReason: '',
    notes: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (farmId != null) loadFinanceData();
  }, [farmId]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [eRes, iRes, cRes, sRes, aRes] = await Promise.all([
        financeService.listExpenses(farmId as number),
        financeService.listIncomes(farmId as number),
        financeService.listCustomers(farmId as number),
        financeService.listSuppliers(farmId as number),
        animalService.list({ pageSize: 100 }),
      ]);
      setExpenses(eRes.data);
      setIncomes(iRes.data);
      setCustomers(cRes.data);
      setSuppliers(sRes.data);
      setAnimals(aRes.data);
      // Animal sale history is not supported by the canonical backend.
      setAnimalSales([]);

      if (aRes.data.length > 0 && !animalSaleForm.animalId) {
        setAnimalSaleForm((prev) => ({ ...prev, animalId: aRes.data[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      setErrorMsg(err.message || 'Failed to load finance data from the backend.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate milk sale total
  useEffect(() => {
    const effectiveRate = Number(milkSaleForm.ratePerLiter || 0) + Number(milkSaleForm.fatBonusDeduction || 0);
    const calculated = Math.round(Number(milkSaleForm.quantityLiters || 0) * effectiveRate);
    setMilkSaleForm((prev) => ({ ...prev, total: calculated }));
  }, [milkSaleForm.quantityLiters, milkSaleForm.ratePerLiter, milkSaleForm.fatBonusDeduction]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await financeService.createExpense(farmId as number, expenseForm);
      setShowExpenseModal(false);
      showToast('Expense recorded successfully');
      loadFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMilkSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await financeService.createIncome(farmId as number, {
        date: milkSaleForm.date,
        source: 'Milk Sales',
        amount: milkSaleForm.total,
        payer: milkSaleForm.buyer,
        paymentMethod: 'Bank Transfer',
        description: `Milk Sale (${milkSaleForm.shift} Shift): ${milkSaleForm.quantityLiters}L @ Rs ${milkSaleForm.ratePerLiter} (Fat adj: Rs ${milkSaleForm.fatBonusDeduction}). ${milkSaleForm.notes}`,
      });
      setShowMilkSaleModal(false);
      showToast(`Recorded milk dispatch: Rs ${milkSaleForm.total.toLocaleString()} from ${milkSaleForm.buyer}`);
      loadFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record milk sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnimalSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cow = animals.find((a) => a.id === animalSaleForm.animalId);
      await animalService.recordSale({
        animalId: animalSaleForm.animalId,
        animalTag: cow?.earTag || cow?.animalId || animalSaleForm.animalId,
        buyerName: animalSaleForm.buyerName,
        buyerPhone: animalSaleForm.buyerPhone,
        saleDate: animalSaleForm.saleDate,
        salePrice: Number(animalSaleForm.salePrice),
        saleReason: animalSaleForm.saleReason as any,
        notes: animalSaleForm.notes,
      });

      // Also record as farm income
      await financeService.createIncome(farmId as number, {
        date: animalSaleForm.saleDate,
        source: 'Animal Sales',
        amount: Number(animalSaleForm.salePrice),
        payer: animalSaleForm.buyerName,
        paymentMethod: 'Cash',
        description: `Sale of animal ${cow?.earTag || cow?.animalId} (${animalSaleForm.saleReason}) to ${animalSaleForm.buyerName}`,
      });

      setShowAnimalSaleModal(false);
      showToast(`Recorded sale of ${cow?.earTag || cow?.animalId} for Rs ${Number(animalSaleForm.salePrice).toLocaleString()}`);
      loadFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record animal sale');
    } finally {
      setSubmitting(false);
    }
  };

  const financialSummary = financialCalculationService.calculateFinancialSummary(incomes, expenses);
  const totalIncome = financialSummary.totalIncome;
  const totalExpense = financialSummary.totalExpense;
  const netOperatingMargin = financialSummary.netProfit;

  const receivables = customers.map((c) => c.outstandingBalance).filter((v): v is number => v != null);
  const payables = suppliers.map((s) => s.outstandingBalance).filter((v): v is number => v != null);
  const totalReceivables = receivables.length ? receivables.reduce((s, value) => s + value, 0) : null;
  const totalPayables = payables.length ? payables.reduce((s, value) => s + value, 0) : null;

  const milkSalesList = incomes.filter((i) => i.source === 'Milk Sales' || i.source === 'Milk Sale' || i.description?.toLowerCase().includes('milk'));

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
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <span>Farm Financials, Cash Flow &amp; Invoicing</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Milk dispatches &bull; Animal sales &bull; Feed &amp; operational expenses &bull; Customer &amp; supplier ledger
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowMilkSaleModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <Milk className="w-4 h-4 text-emerald-600" />
            <span>Record Milk Sale</span>
          </button>

          <button
            onClick={() => setShowAnimalSaleModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            <span>Record Animal Sale</span>
          </button>

          <button
            id="btn-record-expense"
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Revenue
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
            Rs {totalIncome.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{incomes.length} receipts recorded</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Operational Cost
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-700 mt-1">
            Rs {totalExpense.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{expenses.length} expense vouchers</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Net Operating Margin
          </span>
          <div
            className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
              netOperatingMargin >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            Rs {netOperatingMargin.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Margin: {totalIncome > 0 ? Math.round((netOperatingMargin / totalIncome) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Receivables / Payables
          </span>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1 flex items-center justify-between">
            <span className="text-emerald-700">Rec: {totalReceivables === null ? '—' : `Rs ${totalReceivables.toLocaleString()}`}</span>
            <span className="text-rose-700">Pay: {totalPayables === null ? '—' : `Rs ${totalPayables.toLocaleString()}`}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Trade party credit balance</span>
        </div>
      </div>

      {/* Navigation Sub-tabs per Section 12 */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'overview'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('milk-sales')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'milk-sales'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Milk className="w-3.5 h-3.5" />
            <span>Milk Sales ({milkSalesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('animal-sales')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'animal-sales'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Animal Sales ({animalSales.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'expenses'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('parties')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 min-h-[36px] ${
              activeTab === 'parties'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers &amp; Suppliers ({customers.length + suppliers.length})</span>
          </button>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex items-center md:hidden border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0 mb-1">
          <button
            type="button"
            onClick={() => setMobileViewMode('card')}
            className={`p-1.5 rounded-md ${mobileViewMode === 'card' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
            title="Card View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('table')}
            className={`p-1.5 rounded-md ${mobileViewMode === 'table' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: FINANCIAL OVERVIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Revenue Breakdown by Source</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-lg">
                <span className="font-semibold text-slate-800">Commercial Milk Dispatches</span>
                <span className="font-mono font-bold text-emerald-800">
                  Rs {incomes.filter((i) => i.source === 'Milk Sale').reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-blue-50/60 rounded-lg">
                <span className="font-semibold text-slate-800">Animal &amp; Heifer Sales</span>
                <span className="font-mono font-bold text-blue-800">
                  Rs {incomes.filter((i) => i.source === 'Animal Sale').reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-800">Manure / Bio-Fertilizer / Misc</span>
                <span className="font-mono font-bold text-slate-800">
                  Rs {incomes.filter((i) => i.source !== 'Milk Sale' && i.source !== 'Animal Sale').reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Expense Breakdown by Category</h3>
            <div className="space-y-2 text-xs">
              {['Feed', 'Labour', 'Medicine', 'Electricity/Diesel', 'Maintenance', 'Breeding'].map((cat) => {
                const total = expenses
                  .filter((e) => e.category === cat || e.category?.toLowerCase() === cat.toLowerCase())
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="font-mono font-bold text-slate-900">Rs {total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: MILK SALES                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'milk-sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Milk Sales &amp; Dairy Dispatches</span>
            <button
              onClick={() => setShowMilkSaleModal(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              + Record Milk Sale
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Buyer / Dairy</th>
                  <th className="px-4 py-3">Dispatch Details</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milkSalesList.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{sale.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{sale.payer}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-md">{sale.description || 'Milk dispatch'}</td>
                    <td className="px-4 py-3 text-slate-500">{sale.paymentMethod || 'Bank Transfer'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800 text-right">
                      Rs {(sale.amount ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ANIMAL SALES                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'animal-sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Animal Sales Registry</span>
            <button
              onClick={() => setShowAnimalSaleModal(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              + Record Animal Sale
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Sale Date</th>
                  <th className="px-4 py-3">Animal ID / Tag</th>
                  <th className="px-4 py-3">Buyer Name</th>
                  <th className="px-4 py-3">Sale Reason</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Sale Price (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {animalSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No animal sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  animalSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{sale.saleDate}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{sale.animalTag || sale.animalId}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {sale.buyerName} {sale.buyerPhone ? `(${sale.buyerPhone})` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                          {sale.saleReason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{sale.notes || 'Verified market sale receipt'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800 text-right">
                        Rs {(sale.salePrice ?? 0).toLocaleString()}
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
      {/* SUBTAB 4: EXPENSES                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Expense Vouchers &amp; Farm Operating Costs</span>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              + Record Expense
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{e.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{e.payee || 'Local Vendor'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm">{e.description}</td>
                    <td className="px-4 py-3 text-slate-500">{e.paymentMethod}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700 text-right">
                      Rs {(e.amount ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: CUSTOMERS & SUPPLIERS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'parties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Commercial Dairy Buyers ({customers.length})
            </div>
            <div className="divide-y divide-slate-100">
              {customers.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{c.name}</h4>
                    <span className="text-[11px] text-slate-500">{c.phone} &bull; {c.address}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Receivable Balance</span>
                    <span className="font-mono font-bold text-xs text-emerald-700">
                      {c.outstandingBalance == null ? '—' : `Rs ${c.outstandingBalance.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Feed &amp; Farm Suppliers ({suppliers.length})
            </div>
            <div className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <div key={s.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {s.category} &bull; {s.contactPerson} ({s.phone})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Payable Balance</span>
                    <span className="font-mono font-bold text-xs text-rose-700">
                      {s.outstandingBalance == null ? '—' : `Rs ${s.outstandingBalance.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD EXPENSE (Section 12 Exact Specification)                  */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Operational Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Feed">Feed (Forage, Silage, Concentrate)</option>
                    <option value="Medicine">Medicine &amp; Vaccines</option>
                    <option value="Breeding">Breeding &amp; Semen Straws</option>
                    <option value="Labour">Labour &amp; Milker Wages</option>
                    <option value="Electricity/Diesel">Electricity / Generator Diesel</option>
                    <option value="Maintenance">Parlor / Shed Maintenance</option>
                    <option value="Other">Other Operational</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online / Mobile Wallet">Online / JazzCash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vendor / Payee Name</label>
                <input
                  type="text"
                  required
                  value={expenseForm.payee}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, payee: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Voucher Details</label>
                <textarea
                  rows={2}
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MILK SALES ENTRY (Section 12 Exact Specification)                */}
      {/* ========================================================================= */}
      {showMilkSaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Commercial Milk Dispatch</h3>
                <p className="text-xs text-slate-500">Calculates total value with fat premium adjustments</p>
              </div>
              <button onClick={() => setShowMilkSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMilkSaleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Buyer / Dairy *</label>
                <input
                  type="text"
                  required
                  value={milkSaleForm.buyer}
                  onChange={(e) => setMilkSaleForm((prev) => ({ ...prev, buyer: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dispatch Date *</label>
                  <input
                    type="date"
                    required
                    value={milkSaleForm.date}
                    onChange={(e) => setMilkSaleForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Milking Shift *</label>
                  <select
                    value={milkSaleForm.shift}
                    onChange={(e) => setMilkSaleForm((prev) => ({ ...prev, shift: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Both">Both Sessions (Full Day)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantity (Liters) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={milkSaleForm.quantityLiters}
                    onChange={(e) =>
                      setMilkSaleForm((prev) => ({ ...prev, quantityLiters: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rate / Liter (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={milkSaleForm.ratePerLiter}
                    onChange={(e) =>
                      setMilkSaleForm((prev) => ({ ...prev, ratePerLiter: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fat Bonus / Deduction (+/- PKR)</label>
                <input
                  type="number"
                  step="0.5"
                  value={milkSaleForm.fatBonusDeduction}
                  onChange={(e) =>
                    setMilkSaleForm((prev) => ({ ...prev, fatBonusDeduction: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Positive for &gt; 4.0% fat, negative for lower test result
                </span>
              </div>

              {/* Calculated Total */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-emerald-950 block">Total Invoice Value</span>
                  <span className="text-[11px] text-emerald-800">
                    {milkSaleForm.quantityLiters} L &times; Rs{' '}
                    {milkSaleForm.ratePerLiter + milkSaleForm.fatBonusDeduction}/L
                  </span>
                </div>
                <span className="text-base font-bold font-mono text-emerald-900">
                  Rs {milkSaleForm.total.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Dispatch Slip</label>
                <input
                  type="text"
                  value={milkSaleForm.notes}
                  onChange={(e) => setMilkSaleForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMilkSaleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  Save Milk Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ANIMAL SALES ENTRY (Section 12 Exact Specification)              */}
      {/* ========================================================================= */}
      {showAnimalSaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Animal Sale</h3>
                <p className="text-xs text-slate-500">Marks animal as Sold and records revenue in ledger</p>
              </div>
              <button onClick={() => setShowAnimalSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAnimalSaleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Animal *</label>
                <select
                  required
                  value={animalSaleForm.animalId}
                  onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, animalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {animals
                    .filter((a) => a.status !== 'Sold' && a.status !== 'Dead')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.earTag || a.animalId} — {a.name || 'Unnamed'} ({a.status} &bull; {a.breed})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={animalSaleForm.buyerName}
                    onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, buyerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buyer Phone</label>
                  <input
                    type="text"
                    value={animalSaleForm.buyerPhone}
                    onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sale Date *</label>
                  <input
                    type="date"
                    required
                    value={animalSaleForm.saleDate}
                    onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, saleDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sale Price (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={animalSaleForm.salePrice}
                    onChange={(e) =>
                      setAnimalSaleForm((prev) => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sale Reason *</label>
                <select
                  value={animalSaleForm.saleReason}
                  onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, saleReason: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Surplus Male Calf">Surplus Male Calf</option>
                  <option value="Low Milk Yield">Low Milk Yield / Unprofitable</option>
                  <option value="Old Age / Infertility Culling">Old Age / Infertility Culling</option>
                  <option value="Surplus Pregnant Heifer">Surplus Pregnant Heifer</option>
                  <option value="Cash Flow Liquidity">Cash Flow Liquidity</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sale Remarks</label>
                <textarea
                  rows={2}
                  value={animalSaleForm.notes}
                  onChange={(e) => setAnimalSaleForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnimalSaleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50"
                >
                  Complete Animal Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
