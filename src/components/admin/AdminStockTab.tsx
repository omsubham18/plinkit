import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, AlertTriangle, X } from 'lucide-react';
import { PriceTag } from '@/components/common/PriceTag';
import { formatISTTime } from '@/lib/admin';
import type { ProductRow } from '@/types/database';

export interface AdminStockTabProps {
  products: ProductRow[];
  onAdjustStock: (productId: string, delta: number) => Promise<boolean>;
  isUpdating: boolean;
}

export const AdminStockTab: React.FC<AdminStockTabProps> = ({
  products,
  onAdjustStock,
  isUpdating,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'oos'>('all');
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  // Compute counts
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock_qty > 0 && p.stock_qty <= 3).length,
    [products]
  );
  const oosCount = useMemo(
    () => products.filter((p) => p.stock_qty === 0).length,
    [products]
  );

  // Filter products by search and stock mode
  const filteredProducts = useMemo(() => {
    let result = products;

    // Filter by stock mode
    if (filterMode === 'low') {
      result = result.filter((p) => p.stock_qty > 0 && p.stock_qty <= 3);
    } else if (filterMode === 'oos') {
      result = result.filter((p) => p.stock_qty === 0);
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, filterMode, searchQuery]);

  const handleAdjust = async (product: ProductRow, delta: number) => {
    if (delta < 0 && product.stock_qty + delta < 0) return;
    setPendingProductId(product.id);
    try {
      await onAdjustStock(product.id, delta);
    } finally {
      setPendingProductId(null);
    }
  };

  const handleSetOutOfStock = async (product: ProductRow) => {
    if (product.stock_qty === 0) return;
    setPendingProductId(product.id);
    try {
      await onAdjustStock(product.id, -product.stock_qty);
    } finally {
      setPendingProductId(null);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Instant Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock by name, brand, SKU..."
            className="w-full h-11 pl-10 pr-9 rounded-xl border border-line bg-surface text-ink text-sm focus:outline-none focus:border-brand shadow-xs placeholder:text-ink-3"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
              filterMode === 'all'
                ? 'bg-ink text-white border-ink'
                : 'bg-surface text-ink-2 border-line hover:text-ink'
            }`}
          >
            All Items ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('low')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5 ${
              filterMode === 'low'
                ? 'bg-amber-100 text-warning border-amber-300'
                : 'bg-surface text-ink-2 border-line hover:text-warning'
            }`}
          >
            <AlertTriangle size={14} strokeWidth={2} />
            <span>Low Stock ({lowStockCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('oos')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
              filterMode === 'oos'
                ? 'bg-red-100 text-danger border-red-300'
                : 'bg-surface text-ink-2 border-line hover:text-danger'
            }`}
          >
            Out of Stock ({oosCount})
          </button>
        </div>
      </div>

      {/* Products Stock List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-surface rounded-2xl border border-line">
            <p className="type-subtitle font-bold text-ink">No products found</p>
            <p className="type-caption text-ink-2 mt-1">
              Try adjusting your search query or filter selection.
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isPending = pendingProductId === product.id;
            const isOOS = product.stock_qty === 0;
            const isLow = product.stock_qty > 0 && product.stock_qty <= 3;

            return (
              <div
                key={product.id}
                className={`bg-surface rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                  isOOS
                    ? 'border-line/70 bg-canvas/30'
                    : isLow
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-line'
                }`}
              >
                {/* Header: Product name, size, brand, price */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="type-caption text-ink-3 uppercase font-bold tracking-wider block truncate">
                        {product.brand} · {product.sku}
                      </span>
                      <h3 className="type-subtitle font-bold text-ink truncate">
                        {product.name}
                      </h3>
                      <p className="type-caption text-ink-2">
                        {product.size_label}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <PriceTag amount={product.price} className="type-subtitle font-bold text-ink" />
                      {product.mrp > product.price && (
                        <PriceTag amount={product.mrp} className="type-caption text-ink-3 line-through block" />
                      )}
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="flex items-center gap-2 my-3">
                    {isOOS ? (
                      <span className="type-caption px-2 py-0.5 rounded-full bg-slate-100 text-ink-2 font-bold border border-slate-200">
                        Out of stock
                      </span>
                    ) : isLow ? (
                      <span className="type-caption px-2 py-0.5 rounded-full bg-amber-50 text-warning font-bold border border-amber-200 flex items-center gap-1">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        <span>Only {product.stock_qty} left</span>
                      </span>
                    ) : (
                      <span className="type-caption px-2 py-0.5 rounded-full bg-emerald-50 text-success font-semibold border border-emerald-200">
                        In stock ({product.stock_qty})
                      </span>
                    )}

                    <span className="type-caption text-ink-3 text-[11px] ml-auto">
                      {formatISTTime(product.updated_at)}
                    </span>
                  </div>
                </div>

                {/* Steppers & Quick Out of Stock Action */}
                <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
                  {/* Stepper with Large 44px Buttons */}
                  <div className="flex items-center gap-1 bg-canvas rounded-xl p-1 border border-line">
                    <button
                      type="button"
                      onClick={() => handleAdjust(product, -1)}
                      disabled={isOOS || isPending || isUpdating}
                      aria-label="Decrease stock"
                      className="w-11 h-11 rounded-lg bg-surface border border-line flex items-center justify-center text-ink disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      <Minus size={18} strokeWidth={2.5} />
                    </button>

                    <div className="w-14 text-center font-bold text-lg tabular-nums text-ink">
                      {product.stock_qty}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdjust(product, 1)}
                      disabled={isPending || isUpdating}
                      aria-label="Increase stock"
                      className="w-11 h-11 rounded-lg bg-surface border border-line flex items-center justify-center text-ink disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* One-Tap Out of Stock */}
                  <button
                    type="button"
                    onClick={() => handleSetOutOfStock(product)}
                    disabled={isOOS || isPending || isUpdating}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isOOS
                        ? 'border-transparent text-ink-3 pointer-events-none'
                        : 'border-line bg-surface text-ink-2 hover:text-danger hover:border-red-200 hover:bg-red-50 active:scale-95'
                    }`}
                  >
                    {isOOS ? 'Zeroed' : 'Out of stock'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
