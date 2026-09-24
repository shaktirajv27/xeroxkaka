import React, { useState, useEffect } from 'react';
import { Shop } from '../types/database';
import { db } from '../lib/db';
import {
  Printer,
  Search,
  MapPin,
  ExternalLink,
  Store,
  Phone,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface LandingPageProps {
  onOpenShop: (slug: string) => void;
  onTrackOrder: (orderNumber: string) => void;
  onOpenDashboard: () => void;
  onOpenLogin: (tab?: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenShop,
  onTrackOrder,
  onOpenDashboard,
  onOpenLogin,
}) => {
  const [shops, setShops] = useState<Shop[]>(() => db.getCachedShops());
  const [selectedHeroShopSlug, setSelectedHeroShopSlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [trackInput, setTrackInput] = useState('');
  const [isLoadingShops, setIsLoadingShops] = useState(false);

  useEffect(() => {
    async function fetchLiveShops() {
      setIsLoadingShops(true);
      try {
        const liveShops = await db.getAllShops();
        setShops(liveShops);
        if (liveShops.length > 0 && !selectedHeroShopSlug) {
          setSelectedHeroShopSlug(liveShops[0].slug);
        }
      } catch (err) {
        console.error('Error fetching live shops', err);
      } finally {
        setIsLoadingShops(false);
      }
    }
    fetchLiveShops();
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackInput.trim()) {
      onTrackOrder(trackInput.trim());
    }
  };

  const handleHeroSelectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHeroShopSlug) {
      onOpenShop(selectedHeroShopSlug);
    }
  };

  // Derive unique cities for city filter
  const cities = Array.from(new Set(shops.map((s) => s.city).filter(Boolean)));

  const filteredShops = shops.filter((s) => {
    if (selectedCity !== 'all' && s.city?.toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.shop_name?.toLowerCase().includes(q);
      const matchCity = s.city?.toLowerCase().includes(q);
      const matchAddress = s.address?.toLowerCase().includes(q);
      const matchSlug = s.slug?.toLowerCase().includes(q);
      return matchName || matchCity || matchAddress || matchSlug;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 px-2 rounded-xl bg-white flex items-center justify-center shadow-xs border border-slate-100">
              <img src="/logo.png" alt="PrintSetu" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <span className="font-black text-lg text-slate-900 tracking-tight leading-none block">
                PrintSetu
              </span>
              <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">
                Instant Xerox & Print Network
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onOpenLogin('register')}
              className="hidden sm:inline-flex text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              + Register Shop
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('login')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Shop Login
            </button>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 px-4 text-center max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wide mb-4">
          <Zap className="w-3.5 h-3.5 text-sky-600" /> Stop WhatsApp Print Chaos • Direct Counter Queue
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Scan QR. Upload Files. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Print & Collect in Seconds.
          </span>
        </h1>

        <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto mt-3 leading-relaxed">
          The all-in-one ordering operating system for local Xerox, photocopy, scanning, and digital print centers.
          Zero customer app downloads, instant automated price calculation, and real-time counter print queue.
        </p>

        {/* PRIMARY CONSUMER ACTION: SELECT PRINT SHOP DIRECTLY */}
        <div className="mt-8 max-w-xl mx-auto bg-white p-4 sm:p-5 rounded-3xl border border-sky-200 shadow-xl shadow-sky-500/5 text-left">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Select Your Print Shop to Order
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {shops.length} Active Centers
            </span>
          </div>

          <form onSubmit={handleHeroSelectSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedHeroShopSlug}
                onChange={(e) => setSelectedHeroShopSlug(e.target.value)}
                className="flex-1 py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              >
                {shops.length === 0 ? (
                  <option value="">No shops registered yet</option>
                ) : (
                  shops.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.shop_name} ({s.city})
                    </option>
                  ))
                )}
              </select>

              <button
                type="submit"
                disabled={!selectedHeroShopSlug}
                className="py-3 px-6 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Order Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Tracking Secondary Row */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Already placed an order?</span>
            <form onSubmit={handleTrackSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Order # (e.g. P1001)"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                className="py-1 px-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-36 font-medium"
              />
              <button
                type="submit"
                className="py-1 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Track
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 4-Step Process Section */}
      <section className="max-w-5xl mx-auto px-4 py-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 font-black text-sm">
              1
            </div>
            <h3 className="font-bold text-xs text-slate-800">Scan Counter QR</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Opens mobile browser instantly</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 font-black text-sm">
              2
            </div>
            <h3 className="font-bold text-xs text-slate-800">Upload & Configure</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">PDF, Photos • Choose B&W / Color</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 font-black text-sm">
              3
            </div>
            <h3 className="font-bold text-xs text-slate-800">Shop Prints Order</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Organized live queue with audio alerts</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 font-black text-sm">
              4
            </div>
            <h3 className="font-bold text-xs text-slate-800">Customer Collects</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Show order # and pay Cash / UPI</p>
          </div>
        </div>
      </section>

      {/* Live Partner Printing Centers - DIRECT FROM DATABASE */}
      <section className="max-w-5xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Network Directory
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Verified Partner Print Centers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Select your nearby print center to upload documents and print directly.
            </p>
          </div>

          {/* Search & City Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shop or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 w-40 sm:w-56 font-medium"
              />
            </div>

            {cities.length > 1 && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">All Cities ({shops.length})</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Dynamic Shop Cards */}
        {isLoadingShops ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading active print centers...</span>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {searchQuery || selectedCity !== 'all'
                  ? 'No print centers match your search'
                  : 'No print centers registered yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || selectedCity !== 'all'
                  ? 'Try searching with a different shop name or clear your filters.'
                  : 'Be the first print shop in your area to automate orders and print queues!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLogin('register')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Register Your Print Shop</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Verified Partner • {shop.city || 'India'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">/s/{shop.slug}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{shop.shop_name}</h3>
                  <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{shop.address || `${shop.city}, India`}</span>
                  </div>

                  {shop.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>+91 {shop.phone}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">B&W Printing</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Color Printing</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Instant Counter Queue</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenShop(shop.slug)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Online Print Order</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <p>© 2026 PrintSetu. All-in-one Xerox & Print Management System.</p>
      </footer>
    </div>
  );
};
