import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, subscribeToOrders } from '../../lib/db';
import { Order, OrderStatus } from '../../types/database';
import { PrintQueueCard } from '../../components/shop/PrintQueueCard';
import { OrderDetailModal } from '../../components/shop/OrderDetailModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Printer, RefreshCw } from 'lucide-react';

export const PrintQueuePage: React.FC = () => {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    return currentShop ? db.getCachedOrdersByShop(currentShop.id) : [];
  });
  const [activeTab, setActiveTab] = useState<string>('all_active');
  const [isLoading, setIsLoading] = useState(() => {
    return currentShop ? db.getCachedOrdersByShop(currentShop.id).length === 0 : false;
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (currentShop) {
      // Sync local cache immediately on shop change
      const cached = db.getCachedOrdersByShop(currentShop.id);
      if (cached.length > 0) {
        setOrders(cached);
        setIsLoading(false);
      }
      loadOrders();
    }
  }, [currentShop]);

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
      }
    });
    return () => unsubscribe();
  }, [currentShop]);

  const loadOrders = async () => {
    if (!currentShop) return;
    try {
      const data = await db.getOrdersByShop(currentShop.id);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load queue orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    if (!currentShop) return;
    try {
      const updated = await db.updateOrderStatus(orderId, status, 'Shop Staff', note, currentShop.id);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        if (selectedOrder?.id === updated.id) {
          setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (isLoading || !currentShop) {
    return <LoadingSpinner fullScreen message="Loading print queue..." />;
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const confirmed = orders.filter((o) => o.status === 'confirmed');
  const printing = orders.filter((o) => o.status === 'printing');
  const ready = orders.filter((o) => o.status === 'ready');
  const completed = orders.filter((o) => o.status === 'completed');

  const filteredOrders =
    activeTab === 'all_active'
      ? orders.filter((o) => ['pending', 'confirmed', 'printing', 'ready'].includes(o.status))
      : activeTab === 'pending'
      ? pending
      : activeTab === 'confirmed'
      ? confirmed
      : activeTab === 'printing'
      ? printing
      : activeTab === 'ready'
      ? ready
      : completed;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-indigo-600" />
            <span>Dedicated Print Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live queue of all documents waiting to be printed and collected at the counter.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 self-start shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Queue Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('all_active')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'all_active'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Active ({pending.length + confirmed.length + printing.length + ready.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>New Orders</span>
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('printing')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'printing'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Printing Now</span>
          {printing.length > 0 && (
            <span className="bg-indigo-100 text-indigo-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {printing.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'ready'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Ready for Pickup</span>
          {ready.length > 0 && (
            <span className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {ready.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'completed'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Completed Archive ({completed.length})
        </button>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders in this stage"
          description="Everything is processed for this section."
          icon={<Printer className="w-7 h-7 text-indigo-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <PrintQueueCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
              onOpenDetails={setSelectedOrder}
            />
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
