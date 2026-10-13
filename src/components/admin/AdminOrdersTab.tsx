import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageCircle,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PriceTag } from '@/components/common/PriceTag';
import { Button } from '@/components/ui/Button';
import {
  getElapsedMinutes,
  getTimingBadge,
  isTodayBusinessDay,
  formatISTTime,
  type AdminOrderWithItems,
} from '@/lib/admin';
import type { OrderStatus, PaymentStatus, PaidVia } from '@/types/database';

export interface AdminOrdersTabProps {
  orders: AdminOrderWithItems[];
  onSetStatus: (orderId: string, status: OrderStatus, reason?: string) => Promise<void>;
  onSetPayment: (orderId: string, status: PaymentStatus, paidVia?: PaidVia) => Promise<void>;
  onRemoveItem: (orderItemId: string) => Promise<void>;
  onOpenPackView: (order: AdminOrderWithItems) => void;
  isUpdating: boolean;
}

const CANCEL_REASONS = [
  'Customer requested cancellation',
  'All items out of stock',
  'Hostel / room unreachable',
  'Duplicate order placed',
  'Store closing early',
];

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  onSetStatus,
  onSetPayment,
  onRemoveItem,
  onOpenPackView,
  isUpdating,
}) => {
  // Timer tick for dynamic elapsed minutes (every 15s)
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter selection (for phone view) & selected order (for laptop two-pane view)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingOrder, setCancellingOrder] = useState<AdminOrderWithItems | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Categorize orders
  const placedOrders = orders.filter((o) => o.status === 'placed');
  const acceptedOrders = orders.filter((o) => o.status === 'accepted');
  const packedOrders = orders.filter((o) => o.status === 'packed');
  const outOrders = orders.filter((o) => o.status === 'out_for_delivery');
  const todayDeliveredOrCancelled = orders.filter(
    (o) => (o.status === 'delivered' || o.status === 'cancelled') && isTodayBusinessDay(o.placed_at)
  );

  // Filtered orders for display
  const getFilteredOrders = () => {
    if (statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  };

  const filteredOrders = getFilteredOrders();
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  const handleNextStatus = async (order: AdminOrderWithItems) => {
    if (order.status === 'placed') {
      await onSetStatus(order.id, 'accepted');
    } else if (order.status === 'accepted') {
      onOpenPackView(order);
    } else if (order.status === 'packed') {
      await onSetStatus(order.id, 'out_for_delivery');
    } else if (order.status === 'out_for_delivery') {
      await onSetStatus(order.id, 'delivered');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder || !cancelReason.trim()) return;
    setIsSubmittingCancel(true);
    try {
      await onSetStatus(cancellingOrder.id, 'cancelled', cancelReason.trim());
      setCancellingOrder(null);
      setCancelReason('');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleRemoveItem = async (orderItemId: string, itemName: string) => {
    const confirmed = window.confirm(
      `Remove "${itemName}" from this order? Stock will be set to 0 and grand total recalculated.`
    );
    if (!confirmed) return;
    await onRemoveItem(orderItemId);
  };

  const renderOrderCard = (order: AdminOrderWithItems, isSelected = false) => {
    const elapsedMinutes = getElapsedMinutes(order.placed_at);
    const timing = getTimingBadge(elapsedMinutes);
    const activeItems = order.order_items.filter((i) => !i.removed);
    const canCancel = order.status === 'placed' || order.status === 'accepted' || order.status === 'packed';
    const canRemoveItems = order.status === 'placed' || order.status === 'accepted';

    return (
      <div
        key={order.id}
        onClick={() => setSelectedOrderId(order.id)}
        className={`bg-surface rounded-2xl border p-4 transition-all cursor-pointer ${
          isSelected
            ? 'border-brand ring-2 ring-brand/10 shadow-sm'
            : 'border-line hover:border-brand/40 shadow-xs'
        }`}
      >
        {/* Top Meta Line: Order No, Elapsed Time Badge, Status */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="type-title text-ink font-bold tabular-nums">
              #{order.order_no}
            </span>
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <span
                className={`type-caption px-2 py-0.5 rounded-full border tabular-nums ${timing.badgeBg}`}
              >
                {timing.label}
              </span>
            )}
          </div>

          <span
            className={`type-label px-2.5 py-1 rounded-full text-xs font-bold ${
              order.status === 'placed'
                ? 'bg-amber-100 text-warning'
                : order.status === 'accepted'
                ? 'bg-blue-100 text-brand'
                : order.status === 'packed'
                ? 'bg-purple-100 text-purple-700'
                : order.status === 'out_for_delivery'
                ? 'bg-indigo-100 text-indigo-700'
                : order.status === 'delivered'
                ? 'bg-emerald-100 text-success'
                : 'bg-red-100 text-danger'
            }`}
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Customer & Location */}
        <div className="mb-3">
          <div className="type-subtitle font-bold text-ink">
            {order.customer_name}
          </div>
          <p className="type-body text-ink-2">
            {order.room}
          </p>

          {/* Quick Contact Buttons */}
          <div className="flex items-center gap-3 mt-2">
            <a
              href={`tel:${order.customer_phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canvas border border-line text-xs font-semibold text-ink hover:text-brand hover:border-brand transition-colors"
            >
              <Phone size={14} strokeWidth={2} />
              <span>Call ({order.customer_phone.slice(-4)})</span>
            </a>

            <a
              href={`https://wa.me/91${order.customer_phone}?text=Hi%20${encodeURIComponent(
                order.customer_name
              )},%20regarding%20your%20Plinkit%20order%20%23${order.order_no}:`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-success hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={14} strokeWidth={2} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Customer Note & Preferences */}
        {order.note && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-warning font-medium flex items-start gap-1.5">
            <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" />
            <span>Note: {order.note}</span>
          </div>
        )}

        {/* Items Summary */}
        <div className="py-2.5 border-y border-line space-y-1.5 text-xs">
          {order.order_items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 ${
                item.removed ? 'line-through opacity-50 text-ink-3' : 'text-ink'
              }`}
            >
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="font-bold tabular-nums">{item.qty} ×</span>
                <span className="truncate">{item.name_snapshot}</span>
                <span className="text-ink-2 text-[11px]">({item.size_snapshot})</span>
                {item.removed && (
                  <span className="text-danger font-semibold text-[11px] no-underline">
                    [Removed]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <PriceTag amount={item.line_total} className="font-semibold text-xs" />
                {canRemoveItems && !item.removed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(item.id, item.name_snapshot);
                    }}
                    title="Remove item"
                    className="text-ink-3 hover:text-danger p-1 rounded transition-colors"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total & Payment Controls */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <span className="type-caption text-ink-2 block">Total</span>
            <PriceTag amount={order.grand_total} className="type-title font-bold text-ink" />
          </div>

          <div className="flex items-center gap-1.5">
            {order.payment_status === 'unpaid' ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPayment(order.id, 'paid', 'upi');
                  }}
                  disabled={isUpdating}
                  className="px-2.5 py-1 rounded-lg border border-line bg-canvas hover:border-brand text-xs font-semibold text-ink"
                >
                  Pay: UPI
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPayment(order.id, 'paid', 'cash');
                  }}
                  disabled={isUpdating}
                  className="px-2.5 py-1 rounded-lg border border-line bg-canvas hover:border-brand text-xs font-semibold text-ink"
                >
                  Pay: Cash
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-success flex items-center gap-1">
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                  <span>Paid ({order.paid_via?.toUpperCase() || 'POD'})</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPayment(order.id, 'unpaid');
                  }}
                  title="Mark unpaid"
                  className="text-ink-3 hover:text-ink text-[11px] underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Next Status CTA Button */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mt-3 pt-3 border-t border-line flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleNextStatus(order);
              }}
              disabled={isUpdating}
              className="w-full h-12 text-sm font-bold flex items-center justify-center gap-2 shadow-xs"
            >
              {order.status === 'placed' && (
                <>
                  <span>Accept order</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
              {order.status === 'accepted' && (
                <>
                  <Package size={16} strokeWidth={2} />
                  <span>Pack {activeItems.length} items (Pack view)</span>
                </>
              )}
              {order.status === 'packed' && (
                <>
                  <span>Dispatch · Out for delivery</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
              {order.status === 'out_for_delivery' && (
                <>
                  <CheckCircle2 size={16} strokeWidth={2} />
                  <span>Mark delivered</span>
                </>
              )}
            </Button>

            {/* Pack view button (if accepted or placed) */}
            {(order.status === 'placed' || order.status === 'accepted') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPackView(order);
                }}
                className="w-full py-2 text-xs font-semibold text-brand hover:underline flex items-center justify-center gap-1"
              >
                <Package size={14} strokeWidth={2} />
                <span>Open full-screen pack checklist</span>
              </button>
            )}

            {/* Cancel Order Action */}
            {canCancel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCancellingOrder(order);
                  setCancelReason('');
                }}
                className="w-full py-1 text-xs text-ink-3 hover:text-danger text-center transition-colors"
              >
                Cancel order...
              </button>
            )}
          </div>
        )}

        {/* Delivered / Cancelled Footer Info */}
        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <div className="mt-2 pt-2 border-t border-line text-xs text-ink-2 flex items-center justify-between">
            <span>
              {order.status === 'delivered' ? 'Delivered at ' : 'Cancelled at '}
              {formatISTTime(order.delivered_at || order.cancelled_at)}
            </span>
            {order.cancel_reason && (
              <span className="text-danger italic truncate max-w-[180px]">
                Reason: {order.cancel_reason}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Status Filter Chips (Horizontal Scroll on Mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'all'
              ? 'bg-ink text-white border-ink'
              : 'bg-surface text-ink-2 border-line hover:text-ink'
          }`}
        >
          All ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('placed')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'placed'
              ? 'bg-amber-100 text-warning border-amber-300'
              : 'bg-surface text-ink-2 border-line'
          }`}
        >
          Placed ({placedOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('accepted')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'accepted'
              ? 'bg-blue-100 text-brand border-blue-300'
              : 'bg-surface text-ink-2 border-line'
          }`}
        >
          Accepted ({acceptedOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('packed')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'packed'
              ? 'bg-purple-100 text-purple-700 border-purple-300'
              : 'bg-surface text-ink-2 border-line'
          }`}
        >
          Packed ({packedOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('out_for_delivery')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'out_for_delivery'
              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
              : 'bg-surface text-ink-2 border-line'
          }`}
        >
          Out ({outOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('delivered')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shrink-0 ${
            statusFilter === 'delivered'
              ? 'bg-emerald-100 text-success border-emerald-300'
              : 'bg-surface text-ink-2 border-line'
          }`}
        >
          Delivered ({todayDeliveredOrCancelled.filter((o) => o.status === 'delivered').length})
        </button>
      </div>

      {/* Responsive Layout: Single column on phone, Two-pane from 900px */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane (Orders Queue) */}
        <div className="lg:col-span-7 xl:col-span-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-surface rounded-2xl border border-line">
              <Clock size={32} strokeWidth={1.5} className="mx-auto text-ink-3 mb-2" />
              <p className="type-subtitle font-bold text-ink">No orders in this view</p>
              <p className="type-caption text-ink-2 mt-1">
                New incoming orders will appear here automatically via Realtime.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) =>
              renderOrderCard(order, selectedOrder?.id === order.id)
            )
          )}
        </div>

        {/* Right Pane (Selected Order Detail View on Laptop) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-6 sticky top-24 self-start">
          {selectedOrder ? (
            <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="type-title font-bold text-ink">
                    Order #{selectedOrder.order_no}
                  </h2>
                  <p className="type-caption text-ink-2">
                    Placed at {formatISTTime(selectedOrder.placed_at)}
                  </p>
                </div>
                <span className="type-label px-3 py-1 rounded-full text-xs font-bold bg-brand-soft text-brand">
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Delivery Details */}
              <div className="p-4 rounded-xl bg-canvas space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Customer:</span>
                  <span className="font-bold text-ink">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Phone:</span>
                  <a href={`tel:${selectedOrder.customer_phone}`} className="font-bold text-brand underline">
                    {selectedOrder.customer_phone}
                  </a>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Location:</span>
                  <span className="font-bold text-ink">{selectedOrder.room}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Substitution:</span>
                  <span className="font-bold text-ink">{selectedOrder.substitution_pref}</span>
                </div>
                {selectedOrder.note && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-warning font-medium">
                    Note: {selectedOrder.note}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h3 className="type-subtitle font-bold text-ink mb-3">Order Items</h3>
                <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
                  {selectedOrder.order_items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center justify-between text-sm ${
                        item.removed ? 'line-through opacity-50 bg-canvas' : ''
                      }`}
                    >
                      <div>
                        <span className="font-bold tabular-nums mr-2">{item.qty} ×</span>
                        <span className="font-medium text-ink">{item.name_snapshot}</span>
                        <span className="text-xs text-ink-2 block">{item.size_snapshot}</span>
                      </div>
                      <PriceTag amount={item.line_total} className="font-bold" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <div>
                  <span className="type-caption text-ink-2 block">Grand Total</span>
                  <PriceTag amount={selectedOrder.grand_total} className="type-display font-bold text-ink" />
                </div>

                <div className="flex items-center gap-3">
                  {(selectedOrder.status === 'placed' || selectedOrder.status === 'accepted') && (
                    <Button
                      variant="secondary"
                      onClick={() => onOpenPackView(selectedOrder)}
                      className="h-12 px-4"
                    >
                      <Package size={18} strokeWidth={2} />
                      <span>Pack view</span>
                    </Button>
                  )}

                  {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <Button
                      variant="primary"
                      onClick={() => handleNextStatus(selectedOrder)}
                      disabled={isUpdating}
                      className="h-12 px-6 font-bold"
                    >
                      Next Status
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-surface rounded-2xl border border-line">
              <p className="type-body text-ink-2">Select an order on the left to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-line max-w-md w-full p-6 shadow-floating space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="type-title font-bold text-ink">
                Cancel Order #{cancellingOrder.order_no}
              </h2>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas"
              >
                <XCircle size={20} strokeWidth={2} />
              </button>
            </div>

            <p className="type-body text-ink-2 text-sm">
              Please specify the reason for cancellation. This will restore the stock for all active items and record the reason in Postgres.
            </p>

            {/* Quick Reasons Chips */}
            <div className="space-y-1.5">
              <span className="type-caption text-ink-2 font-semibold">Common reasons:</span>
              <div className="flex flex-wrap gap-1.5">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      cancelReason === reason
                        ? 'bg-brand text-white border-brand'
                        : 'bg-canvas text-ink-2 border-line hover:text-ink'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label htmlFor="cancel-reason" className="type-caption text-ink-2 font-semibold block mb-1">
                Reason note (required):
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={3}
                className="w-full p-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setCancellingOrder(null)}
                disabled={isSubmittingCancel}
              >
                Dismiss
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim() || isSubmittingCancel}
                className="bg-danger hover:bg-red-700 text-white"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
