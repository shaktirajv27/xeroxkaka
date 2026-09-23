import React from 'react';
import { Order, OrderStatus, UploadedFile } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { getAuthorizedFileUrl } from '../../lib/storage';
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

  const openDocument = async (file?: UploadedFile) => {
    // Open a window immediately to guarantee browser popup blocker will not block it
    let win: Window | null = null;
    try {
      win = window.open('about:blank', '_blank');
    } catch (e) {
      console.warn('Popup blocker notice:', e);
    }

    let targetUrl = '';
    // Priority 1: Supabase remote storage URL if present
    if (file?.storage_path && !file.storage_path.startsWith('blob:')) {
      targetUrl = await getAuthorizedFileUrl(file.storage_path);
    }
    // Priority 2: Remote HTTPS preview URL
    if (!targetUrl && file?.preview_url && !file.preview_url.startsWith('blob:')) {
      targetUrl = file.preview_url;
    }
    // Priority 3: Data URL
    if (!targetUrl && file?.data_url) {
      targetUrl = file.data_url;
    }
    // Priority 4: Local preview blob if still active
    if (!targetUrl && file?.preview_url) {
      targetUrl = file.preview_url;
    }

    if (targetUrl) {
      if (win && !win.closed) {
        win.location.href = targetUrl;
        win.focus();
        setTimeout(() => {
          try { win?.print(); } catch (err) {}
        }, 1200);
      } else {
        window.open(targetUrl, '_blank');
      }
    } else {
      // Printable job summary ticket fallback
      const printJobHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order #${order.order_number} - ${file?.original_filename || 'Print Job'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: auto; }
            .header { border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            .order-title { font-size: 28px; font-weight: 900; color: #1e1b4b; }
            .badge { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
            .spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
            .spec-item { padding: 12px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; }
            .spec-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .spec-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .btn-print { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px; }
            @media print { .no-print { display: none; } body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="order-title">Print Job #${order.order_number}</div>
              <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Created: ${new Date(order.created_at).toLocaleString()}</div>
            </div>
            <span class="badge">${order.priority === 'urgent' ? 'Urgent Order' : 'Standard Queue'}</span>
          </div>
          <div class="card">
            <h2 style="font-size: 18px; margin: 0 0 12px 0;">Document: ${file?.original_filename || 'Customer Document'}</h2>
            <div class="spec-grid">
              <div class="spec-item"><div class="spec-label">Customer</div><div class="spec-val">${order.customer?.name || 'Customer'} (${order.customer?.phone || ''})</div></div>
              <div class="spec-item"><div class="spec-label">Paper & Color</div><div class="spec-val">${order.items?.[0]?.paper_size || 'A4'} • ${order.items?.[0]?.print_color === 'bw' ? 'B&W' : 'Color'}</div></div>
              <div class="spec-item"><div class="spec-label">Sides & Copies</div><div class="spec-val">${order.items?.[0]?.print_side === 'single' ? 'Single Sided' : 'Back-to-Back'} • ${order.items?.[0]?.copies || 1} Copies</div></div>
              <div class="spec-item"><div class="spec-label">Total Amount</div><div class="spec-val">₹${order.total}</div></div>
            </div>
            ${order.customer_note ? `<div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;"><strong>Customer Note:</strong> ${order.customer_note}</div>` : ''}
          </div>
          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button class="btn-print" onclick="window.print()">Print This Job Ticket</button>
          </div>
          <script>setTimeout(() => window.print(), 600);</script>
        </body>
        </html>
      `;
      const blob = new Blob([printJobHtml], { type: 'text/html' });
      const fallbackUrl = URL.createObjectURL(blob);
      if (win && !win.closed) {
        win.location.href = fallbackUrl;
        win.focus();
      } else {
        window.open(fallbackUrl, '_blank');
      }
    }
  };

  const handleStartPrinting = async () => {
    onUpdateStatus(order.id, 'printing', 'Started printing order');
    const firstFile = order.files?.[0];
    if (firstFile) {
      await openDocument(firstFile);
    } else {
      await openDocument();
    }
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
