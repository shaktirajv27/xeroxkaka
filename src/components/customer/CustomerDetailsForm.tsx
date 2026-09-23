import React from 'react';
import { User, Phone, MessageSquare, AlertCircle } from 'lucide-react';

interface CustomerDetailsFormProps {
  name: string;
  phone: string;
  note: string;
  onChangeName: (val: string) => void;
  onChangePhone: (val: string) => void;
  onChangeNote: (val: string) => void;
  phoneError?: string | null;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  name,
  phone,
  note,
  onChangeName,
  onChangePhone,
  onChangeNote,
  phoneError,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Contact Details</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          We use this to identify your prints and send you your pickup order number.
        </p>
      </div>

      <div className="space-y-3">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Your Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. Rahul Patel"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        {/* Mobile Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            WhatsApp / Mobile Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
              +91
            </div>
            <input
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                onChangePhone(clean);
              }}
              className={`w-full pl-12 pr-3 py-2 text-sm rounded-xl border ${
                phoneError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              } focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono`}
              required
            />
          </div>
          {phoneError ? (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {phoneError}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">10-digit Indian mobile number</p>
          )}
        </div>

        {/* Note Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Special Instructions <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute top-2.5 left-3 flex items-start pointer-events-none text-slate-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              placeholder="e.g. Please staple top left corner, or print page 2 in color..."
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
