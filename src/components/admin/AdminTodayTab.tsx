import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  ShoppingBag,
  XCircle,
  Clock,
  Search,
  MessageSquare,
  AlertTriangle,
  Download,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { PriceTag } from '@/components/common/PriceTag';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import {
  fetchOrdersForDateRange,
  formatISTTime,
  type TodayAnalyticsData,
} from '@/lib/admin';
import { exportOrdersToCsv, downloadCsv } from '@/lib/csvUtils';
import type { ItemRequestRow } from '@/types/database';

export interface AdminTodayTabProps {
  analytics: TodayAnalyticsData | null;
  failedSearches: Array<{ query: string; count: number; last_at: string }>;
  itemRequests: ItemRequestRow[];
  onNavigateToStock: () => void;
  onRefreshAnalytics: () => Promise<void>;
}

export const AdminTodayTab: React.FC<AdminTodayTabProps> = ({
  analytics,
  failedSearches,
  itemRequests,
  onNavigateToStock,
  onRefreshAnalytics,
}) => {
  const { showToast } = useToast();

  // Date range export state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [exportStartDate, setExportStartDate] = useState(todayStr);
  const [exportEndDate, setExportEndDate] = useState(todayStr);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportOrders = async () => {
    setIsExporting(true);
    try {
      const startIso = `${exportStartDate}T00:00:00.000Z`;
      const endIso = `${exportEndDate}T23:59:59.999Z`;

      const orders = await fetchOrdersForDateRange(startIso, endIso);
      if (orders.length === 0) {
        showToast('No orders found within selected date range');
        return;
      }

      const csvContent = exportOrdersToCsv(orders);
      downloadCsv(csvContent, `plinkit-orders-${exportStartDate}-to-${exportEndDate}.csv`);
      showToast(`Exported ${orders.length} orders to CSV`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (!analytics) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin mx-auto mb-3" />
        <p className="type-caption text-ink-2">Loading today's business day analytics...</p>
      </div>
    );
  }

  // Find max count for histogram scaling
  const maxHourlyCount = Math.max(1, ...analytics.hourlyOrders.map((h) => h.count));

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* Top Banner: Business Day 06:00 to 06:00 IST */}
      <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="type-title font-bold text-ink">Today's Store Performance</h2>
            <p className="type-caption text-ink-2">
              Business day window: <span className="font-semibold text-ink">06:00 IST – 06:00 IST</span> (trades past midnight)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshAnalytics}
          className="text-xs font-semibold text-brand hover:underline shrink-0"
        >
          Refresh metrics
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-2 mb-1">
            <span className="type-caption font-semibold">Total Orders</span>
            <ShoppingBag size={18} strokeWidth={2} className="text-brand" />
          </div>
          <div className="type-display font-bold text-ink tabular-nums">
            {analytics.totalOrders}
          </div>
          <span className="type-caption text-ink-2 mt-1 block">
            {analytics.itemsSold} items sold today
          </span>
        </div>

        {/* Total Revenue & Split */}
        <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-2 mb-1">
            <span className="type-caption font-semibold">Gross Revenue</span>
            <TrendingUp size={18} strokeWidth={2} className="text-success" />
          </div>
          <PriceTag amount={analytics.totalRevenue} className="type-display font-bold text-ink" />
          <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold">
            <span className="text-indigo-600 flex items-center gap-0.5">
              <CreditCard size={11} /> UPI: ₹{analytics.upiRevenue}
            </span>
            <span className="text-emerald-700 flex items-center gap-0.5">
              <Banknote size={11} /> Cash: ₹{analytics.cashRevenue}
            </span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-2 mb-1">
            <span className="type-caption font-semibold">Avg. Order Value</span>
            <span className="type-caption font-bold text-ink-3">AOV</span>
          </div>
          <PriceTag amount={analytics.aov} className="type-display font-bold text-ink" />
          <span className="type-caption text-ink-2 mt-1 block">
            Per delivered/paid order
          </span>
        </div>

        {/* Cancellations */}
        <div className="bg-surface rounded-2xl border border-line p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-2 mb-1">
            <span className="type-caption font-semibold">Cancellations</span>
            <XCircle size={18} strokeWidth={2} className="text-danger" />
          </div>
          <div className="type-display font-bold text-danger tabular-nums">
            {analytics.cancellationsCount}
          </div>
          <span className="type-caption text-ink-2 mt-1 block">
            {analytics.cancellationRate}% cancellation rate
          </span>
        </div>
      </div>

      {/* Orders Per Hour Distribution Chart */}
      <section className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-4">
        <div>
          <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
            <Clock size={18} className="text-brand" />
            <span>Orders Per Hour (24h IST Distribution)</span>
          </h3>
          <p className="type-caption text-ink-2">Hourly order volume from 06:00 IST to 05:00 IST next morning</p>
        </div>

        <div className="pt-4 overflow-x-auto no-scrollbar">
          <div className="flex items-end gap-1.5 h-36 min-w-[600px] border-b border-line pb-1">
            {analytics.hourlyOrders.map((h, i) => {
              const heightPct = Math.round((h.count / maxHourlyCount) * 100);
              const hourLabel = `${h.hourIST % 12 === 0 ? 12 : h.hourIST % 12}${h.hourIST >= 12 ? 'p' : 'a'}`;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-10 shadow-md">
                    {h.count} orders · ₹{h.revenue}
                  </div>

                  {/* Histogram Bar */}
                  <div className="w-full bg-canvas rounded-t flex items-end justify-center h-28">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        h.count > 0 ? 'bg-brand group-hover:bg-brand-pressed' : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Hour tick */}
                  <span className="text-[10px] text-ink-3 font-semibold tabular-nums">
                    {hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Column Layout: Top 10 Items & Out of Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 10 Items */}
        <section className="lg:col-span-7 bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
            <Layers size={18} className="text-brand" />
            <span>Top 10 Best-Selling Items Today</span>
          </h3>

          {analytics.topItems.length === 0 ? (
            <p className="type-caption text-ink-2 py-4">No item orders completed yet today.</p>
          ) : (
            <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
              {analytics.topItems.map((item, idx) => (
                <div key={item.productId} className="p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="type-caption font-bold text-ink-3 w-5 text-center tabular-nums">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-ink block">{item.name}</span>
                      <span className="type-caption text-ink-2">{item.qty} units ordered</span>
                    </div>
                  </div>
                  <PriceTag amount={item.revenue} className="font-bold text-ink" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Out of Stock Monitor */}
        <section className="lg:col-span-5 bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              <span>Out of Stock Monitor ({analytics.outOfStockCount})</span>
            </h3>
            <button
              type="button"
              onClick={onNavigateToStock}
              className="type-caption text-brand font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>Manage stock</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {analytics.outOfStockProducts.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 text-success text-xs font-semibold">
              All catalogue products currently have positive stock units.
            </div>
          ) : (
            <div className="border border-line rounded-xl divide-y divide-line max-h-64 overflow-y-auto">
              {analytics.outOfStockProducts.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink block">{p.name}</span>
                    <span className="text-ink-2">{p.brand} · {p.size_label}</span>
                  </div>
                  <span className="type-caption px-2 py-0.5 rounded-full bg-slate-100 text-ink-2 font-bold border border-slate-200">
                    0 left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Two Column Layout: 20 Frequent Failed Searches & Customer Item Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Failed Searches (Last 7 Days) */}
        <section className="lg:col-span-7 bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <div>
            <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
              <Search size={18} className="text-brand" />
              <span>Top 20 Frequent Failed Searches (Last 7 Days)</span>
            </h3>
            <p className="type-caption text-ink-2">
              Queries logged to search_misses that returned zero items for students.
            </p>
          </div>

          {failedSearches.length === 0 ? (
            <p className="type-caption text-ink-2 py-4">No search misses recorded in the last 7 days.</p>
          ) : (
            <div className="border border-line rounded-xl divide-y divide-line max-h-72 overflow-y-auto">
              {failedSearches.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink block">"{item.query}"</span>
                    <span className="text-ink-2">Last search: {formatISTTime(item.last_at)}</span>
                  </div>
                  <span className="type-caption px-2.5 py-0.5 rounded-full bg-amber-50 text-warning font-bold border border-amber-200 tabular-nums">
                    {item.count} misses
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Customer Item Requests */}
        <section className="lg:col-span-5 bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <div>
            <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
              <MessageSquare size={18} className="text-brand" />
              <span>Customer Item Requests ({itemRequests.length})</span>
            </h3>
            <p className="type-caption text-ink-2">Student wishlist submissions from search screen.</p>
          </div>

          {itemRequests.length === 0 ? (
            <p className="type-caption text-ink-2 py-4">No item requests submitted yet.</p>
          ) : (
            <div className="border border-line rounded-xl divide-y divide-line max-h-72 overflow-y-auto">
              {itemRequests.map((req) => (
                <div key={req.id} className="p-3 text-xs space-y-1">
                  <p className="font-semibold text-ink">"{req.text}"</p>
                  <span className="type-caption text-ink-3 block">
                    {formatISTTime(req.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Export Orders CSV by Date Range */}
      <section className="bg-surface rounded-2xl border border-line p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="type-subtitle font-bold text-ink flex items-center gap-2">
            <Download size={18} className="text-brand" />
            <span>Export Orders to CSV</span>
          </h3>
          <p className="type-caption text-ink-2">
            Download complete order items, totals, fees, and customer contact data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={exportStartDate}
            onChange={(e) => setExportStartDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-xs font-semibold focus:outline-none focus:border-brand"
          />
          <span className="text-xs text-ink-3">to</span>
          <input
            type="date"
            value={exportEndDate}
            onChange={(e) => setExportEndDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-xs font-semibold focus:outline-none focus:border-brand"
          />
          <Button
            variant="primary"
            onClick={handleExportOrders}
            disabled={isExporting}
            className="h-10 px-4 text-xs font-bold"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </section>
    </div>
  );
};
