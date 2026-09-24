import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Layers,
  Palette,
  FileSpreadsheet,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { currentShop } = useAuth();
  const [analytics, setAnalytics] = useState<any>(() => {
    return currentShop ? db.getCachedShopAnalytics(currentShop.id) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentShop) {
      setAnalytics(db.getCachedShopAnalytics(currentShop.id));
      loadStats();
    }
  }, [currentShop]);

  const loadStats = async () => {
    if (!currentShop) return;
    try {
      const data = await db.getShopAnalytics(currentShop.id);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentShop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <LoadingSpinner message="Crunching shop analytics..." />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <LoadingSpinner message="Crunching shop analytics..." />
      </div>
    );
  }

  const totalPages = (analytics.bwPages || 0) + (analytics.colorPages || 0);
  const bwPercent = totalPages > 0 ? Math.round((analytics.bwPages / totalPages) * 100) : 0;
  const colorPercent = totalPages > 0 ? Math.round((analytics.colorPages / totalPages) * 100) : 0;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>Shop Performance & Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Actionable metrics on order volume, paper usage, color distributions, and revenue.
        </p>
      </div>

      {/* Revenue & Volume Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Today's Performance</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">₹{analytics.revenueToday}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.ordersToday} orders received today
            </p>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Last 7 Days</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">₹{analytics.revenueWeek}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.ordersWeek} total orders this week
            </p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Last 30 Days</span>
            <IndianRupee className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">₹{analytics.revenueMonth}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.ordersMonth} total orders this month
            </p>
          </div>
        </div>
      </div>

      {/* Usage Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Black & White vs Color Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">B&W vs. Color Pages</h3>
          </div>

          <p className="text-xs text-slate-500">
            Helps you anticipate toner & ink consumption for laser printers.
          </p>

          <div className="space-y-4">
            {/* B&W Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Black & White Prints</span>
                <span>{analytics.bwPages} pages ({bwPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-slate-800 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${bwPercent}%` }}
                />
              </div>
            </div>

            {/* Color Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-indigo-700 mb-1">
                <span>Color Prints</span>
                <span>{analytics.colorPages} pages ({colorPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${colorPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Paper Size Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">Paper Size Distribution</h3>
          </div>

          <p className="text-xs text-slate-500">
            Helps you maintain sufficient paper ream stock at the shop.
          </p>

          <div className="space-y-3">
            {Object.entries(analytics.paperSizeCounts || {}).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No paper usage recorded yet.</p>
            ) : (
              Object.entries(analytics.paperSizeCounts || {}).map(([size, count]) => {
                const p = totalPages > 0 ? Math.round(((count as number) / totalPages) * 100) : 0;
                return (
                  <div key={size}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>{size} Paper</span>
                      <span>{count as number} pages ({p}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
