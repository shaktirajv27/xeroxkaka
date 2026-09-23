import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order } from '../types/database';
import { subscribeToOrders } from '../lib/db';
import { playNewOrderSound } from '../lib/sound';
import { useAuth } from './AuthContext';

export interface InAppToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

interface NotificationContextType {
  toasts: InAppToast[];
  soundEnabled: boolean;
  toggleSound: () => void;
  showToast: (title: string, message: string, type?: InAppToast['type']) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentShop } = useAuth();
  const [toasts, setToasts] = useState<InAppToast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('xeroxflow_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('xeroxflow_sound_enabled', String(next));
      return next;
    });
  };

  const showToast = (title: string, message: string, type: InAppToast['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, message, type, timestamp: Date.now() }]);

    setTimeout(() => {
      dismissToast(id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Subscribe to real-time order events
  useEffect(() => {
    const unsubscribe = subscribeToOrders((newOrder: Order) => {
      // Check if order belongs to current active shop
      if (currentShop && newOrder.shop_id === currentShop.id) {
        if (soundEnabled) {
          playNewOrderSound();
        }
        showToast(
          `🔔 New Order Received: ${newOrder.order_number}`,
          `${newOrder.customer?.name || 'Customer'} placed an order for ₹${newOrder.total}`,
          'success'
        );
      }
    });

    return () => unsubscribe();
  }, [currentShop, soundEnabled]);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        soundEnabled,
        toggleSound,
        showToast,
        dismissToast,
      }}
    >
      {children}
      {/* In-app Toast Banner container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all transform translate-y-0 duration-200 flex items-start justify-between ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <div>
              <h4 className="font-semibold text-sm leading-snug">{toast.title}</h4>
              <p className="text-xs text-slate-200 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-3 text-slate-300 hover:text-white text-xs font-bold px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
