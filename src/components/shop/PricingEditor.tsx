import React, { useState, useEffect } from 'react';
import { PricingRule, PaperSize } from '../../types/database';
import { DEFAULT_PRICING_RULES } from '../../lib/priceEngine';
import { db } from '../../lib/db';
import { Save, CheckCircle2, Layers, Check, RotateCcw } from 'lucide-react';

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
  const paperSizes: PaperSize[] = ['A4', 'A3', 'A5', 'Legal', 'Letter'];
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [availableSizes, setAvailableSizes] = useState<PaperSize[]>(() => db.getCachedAvailablePaperSizes(shopId));
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSizes() {
      const sizes = await db.getAvailablePaperSizes(shopId);
      if (sizes && sizes.length > 0) {
        setAvailableSizes(sizes);
      }
    }
    loadSizes();
  }, [shopId]);

  // Sync inputs whenever incoming rules change
  useEffect(() => {
    const inputs: Record<string, string> = {};
    paperSizes.forEach((paper) => {
      (['bw', 'color'] as const).forEach((color) => {
        (['single', 'double'] as const).forEach((side) => {
          const key = `${paper}-${color}-${side}`;
          const found = rules.find(
            (r) => r.paper_size === paper && r.print_color === color && r.print_side === side
          );
          if (found && found.price_per_page !== undefined && found.price_per_page !== null) {
            inputs[key] = String(found.price_per_page);
          } else {
            const def = DEFAULT_PRICING_RULES.find(
              (d) => d.paper_size === paper && d.print_color === color && d.print_side === side
            );
            inputs[key] = def ? String(def.price_per_page) : '2';
          }
        });
      });
    });
    setPriceInputs(inputs);
  }, [rules]);

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

  const handlePriceChange = (
    paper: PaperSize,
    color: 'bw' | 'color',
    side: 'single' | 'double',
    val: string
  ) => {
    const key = `${paper}-${color}-${side}`;
    setPriceInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetDefaults = () => {
    const inputs: Record<string, string> = {};
    paperSizes.forEach((paper) => {
      (['bw', 'color'] as const).forEach((color) => {
        (['single', 'double'] as const).forEach((side) => {
          const key = `${paper}-${color}-${side}`;
          const def = DEFAULT_PRICING_RULES.find(
            (d) => d.paper_size === paper && d.print_color === color && d.print_side === side
          );
          inputs[key] = def ? String(def.price_per_page) : '2';
        });
      });
    });
    setPriceInputs(inputs);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const rulesToSave: PricingRule[] = [];
      paperSizes.forEach((paper) => {
        (['bw', 'color'] as const).forEach((color) => {
          (['single', 'double'] as const).forEach((side) => {
            const key = `${paper}-${color}-${side}`;
            const raw = priceInputs[key];
            const parsed = parseFloat(raw);
            const def = DEFAULT_PRICING_RULES.find(
              (d) => d.paper_size === paper && d.print_color === color && d.print_side === side
            );
            const fallback = def ? def.price_per_page : 2;
            const finalPrice = isNaN(parsed) || parsed < 0 ? fallback : parsed;
            rulesToSave.push({
              id: `rule-${shopId}-${paper}-${color}-${side}`,
              shop_id: shopId,
              paper_size: paper,
              print_color: color,
              print_side: side,
              price_per_page: finalPrice,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
        });
      });

      await Promise.all([
        db.updatePricingRulesBatch(shopId, rulesToSave),
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            title="Reset to recommended standard prices"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer transition-all"
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
      </div>

      {/* Offered Paper Sizes Selector */}
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
                        type="text"
                        disabled={!isOffered}
                        value={priceInputs[`${size}-bw-single`] ?? '2'}
                        onChange={(e) => handlePriceChange(size, 'bw', 'single', e.target.value)}
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="text"
                        disabled={!isOffered}
                        value={priceInputs[`${size}-bw-double`] ?? '1.5'}
                        onChange={(e) => handlePriceChange(size, 'bw', 'double', e.target.value)}
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="text"
                        disabled={!isOffered}
                        value={priceInputs[`${size}-color-single`] ?? '10'}
                        onChange={(e) => handlePriceChange(size, 'color', 'single', e.target.value)}
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">₹</span>
                      <input
                        type="text"
                        disabled={!isOffered}
                        value={priceInputs[`${size}-color-double`] ?? '7.5'}
                        onChange={(e) => handlePriceChange(size, 'color', 'double', e.target.value)}
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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
