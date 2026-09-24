import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '../../types/database';
import { db, subscribeToOrders } from '../../lib/db';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Phone,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface OrderTrackPageProps {
  orderNumber: string;
  initialPhone?: string;
  onNavigateHome: () => void;
}

export const OrderTrackPage: React.FC<OrderTrackPageProps> = ({
  orderNumber,
  initialPhone = '',
  onNavigateHome,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<Order | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const verifyAndLoadOrder = useCallback(
    async (phoneToVerify: string) => {
      setIsVerifying(true);
      setErrorMsg(null);
      try {
        const clean = phoneToVerify.replace(/\D/g, '').slice(-10);
        const found = await db.trackCustomerOrder(orderNumber, clean);
        if (found) {
          setOrder(found);
          setIsUnlocked(true);
        } else {
          setErrorMsg('Order number or mobile number did not match. Please verify your details.');
        }
      } catch (err) {
        console.error('Tracking verification error', err);
        setErrorMsg('Failed to check order status. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    },
    [orderNumber]
  );

  // If initialPhone was provided, auto-verify
  useEffect(() => {
    if (initialPhone && initialPhone.length >= 10) {
      verifyAndLoadOrder(initialPhone);
    }
  }, [initialPhone, verifyAndLoadOrder]);

  // Subscribe to realtime updates for this order once unlocked
  useEffect(() => {
    if (!isUnlocked || !order) return;

    const unsubscribe = subscribeToOrders((updatedOrder) => {
      if (updatedOrder.order_number === order.order_number) {
        setOrder(updatedOrder);
      }
    });

    return () => unsubscribe();
  }, [isUnlocked, order]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    verifyAndLoadOrder(phone);
  };

  const steps: { status: OrderStatus; label: string; desc: string }[] = [
    { status: 'pending', label: 'Order Received', desc: 'Files received at shop counter' },
    { status: 'confirmed', label: 'Confirmed', desc: 'Shop checked files and queued order' },
    { status: 'printing', label: 'Printing Now', desc: 'Document is currently being printed' },
    { status: 'ready', label: 'Ready for Pickup', desc: 'Ready! Visit shop to collect your prints' },
    { status: 'completed', label: 'Collected', desc: 'Order picked up and completed' },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'printing':
        return 2;
      case 'ready':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-8 px-2 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-2xs">
              <img src="/logo.png" alt="PrintSetu" className="h-5 w-auto object-contain" />
            </div>
            <span className="font-bold text-slate-900 text-sm">PrintSetu Order Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Order #{orderNumber.toUpperCase()}
          </h1>
        </div>

        {/* Security Verification Gate */}
        {!isUnlocked ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-base">Security Verification</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                To protect customer document privacy, please enter the mobile number used during ordering.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-12 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isVerifying || phone.length < 10}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <span>Unlock & View Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Live Progress Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Current Status
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={order.status} size="lg" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => verifyAndLoadOrder(phone)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 p-2 rounded-xl"
                  title="Refresh status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Ready for Pickup Banner */}
              {order.status === 'ready' && (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 text-emerald-900 text-center animate-pulse">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                  <h4 className="font-bold text-sm">Your prints are ready!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Please visit the shop counter and show order #{order.order_number} to collect your prints.
                  </p>
                </div>
              )}

              {/* Step Timeline */}
              <div className="space-y-5">
                {steps.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div key={step.status} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div
                            className={`w-0.5 h-8 my-1 ${
                              currentStep > idx ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-0.5">
                        <h4
                          className={`text-sm font-bold leading-tight ${
                            isCurrent
                              ? 'text-indigo-600'
                              : isDone
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items & Summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Order Summary</h3>
              <div className="divide-y divide-slate-100">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <div>
                        <div className="font-semibold text-slate-800">{item.file_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.paper_size} • {item.print_color === 'bw' ? 'B&W' : 'Color'} • {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.item_total}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Due at Counter</span>
                <span className="text-xl font-black text-indigo-600">₹{order.total}</span>
              </div>
            </div>

            {/* Shop Contact Card */}
            {order.shop && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{order.shop.shop_name}</h4>
                  <p className="text-slate-500">{order.shop.address}</p>
                </div>
                <a
                  href={`tel:${order.shop.phone}`}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>Call Shop</span>
                </a>
              </div>
            )}
          </div>
        ) : null}

        {/* Back home */}
        <div className="text-center">
          <button
            onClick={onNavigateHome}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium underline"
          >
            Back to Platform Home
          </button>
        </div>
      </div>
    </div>
  );
};
