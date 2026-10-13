import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageCircle,
  AlertTriangle,
  XCircle,
  MapPin,
  Clock,
  Home,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusTimeline } from '@/components/common/StatusTimeline';
import { fetchOrderDetails, cancelMyOrder, subscribeToOrderUpdates } from '@/lib/orders';
import { useCatalogue } from '@/lib/catalogue';
import { getWhatsAppOrderSupportUrl } from '@/lib/whatsapp';
import { useToast } from '@/components/common/Toast';
import type { OrderStatus, OrderTimelineStep } from '@/types';

function formatISTTime(utcString: string | null | undefined): string {
  if (!utcString) return '';
  try {
    const date = new Date(utcString);
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function formatISTDate(utcString: string | null | undefined): string {
  if (!utcString) return '';
  try {
    const date = new Date(utcString);
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: catalogue } = useCatalogue();
  const settings = catalogue?.settings;

  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 1. Fetch order details with 10s fallback polling
  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => {
      if (!id) throw new Error('Order ID is required');
      return fetchOrderDetails(id);
    },
    enabled: Boolean(id),
    refetchInterval: 10_000, // Fallback polling every 10s
    staleTime: 5_000,
  });

  // 2. Realtime WebSocket subscription for instantaneous status updates
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToOrderUpdates(id, (updatedOrder) => {
      queryClient.setQueryData(['order', id], (prev: unknown) => {
        if (!prev) return prev;
        const current = prev as { order: typeof updatedOrder; items: unknown[] };
        return {
          ...current,
          order: updatedOrder,
        };
      });
      showToast(`Order status updated: ${updatedOrder.status.replace(/_/g, ' ')}`);
    });

    return () => {
      unsubscribe();
    };
  }, [id, queryClient, showToast]);

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-canvas" />
          <div className="h-6 w-36 bg-canvas rounded" />
        </div>
        <div className="h-32 bg-canvas rounded-[14px]" />
        <div className="h-48 bg-canvas rounded-[14px]" />
      </div>
    );
  }

  if (error || !data || !data.order) {
    return (
      <div className="p-6 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h2 className="type-title font-bold text-ink">Order not found</h2>
        <p className="type-body text-ink-2 max-w-[280px]">
          We couldn&apos;t load the details for this order. It may have been removed or you may need to sign in.
        </p>
        <Button variant="primary" onClick={() => navigate('/orders')}>
          View all orders
        </Button>
      </div>
    );
  }

  const { order, items } = data;

  // Build StatusTimeline steps
  const statusHierarchy: OrderStatus[] = [
    'placed',
    'accepted',
    'packed',
    'out_for_delivery',
    'delivered',
  ];

  const currentStatusIndex = statusHierarchy.indexOf(order.status as OrderStatus);

  const timelineSteps: OrderTimelineStep[] = [
    {
      status: 'placed',
      label: 'Order placed',
      time: formatISTTime(order.placed_at),
      isCompleted: currentStatusIndex > 0,
      isCurrent: order.status === 'placed',
    },
    {
      status: 'accepted',
      label: 'Accepted by store',
      time: formatISTTime(order.accepted_at),
      isCompleted: currentStatusIndex > 1,
      isCurrent: order.status === 'accepted',
    },
    {
      status: 'packed',
      label: 'Packed & ready',
      time: formatISTTime(order.packed_at),
      isCompleted: currentStatusIndex > 2,
      isCurrent: order.status === 'packed',
    },
    {
      status: 'out_for_delivery',
      label: 'Out for delivery',
      time: formatISTTime(order.out_at),
      isCompleted: currentStatusIndex > 3,
      isCurrent: order.status === 'out_for_delivery',
    },
    {
      status: 'delivered',
      label: 'Delivered',
      time: formatISTTime(order.delivered_at),
      isCompleted: order.status === 'delivered',
      isCurrent: order.status === 'delivered',
    },
  ];

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelMyOrder(order.id);
      setIsCancelling(false);
      setShowCancelConfirm(false);

      if (res.success && res.order) {
        queryClient.setQueryData(['order', id], {
          order: res.order,
          items,
        });
        showToast('Your order has been cancelled.');
      } else {
        showToast(res.message || 'Unable to cancel this order.');
      }
    } catch (err) {
      setIsCancelling(false);
      setShowCancelConfirm(false);
      showToast(err instanceof Error ? err.message : 'Failed to cancel order.');
    }
  };

  const supportUrl = getWhatsAppOrderSupportUrl(
    settings?.support_phone || '',
    order.order_no
  );

  return (
    <div className="p-4 flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60"
            aria-label="Back to orders"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className="flex flex-col">
            <h1 className="type-title text-ink font-bold">Order #{order.order_no}</h1>
            <span className="type-caption text-ink-2">{formatISTDate(order.placed_at)}</span>
          </div>
        </div>

        {/* Need Help WhatsApp Button */}
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-3 rounded-full bg-success/10 text-success hover:bg-success/20 font-semibold type-caption flex items-center gap-1.5 transition-colors"
        >
          <MessageCircle size={15} strokeWidth={2.2} />
          <span>Need help?</span>
        </a>
      </div>

      {/* Cancelled Alert Banner (if cancelled) */}
      {order.status === 'cancelled' && (
        <div className="p-4 rounded-[14px] bg-danger/10 border border-danger/20 text-danger flex items-start gap-3">
          <XCircle size={22} strokeWidth={2} className="shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="type-subtitle font-bold">Order cancelled</span>
            <span className="type-caption mt-0.5">
              {order.cancel_reason || 'This order was cancelled.'}
            </span>
            {order.cancelled_at && (
              <span className="type-caption opacity-80 mt-1">
                Cancelled on {formatISTDate(order.cancelled_at)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Live Timeline Card (if active or delivered) */}
      {order.status !== 'cancelled' && (
        <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
              Delivery Progress
            </span>
            <span className="flex items-center gap-1.5 type-caption text-brand font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
              <span>Live tracking</span>
            </span>
          </div>
          <StatusTimeline steps={timelineSteps} />
        </div>
      )}

      {/* Delivery Destination Card */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-2.5">
        <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
          Delivering to
        </span>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={16} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="type-body font-bold text-ink">{order.customer_name}</span>
            <div className="flex items-center gap-1.5 type-caption text-ink-2 mt-0.5">
              <Home size={13} strokeWidth={1.75} className="text-ink-3" />
              <span>Room {order.room}</span>
            </div>
            <div className="flex items-center gap-1.5 type-caption text-ink-2 mt-0.5">
              <Clock size={13} strokeWidth={1.75} className="text-ink-3" />
              <span>Hostel delivery gate</span>
            </div>
          </div>
        </div>
        {order.note && (
          <div className="p-2.5 rounded-[10px] bg-canvas border border-line type-caption text-ink-2 mt-1">
            <strong>Note:</strong> {order.note}
          </div>
        )}
      </div>

      {/* Order Items Breakdown */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3">
        <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
          Order Items ({items.length})
        </span>

        <div className="flex flex-col divide-y divide-line/60">
          {items.map((item) => (
            <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="type-caption font-bold text-ink shrink-0 mt-0.5">
                  {item.qty}×
                </span>
                <div className="flex flex-col">
                  <span
                    className={`type-body font-medium ${
                      item.removed ? 'line-through text-ink-3' : 'text-ink'
                    }`}
                  >
                    {item.name_snapshot}
                  </span>
                  <span className="type-caption text-ink-3">{item.size_snapshot}</span>

                  {item.removed && (
                    <span className="type-caption font-bold text-danger mt-0.5">
                      Unavailable · Removed from bill
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`type-body font-bold tabular-nums shrink-0 ${
                  item.removed ? 'line-through text-ink-3' : 'text-ink'
                }`}
              >
                ₹{item.line_total}
              </span>
            </div>
          ))}
        </div>

        {/* Bill Summary Rows */}
        <div className="border-t border-line pt-3 flex flex-col gap-1.5">
          <div className="flex justify-between type-caption text-ink-2">
            <span>Items total</span>
            <span className="tabular-nums">₹{order.items_total}</span>
          </div>
          <div className="flex justify-between type-caption text-ink-2">
            <span>Delivery fee</span>
            <span className="tabular-nums">
              {order.delivery_fee === 0 ? 'Free' : `₹${order.delivery_fee}`}
            </span>
          </div>
          <div className="border-t border-line/60 pt-2 flex justify-between type-subtitle font-bold text-ink">
            <span>Grand total</span>
            <span className="tabular-nums">₹{order.grand_total}</span>
          </div>

          <div className="flex items-center gap-1.5 type-caption mt-1 font-semibold text-ink-2">
            {order.payment_status === 'paid' ? (
              <>
                <CheckCircle2 size={14} strokeWidth={2} className="text-success" />
                <span className="text-success">
                  Paid via {order.paid_via ? order.paid_via.toUpperCase() : 'UPI'}
                </span>
              </>
            ) : (
              <span>Pay on delivery: UPI or cash</span>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Action (Only while status is 'placed') */}
      {order.status === 'placed' && (
        <div className="mt-2">
          {!showCancelConfirm ? (
            <Button
              variant="ghost"
              onClick={() => setShowCancelConfirm(true)}
              className="w-full text-danger hover:bg-danger/10 border border-danger/20"
            >
              Cancel order
            </Button>
          ) : (
            <div className="p-3.5 rounded-[14px] bg-danger/10 border border-danger/30 flex flex-col gap-2.5 animate-slide-up">
              <span className="type-caption font-bold text-danger">
                Are you sure you want to cancel Order #{order.order_no}?
              </span>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex-1 bg-danger hover:bg-danger/90 text-surface h-10 type-caption"
                >
                  {isCancelling ? (
                    <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                  ) : (
                    'Yes, cancel'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancelling}
                  className="flex-1 h-10 type-caption"
                >
                  No, keep order
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
