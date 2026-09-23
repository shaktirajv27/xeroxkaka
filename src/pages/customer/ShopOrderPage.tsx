import React, { useState, useEffect } from 'react';
import { Shop, PricingRule, ShopService } from '../../types/database';
import { db } from '../../lib/db';
import { ProcessedUpload, uploadOrderFile } from '../../lib/storage';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ItemCalculationInput, calculateOrderSummary } from '../../lib/priceEngine';
import { FileUploader } from '../../components/customer/FileUploader';
import { FileCard } from '../../components/customer/FileCard';
import { CustomerDetailsForm } from '../../components/customer/CustomerDetailsForm';
import { PriceBreakdown } from '../../components/customer/PriceBreakdown';
import { FilePreviewModal } from '../../components/customer/FilePreviewModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ShieldCheck, MapPin, Phone, ArrowRight, Printer, AlertCircle } from 'lucide-react';

interface ShopOrderPageProps {
  shopSlug: string;
  onOrderPlaced: (orderNumber: string, customerPhone: string) => void;
  onNavigateHome: () => void;
}

export const ShopOrderPage: React.FC<ShopOrderPageProps> = ({
  shopSlug,
  onOrderPlaced,
  onNavigateHome,
}) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [services, setServices] = useState<ShopService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
      try {
        const foundShop = await db.getShopBySlug(shopSlug);
        if (foundShop) {
          setShop(foundShop);
          const [rules, svcs] = await Promise.all([
            db.getPricingRules(foundShop.id),
            db.getShopServices(foundShop.id),
          ]);
          setPricingRules(rules);
          setServices(svcs);
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
    const newItems = newUploads.map((up) => ({
      upload: up,
      config: {
        paper_size: 'A4' as const,
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
      // Upload physical documents to storage bucket
      await Promise.all(
        uploadedItems.map(async (item) => {
          try {
            const uploadedPath = await uploadOrderFile(item.upload.file, item.upload.storage_path, shop.slug);
            if (uploadedPath) {
              item.upload.storage_path = uploadedPath;
              // Ensure remote preview_url is accessible across all devices (shop PC, counter phone)
              if (!uploadedPath.startsWith('blob:')) {
                const supabaseUrl =
                  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                  'https://rjlfuefvovyqflctqvis.supabase.co';
                item.upload.preview_url = uploadedPath.startsWith('http')
                  ? uploadedPath
                  : `${supabaseUrl}/storage/v1/object/public/order-documents/${uploadedPath}`;
              }
            }
          } catch (e) {
            console.warn('File upload notice:', e);
          }
        })
      );

      // Recalculate trusted prices on backend / db layer
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

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading print shop..." />;
  }

  if (!shop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Shop Not Found</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
          The print shop URL "{shopSlug}" does not exist or has been deactivated.
        </p>
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-12">
      {/* Top Shop Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
              X
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {shop.shop_name}
              </h1>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{shop.address}, {shop.city}</span>
              </div>
            </div>
          </div>

          <a
            href={`tel:${shop.phone}`}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Call Shop</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 uppercase tracking-wide mb-3">
              <Printer className="w-3.5 h-3.5" /> Direct Counter Print
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Send your files for printing
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-md">
              Upload your documents, choose color and copies, and collect your prints at the counter when ready.
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
        </div>

        {/* 1. File Uploader */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              1. Upload Documents
            </h3>
            <span className="text-xs text-slate-500">{uploadedItems.length} files selected</span>
          </div>

          <FileUploader shopSlug={shop.slug} onFilesSelected={handleFilesAdded} />
        </section>

        {/* 2. Uploaded Files & Print Options */}
        {uploadedItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                2. Configure Print Options
              </h3>
              <span className="text-xs text-indigo-600 font-semibold">Tap Configure to change options</span>
            </div>

            <div className="space-y-3">
              {uploadedItems.map((item, idx) => (
                <FileCard
                  key={idx}
                  item={item}
                  pricingRules={pricingRules}
                  services={services}
                  onUpdateConfig={(cfg) => handleUpdateConfig(idx, cfg)}
                  onRemove={() => handleRemoveItem(idx)}
                  onPreview={() => setPreviewUpload(item.upload)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Customer Information Form */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            3. Customer Details
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
          <section className="space-y-3">
            <PriceBreakdown summary={summary} />
          </section>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Privacy & Trust Note */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Your files are private and used only for this print order.</span>
        </div>
      </main>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-lg sm:static sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:max-w-2xl sm:mx-auto">
        <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Estimated Total</span>
            <span className="text-xl font-black text-slate-900">₹{summary.total}</span>
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || uploadedItems.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-2xl shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {isSubmitting ? (
              <span>Submitting Order...</span>
            ) : (
              <>
                <span>Place Print Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal upload={previewUpload} onClose={() => setPreviewUpload(null)} />
    </div>
  );
};
