import React, { useState } from 'react';
import { ShopService } from '../../types/database';
import { db } from '../../lib/db';
import { Save, CheckCircle2 } from 'lucide-react';

interface ServicesEditorProps {
  shopId: string;
  services: ShopService[];
  onRefresh: () => void;
}

export const ServicesEditor: React.FC<ServicesEditorProps> = ({ shopId, services, onRefresh }) => {
  const [localServices, setLocalServices] = useState<ShopService[]>(services);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePriceChange = (id: string, price: number) => {
    setLocalServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price } : s))
    );
  };

  const handleToggle = (id: string) => {
    setLocalServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await db.updateShopServicesBatch(shopId, localServices);
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update services', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Finishing & Add-On Services</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Set rates for lamination, spiral binding, and other post-print services.
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
              <span>{isSaving ? 'Saving...' : 'Save Services'}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {localServices.map((svc) => (
          <div
            key={svc.id}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={svc.is_active}
                onChange={() => handleToggle(svc.id)}
                className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
              />
              <div>
                <span className={`text-sm font-semibold ${svc.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {svc.service_name}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {svc.is_active ? 'Available for customer orders' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">₹</span>
              <input
                type="number"
                min="0"
                value={svc.price}
                disabled={!svc.is_active}
                onChange={(e) => handlePriceChange(svc.id, parseFloat(e.target.value) || 0)}
                className="w-24 p-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
