import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/FeedbackStates';
import { fetchCustomerOrders, CustomerOrderWithItems } from '@/lib/orders';
import { useAuthStore } from '@/lib/authStore';
import { useCatalogue } from '@/lib/catalogue';
import { useCartStore } from '@/lib/cartStore';
import { useToast } from '@/components/common/Toast';
import { SignInPromptModal } from '@/components/auth/SignInPromptModal';

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'delivered':
      return {
        label: 'Delivered',
        className: 'bg-success/10 text-success border-success/20',
        icon: <CheckCircle2 size={13} strokeWidth={2.2} />,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-danger/10 text-danger border-danger/20',
        icon: <XCircle size={13} strokeWidth={2.2} />,
      };
    case 'out_for_delivery':
      return {
        label: 'Out for delivery',
        className: 'bg-brand-soft text-brand border-brand/20',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />,
      };
    case 'packed':
      return {
        label: 'Packed',
        className: 'bg-brand-soft text-brand border-brand/20',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-brand" />,
      };
    case 'accepted':
      return {
        label: 'Accepted',
        className: 'bg-brand-soft text-brand border-brand/20',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-brand" />,
      };
    case 'placed':
    default:
      return {
        label: 'Placed',
        className: 'bg-warning/10 text-warning border-warning/20',
        icon: <Clock size={13} strokeWidth={2.2} />,
      };
  }
}

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: catalogue } = useCatalogue();
  const { setItemQty } = useCartStore();
  const { showToast } = useToast();

  const [showSignInModal, setShowSignInModal] = useState(false);

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error,
  } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: fetchCustomerOrders,
    enabled: Boolean(user?.id),
    staleTime: 10_000,
  });

  const handleOrderAgain = (e: React.MouseEvent, order: CustomerOrderWithItems) => {
    e.stopPropagation();

    const products = catalogue?.products || [];
    if (products.length === 0) {
      showToast('Catalogue is loading, please try again in a moment');
      return;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let addedCount = 0;
    let unavailableCount = 0;

    for (const item of order.order_items) {
      // Don't re-order items that were removed by admin
      if (item.removed) continue;

      const liveProduct = productMap.get(item.product_id);
      if (!liveProduct || !liveProduct.is_active || liveProduct.stock_qty <= 0) {
        unavailableCount += 1;
        continue;
      }

      // Quantity capped by current stock and per-order limit
      const maxCap = Math.min(liveProduct.stock_qty, liveProduct.max_per_order ?? 5);
      const targetQty = Math.min(item.qty, maxCap);

      if (targetQty > 0) {
        setItemQty(liveProduct.id, targetQty);
        addedCount += 1;
      } else {
        unavailableCount += 1;
      }
    }

    if (addedCount > 0) {
      if (unavailableCount > 0) {
        showToast(`Added ${addedCount} available items to your cart (${unavailableCount} unavailable).`);
      } else {
        showToast(`Added ${addedCount} items to your cart.`);
      }
      navigate('/cart');
    } else {
      showToast('Items from this order are currently out of stock.');
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Orders</h1>
      </div>

      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        returnTo="/orders"
        title="Sign in to view orders"
        subtitle="Sign in with your student Google account to view your past orders and live delivery tracking."
      />

      {/* Unauthenticated State */}
      {!authLoading && !user && (
        <div className="bg-surface border border-line rounded-[14px] p-6 text-center flex flex-col items-center gap-3 mt-4">
          <div className="w-16 h-16 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-2">
            <ShoppingBag size={30} strokeWidth={1.75} />
          </div>
          <h2 className="type-title font-bold text-ink">Sign in to view orders</h2>
          <p className="type-body text-ink-2 max-w-[280px]">
            Please sign in to track live status and view your past orders.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowSignInModal(true)}
            className="w-full mt-2"
          >
            Continue with Google
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {(authLoading || ordersLoading) && user && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-canvas rounded" />
                <div className="h-5 w-20 bg-canvas rounded-full" />
              </div>
              <div className="h-4 w-36 bg-canvas rounded" />
              <div className="h-10 bg-canvas rounded-[10px]" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && user && (
        <div className="p-4 rounded-[14px] bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertCircle size={20} strokeWidth={2} className="shrink-0" />
          <span className="type-caption font-semibold">
            Failed to load orders. Please pull to refresh or try again later.
          </span>
        </div>
      )}

      {/* Empty State */}
      {!ordersLoading && user && orders.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={<ShoppingBag size={32} strokeWidth={1.75} className="text-ink-2" />}
            message="No orders placed yet. Orders will appear here."
            actionLabel="Start shopping"
            onAction={() => navigate('/')}
          />
        </div>
      )}

      {/* Orders List */}
      {!ordersLoading && user && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const itemsSummary = order.order_items
              .slice(0, 3)
              .map((i) => `${i.qty}× ${i.name_snapshot}`)
              .join(', ');
            const remainingCount = order.order_items.length - 3;

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3 hover:border-brand/40 transition-colors cursor-pointer"
              >
                {/* Header: Order No & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="type-subtitle font-bold text-ink">
                      Order #{order.order_no}
                    </span>
                    <span className="type-caption text-ink-3">•</span>
                    <span className="type-caption text-ink-2 font-medium">
                      {formatISTDate(order.placed_at)}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Delivery Point Info */}
                <div className="flex items-center gap-1.5 type-caption text-ink-2">
                  <MapPin size={14} strokeWidth={1.75} className="text-ink-3 shrink-0" />
                  <span className="truncate">Room {order.room}</span>
                </div>

                {/* Items Summary Preview */}
                <div className="p-2.5 rounded-[10px] bg-canvas border border-line/60 type-caption text-ink-2">
                  <span className="line-clamp-1">
                    {itemsSummary}
                    {remainingCount > 0 && ` +${remainingCount} more`}
                  </span>
                </div>

                {/* Footer: Total & Actions */}
                <div className="border-t border-line/60 pt-2.5 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="type-subtitle font-bold text-ink tabular-nums">
                      ₹{order.grand_total}
                    </span>
                    <span className="type-caption text-ink-3">
                      ({order.order_items.reduce((acc, i) => acc + i.qty, 0)} items)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(e) => handleOrderAgain(e, order)}
                      className="h-8 px-3 rounded-full type-caption font-bold flex items-center gap-1.5 border-line hover:border-brand hover:text-brand"
                    >
                      <RotateCcw size={13} strokeWidth={2.2} />
                      <span>Order again</span>
                    </Button>

                    <span className="text-ink-3">
                      <ChevronRight size={18} strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
