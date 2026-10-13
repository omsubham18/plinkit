import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Home,
  Clock,
  Phone,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BillSummary } from '@/components/common/BillSummary';
import { useAuthStore } from '@/lib/authStore';
import { useProfile, isProfileComplete } from '@/lib/profile';
import { useCatalogue } from '@/lib/catalogue';
import { useCartStore, getCartSummary, CartLineItem } from '@/lib/cartStore';
import { placeOrder } from '@/lib/orders';
import { useToast } from '@/components/common/Toast';
import { SignInPromptModal } from '@/components/auth/SignInPromptModal';
import { ProfileSetupModal } from '@/components/auth/ProfileSetupModal';
import { captureClientError } from '@/lib/errorReporting';
import type { SubstitutionPref } from '@/types/database';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: catalogue, isLoading: catalogueLoading } = useCatalogue();
  const { items: cartMap, clearCart, setItemQty, removeItem } = useCartStore();
  const { showToast } = useToast();

  // Stable client_request_id created on mount, preserved across re-renders and network retries
  const clientRequestIdRef = useRef<string>(crypto.randomUUID());

  const [substitutionPref, setSubstitutionPref] = useState<SubstitutionPref>('call_me');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modals for auth or missing profile
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const products = catalogue?.products || [];
  const settings = catalogue?.settings;
  const deliveryPoints = catalogue?.deliveryPoints || [];

  const { itemsTotal, totalSavings, lineItems } = getCartSummary(cartMap, products);

  // Active delivery point from profile or fallback
  const activeDeliveryPoint =
    deliveryPoints.find((dp) => dp.id === profile?.delivery_point_id) ||
    deliveryPoints[0];

  // Recalculate delivery fee if delivery point has override
  const deliveryFee =
    itemsTotal >= (settings?.free_delivery_above ?? 299)
      ? 0
      : activeDeliveryPoint?.delivery_fee_override ?? (settings?.delivery_fee ?? 15);
  const grandTotal = itemsTotal + deliveryFee;

  // Empty cart guard
  useEffect(() => {
    if (!catalogueLoading && lineItems.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [catalogueLoading, lineItems.length, navigate]);

  // Auth & Profile checks
  useEffect(() => {
    if (!authLoading && !user) {
      setShowSignInModal(true);
    } else if (!authLoading && user && !profileLoading && !isProfileComplete(profile)) {
      setShowProfileModal(true);
    }
  }, [authLoading, user, profileLoading, profile]);

  const handlePlaceOrder = async () => {
    if (!user) {
      setShowSignInModal(true);
      return;
    }

    if (!isProfileComplete(profile) || !profile?.delivery_point_id || !profile?.room) {
      setShowProfileModal(true);
      return;
    }

    if (lineItems.length === 0) {
      navigate('/cart');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);

    const orderPayload = {
      client_request_id: clientRequestIdRef.current,
      items: lineItems.map((item: CartLineItem) => ({
        product_id: item.product.id,
        qty: item.qty,
      })),
      delivery_point_id: profile.delivery_point_id,
      room: profile.room,
      substitution_pref: substitutionPref,
      note: deliveryNote.trim() || null,
    };

    try {
      const result = await placeOrder(orderPayload);

      if (result.success) {
        clearCart();
        showToast('Order placed successfully!');
        navigate(`/orders/${result.order.id}`, { replace: true });
        return;
      }

      // Handle structured errors per SPEC Rule 11
      setIsSubmitting(false);
      captureClientError(`Order placement failed: ${result.error || result.message}`, '/checkout');

      if (result.error === 'stock_or_item_issue' && result.details) {
        // Correct the cart with the server's authoritative stock
        for (const issue of result.details) {
          if (issue.available_qty <= 0 || issue.reason === 'inactive') {
            removeItem(issue.product_id);
          } else {
            setItemQty(issue.product_id, issue.available_qty);
          }
        }
        const msg = 'Some items in your cart had stock changes and your cart has been updated.';
        setErrorBanner(msg);
        showToast(msg);
      } else if (result.error === 'min_order_value_not_met') {
        const msg = `Minimum order value is ₹${result.min_order_value ?? 99}. Your items total is ₹${result.items_total ?? itemsTotal}.`;
        setErrorBanner(msg);
        showToast(msg);
      } else if (result.error === 'store_closed') {
        const msg = 'The store is currently closed.';
        setErrorBanner(msg);
        showToast(msg);
      } else if (result.error === 'max_active_orders_reached') {
        const msg = 'You have reached the maximum number of active orders (2).';
        setErrorBanner(msg);
        showToast(msg);
      } else {
        const msg = result.message || 'Failed to place order. Please try again.';
        setErrorBanner(msg);
        showToast(msg);
      }
    } catch (err) {
      setIsSubmitting(false);
      captureClientError(`Order placement exception: ${err instanceof Error ? err.message : String(err)}`, '/checkout');
      // On network failure: button re-enables; retry will reuse the identical clientRequestIdRef.current
      const msg = err instanceof Error ? err.message : 'Network error. Tap Place order to retry.';
      setErrorBanner(msg);
      showToast(msg);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5 pb-28">
      {/* Modals */}
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => {
          setShowSignInModal(false);
          if (!user) navigate('/cart');
        }}
        returnTo="/checkout"
      />

      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          if (!isProfileComplete(profile)) navigate('/cart');
        }}
        onSuccess={() => setShowProfileModal(false)}
        title="Delivery details"
        subtitle="Please confirm your name, phone number, and hostel room for delivery."
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Checkout</h1>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-[12px] bg-danger/10 border border-danger/30 text-danger flex items-start gap-2.5 animate-slide-up">
          <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
          <p className="type-caption font-semibold leading-snug">{errorBanner}</p>
        </div>
      )}

      {/* 1. Address Summary Card */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
            Delivery Address
          </span>
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="type-caption font-bold text-brand hover:underline px-1 py-0.5"
          >
            Edit
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={18} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="type-subtitle font-bold text-ink">
              {activeDeliveryPoint ? activeDeliveryPoint.name : 'Select Delivery Point'}
            </span>
            <span className="type-caption text-ink-2 font-medium">
              {activeDeliveryPoint?.campus}
            </span>
            <div className="flex items-center gap-1.5 type-caption text-ink-2 mt-1">
              <Home size={14} strokeWidth={1.75} className="text-ink-3" />
              <span>{profile?.room || 'Room not set'}</span>
            </div>
            <div className="flex items-center gap-1.5 type-caption text-ink-2 mt-0.5">
              <Phone size={14} strokeWidth={1.75} className="text-ink-3" />
              <span>{profile?.phone || 'Phone not set'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-line/60 pt-2 flex items-center gap-2 type-caption text-ink-2">
          <Clock size={14} strokeWidth={1.75} className="text-brand shrink-0" />
          <span>Estimated arrival in ~{activeDeliveryPoint?.eta_minutes ?? 15} minutes</span>
        </div>
      </div>

      {/* 2. Order Items Preview */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
            Items ({lineItems.reduce((acc: number, i: CartLineItem) => acc + i.qty, 0)})
          </span>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="type-caption font-bold text-brand hover:underline px-1 py-0.5"
          >
            Review cart
          </button>
        </div>

        <div className="flex flex-col divide-y divide-line/60">
          {lineItems.map((item: CartLineItem) => (
            <div key={item.product.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate max-w-[240px]">
                <span className="type-caption font-bold text-ink shrink-0">{item.qty}×</span>
                <div className="flex flex-col truncate">
                  <span className="type-body font-medium text-ink truncate">{item.product.name}</span>
                  <span className="type-caption text-ink-3">{item.product.size_label}</span>
                </div>
              </div>
              <span className="type-body font-bold text-ink tabular-nums">
                ₹{item.lineTotal}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Substitution Preference */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-3">
        <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
          If an item is unavailable
        </span>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 p-2.5 rounded-[10px] border border-line hover:bg-canvas cursor-pointer transition-colors">
            <input
              type="radio"
              name="substitution"
              value="call_me"
              checked={substitutionPref === 'call_me'}
              onChange={() => setSubstitutionPref('call_me')}
              className="w-4 h-4 text-brand focus:ring-brand"
            />
            <div className="flex flex-col">
              <span className="type-body font-semibold text-ink">Call me for substitution</span>
              <span className="type-caption text-ink-2">Runner will call before dispatching</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2.5 rounded-[10px] border border-line hover:bg-canvas cursor-pointer transition-colors">
            <input
              type="radio"
              name="substitution"
              value="replace_similar"
              checked={substitutionPref === 'replace_similar'}
              onChange={() => setSubstitutionPref('replace_similar')}
              className="w-4 h-4 text-brand focus:ring-brand"
            />
            <div className="flex flex-col">
              <span className="type-body font-semibold text-ink">Replace with similar item</span>
              <span className="type-caption text-ink-2">Best match from the same category</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2.5 rounded-[10px] border border-line hover:bg-canvas cursor-pointer transition-colors">
            <input
              type="radio"
              name="substitution"
              value="remove_item"
              checked={substitutionPref === 'remove_item'}
              onChange={() => setSubstitutionPref('remove_item')}
              className="w-4 h-4 text-brand focus:ring-brand"
            />
            <div className="flex flex-col">
              <span className="type-body font-semibold text-ink">Remove item from bill</span>
              <span className="type-caption text-ink-2">Adjust bill total without substitution</span>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Optional Delivery Note */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileText size={16} strokeWidth={1.75} className="text-ink-2" />
          <span className="type-caption font-bold uppercase tracking-wider text-ink-3">
            Delivery note (optional)
          </span>
        </div>
        <textarea
          value={deliveryNote}
          onChange={(e) => setDeliveryNote(e.target.value.slice(0, 200))}
          placeholder="e.g. Leave with hostel security if I'm not down, call on arrival"
          rows={2}
          className="w-full p-3 rounded-[10px] bg-canvas border border-line text-ink type-body focus:bg-surface focus:border-brand focus:outline-none resize-none transition-colors"
        />
        <span className="type-caption text-ink-3 text-right tabular-nums">
          {deliveryNote.length}/200
        </span>
      </div>

      {/* 5. Payment Method Notice */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
          <CreditCard size={18} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="type-subtitle font-bold text-ink">
              Pay on delivery: UPI or cash
            </span>
            <CheckCircle2 size={16} strokeWidth={2} className="text-success" />
          </div>
          <p className="type-caption text-ink-2 mt-0.5">
            Scan the runner&apos;s UPI QR code or pay with cash when your snacks arrive.
          </p>
        </div>
      </div>

      {/* 6. Bill Summary */}
      <BillSummary
        itemsTotal={itemsTotal}
        deliveryFee={deliveryFee}
        totalSavings={totalSavings}
        freeDeliveryThreshold={settings?.free_delivery_above ?? 299}
      />

      {/* Sticky Bottom Place Order CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-surface/95 backdrop-blur-md border-t border-line flex justify-center">
        <div className="w-full max-w-[480px]">
          <Button
            variant="primary"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || lineItems.length === 0}
            className="w-full h-12 type-subtitle font-bold shadow-float flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                <span>Placing order...</span>
              </>
            ) : (
              <span>Place order · ₹{grandTotal}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
