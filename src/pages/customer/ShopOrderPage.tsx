import React, { useState, useEffect } from 'react';
import { Shop, PricingRule, ShopService, PaperSize } from '../../types/database';
import { db } from '../../lib/db';
import { ProcessedUpload, uploadOrderFile } from '../../lib/storage';
import { calculateOrderSummary, ItemCalculationInput } from '../../lib/priceEngine';
import { FileUploader } from '../../components/customer/FileUploader';
import { FileCard } from '../../components/customer/FileCard';
import { CustomerDetailsForm } from '../../components/customer/CustomerDetailsForm';
import { PriceBreakdown } from '../../components/customer/PriceBreakdown';
import { FilePreviewModal } from '../../components/customer/FilePreviewModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ShieldCheck,
  MapPin,
  Phone,
  ArrowRight,
  Printer,
  AlertCircle,
  Store,
  ChevronDown,
  X,
  Search,
} from 'lucide-react';

interface ShopOrderPageProps {
  shopSlug: string;
  onOrderPlaced: (orderNumber: string, customerPhone: string) => void;
  onNavigateHome: () => void;
  onSelectShop?: (slug: string) => void;
}

export const ShopOrderPage: React.FC<ShopOrderPageProps> = ({
  shopSlug,
  onOrderPlaced,
  onNavigateHome,
  onSelectShop,
}) => {
  const [allShops, setAllShops] = useState<Shop[]>(() => db.getCachedShops());
  const [shop, setShop] = useState<Shop | null>(() => {
    const cached = db.getCachedShops();
    return cached.find((s) => s.slug === shopSlug) || cached[0] || null;
  });
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(() => {
    const cached = db.getCachedShops();
    const target = cached.find((s) => s.slug === shopSlug) || cached[0];
    return target ? db.getCachedPricingRules(target.id) : [];
  });
  const [services, setServices] = useState<ShopService[]>(() => {
    const cached = db.getCachedShops();
    const target = cached.find((s) => s.slug === shopSlug) || cached[0];
    return target ? db.getCachedShopServices(target.id) : [];
  });
  const [availablePaperSizes, setAvailablePaperSizes] = useState<PaperSize[]>(() => {
    const cached = db.getCachedShops();
    const target = cached.find((s) => s.slug === shopSlug) || cached[0];
    return target ? db.getCachedAvailablePaperSizes(target.id) : ['A4', 'A3', 'A5', 'Legal', 'Letter'];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Shop Switcher Modal State
  const [isShopSwitcherOpen, setIsShopSwitcherOpen] = useState(false);
  const [shopSearch, setShopSearch] = useState('');

  // Order State
  const [uploadedItems, setUploadedItems] = useState<{
    upload: ProcessedUpload;
    config: ItemCalculationInput;
  }[]>([]);

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // UI state
  const [previewUpload, setPreviewUpload] = useState<ProcessedUpload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShopData() {
      try {
        const [foundShop, liveShops] = await Promise.all([
          db.getShopBySlug(shopSlug),
          db.getAllShops(),
        ]);

        if (liveShops.length > 0) {
          setAllShops(liveShops);
        }

        const resolved = foundShop || (liveShops.length > 0 ? liveShops[0] : null);
        if (resolved) {
          setShop(resolved);
          const [rules, svcs, sizes] = await Promise.all([
            db.getPricingRules(resolved.id),
            db.getShopServices(resolved.id),
            db.getAvailablePaperSizes(resolved.id),
          ]);
          setPricingRules(rules);
          setServices(svcs);
          if (sizes && sizes.length > 0) {
            setAvailablePaperSizes(sizes);
          }
        }
      } catch (err) {
        console.error('Error loading shop data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadShopData();
  }, [shopSlug]);

  const handleFilesAdded = (newUploads: ProcessedUpload[]) => {
    const defaultPaperSize = (availablePaperSizes && availablePaperSizes.length > 0)
      ? availablePaperSizes[0]
      : ('A4' as const);

    const newItems = newUploads.map((up) => ({
      upload: up,
      config: {
        paper_size: defaultPaperSize,
        print_color: 'bw' as const,
        print_side: 'single' as const,
        copies: 1,
        page_range: 'all',
        total_document_pages: up.page_count,
        binding_type: 'none',
        lamination_type: 'none',
      },
    }));

    setUploadedItems((prev) => [...prev, ...newItems]);

    // Background upload files immediately for sub-200ms submission experience!
    if (shop) {
      newUploads.forEach(async (up) => {
        try {
          const uploadedPath = await uploadOrderFile(up.file, up.storage_path, shop.slug);
          if (uploadedPath) {
            up.storage_path = uploadedPath;
            if (!uploadedPath.startsWith('blob:')) {
              const supabaseUrl =
                (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                'https://rjlfuefvovyqflctqvis.supabase.co';
              up.preview_url = uploadedPath.startsWith('http')
                ? uploadedPath
                : `${supabaseUrl}/storage/v1/object/public/order-documents/${uploadedPath}`;
            }
          }
        } catch (e) {
          console.warn('Background upload notice:', e);
        }
      });
    }
  };

  const handleUpdateConfig = (index: number, newConfig: ItemCalculationInput) => {
    setUploadedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], config: newConfig };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setUploadedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Order summary calculation
  const summary = calculateOrderSummary(
    uploadedItems.map((item) => item.config),
    pricingRules,
    services
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setSubmitError(null);

    if (!shop) return;

    if (uploadedItems.length === 0) {
      setSubmitError('Please upload at least one document or image to print.');
      return;
    }

    if (!customerName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Double click protection
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Ensure all customer files are uploaded to Supabase Storage before order creation
      await Promise.all(
        uploadedItems.map(async (item) => {
          try {
            const uploadedPath = await uploadOrderFile(item.upload.file, item.upload.storage_path, shop.slug);
            if (uploadedPath) {
              item.upload.storage_path = uploadedPath;
              const supabaseUrl =
                (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                'https://rjlfuefvovyqflctqvis.supabase.co';
              const cleanPath = uploadedPath.replace(/^\/+/, '');
              item.upload.preview_url = uploadedPath.startsWith('http')
                ? uploadedPath
                : `${supabaseUrl}/storage/v1/object/public/order-documents/${cleanPath}`;
            }
          } catch (e) {
            console.warn('File upload finalize notice:', e);
          }
        })
      );

      // Create order with real instant local state write + Supabase sync
      const createdOrder = await db.createOrder({
        shop_id: shop.id,
        customer_name: customerName,
        customer_phone: cleanPhone,
        customer_note: customerNote,
        items: uploadedItems.map((item, idx) => {
          const res = summary.item_results[idx];
          return {
            paper_size: item.config.paper_size,
            print_color: item.config.print_color,
            print_side: item.config.print_side,
            copies: item.config.copies,
            page_range: item.config.page_range,
            calculated_pages: res.calculated_pages,
            orientation: 'auto',
            scaling: 'fit',
            pages_per_sheet: 1,
            file_name: item.upload.original_filename,
            file_size: item.upload.file_size,
            binding_type: item.config.binding_type,
            binding_price: res.binding_price,
            lamination_type: item.config.lamination_type,
            lamination_price: res.lamination_price,
            price_per_page: res.price_per_page,
            item_total: res.item_total,
          };
        }),
        files: uploadedItems.map((item) => ({
          shop_id: shop.id,
          original_filename: item.upload.original_filename,
          storage_path: item.upload.storage_path,
          file_type: item.upload.file_type,
          mime_type: item.upload.mime_type,
          file_size: item.upload.file_size,
          page_count: item.upload.page_count,
          status: 'active',
          preview_url: item.upload.preview_url,
          data_url: item.upload.data_url,
        })),
        subtotal: summary.subtotal,
        discount: summary.discount,
        tax: summary.tax,
        total: summary.total,
      });

      onOrderPlaced(createdOrder.order_number, cleanPhone);
    } catch (err: any) {
      console.error('Order creation error', err);
      setSubmitError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDifferentShop = (slug: string) => {
    setIsShopSwitcherOpen(false);
    if (onSelectShop) {
      onSelectShop(slug);
    } else {
      window.location.href = `/s/${slug}`;
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading print center details..." />;
  }

  // Shop Not Found - User friendly directory
  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Print Shop Not Found</h2>
          <p className="text-xs text-slate-500">
            The URL "{shopSlug}" is not registered. Please choose one of our active partner print centers below:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pt-2 text-left">
            {allShops.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectDifferentShop(s.slug)}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{s.shop_name}</h4>
                  <p className="text-[11px] text-slate-500">{s.city} • {s.address}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-600" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const filteredShopsList = allShops.filter((s) => {
    if (!shopSearch.trim()) return true;
    const q = shopSearch.toLowerCase();
    return (
      s.shop_name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28 sm:pb-12 text-slate-900 font-sans">
      {/* Top Header with PrintSetu Brand & Shop Selector */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="h-8 px-1.5 rounded-lg bg-white flex items-center justify-center border border-slate-100 shrink-0 cursor-pointer"
              title="Home"
            >
              <img src="/logo.png" alt="PrintSetu" className="h-5 w-auto object-contain" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {shop.shop_name}
                </h1>
                <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{shop.address}, {shop.city}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Change Shop Button */}
            <button
              type="button"
              onClick={() => setIsShopSwitcherOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Store className="w-3 h-3" />
              <span className="hidden sm:inline">Change Shop</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">Call</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-blue-950 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] font-bold text-sky-200 uppercase tracking-wide mb-2.5">
              <Printer className="w-3 h-3 text-sky-400" /> Direct Counter Print Queue
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
              Instant Online Print Order
            </h2>
            <p className="text-xs text-sky-100 mt-1 max-w-md">
              Upload documents, select color and copies, and pick up your prints at the counter in minutes.
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
        </div>

        {/* 1. File Uploader */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-600 text-[10px] flex items-center justify-center font-bold">1</span>
              Upload Documents
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">{uploadedItems.length} files selected</span>
          </div>

          <FileUploader shopSlug={shop.slug} onFilesSelected={handleFilesAdded} />
        </section>

        {/* 2. Uploaded Files & Print Options */}
        {uploadedItems.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-600 text-[10px] flex items-center justify-center font-bold">2</span>
                Configure Print Options
              </h3>
              <span className="text-[11px] text-sky-600 font-semibold">Tap to customize</span>
            </div>

            <div className="space-y-2.5">
              {uploadedItems.map((item, idx) => (
                <FileCard
                  key={idx}
                  item={item}
                  pricingRules={pricingRules}
                  services={services}
                  availablePaperSizes={availablePaperSizes}
                  onUpdateConfig={(cfg) => handleUpdateConfig(idx, cfg)}
                  onRemove={() => handleRemoveItem(idx)}
                  onPreview={() => setPreviewUpload(item.upload)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Customer Information Form */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-600 text-[10px] flex items-center justify-center font-bold">3</span>
            Customer Details
          </h3>
          <CustomerDetailsForm
            name={customerName}
            phone={customerPhone}
            note={customerNote}
            onChangeName={setCustomerName}
            onChangePhone={setCustomerPhone}
            onChangeNote={setCustomerNote}
            phoneError={phoneError}
          />
        </section>

        {/* 4. Price Breakdown */}
        {uploadedItems.length > 0 && (
          <section className="space-y-2.5">
            <PriceBreakdown summary={summary} />
          </section>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Privacy & Trust Note */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Files are safely processed and retained only for printing.</span>
        </div>
      </main>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-40 shadow-lg sm:static sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:max-w-2xl sm:mx-auto">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Total Amount</span>
            <span className="text-lg sm:text-xl font-black text-slate-900">₹{summary.total}</span>
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || uploadedItems.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-8 py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span>Placing Order in milliseconds...</span>
            ) : (
              <>
                <span>Place Print Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: Switch Print Shop Selector */}
      {isShopSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-sm text-slate-900">Choose a Print Shop</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShopSwitcherOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search shop or city..."
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredShopsList.map((s) => {
                const isSelected = s.slug === shop.slug;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectDifferentShop(s.slug)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{s.shop_name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.city} • {s.address}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal upload={previewUpload} onClose={() => setPreviewUpload(null)} />
    </div>
  );
};
