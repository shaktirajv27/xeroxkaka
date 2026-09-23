import React from 'react';
import { X, FileText, Download, ExternalLink, Printer, Image as ImageIcon } from 'lucide-react';
import { ProcessedUpload } from '../../lib/storage';

interface FilePreviewModalProps {
  upload: ProcessedUpload | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ upload, onClose }) => {
  if (!upload) return null;

  const handlePrint = () => {
    if (upload.preview_url) {
      const win = window.open(upload.preview_url, '_blank');
      win?.focus();
      setTimeout(() => win?.print(), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="min-w-0 pr-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              {upload.file_type === 'image' ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 truncate" title={upload.original_filename}>
                {upload.original_filename}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {upload.file_type.toUpperCase()} • {upload.page_count} {upload.page_count === 1 ? 'page' : 'pages'} • {(upload.file_size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {upload.preview_url && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                  title="Print preview"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <a
                  href={upload.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={upload.preview_url}
                  download={upload.original_filename}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-100/60 min-h-[350px] flex-1">
          {upload.file_type === 'image' && upload.preview_url ? (
            <div className="max-h-[68vh] flex items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm border border-slate-200/70">
              <img
                src={upload.preview_url}
                alt={upload.original_filename}
                className="max-h-[64vh] max-w-full object-contain rounded-xl"
              />
            </div>
          ) : upload.file_type === 'pdf' && upload.preview_url ? (
            <div className="w-full h-[68vh] rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
              <iframe
                src={upload.preview_url}
                title={upload.original_filename}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-200 max-w-sm">
              <FileText className="w-14 h-14 text-indigo-500 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm">{upload.original_filename}</h4>
              <p className="text-xs text-slate-500 mt-1">
                {upload.file_type === 'word'
                  ? 'Microsoft Word documents are queued for native high-definition printing.'
                  : 'Document uploaded successfully. Ready for print queue processing.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
