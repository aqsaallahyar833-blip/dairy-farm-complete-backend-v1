import React, { useState } from 'react';
import { X, Printer, PlusCircle, CheckCircle2, AlertCircle, Receipt, ArrowDownLeft } from 'lucide-react';
import { Customer, Income } from '../../types';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  incomes: Income[];
  onPaymentRecorded: () => void;
  recordPaymentService: (
    customerId: string,
    amount: number,
    date: string,
    paymentMethod: string,
    notes?: string
  ) => Promise<any>;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  incomes,
  onPaymentRecorded,
  recordPaymentService,
}) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(customer?.outstandingBalance || 0);
  const [paymentDate, setPaymentDate] = useState('2024-05-14');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  // Filter transactions related to this customer
  const customerIncomes = incomes.filter(
    (i) =>
      (i.customerName && i.customerName.toLowerCase().includes(customer.name.toLowerCase())) ||
      (i.payer && i.payer.toLowerCase().includes(customer.name.toLowerCase())) ||
      (customer.name.toLowerCase().includes('engro') && (i.customerName?.toLowerCase().includes('engro') || i.payer?.toLowerCase().includes('engro')))
  );

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0 PKR.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordPaymentService(
        customer.id,
        Number(paymentAmount),
        paymentDate,
        paymentMethod,
        paymentNotes || `Received payment against receivable balance from ${customer.name}`
      );
      setShowPaymentForm(false);
      onPaymentRecorded();
    } catch (err: any) {
      setError(err.message || 'Failed to record customer payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Customer Account Statement &amp; Trade Ledger
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">{customer.name}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer KPI & Details Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Contact Person</span>
            <span className="font-bold text-slate-900">{customer.contactPerson || 'Direct Accounts'}</span>
            <span className="text-[11px] text-slate-500 block">{customer.phone}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Daily Milk Quota</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {customer.dailyMilkQuotaLiters > 0 ? `${customer.dailyMilkQuotaLiters.toLocaleString()} L` : 'On Demand'}
            </span>
            <span className="text-[11px] text-slate-500 block">@ Rs {customer.ratePerLiter}/L</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Payment Terms</span>
            <span className="font-semibold text-slate-800">{customer.paymentTerms || 'Standard'}</span>
            <span className="text-[11px] text-slate-500 block">{customer.address}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-right">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Current Receivable Due</span>
            <span className="font-mono font-bold text-sm text-emerald-700">
              Rs {(customer.outstandingBalance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Form Toggle & Actions */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Ledger Activity ({customerIncomes.length} Entries)
          </span>
          {!showPaymentForm ? (
            <button
              onClick={() => {
                setPaymentAmount(customer.outstandingBalance || 0);
                setShowPaymentForm(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Record Payment Received</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPaymentForm(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
            >
              Hide Payment Form
            </button>
          )}
        </div>

        {/* Settlement Payment Form */}
        {showPaymentForm && (
          <form
            onSubmit={handlePaymentSubmit}
            className="p-4 bg-emerald-50/60 border-b border-emerald-200 space-y-3 text-xs animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950">Receive Payment Against Account Balance</span>
              <span className="text-slate-500 text-[11px]">Updates ledger &amp; reduces outstanding balance</span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Cash">Cash at Farm Gate</option>
                  <option value="Cheque">Cross Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transaction Reference / Voucher Notes</label>
              <input
                type="text"
                placeholder="Bank ref # / slip notes / cheque number"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Confirm Receipt & Update Ledger'}
              </button>
            </div>
          </form>
        )}

        {/* Ledger Transactions Table */}
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[10px] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Transaction Type</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5 text-right">Volume</th>
                <th className="px-4 py-2.5 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerIncomes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No specific transaction records found for this buyer yet.
                  </td>
                </tr>
              ) : (
                customerIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">{inc.date}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.source === 'Customer Payment'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inc.source || inc.category || 'Dispatch'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{inc.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {inc.quantityLiters ? `${inc.quantityLiters.toLocaleString()} L` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      Rs {inc.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Total Invoiced to Customer:{' '}
            <span className="font-bold text-slate-800 font-mono">
              Rs {customerIncomes.reduce((s, i) => s + i.amount, 0).toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
