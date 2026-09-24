import React, { useState } from 'react';
import { Order, OrderStatus, UploadedFile } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { OrderTimeline } from './OrderTimeline';
import { getAuthorizedFileUrl } from '../../lib/storage';
import {
  X,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  Download,
  Eye,
  Calendar,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'timeline'>('files');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order?.status || 'pending');
  const [statusNote, setStatusNote] = useState('');

  if (!order) return null;

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus !== order.status || statusNote) {
      onUpdateStatus(order.id, selectedStatus, statusNote);
      setStatusNote('');
    }
  };

  const cleanPhone = (order.customer?.phone || '').replace(/\D/g, '').slice(-10);
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hello ${order.customer?.name || ''}, regarding your Xerox print order #${order.order_number}: `
  )}`;

  const resolveFileUrl = async (file?: UploadedFile): Promise<string> => {
    if (!file) return '';
    // Priority 1: Supabase remote storage path
    if (file.storage_path && !file.storage_path.startsWith('blob:')) {
      const remoteUrl = await getAuthorizedFileUrl(file.storage_path);
      if (remoteUrl) return remoteUrl;
    }
    // Priority 2: Remote HTTPS preview_url
    if (file.preview_url && !file.preview_url.startsWith('blob:')) {
      return file.preview_url;
    }
    // Priority 3: Data URL
    if (file.data_url) {
      return file.data_url;
    }
    // Priority 4: Local preview blob if still active
    if (file.preview_url) {
      return file.preview_url;
    }
    return '';
  };

  const createPrintJobTicketUrl = (file?: UploadedFile): string => {
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
    return URL.createObjectURL(blob);
  };

  const handlePrintDocument = async (file?: UploadedFile) => {
    let win: Window | null = null;
    try {
      win = window.open('about:blank', '_blank');
    } catch (e) {
      console.warn('Popup blocker notice', e);
    }

    let fileUrl = await resolveFileUrl(file);
    if (!fileUrl) {
      fileUrl = createPrintJobTicketUrl(file);
    }

    if (fileUrl) {
      if (win && !win.closed) {
        win.location.href = fileUrl;
        win.focus();
        setTimeout(() => {
          try { win?.print(); } catch (err) {}
        }, 1200);
      } else {
        window.open(fileUrl, '_blank');
      }
    } else {
      win?.close();
      window.print();
    }
  };

  const handleViewDocument = async (file?: UploadedFile) => {
    let win: Window | null = null;
    try {
      win = window.open('about:blank', '_blank');
    } catch (e) {}

    let fileUrl = await resolveFileUrl(file);
    if (!fileUrl) {
      fileUrl = createPrintJobTicketUrl(file);
    }

    if (fileUrl) {
      if (win && !win.closed) {
        win.location.href = fileUrl;
        win.focus();
      } else {
        window.open(fileUrl, '_blank');
      }
    } else {
      win?.close();
    }
  };

  const handlePrintAll = async () => {
    if (order.files && order.files.length > 0) {
      for (const f of order.files) {
        await handlePrintDocument(f);
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Order #{order.order_number}
            </span>
            <StatusBadge status={order.status} size="md" />
            {order.priority === 'urgent' && (
              <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-md font-bold uppercase">
                Urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
              title="Open and print all order files"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="border-b border-slate-200 px-6 flex gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Files & Print Specs ({order.items?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Status History & Audit ({order.history?.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Customer Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Customer Information
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                {order.customer?.name || 'Customer'}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91 {order.customer?.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Customer</span>
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                title="Call Customer"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {order.customer_note && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700 mb-0.5">
                Special Customer Instructions:
              </span>
              {order.customer_note}
            </div>
          )}

          {activeTab === 'files' ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm">Print Files Breakdown</h4>
              <div className="space-y-3">
                {(order.items || []).map((item, idx) => {
                  const matchingFile = order.files?.find((f) => f.id === item.file_id) || order.files?.[idx];
                  return (
                    <div
                      key={item.id || idx}
                      className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-800 text-sm">
                              {item.file_name || matchingFile?.original_filename || `Document ${idx + 1}`}
                            </h5>
                            <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                                {item.paper_size}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                {item.print_color === 'bw' ? 'Black & White' : 'Full Color'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                {item.print_side === 'single' ? 'Single Side' : 'Double Side'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                                {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                              </span>
                              {item.page_range && item.page_range !== 'all' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                                  Pages: {item.page_range}
                                </span>
                              )}
                              {item.lamination_type && item.lamination_type !== 'none' && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                                  + Lamination
                                </span>
                              )}
                              {item.binding_type && item.binding_type !== 'none' && (
                                <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-medium">
                                  + {item.binding_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">Calculated</span>
                          <span className="text-base font-bold text-slate-900">₹{item.item_total}</span>
                        </div>
                      </div>

                      {/* File action buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(matchingFile)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors"
                          title="View and inspect document in new tab"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Document</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintDocument(matchingFile)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition-colors"
                          title="Directly print this document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print File</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const url = await resolveFileUrl(matchingFile);
                            if (url) {
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = matchingFile?.original_filename || item.file_name || 'document';
                              a.target = '_blank';
                              a.click();
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown Footer */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">₹{order.subtotal}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-₹{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Total Order Value</span>
                  <span className="text-indigo-600 text-base">₹{order.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="font-semibold text-slate-800 text-sm mb-4">State Transition Timeline</h4>
              <OrderTimeline history={order.history || []} />
            </div>
          )}

          {/* Quick Status Progression Form */}
          <form onSubmit={handleStatusSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
              Update Order Status
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                className="bg-white border border-slate-300 text-xs font-semibold rounded-xl p-2 sm:w-48 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">Pending (New)</option>
                <option value="confirmed">Confirmed</option>
                <option value="printing">Printing Now</option>
                <option value="ready">Ready for Pickup</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                type="text"
                placeholder="Optional status note (e.g. Printed 2 copies, stapled)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="flex-1 bg-white border border-slate-300 text-xs rounded-xl p-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                Update Status
              </button>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Payment: <span className="font-bold text-slate-800 uppercase">{order.payment_method}</span> ({order.payment_status})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
