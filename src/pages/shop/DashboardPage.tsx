import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, subscribeToOrders } from '../../lib/db';
import { Order, OrderStatus } from '../../types/database';
import { PrintQueueCard } from '../../components/shop/PrintQueueCard';
import { OrderDetailModal } from '../../components/shop/OrderDetailModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Printer,
  Clock,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  QrCode,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    return currentShop ? db.getCachedOrdersByShop(currentShop.id) : [];
  });
  const [analytics, setAnalytics] = useState<any>(() => {
    return currentShop ? db.getCachedShopAnalytics(currentShop.id) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (currentShop) {
      const cached = db.getCachedOrdersByShop(currentShop.id);
      setOrders(cached);
      setAnalytics(db.getCachedShopAnalytics(currentShop.id));
      loadData();
    }
  }, [currentShop]);

  // Subscribe to real-time order updates
  useEffect(() => {
    const unsubscribe = subscribeToOrders((updatedOrder) => {
      if (currentShop && updatedOrder.shop_id === currentShop.id) {
        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === updatedOrder.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updatedOrder;
            return copy;
          } else {
            return [updatedOrder, ...prev];
          }
        });
        if (currentShop) {
          setAnalytics(db.getCachedShopAnalytics(currentShop.id));
        }
      }
    });
    return () => unsubscribe();
  }, [currentShop]);

  const loadData = async () => {
    if (!currentShop) return;
    try {
      const [shopOrders, shopStats] = await Promise.all([
        db.getOrdersByShop(currentShop.id),
        db.getShopAnalytics(currentShop.id),
      ]);
      setOrders(shopOrders);
      setAnalytics(shopStats);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    if (!currentShop) return;
    try {
      const updated = await db.updateOrderStatus(orderId, status, 'Shop Owner', note, currentShop.id);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        if (selectedOrder?.id === updated.id) {
          setSelectedOrder(updated);
        }
        setAnalytics(db.getCachedShopAnalytics(currentShop.id));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!currentShop) return;
    try {
      await db.deleteOrder(orderId, currentShop.id);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      setAnalytics(db.getCachedShopAnalytics(currentShop.id));
    } catch (err) {
      console.error('Failed to delete order', err);
    }
  };

  if (!currentShop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <LoadingSpinner message="Connecting to your print shop cockpit..." />
      </div>
    );
  }

  // Active queue: Pending, Confirmed, Printing, Ready
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'printing', 'ready'].includes(o.status)
  );

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const printingCount = orders.filter((o) => o.status === 'printing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick QR Link */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Online Storefront Active
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {currentShop.shop_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentShop.address}, {currentShop.city} • Phone: +91 {currentShop.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/settings')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-sky-600" />
            <span>Counter Standee QR</span>
          </button>

          <a
            href={`/s/${currentShop.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Open Customer Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              New Orders
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{pendingCount}</div>
          <span className="text-[11px] text-amber-600 font-medium">Requires printing</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Printing Now
            </span>
            <Printer className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{printingCount}</div>
          <span className="text-[11px] text-indigo-600 font-medium">In progress</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ready for Pickup
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{readyCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Waiting at counter</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Orders
            </span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {analytics?.ordersToday ?? orders.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Total received</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Revenue
            </span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{analytics?.revenueToday ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Calculated value</span>
        </div>
      </div>

      {/* Main Print Queue: "What do I need to print right now?" */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Active Print Queue ({activeOrders.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/print-queue')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Open Dedicated Queue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description="No active print orders right now. When customers scan your counter QR and place an order, it will appear here immediately."
            icon={<Printer className="w-7 h-7 text-indigo-600" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <PrintQueueCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                onOpenDetails={setSelectedOrder}
              />
            ))}
          </div>
        )}
      </section>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
};
