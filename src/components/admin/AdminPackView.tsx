import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { PriceTag } from '@/components/common/PriceTag';
import { Button } from '@/components/ui/Button';
import type { AdminOrderWithItems } from '@/lib/admin';
import type { OrderItemRow } from '@/types/database';

export interface AdminPackViewProps {
  order: AdminOrderWithItems;
  onClose: () => void;
  onMarkPacked: (orderId: string) => Promise<void>;
  onRemoveItem: (orderItemId: string) => Promise<void>;
  isUpdating: boolean;
}

export const AdminPackView: React.FC<AdminPackViewProps> = ({
  order,
  onClose,
  onMarkPacked,
  onRemoveItem,
  isUpdating,
}) => {
  // Local checklist state for checked items
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const activeItems = order.order_items.filter((item) => !item.removed);
  const totalActive = activeItems.length;
  const checkedCount = activeItems.filter((item) => checkedItemIds.has(item.id)).length;
  const allChecked = totalActive > 0 && checkedCount === totalActive;

  const toggleItem = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleRemove = async (item: OrderItemRow) => {
    const confirmed = window.confirm(
      `Remove "${item.name_snapshot}"? This will set its stock to 0 and recalculate the order total.`
    );
    if (!confirmed) return;

    setRemovingItemId(item.id);
    try {
      await onRemoveItem(item.id);
      // Remove from checked set if it was checked
      setCheckedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleCompletePack = async () => {
    await onMarkPacked(order.id);
    onClose();
  };

  const getSubPrefLabel = (pref: string) => {
    switch (pref) {
      case 'call_me':
        return 'Call me if unavailable';
      case 'replace_similar':
        return 'Replace with similar';
      case 'remove_item':
        return 'Remove unavailable item';
      default:
        return pref;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Sticky Header */}
      <header className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:scale-95 transition-all"
            aria-label="Back to queue"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="type-title text-ink font-bold">Pack #{order.order_no}</h1>
              <span className="type-caption px-2 py-0.5 rounded-full bg-brand-soft text-brand font-bold uppercase tracking-wider">
                {order.status}
              </span>
            </div>
            <p className="type-caption text-ink-2 truncate">
              {order.customer_name} · {order.room}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="text-right">
          <span className="type-title text-brand font-bold tabular-nums">
            {checkedCount}/{totalActive}
          </span>
          <span className="type-caption text-ink-2 block">packed</span>
        </div>
      </header>

      {/* Customer Note & Preferences Banner */}
      <div className="px-4 py-2.5 bg-canvas border-b border-line flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-ink-2">
          <span className="font-semibold text-ink">Pref:</span>
          <span>{getSubPrefLabel(order.substitution_pref)}</span>
        </div>
        {order.note && (
          <div className="flex items-start gap-1.5 text-warning bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200 font-medium">
            <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" />
            <span>Note: {order.note}</span>
          </div>
        )}
      </div>

      {/* Large Checklist Items */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {order.order_items.map((item) => {
          const isChecked = checkedItemIds.has(item.id);
          const isRemoved = item.removed;

          if (isRemoved) {
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-dashed border-line bg-canvas/50 opacity-60 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="line-through text-ink-2 font-medium text-base">
                    {item.qty} × {item.name_snapshot}
                  </p>
                  <span className="type-caption text-danger font-semibold">
                    Removed / Unavailable
                  </span>
                </div>
                <PriceTag amount={item.line_total} className="line-through text-ink-3" />
              </div>
            );
          }

          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-4 ${
                isChecked
                  ? 'bg-emerald-50/70 border-success/40 shadow-xs'
                  : 'bg-surface border-line hover:border-brand/40 shadow-xs'
              }`}
            >
              {/* Large Checkbox */}
              <div
                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isChecked
                    ? 'bg-success border-success text-white'
                    : 'border-line bg-canvas'
                }`}
              >
                {isChecked && <Check size={20} strokeWidth={3} />}
              </div>

              {/* Item Info in Large Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="type-title text-ink font-bold tabular-nums">
                    {item.qty} ×
                  </span>
                  <span className={`text-lg font-bold leading-snug truncate ${
                    isChecked ? 'line-through text-ink-2' : 'text-ink'
                  }`}>
                    {item.name_snapshot}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="type-caption text-ink-2 font-medium">
                    {item.size_snapshot}
                  </span>
                  <span className="text-ink-3">·</span>
                  <PriceTag amount={item.line_total} className="type-subtitle font-bold" />
                </div>
              </div>

              {/* Remove button if order is not packed */}
              {(order.status === 'placed' || order.status === 'accepted') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  disabled={isUpdating || removingItemId === item.id}
                  title="Remove unavailable item"
                  className="w-10 h-10 rounded-xl border border-line flex items-center justify-center text-ink-3 hover:text-danger hover:border-red-200 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={18} strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="p-4 bg-surface border-t border-line safe-area-bottom">
        <Button
          variant="primary"
          onClick={handleCompletePack}
          disabled={isUpdating}
          className={`w-full h-14 text-base font-bold shadow-md flex items-center justify-center gap-2 ${
            allChecked ? 'bg-success hover:bg-emerald-700' : ''
          }`}
        >
          {allChecked ? (
            <>
              <CheckCircle2 size={22} strokeWidth={2} />
              <span>All Packed · Mark Order Packed</span>
            </>
          ) : (
            <span>Mark Order Packed ({checkedCount}/{totalActive})</span>
          )}
        </Button>
      </footer>
    </div>
  );
};
