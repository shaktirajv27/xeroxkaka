import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { Customer } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Users, Phone, MessageCircle, Search, Trash2, AlertTriangle } from 'lucide-react';

interface CustomerRow {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export const CustomersPage: React.FC = () => {
  const { currentShop } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>(() => {
    return currentShop ? db.getCachedShopCustomers(currentShop.id) : [];
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  useEffect(() => {
    if (currentShop) {
      setCustomers(db.getCachedShopCustomers(currentShop.id));
      loadCustomers();
    }
  }, [currentShop]);

  const loadCustomers = async () => {
    if (!currentShop) return;
    try {
      const data = await db.getShopCustomers(currentShop.id);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!currentShop) return;
    try {
      setIsDeleting(true);
      await db.deleteCustomer(customerId, currentShop.id);
      setCustomers((prev) => prev.filter((c) => c.customer.id !== customerId));
      setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
      setCustomerToDelete(null);
    } catch (err) {
      console.error('Failed to delete customer', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelectCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const handleToggleSelectAll = (filteredRows: CustomerRow[]) => {
    const allIds = filteredRows.map((r) => r.customer.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedCustomerIds.includes(id));
    if (allSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(allIds);
    }
  };

  const handleBatchDelete = async () => {
    if (!currentShop || selectedCustomerIds.length === 0) return;
    try {
      setIsDeleting(true);
      await db.deleteCustomersBatch(selectedCustomerIds, currentShop.id);
      setCustomers((prev) => prev.filter((c) => !selectedCustomerIds.includes(c.customer.id)));
      setSelectedCustomerIds([]);
      setShowBatchDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to batch delete customers', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentShop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <LoadingSpinner message="Loading customer directory..." />
      </div>
    );
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

      {/* Multi-Selection Batch Actions Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs">
              {selectedCustomerIds.length}
            </span>
            <span className="font-semibold text-slate-200">customers selected</span>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => setSelectedCustomerIds(filtered.map((r) => r.customer.id))}
              className="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
            >
              Select all {filtered.length} customers
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCustomerIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedCustomerIds.length})</span>
            </button>
          </div>
        </div>
      )}

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
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((r) => selectedCustomerIds.includes(r.customer.id))}
                      onChange={() => handleToggleSelectAll(filtered)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      title="Select all customers"
                    />
                  </th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Order</th>
                  <th className="py-3.5 px-4 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ customer, orderCount, totalSpent, lastOrderDate }) => {
                  const isChecked = selectedCustomerIds.includes(customer.id);
                  return (
                    <tr
                      key={customer.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-indigo-50/50 hover:bg-indigo-50/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectCustomer(customer.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
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
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(customer)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Single Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Customer {customerToDelete.name}?</h4>
                <p className="text-xs text-slate-500">
                  This will remove {customerToDelete.name} ({customerToDelete.phone}) from your customer directory.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteCustomer(customerToDelete.id)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Selection Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Delete {selectedCustomerIds.length} Customers?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete {selectedCustomerIds.length} selected customers from your directory?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : `Yes, Delete ${selectedCustomerIds.length} Customers`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
