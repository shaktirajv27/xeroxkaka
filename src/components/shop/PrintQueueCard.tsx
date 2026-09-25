import React from 'react';
import { Order, OrderStatus, UploadedFile } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { printCustomerFile, viewCustomerFile } from '../../lib/printHelper';
import { Play, CheckCircle2, Eye, Printer, Phone, Clock, FileText, ExternalLink } from 'lucide-react';

interface PrintQueueCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  onOpenDetails: (order: Order) => void;
}

export const PrintQueueCard: React.FC<PrintQueueCardProps> = ({
  order,
  onUpdateStatus,
  onOpenDetails,
}) => {
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    return `${hours}h ago`;
  };

  const totalPages = (order.items || []).reduce(
    (acc, it) => acc + (it.calculated_pages || 1) * (it.copies || 1),
    0
  );

  const openDocument = (file?: UploadedFile) => {
    viewCustomerFile(file, order);
  };

  const handleStartPrinting = async () => {
    onUpdateStatus(order.id, 'printing', 'Started printing order');
    const firstFile = order.files?.[0];
    await printCustomerFile(firstFile, order);
  };

  return (
    <div
      className={`bg-white rounded-3xl border transition-all shadow-sm p-5 flex flex-col justify-between ${
        order.status === 'pending'
          ? 'border-amber-300 ring-2 ring-amber-100/80'
          : order.status === 'printing'
          ? 'border-indigo-400 ring-2 ring-indigo-100/80'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top row: Order number, Priority, Status */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              #{order.order_number}
            </span>
            {order.priority === 'urgent' && (
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                Urgent
              </span>
            )}
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>

        {/* Customer info & Time */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <span>{order.customer?.name || 'Customer'}</span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1 font-mono text-slate-600">
              <Phone className="w-3 h-3 text-slate-400" />
              {order.customer?.phone}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(order.created_at)}</span>
          </div>
        </div>

        {/* Files & Print Specifications */}
        <div className="space-y-2 mb-4">
          {(order.items || []).map((item, idx) => {
            const matchingFile = order.files?.find((f) => f.id === item.file_id) || order.files?.[idx];
            return (
              <div
                key={item.id || idx}
                className="bg-slate-50/80 rounded-2xl p-3 text-xs text-slate-700 flex items-start justify-between gap-2 border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]" title={item.file_name}>
                        {item.file_name || matchingFile?.original_filename || `Document ${idx + 1}`}
                      </span>
                      {matchingFile && (
                        <button
                          type="button"
                          onClick={() => openDocument(matchingFile)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                          title="Open document in new tab to print"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Open</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 mt-1">
                      <span className="font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded">
                        {item.paper_size}
                      </span>
                      <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {item.print_color === 'bw' ? 'B&W' : 'Color'}
                      </span>
                      <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {item.print_side === 'single' ? 'Single' : 'Double'}
                      </span>
                      <span className="font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                        {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                      </span>
                      {item.page_range && item.page_range !== 'all' && (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                          p. {item.page_range}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900">₹{item.item_total}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer instruction note */}
        {order.customer_note && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
            <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700 mb-0.5">
              Customer Note:
            </span>
            {order.customer_note}
          </div>
        )}
      </div>

      {/* Bottom row: Total price & One-click status buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            {totalPages} Pages
          </span>
          <span className="text-lg font-black text-slate-900">₹{order.total}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(order)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="View order details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {order.status === 'pending' && (
            <button
              type="button"
              onClick={handleStartPrinting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Start Printing</span>
            </button>
          )}

          {order.status === 'confirmed' && (
            <button
              type="button"
              onClick={handleStartPrinting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          )}

          {order.status === 'printing' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, 'ready', 'Print finished, ready for customer pickup')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Ready</span>
            </button>
          )}

          {order.status === 'ready' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, 'completed', 'Order collected by customer')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Complete & Collect</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
