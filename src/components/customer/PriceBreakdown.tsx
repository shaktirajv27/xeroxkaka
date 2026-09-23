import React from 'react';
import { OrderCalculationSummary } from '../../lib/priceEngine';
import { ShieldCheck } from 'lucide-react';

interface PriceBreakdownProps {
  summary: OrderCalculationSummary;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ summary }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
      <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Order Summary</h3>

      <div className="space-y-2 text-xs text-slate-600 border-b border-slate-100 pb-3">
        <div className="flex justify-between">
          <span>Total Printed Pages</span>
          <span className="font-semibold text-slate-800">{summary.total_pages} pages</span>
        </div>
        <div className="flex justify-between">
          <span>Total Copies</span>
          <span className="font-semibold text-slate-800">{summary.total_copies}</span>
        </div>
        <div className="flex justify-between">
          <span>Printing Subtotal</span>
          <span className="font-semibold text-slate-800">₹{summary.subtotal}</span>
        </div>
        {summary.discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Special Discount</span>
            <span>-₹{summary.discount}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-sm font-bold text-slate-900">Total Payable</span>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-indigo-600">₹{summary.total}</span>
          <span className="block text-[10px] text-slate-400">Pay at shop counter (Cash/UPI)</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Price calculated directly from shop's verified rate card.</span>
      </div>
    </div>
  );
};
