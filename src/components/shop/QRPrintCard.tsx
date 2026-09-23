import React, { useEffect, useState } from 'react';
import { Shop } from '../../types/database';
import { generateQRCodeDataUrl, downloadImage } from '../../lib/qrHelper';
import { Download, Printer, ExternalLink, QrCode, Sparkles } from 'lucide-react';

interface QRPrintCardProps {
  shop: Shop;
}

export const QRPrintCard: React.FC<QRPrintCardProps> = ({ shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDownload = () => {
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Countertop QR Code Standee</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Print this poster and place it at your shop counter. Customers scan it with their phone camera.
          </p>
          <div className="mt-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
            <span>Direct link:</span>
            <a href={customerUrl} target="_blank" rel="noreferrer" className="underline font-bold flex items-center gap-1">
              {customerUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Counter Standee</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 Standee design) */}
      <div className="printable-area max-w-md mx-auto bg-white rounded-3xl border-2 border-slate-800 p-8 shadow-xl text-center flex flex-col items-center">
        {/* Shop Branding */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-4">
          X
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{shop.shop_name}</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{shop.address}, {shop.city}</p>

        {/* Catchy headline */}
        <div className="mt-6 mb-4 py-2 px-4 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold inline-flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Instant Print Queue</span>
        </div>

        <h1 className="text-xl font-bold text-slate-800 max-w-xs leading-snug">
          Scan to send files for printing
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Upload PDF, Word, or Photos • Choose B&W / Color • Collect at counter
        </p>

        {/* QR Code Container */}
        <div className="mt-6 p-4 rounded-2xl border-4 border-slate-900 bg-white shadow-md">
          {isLoading ? (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-xs">
              Generating High-Res QR...
            </div>
          ) : (
            <img src={qrDataUrl} alt={`QR code for ${shop.shop_name}`} className="w-64 h-64 object-contain" />
          )}
        </div>

        {/* Bottom instructions */}
        <div className="mt-6 space-y-1">
          <p className="text-xs font-bold text-slate-700">No app installation required!</p>
          <p className="text-[11px] text-slate-400">Open mobile camera or Paytm / Google Pay / any scanner</p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-400">
          <span>Phone: +91 {shop.phone}</span>
          <span className="font-semibold text-slate-600">Powered by XeroxFlow</span>
        </div>
      </div>
    </div>
  );
};
