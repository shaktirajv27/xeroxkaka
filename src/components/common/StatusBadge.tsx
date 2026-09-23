import React from 'react';
import { OrderStatus } from '../../types/database';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
    pending: {
      label: 'New Order',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      text: 'text-amber-700',
      dot: 'bg-amber-500 animate-pulse',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    printing: {
      label: 'Printing Now',
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      text: 'text-indigo-700',
      dot: 'bg-indigo-600 animate-ping',
    },
    ready: {
      label: 'Ready for Pickup',
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-red-50 border-red-200 text-red-800',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
  };

  const item = config[status] || config.pending;

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${item.bg} ${sizeClass}`}
    >
      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
};
