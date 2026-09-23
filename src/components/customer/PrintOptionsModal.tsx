import React, { useState } from 'react';
import { PaperSize, PrintColor, PrintSide, PricingRule, ShopService } from '../../types/database';
import { parsePageRange } from '../../lib/pageRange';
import { calculateItemPrice, ItemCalculationInput } from '../../lib/priceEngine';
import { Sliders, Check, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

interface PrintOptionsModalProps {
  filename: string;
  totalPages: number;
  config: ItemCalculationInput;
  pricingRules: PricingRule[];
  services: ShopService[];
  onSave: (newConfig: ItemCalculationInput) => void;
  onClose: () => void;
}

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  filename,
  totalPages,
  config,
  pricingRules,
  services,
  onSave,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>(config.paper_size || 'A4');
  const [printColor, setPrintColor] = useState<PrintColor>(config.print_color || 'bw');
  const [printSide, setPrintSide] = useState<PrintSide>(config.print_side || 'single');
  const [copies, setCopies] = useState<number>(config.copies || 1);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>(
    config.page_range && config.page_range !== 'all' ? 'custom' : 'all'
  );
  const [customRange, setCustomRange] = useState<string>(
    config.page_range && config.page_range !== 'all' ? config.page_range : ''
  );
  const [bindingType, setBindingType] = useState<string>(config.binding_type || 'none');
  const [laminationType, setLaminationType] = useState<string>(config.lamination_type || 'none');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Validation
  const effectiveRange = pageRangeMode === 'all' ? 'all' : customRange;
  const rangeValidation = parsePageRange(effectiveRange, totalPages);

  // Live item calculation
  const previewCost = calculateItemPrice(
    {
      paper_size: paperSize,
      print_color: printColor,
      print_side: printSide,
      copies,
      page_range: effectiveRange,
      total_document_pages: totalPages,
      binding_type: bindingType,
      lamination_type: laminationType,
    },
    pricingRules,
    services
  );

  const handleApply = () => {
    if (pageRangeMode === 'custom' && !rangeValidation.valid) {
      return;
    }

    onSave({
      paper_size: paperSize,
      print_color: printColor,
      print_side: printSide,
      copies,
      page_range: effectiveRange,
      total_document_pages: totalPages,
      binding_type: bindingType,
      lamination_type: laminationType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Print Settings</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* 1. Paper Size */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Paper Size
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['A4', 'A3', 'A5', 'Legal', 'Letter'] as PaperSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    paperSize === size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Color Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Color Selection
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrintColor('bw')}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  printColor === 'bw'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold">Black & White</div>
                  <div className={`text-xs ${printColor === 'bw' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Standard text & documents
                  </div>
                </div>
                {printColor === 'bw' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setPrintColor('color')}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  printColor === 'color'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold">Color Print</div>
                  <div className={`text-xs ${printColor === 'color' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    Photos, charts & posters
                  </div>
                </div>
                {printColor === 'color' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Sides (Single vs Double) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Printing Sides
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrintSide('single')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  printSide === 'single'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <div>Single Side (1-Sided)</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Printed on front page only</div>
              </button>

              <button
                type="button"
                onClick={() => setPrintSide('double')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  printSide === 'double'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <div>Double Side (Back-to-Back)</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Saves paper & cost</div>
              </button>
            </div>
          </div>

          {/* 4. Copies Counter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Number of Copies
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCopies(num)}
                  className={`w-10 h-10 rounded-xl font-semibold border text-sm transition-all ${
                    copies === num
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {num}
                </button>
              ))}
              <div className="flex items-center ml-auto border border-slate-200 rounded-xl bg-white px-2 py-1">
                <span className="text-xs text-slate-400 mr-2">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-sm font-semibold text-slate-800 focus:outline-hidden text-center"
                />
              </div>
            </div>
          </div>

          {/* 5. Page Range */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Pages to Print
            </label>
            <div className="flex gap-3 mb-2">
              <button
                type="button"
                onClick={() => setPageRangeMode('all')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                  pageRangeMode === 'all'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                All Pages ({totalPages || 1})
              </button>
              <button
                type="button"
                onClick={() => setPageRangeMode('custom')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                  pageRangeMode === 'custom'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Selected Pages
              </button>
            </div>

            {pageRangeMode === 'custom' && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 8-10"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-xl border ${
                    !rangeValidation.valid ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
                />
                {!rangeValidation.valid && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {rangeValidation.error}
                  </p>
                )}
                {rangeValidation.valid && (
                  <p className="text-[11px] text-slate-500">
                    Will print {rangeValidation.pageCount} pages ({rangeValidation.pages.join(', ')})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 6. Advanced Add-ons (Lamination & Binding) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 py-1"
            >
              <span>Extra Finishing (Lamination, Binding)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lamination</label>
                  <select
                    value={laminationType}
                    onChange={(e) => setLaminationType(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="none">None</option>
                    <option value="lamination">Thermal Lamination (+₹20/copy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Book Binding</label>
                  <select
                    value={bindingType}
                    onChange={(e) => setBindingType(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="none">None (Stapled)</option>
                    <option value="spiral">Spiral Binding (+₹35/copy)</option>
                    <option value="soft">Soft Binding / Thermal (+₹50/copy)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Live Cost */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500">Item Estimated Cost:</span>
            <div className="text-lg font-bold text-slate-900">₹{previewCost.item_total}</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={pageRangeMode === 'custom' && !rangeValidation.valid}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
