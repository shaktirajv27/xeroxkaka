import React, { useState } from 'react';
import { PricingRule, PaperSize } from '../../types/database';
import { db } from '../../lib/db';
import { Save, CheckCircle2 } from 'lucide-react';

interface PricingEditorProps {
  shopId: string;
  rules: PricingRule[];
  onRefresh: () => void;
}

export const PricingEditor: React.FC<PricingEditorProps> = ({ shopId, rules, onRefresh }) => {
  const [localRules, setLocalRules] = useState<PricingRule[]>(rules);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const paperSizes: PaperSize[] = ['A4', 'A3', 'A5', 'Legal', 'Letter'];

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
      for (const r of localRules) {
        await db.updatePricingRule({
          shop_id: shopId,
          paper_size: r.paper_size,
          print_color: r.print_color,
          print_side: r.print_side,
          price_per_page: Number(r.price_per_page),
        });
      }
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 3000);
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
          <h3 className="font-bold text-slate-800 text-base">Shop Rate Card (Price per page)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure how much you charge per page. Existing orders will keep their snapshotted prices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Rate Card'}</span>
            </>
          )}
        </button>
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
            {paperSizes.map((size) => (
              <tr key={size} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-900">{size}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={getPrice(size, 'bw', 'single')}
                      onChange={(e) =>
                        handlePriceChange(size, 'bw', 'single', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
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
                      value={getPrice(size, 'bw', 'double')}
                      onChange={(e) =>
                        handlePriceChange(size, 'bw', 'double', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
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
                      value={getPrice(size, 'color', 'single')}
                      onChange={(e) =>
                        handlePriceChange(size, 'color', 'single', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 font-semibold"
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
                      value={getPrice(size, 'color', 'double')}
                      onChange={(e) =>
                        handlePriceChange(size, 'color', 'double', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-indigo-700 font-semibold"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
