import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { PricingRule, ShopService, ShopSettings } from '../../types/database';
import { PricingEditor } from '../../components/shop/PricingEditor';
import { ServicesEditor } from '../../components/shop/ServicesEditor';
import { QRPrintCard } from '../../components/shop/QRPrintCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  QrCode,
  Store,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentShop, refreshShop } = useAuth();
  const [activeTab, setActiveTab] = useState<'pricing' | 'services' | 'qr' | 'profile'>('pricing');
  const [rules, setRules] = useState<PricingRule[]>(() => {
    return currentShop ? db.getCachedPricingRules(currentShop.id) : [];
  });
  const [services, setServices] = useState<ShopService[]>(() => {
    return currentShop ? db.getCachedShopServices(currentShop.id) : [];
  });
  const [settings, setSettings] = useState<ShopSettings | null>(() => {
    return currentShop ? db.getCachedShopSettings(currentShop.id) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Profile Form State
  const [shopName, setShopName] = useState(currentShop?.shop_name || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentShop?.whatsapp_number || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [city, setCity] = useState(currentShop?.city || '');
  const [stateName, setStateName] = useState(currentShop?.state || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (currentShop) {
      const cachedRules = db.getCachedPricingRules(currentShop.id);
      const cachedServices = db.getCachedShopServices(currentShop.id);
      const cachedSettings = db.getCachedShopSettings(currentShop.id);
      setRules(cachedRules);
      setServices(cachedServices);
      setSettings(cachedSettings);

      loadSettingsData();
      setShopName(currentShop.shop_name);
      setPhone(currentShop.phone);
      setWhatsapp(currentShop.whatsapp_number || '');
      setAddress(currentShop.address);
      setCity(currentShop.city);
      setStateName(currentShop.state);
    }
  }, [currentShop]);

  const loadSettingsData = async () => {
    if (!currentShop) return;
    try {
      const [pricingData, servicesData, settingsData] = await Promise.all([
        db.getPricingRules(currentShop.id),
        db.getShopServices(currentShop.id),
        db.getShopSettings(currentShop.id),
      ]);
      setRules(pricingData);
      setServices(servicesData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop) return;
    setIsSavingProfile(true);
    setProfileSuccess(true); // Optimistic feedback immediately

    try {
      await db.updateShop(currentShop.id, {
        shop_name: shopName,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state: stateName,
      });
      await refreshShop();
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update shop profile', err);
      setProfileSuccess(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!currentShop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <LoadingSpinner message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          <span>Shop Settings & Configuration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your rate card, counter QR standee, finishing services, and shop details.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'pricing'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Pricing Rate Card</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'services'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Finishing Services</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'qr'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Printable Counter QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop Profile</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'pricing' && (
        <PricingEditor shopId={currentShop.id} rules={rules} onRefresh={loadSettingsData} />
      )}

      {activeTab === 'services' && (
        <ServicesEditor shopId={currentShop.id} services={services} onRefresh={loadSettingsData} />
      )}

      {activeTab === 'qr' && <QRPrintCard shop={currentShop} />}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <h3 className="font-bold text-slate-800 text-base mb-4">Shop Business Details</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shop Display Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shop Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {profileSuccess && (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Profile saved!
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
