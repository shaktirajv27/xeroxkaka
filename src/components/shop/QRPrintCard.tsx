import React, { useEffect, useState } from 'react';
import { Shop } from '../../types/database';
import { generateQRCodeDataUrl, generateStandeePosterDataUrl, downloadImage } from '../../lib/qrHelper';
import { Download, Printer, ExternalLink, QrCode, Sparkles, CheckCircle2, Loader2, ImageDown } from 'lucide-react';

interface QRPrintCardProps {
  shop: Shop;
}

export const QRPrintCard: React.FC<QRPrintCardProps> = ({ shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingStandee, setIsGeneratingStandee] = useState(false);

  const customerUrl = `${window.location.origin}/s/${shop.slug}`;

  useEffect(() => {
    async function makeQR() {
      setIsLoading(true);
      try {
        const url = await generateQRCodeDataUrl(customerUrl, 600);
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      } finally {
        setIsLoading(false);
      }
    }
    makeQR();
  }, [customerUrl]);

  const handleDownloadFullStandee = async () => {
    if (!qrDataUrl) return;
    setIsGeneratingStandee(true);
    try {
      const standeeDataUrl = await generateStandeePosterDataUrl(
        {
          shop_name: shop.shop_name,
          address: shop.address,
          city: shop.city,
          phone: shop.phone,
          slug: shop.slug,
        },
        qrDataUrl
      );
      downloadImage(standeeDataUrl, `${shop.slug}-counter-standee.png`);
    } catch (err) {
      console.error('Failed to generate standee poster', err);
      // Fallback to QR download
      downloadImage(qrDataUrl, `${shop.slug}-print-qr.png`);
    } finally {
      setIsGeneratingStandee(false);
    }
  };

  const handleDownloadQROnly = () => {
    if (qrDataUrl) {
      downloadImage(qrDataUrl, `${shop.slug}-print-qr.png`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Actions Header (hidden during print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Countertop QR Code Standee</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Place this printable standee on your counter or cash desk. Customers scan the QR code to instantly upload documents and send them straight to your PrintSetu cockpit.
          </p>
          <div className="mt-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 flex-wrap">
            <span className="font-sans text-slate-500">Counter URL:</span>
            <a href={customerUrl} target="_blank" rel="noreferrer" className="underline font-bold flex items-center gap-1">
              {customerUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Download QR Only */}
          <button
            type="button"
            onClick={handleDownloadQROnly}
            disabled={!qrDataUrl || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download QR code image file only"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>QR Only</span>
          </button>

          {/* Download Full Standee Poster (PNG) */}
          <button
            type="button"
            onClick={handleDownloadFullStandee}
            disabled={!qrDataUrl || isLoading || isGeneratingStandee}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download the complete high-resolution standee poster image ready for printing"
          >
            {isGeneratingStandee ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Generating Standee...</span>
              </>
            ) : (
              <>
                <ImageDown className="w-4 h-4 text-sky-400" />
                <span>Download Standee (PNG)</span>
              </>
            )}
          </button>

          {/* Print Standee */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Standee</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 Standee design) */}
      <div className="printable-area max-w-md mx-auto bg-white rounded-3xl border-2 border-slate-900 p-7 sm:p-8 shadow-xl text-center flex flex-col items-center relative overflow-hidden">
        {/* Top Header with PrintSetu Logo & Shop Name */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PrintSetu" className="h-6 w-auto object-contain" />
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
              Counter Standee
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Direct Order</span>
        </div>

        {/* Shop Name & Address */}
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          {shop.shop_name}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          {shop.address}, {shop.city}
        </p>

        {/* Catchy headline */}
        <div className="mt-4 mb-3 py-1.5 px-3.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Instant Counter Print Queue</span>
        </div>

        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 max-w-xs leading-snug">
          Scan to Send Documents for Printing
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          PDF • Word • Photos • Choose B&W or Color • Fast Pickup
        </p>

        {/* QR Code Container */}
        <div className="mt-5 p-4 rounded-2xl border-4 border-slate-900 bg-white shadow-md relative">
          {isLoading ? (
            <div className="w-60 h-60 flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt={`QR code for ${shop.shop_name}`}
              className="w-56 h-56 sm:w-60 sm:h-60 object-contain mx-auto"
            />
          )}
        </div>

        {/* Scanner Compatibility Note */}
        <div className="mt-4 space-y-0.5">
          <p className="text-xs font-bold text-slate-800">
            No app download required!
          </p>
          <p className="text-[11px] text-slate-500">
            Scan with Phone Camera, Google Pay, PhonePe, or Paytm
          </p>
        </div>

        {/* 3 Simple Steps */}
        <div className="mt-4 w-full grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-left">
          <div className="space-y-0.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center mb-1">
              1
            </div>
            <p className="text-[11px] font-bold text-slate-800">Scan QR</p>
            <p className="text-[9px] text-slate-500 leading-tight">Open camera & point at code</p>
          </div>
          <div className="space-y-0.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center mb-1">
              2
            </div>
            <p className="text-[11px] font-bold text-slate-800">Upload Files</p>
            <p className="text-[9px] text-slate-500 leading-tight">Choose color, copies & pages</p>
          </div>
          <div className="space-y-0.5">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mb-1">
              3
            </div>
            <p className="text-[11px] font-bold text-slate-800">Collect Prints</p>
            <p className="text-[9px] text-slate-500 leading-tight">Instant counter pickup</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-500">
          <span>📞 Counter: +91 {shop.phone || '9876543210'}</span>
          <span className="font-bold text-indigo-600">Powered by PrintSetu</span>
        </div>
      </div>
    </div>
  );
};
