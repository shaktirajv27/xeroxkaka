import React, { useState } from 'react';
import { ProcessedUpload } from '../../lib/storage';
import { ItemCalculationInput, calculateItemPrice } from '../../lib/priceEngine';
import { PricingRule, ShopService, PaperSize } from '../../types/database';
import { PrintOptionsModal } from './PrintOptionsModal';
import { FileText, Image as ImageIcon, Trash2, Sliders, Eye } from 'lucide-react';

interface FileCardProps {
  item: {
    upload: ProcessedUpload;
    config: ItemCalculationInput;
  };
  pricingRules: PricingRule[];
  services: ShopService[];
  availablePaperSizes?: PaperSize[];
  onUpdateConfig: (newConfig: ItemCalculationInput) => void;
  onRemove: () => void;
  onPreview: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  pricingRules,
  services,
  availablePaperSizes,
  onUpdateConfig,
  onRemove,
  onPreview,
}) => {
  const [showModal, setShowModal] = useState(false);
  const { upload, config } = item;

  const cost = calculateItemPrice(config, pricingRules, services);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon & File Meta */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 border border-slate-200/60">
            {upload.file_type === 'image' ? (
              <ImageIcon className="w-6 h-6 text-blue-600" />
            ) : upload.file_type === 'word' ? (
              <FileText className="w-6 h-6 text-indigo-600" />
            ) : (
              <FileText className="w-6 h-6 text-rose-600" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-slate-800 truncate" title={upload.original_filename}>
              {upload.original_filename}
            </h4>

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{formatFileSize(upload.file_size)}</span>
              <span>•</span>
              <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {upload.page_count} {upload.page_count === 1 ? 'page' : 'pages'}
              </span>
            </div>

            {/* Current Configuration Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                {config.paper_size}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                {config.print_color === 'bw' ? 'B&W' : 'Color'}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                {config.print_side === 'single' ? '1-Sided' : 'Back-to-Back'}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold">
                {config.copies} {config.copies === 1 ? 'copy' : 'copies'}
              </span>
              {config.page_range && config.page_range !== 'all' && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                  Pages: {config.page_range}
                </span>
              )}
              {config.lamination_type && config.lamination_type !== 'none' && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-medium">
                  Lamination
                </span>
              )}
              {config.binding_type && config.binding_type !== 'none' && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-medium">
                  Binding
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Price & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-medium tracking-wider">Item Total</span>
            <span className="text-base sm:text-lg font-bold text-slate-900">₹{cost.item_total}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {upload.preview_url ? (
              <button
                type="button"
                onClick={onPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Preview document"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Preview</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure</span>
            </button>

            <button
              type="button"
              onClick={onRemove}
              title="Remove file"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <PrintOptionsModal
          filename={upload.original_filename}
          totalPages={upload.page_count}
          config={config}
          pricingRules={pricingRules}
          services={services}
          availablePaperSizes={availablePaperSizes}
          onSave={onUpdateConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
