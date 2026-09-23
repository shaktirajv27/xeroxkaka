import React from 'react';
import { OrderStatusHistory } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Clock } from 'lucide-react';

export const OrderTimeline: React.FC<{ history: OrderStatusHistory[] }> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-xs text-slate-400 italic">No history events recorded yet.</p>;
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {history.map((h, i) => (
        <div key={h.id || i} className="relative">
          {/* Node dot */}
          <span className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white bg-indigo-600 shadow-xs flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </span>

          <div className="flex items-baseline justify-between gap-2">
            <StatusBadge status={h.new_status} size="sm" />
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-700 mt-1">{h.note || `Changed by ${h.changed_by}`}</p>
          <span className="text-[10px] text-slate-400">Actor: {h.changed_by}</span>
        </div>
      ))}
    </div>
  );
};
