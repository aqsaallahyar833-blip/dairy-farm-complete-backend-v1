import React from 'react';
import { X, Printer, CheckCircle, Clock, Milk, ArrowUpRight } from 'lucide-react';
import { Income, Customer } from '../../types';

interface BillingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Income | null;
  customer?: Customer | null;
}

export const BillingInvoiceModal: React.FC<BillingInvoiceModalProps> = ({
  isOpen,
  onClose,
  record,
  customer,
}) => {
  if (!isOpen || !record) return null;

  const isMilkSale =
    record.category === 'Milk Sales' ||
    record.source === 'Milk Sale' ||
    record.description?.toLowerCase().includes('milk');
  const isAnimalSale =
    record.category === 'Animal Sales' ||
    record.source === 'Animal Sale' ||
    record.description?.toLowerCase().includes('sale of animal') ||
    record.description?.toLowerCase().includes('calf');

  const invoiceNo = `PPD-INV-${record.id.replace(/[^0-9]/g, '').padStart(5, '0')}`;
  const buyerName = record.customerName || record.payer || customer?.name || 'Commercial Dairy Buyer';
  const buyerPhone = customer?.phone || 'On Record';
  const buyerAddress = customer?.address || 'Punjab Dairy Supply Chain Network';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Modal Top Bar (Screen only) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Tax Invoice &amp; Dispatch Note
            </span>
            <span className="text-xs text-slate-300 font-mono">#{invoiceNo}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div id="printable-invoice" className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 text-xs">
          {/* Farm Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-emerald-700">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-base shadow-sm">
                  PP
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                    PUNJAB PURE DAIRY
                  </h1>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Modern Commercial Dairy &amp; Livestock Breeders
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Farm Site: Kasur-Raiwind Agricultural Corridor, Punjab, Pakistan<br />
                NTN: 8172930-4 &bull; Reg: PPD-LIVESTOCK-01<br />
                Phone: +92 42 35988000 &bull; Email: accounts@punjabpuredairy.pk
              </p>
            </div>

            <div className="text-right sm:min-w-[180px]">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                OFFICIAL INVOICE
              </span>
              <div className="mt-2 font-mono font-bold text-slate-900 text-sm">{invoiceNo}</div>
              <div className="text-[11px] text-slate-500 mt-1">Date: <span className="font-semibold text-slate-800">{record.date}</span></div>
              <div className="text-[11px] text-slate-500">Method: <span className="font-semibold text-slate-800">{record.paymentMethod}</span></div>
            </div>
          </div>

          {/* Bill To & Dispatch Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To (Buyer):
              </span>
              <h3 className="font-bold text-slate-950 text-sm">{buyerName}</h3>
              <p className="text-slate-600 text-[11px] mt-0.5">{buyerAddress}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Phone: {buyerPhone}</p>
              {customer?.paymentTerms && (
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Terms: <span className="font-medium text-slate-800">{customer.paymentTerms}</span>
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Transaction Status &amp; Type:
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-700">Category:</span>
                  <span className="font-bold text-slate-900">{record.category || record.source || 'Sale'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-700">Payment Status:</span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Reconciled / Completed</span>
                  </span>
                </div>
                {customer && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-700">Trade Balance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {customer.outstandingBalance == null ? '—' : `Rs ${customer.outstandingBalance.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Description &amp; Specifications</th>
                  <th className="px-4 py-2.5 text-right">Quantity / Vol</th>
                  <th className="px-4 py-2.5 text-right">Unit Rate (PKR)</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-slate-400">01</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {isMilkSale ? 'Chilled Farm Milk Tanker Dispatch' : isAnimalSale ? 'Livestock Animal Asset Transfer' : 'Commercial Farm Output'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      {record.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                    {record.quantityLiters ? `${record.quantityLiters.toLocaleString()} L` : '1 Unit'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                    {record.ratePerLiter ? `Rs ${record.ratePerLiter}` : `Rs ${record.amount.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 text-sm">
                    Rs {record.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total & Summary Calculations */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="max-w-xs text-[11px] text-slate-500">
              <span className="font-bold text-slate-700 block mb-1">Standard Quality Declarations:</span>
              <p>
                Milk dispatched from certified herd parlors. Temperature chilled &lt; 4.0&deg;C.
                Antibiotic withdrawal and hygiene tests verified negative prior to tank release.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">Rs {record.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax / GST</span>
                <span className="font-mono font-semibold">Exempt (Agri Goods)</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-950 text-sm">
                <span>Total Payable</span>
                <span className="font-mono text-emerald-700">Rs {record.amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
            <div>
              <div className="h-10 border-b border-dashed border-slate-300"></div>
              <span className="mt-1 block font-semibold text-slate-700">Farm Dispatch Incharge</span>
              <span>Punjab Pure Dairy Management</span>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-300"></div>
              <span className="mt-1 block font-semibold text-slate-700">Authorized Receiver / Buyer</span>
              <span>{buyerName}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
