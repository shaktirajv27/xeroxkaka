import React, { useState } from 'react';
import { Order, OrderStatus, UploadedFile } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { OrderTimeline } from './OrderTimeline';
import { printCustomerFile, viewCustomerFile, resolveFileUrl, createPrintJobTicketUrl } from '../../lib/printHelper';
import {
  X,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  Download,
  Eye,
  Calendar,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onDeleteOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'timeline'>('files');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order?.status || 'pending');
  const [statusNote, setStatusNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

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

  const handlePrintDocument = async (file?: UploadedFile) => {
    await printCustomerFile(file, order);
  };

  const handleViewDocument = (file?: UploadedFile) => {
    // Open in-modal preview first for instant viewing
    if (file) {
      setPreviewFile(file);
    } else {
      viewCustomerFile(file, order);
    }
  };

  const handlePrintAll = async () => {
    if (order.files && order.files.length > 0) {
      for (const f of order.files) {
        await printCustomerFile(f, order);
      }
    } else {
      await printCustomerFile(undefined, order);
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
                  const fileUrl = resolveFileUrl(matchingFile);
                  const isImage =
                    matchingFile?.file_type === 'image' ||
                    fileUrl.startsWith('data:image/') ||
                    /\.(jpg|jpeg|png|webp|gif)$/i.test(matchingFile?.original_filename || item.file_name || '');

                  return (
                    <div
                      key={item.id || idx}
                      className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {isImage && fileUrl ? (
                            <div
                              onClick={() => setPreviewFile(matchingFile || ({ original_filename: item.file_name } as any))}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 cursor-pointer relative group"
                              title="Click to view full image"
                            >
                              <img
                                src={fileUrl}
                                alt={item.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

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
                          onClick={() => setPreviewFile(matchingFile || ({ original_filename: item.file_name } as any))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer"
                          title="Preview and inspect document inside modal"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Show File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintDocument(matchingFile)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                          title="Directly print this document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => viewCustomerFile(matchingFile, order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                          title="Open document in new browser tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">New Tab</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const url = resolveFileUrl(matchingFile) || createPrintJobTicketUrl(order, matchingFile);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = matchingFile?.original_filename || item.file_name || 'document';
                            a.target = '_blank';
                            a.click();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
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
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span>
              Payment: <span className="font-bold text-slate-800 uppercase">{order.payment_method}</span> ({order.payment_status})
            </span>

            {onDeleteOrder && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
          >
            Close
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Delete Order #{order.order_number}?</h4>
                  <p className="text-xs text-slate-500">This action will permanently delete this order and its print records.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (onDeleteOrder) {
                      setIsDeleting(true);
                      await onDeleteOrder(order.id);
                      setIsDeleting(false);
                      setShowDeleteConfirm(false);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Order'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document In-Modal Preview Lightbox */}
        {previewFile && (
          <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {previewFile.original_filename}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Order #{order.order_number} • Customer: {order.customer?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintDocument(previewFile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => viewCustomerFile(previewFile, order)}
                    className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    title="Open full size in separate tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document Body */}
              <div className="p-3 sm:p-5 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[50vh]">
                {(() => {
                  const url = resolveFileUrl(previewFile);
                  const isImg =
                    previewFile.file_type === 'image' ||
                    url.startsWith('data:image/') ||
                    /\.(jpg|jpeg|png|webp|gif)$/i.test(previewFile.original_filename || '');

                  if (url && isImg) {
                    return (
                      <div className="flex flex-col items-center">
                        <img
                          src={url}
                          alt={previewFile.original_filename}
                          className="max-h-[68vh] max-w-full rounded-xl object-contain shadow-md"
                        />
                      </div>
                    );
                  }

                  if (url) {
                    return (
                      <iframe
                        src={url}
                        title={previewFile.original_filename}
                        className="w-full h-[68vh] rounded-xl border border-slate-200 bg-white"
                      />
                    );
                  }

                  return (
                    <iframe
                      src={createPrintJobTicketUrl(order, previewFile)}
                      title="Job Ticket"
                      className="w-full h-[68vh] rounded-xl border border-slate-200 bg-white"
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
