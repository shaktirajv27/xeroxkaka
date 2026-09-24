import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Customer } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Users, Phone, MessageCircle, Search, Calendar, IndianRupee } from 'lucide-react';

interface CustomerRow {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export const CustomersPage: React.FC = () => {
  const { currentShop } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentShop) {
      loadCustomers();
    }
  }, [currentShop]);

  const loadCustomers = async () => {
    if (!currentShop) return;
    setIsLoading(true);
    try {
      const data = await db.getShopCustomers(currentShop.id);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !currentShop) {
    return <LoadingSpinner fullScreen message="Loading customer directory..." />;
  }

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.customer.name.toLowerCase().includes(q) || c.customer.phone.includes(q);
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-indigo-600" />
          <span>Customer Directory</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Customers who have placed print orders at your shop.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by customer name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs border-0 focus:outline-hidden"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={search ? `No customer matched "${search}".` : 'No customers recorded yet.'}
          icon={<Users className="w-7 h-7 text-indigo-500" />}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Order</th>
                  <th className="py-3.5 px-4 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ customer, orderCount, totalSpent, lastOrderDate }) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{customer.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">+91 {customer.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                        {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      ₹{totalSpent}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(lastOrderDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://wa.me/91${customer.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <a
                          href={`tel:${customer.phone}`}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Call customer"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
