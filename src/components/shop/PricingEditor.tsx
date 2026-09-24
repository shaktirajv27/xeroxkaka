import React, { useState, useEffect } from 'react';
import { PricingRule, PaperSize } from '../../types/database';
import { db } from '../../lib/db';
import { Save, CheckCircle2, Layers, Check } from 'lucide-react';

interface PricingEditorProps {
  shopId: string;
  rules: PricingRule[];
  onRefresh: () => void;
}

const PAPER_DETAILS: Record<PaperSize, { label: string; desc: string; dimensions: string }> = {
  A4: { label: 'A4', desc: 'Standard documents, resumes, assignments', dimensions: '210 × 297 mm' },
  A3: { label: 'A3', desc: 'Posters, drawings, architectural charts', dimensions: '297 × 420 mm' },
  A5: { label: 'A5', desc: 'Booklets, flyers, compact reading format', dimensions: '148 × 210 mm' },
  Legal: { label: 'Legal', desc: 'Government stamp papers, legal contracts', dimensions: '8.5 × 14 in' },
  Letter: { label: 'Letter', desc: 'US standard document format', dimensions: '8.5 × 11 in' },
};

export const PricingEditor: React.FC<PricingEditorProps> = ({ shopId, rules, onRefresh }) => {
  const [localRules, setLocalRules] = useState<PricingRule[]>(rules);
  const [availableSizes, setAvailableSizes] = useState<PaperSize[]>(() => db.getCachedAvailablePaperSizes(shopId));
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const paperSizes: PaperSize[] = ['A4', 'A3', 'A5', 'Legal', 'Letter'];

  useEffect(() => {
    async function loadSizes() {
      const sizes = await db.getAvailablePaperSizes(shopId);
      setAvailableSizes(sizes);
    }
    loadSizes();
  }, [shopId]);

  const handleToggleSize = (size: PaperSize) => {
    setAvailableSizes((prev) => {
      if (prev.includes(size)) {
        if (prev.length <= 1) return prev; // Keep at least one size enabled
        return prev.filter((s) => s !== size);
      } else {
        return [...prev, size];
      }
    });
  };

  const getPrice = (paper: PaperSize, color: 'bw' | 'color', side: 'single' | 'double') => {
    const r = localRules.find(
      (rule) => rule.paper_size === paper && rule.print_color === color && rule.print_side === side
    );
    return r ? r.price_per_page : 0;
  };

  const handlePriceChange = (
    paper: PaperSize,
    color: 'bw' | 'color',
    side: 'single' | 'double',
    newPrice: number
  ) => {
    setLocalRules((prev) => {
      const idx = prev.findIndex(
        (rule) => rule.paper_size === paper && rule.print_color === color && rule.print_side === side
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], price_per_page: newPrice };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: `rule-${paper}-${color}-${side}`,
            shop_id: shopId,
            paper_size: paper,
            print_color: color,
            print_side: side,
            price_per_page: newPrice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await Promise.all([
        db.updatePricingRulesBatch(shopId, localRules),
        db.updateAvailablePaperSizes(shopId, availableSizes),
      ]);
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update pricing rules', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Paper Sizes & Rate Card</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select which paper sizes your machines support, and set per-page prices for each combination.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer transition-all"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Paper & Rates'}</span>
            </>
          )}
        </button>
      </div>

      {/* Offered Paper Sizes Selector (Like Finishing Services) */}
      <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Offered Paper Sizes (Select what your shop has)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {availableSizes.length} of {paperSizes.length} sizes active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {paperSizes.map((size) => {
            const isOffered = availableSizes.includes(size);
            const info = PAPER_DETAILS[size];
            return (
              <label
                key={size}
                onClick={() => handleToggleSize(size)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isOffered
                    ? 'bg-white border-indigo-500/50 shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-100/60 border-slate-200 opacity-60 hover:opacity-80'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isOffered ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isOffered && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{info.label} Paper</span>
                    <span className="text-[10px] font-mono text-slate-400">{info.dimensions}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{info.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-3 px-4">Paper Size</th>
              <th className="py-3 px-4">B&W (Single Side)</th>
              <th className="py-3 px-4">B&W (Back-to-Back)</th>
              <th className="py-3 px-4">Color (Single Side)</th>
              <th className="py-3 px-4">Color (Back-to-Back)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paperSizes.map((size) => {
              const isOffered = availableSizes.includes(size);
              return (
                <tr
                  key={size}
                  className={`transition-colors ${
                    isOffered ? 'hover:bg-slate-50/50' : 'bg-slate-50/40 opacity-50'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{size}</span>
                      {!isOffered && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 uppercase tracking-tight">
                          Not Offered
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        disabled={!isOffered}
                        value={getPrice(size, 'bw', 'single')}
                        onChange={(e) =>
                          handlePriceChange(size, 'bw', 'single', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        disabled={!isOffered}
                        value={getPrice(size, 'bw', 'double')}
                        onChange={(e) =>
                          handlePriceChange(size, 'bw', 'double', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!isOffered}
                        value={getPrice(size, 'color', 'single')}
                        onChange={(e) =>
                          handlePriceChange(size, 'color', 'single', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!isOffered}
                        value={getPrice(size, 'color', 'double')}
                        onChange={(e) =>
                          handlePriceChange(size, 'color', 'double', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
