import React from 'react';
import { CheckCircle2, ArrowRight, Share2, Printer, Store } from 'lucide-react';

interface OrderSuccessPageProps {
  orderNumber: string;
  customerPhone?: string;
  onTrackOrder: (orderNumber: string) => void;
  onNewOrder: () => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderNumber,
  customerPhone,
  onTrackOrder,
  onNewOrder,
}) => {
  const shareText = `My Xerox print order #${orderNumber} has been placed! Track status at ${window.location.origin}/track/${orderNumber}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center space-y-6">
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Order Received
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-3 tracking-tight">
            #{orderNumber}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Your print order has been queued directly at the shop counter. Show this order number when collecting your documents.
          </p>
        </div>

        {/* Verification Phone Note */}
        {customerPhone && (
          <div className="bg-slate-50 rounded-2xl p-3 text-xs text-slate-600 border border-slate-100">
            Linked to WhatsApp number: <span className="font-mono font-bold text-slate-800">+91 {customerPhone}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => onTrackOrder(orderNumber)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all"
          >
            <span>Track Live Order Status</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-2xl border border-emerald-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Order via WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onNewOrder}
            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-2"
          >
            Place Another Print Order
          </button>
        </div>
      </div>
    </div>
  );
};
