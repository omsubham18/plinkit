import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogue, checkStoreStatus } from '@/lib/catalogue';
import { useCartStore, getCartSummary } from '@/lib/cartStore';
import { useDeliveryPointStore } from '@/lib/deliveryPointStore';
import { useAuthStore } from '@/lib/authStore';
import { useToast } from '@/components/common/Toast';
import { AddStepper } from '@/components/common/AddStepper';
import { BillSummary } from '@/components/common/BillSummary';
import { PriceTag } from '@/components/common/PriceTag';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/FeedbackStates';
import { SkeletonProductRow } from '@/components/ui/Skeletons';
import { SignInPromptModal } from '@/components/auth/SignInPromptModal';
import { ArrowLeft, ShoppingBag, AlertCircle, Clock, Package } from 'lucide-react';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: catalogue, isLoading } = useCatalogue();
  const products = useMemo(() => catalogue?.products || [], [catalogue?.products]);
  const settings = catalogue?.settings || null;
  const deliveryPoints = useMemo(() => catalogue?.deliveryPoints || [], [catalogue?.deliveryPoints]);

  const { items, increment, decrement, reconcile } = useCartStore();
  const { getActivePoint } = useDeliveryPointStore();
  const activeDeliveryPoint = getActivePoint(deliveryPoints);

  // Store open/closed status
  const storeStatus = checkStoreStatus(settings);

  // Reconcile cart if catalogue products are loaded
  useEffect(() => {
    if (products.length > 0) {
      const notices = reconcile(products);
      if (notices.length > 0) {
        showToast(notices[0]);
      }
    }
  }, [products, reconcile, showToast]);

  const { totalCount, itemsTotal, totalSavings, lineItems } = getCartSummary(items, products);

  // Fee calculation: check delivery point override or default setting fee
  const defaultFee = settings?.delivery_fee ?? 15;
  const pointOverride = activeDeliveryPoint?.delivery_fee_override;
  const standardFee = pointOverride !== null && pointOverride !== undefined ? pointOverride : defaultFee;
  const freeDeliveryThreshold = settings?.free_delivery_above ?? 299;
  const minOrderValue = settings?.min_order_value ?? 99;

  const isBelowMinOrder = itemsTotal < minOrderValue;
  const minOrderDiff = minOrderValue - itemsTotal;

  const canProceed = storeStatus.isOpen && !isBelowMinOrder && totalCount > 0;
  const { user } = useAuthStore();
  const [showSignInModal, setShowSignInModal] = useState(false);

  const handleProceed = () => {
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    navigate('/checkout');
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex flex-col w-full p-4 gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-line/60 animate-pulse" />
          <div className="h-6 w-24 bg-line/60 rounded-md animate-pulse" />
        </div>
        <SkeletonProductRow />
        <SkeletonProductRow />
        <SkeletonProductRow />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8">
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        returnTo="/checkout"
        title="Sign in to checkout"
        subtitle="Sign in with your student Google account to proceed to checkout."
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-line px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 className="type-title text-ink font-bold tracking-tight">Your cart</h1>
        </div>
        {totalCount > 0 && (
          <span className="type-caption text-ink-2 font-semibold">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </header>

      {/* Main Content */}
      {lineItems.length === 0 ? (
        <div className="p-4 pt-12">
          <EmptyState
            icon={<ShoppingBag size={36} strokeWidth={1.5} className="text-ink-2" />}
            message="Your cart is empty. Add your favourite snacks and essentials to get started."
            actionLabel="Start shopping"
            onAction={() => navigate('/')}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {/* Store Closed Banner (when closed) */}
          {!storeStatus.isOpen && (
            <div className="bg-warning/10 border border-warning/30 rounded-card p-3 flex items-start gap-2.5 text-warning">
              <Clock size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
              <div className="type-caption font-medium">
                <span className="font-bold">Store is currently closed.</span> Opens at{' '}
                {storeStatus.opensAtFormatted}. You can prepare your cart now, but ordering is paused until opening hours.
              </div>
            </div>
          )}

          {/* Delivery Point Banner */}
          {activeDeliveryPoint && (
            <div className="bg-canvas border border-line rounded-card px-3.5 py-2.5 flex items-center justify-between text-ink">
              <div className="type-caption text-ink-2">
                Delivering to{' '}
                <span className="font-bold text-ink">{activeDeliveryPoint.name}</span> (
                {activeDeliveryPoint.eta_minutes} min)
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="type-caption text-brand font-bold hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {/* Minimum Order Warning Banner */}
          {isBelowMinOrder && storeStatus.isOpen && (
            <div className="bg-brand-soft border border-brand/20 rounded-card p-3 flex items-start gap-2.5 text-brand">
              <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
              <div className="type-caption font-medium">
                Minimum order value is <PriceTag amount={minOrderValue} />. Add{' '}
                <PriceTag amount={minOrderDiff} /> more to checkout.
              </div>
            </div>
          )}

          {/* Line Items List */}
          <div className="bg-surface rounded-card border border-line divide-y divide-line overflow-hidden">
            {lineItems.map(({ product, qty, lineTotal }) => (
              <div
                key={product.id}
                className="p-3 flex items-center justify-between gap-3 transition-colors"
              >
                {/* Product Image & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-image bg-surface border border-line/50 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package size={22} className="text-ink-3" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="type-body font-bold text-ink truncate">
                      {product.name}
                    </h3>
                    <div className="type-caption text-ink-2 font-medium">
                      {product.size_label} · <PriceTag amount={product.price} /> each
                    </div>
                    <div className="type-caption font-bold text-ink mt-0.5">
                      <PriceTag amount={lineTotal} />
                    </div>
                  </div>
                </div>

                {/* AddStepper */}
                <div className="shrink-0">
                  <AddStepper
                    qty={qty}
                    stockQty={product.stock_qty}
                    maxQty={product.max_per_order ?? 5}
                    onAdd={() => increment(product, showToast)}
                    onIncrement={() => increment(product, showToast)}
                    onDecrement={() => decrement(product.id)}
                    onCapReached={showToast}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bill Summary */}
          <BillSummary
            itemsTotal={itemsTotal}
            deliveryFee={standardFee}
            freeDeliveryThreshold={freeDeliveryThreshold}
            totalSavings={totalSavings}
          />

          {/* Price Disclaimer */}
          <p className="type-caption text-ink-2 text-center px-2">
            Prices, delivery fee and availability are confirmed at checkout.
          </p>

          {/* Checkout CTA Footer */}
          <div className="sticky bottom-0 bg-surface/95 backdrop-blur-sm border-t border-line -mx-4 -mb-8 p-4 pt-3 flex flex-col gap-2">
            <Button
              variant="primary"
              disabled={!canProceed}
              onClick={handleProceed}
              className="w-full h-12"
            >
              {!storeStatus.isOpen
                ? `Store Closed (Opens ${storeStatus.opensAtFormatted})`
                : isBelowMinOrder
                ? `Add ₹${minOrderDiff} more to order`
                : 'Proceed to checkout'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
