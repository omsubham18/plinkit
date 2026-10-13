import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/common/AppHeader';
import { SearchField } from '@/components/common/SearchField';
import { CategoryTile } from '@/components/common/CategoryTile';
import { ProductRail } from '@/components/common/ProductRail';
import { ProductSheet } from '@/components/common/ProductSheet';
import { CartBar } from '@/components/common/CartBar';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useToast } from '@/components/common/Toast';
import { SkeletonProductCard, SkeletonCategoryTile } from '@/components/ui/Skeletons';
import { useCatalogue, checkStoreStatus } from '@/lib/catalogue';
import { useCartStore, getCartSummary } from '@/lib/cartStore';
import { useDeliveryPointStore } from '@/lib/deliveryPointStore';
import { Product } from '@/types';
import { MapPin, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: catalogue, isLoading, isError, refetch } = useCatalogue();
  const categories = useMemo(() => catalogue?.categories || [], [catalogue?.categories]);
  const products = useMemo(() => catalogue?.products || [], [catalogue?.products]);
  const deliveryPoints = useMemo(() => catalogue?.deliveryPoints || [], [catalogue?.deliveryPoints]);
  const settings = catalogue?.settings || null;

  const { items, increment, decrement, reconcile } = useCartStore();
  const { selectedPointId, setSelectedPointId, getActivePoint } = useDeliveryPointStore();
  const activeDeliveryPoint = getActivePoint(deliveryPoints);

  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [selectedProductForSheet, setSelectedProductForSheet] = useState<Product | null>(null);

  // Store open/closed status evaluated in Asia/Kolkata
  const storeStatus = checkStoreStatus(settings);

  // Reconcile cart whenever products are refreshed
  useEffect(() => {
    if (products.length > 0) {
      const notices = reconcile(products);
      if (notices.length > 0) {
        showToast(notices[0]);
      }
    }
  }, [products, reconcile, showToast]);

  // Product rails driven by rail column
  const lateNightProducts = useMemo(
    () => products.filter((p) => p.rail === 'late_night'),
    [products]
  );
  const bestsellerProducts = useMemo(
    () => products.filter((p) => p.rail === 'bestsellers'),
    [products]
  );
  const newProducts = useMemo(
    () => products.filter((p) => p.rail === 'new'),
    [products]
  );

  const { totalCount, itemsTotal } = getCartSummary(items, products);

  if (isError && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <p className="type-body text-ink font-semibold mb-3">
          Unable to load store catalogue.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand text-surface rounded-button type-subtitle font-bold"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8">
      {/* 1. App Header */}
      <AppHeader
        deliveryEta={activeDeliveryPoint?.eta_minutes ?? 15}
        deliveryPointName={activeDeliveryPoint?.name ?? 'Select delivery point'}
        isStoreOpen={storeStatus.isOpen}
        opensAtText={storeStatus.opensAtFormatted}
        onChangeDeliveryPoint={() => setIsLocationSheetOpen(true)}
        onAccountClick={() => navigate('/account')}
      />

      {/* Store Closed Banner (when closed) */}
      {!storeStatus.isOpen && (
        <div className="mx-4 mt-3 bg-warning/10 border border-warning/30 rounded-card p-3 flex items-start gap-2.5 text-warning">
          <Clock size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
          <div className="type-caption font-medium">
            <span className="font-bold">Store closed · Opens at {storeStatus.opensAtFormatted}.</span>{' '}
            You can still browse and add items to your cart.
          </div>
        </div>
      )}

      {/* 2. Instant Search Field */}
      <div className="p-4 pb-2">
        <SearchField onClick={() => navigate('/search')} readOnly />
      </div>

      {/* 3. Category Grid: 4 columns per DESIGN.md */}
      <section className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="type-title text-ink font-bold tracking-tight">
            Explore categories
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {isLoading && categories.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCategoryTile key={i} />
              ))
            : categories.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  onClick={() => navigate(`/c/${category.slug}`)}
                />
              ))}
        </div>
      </section>

      {/* 4. Product Rails */}
      {isLoading && products.length === 0 ? (
        <div className="space-y-4 min-h-[500px]">
          <div className="px-4 py-3">
            <div className="h-5 w-36 bg-line/60 rounded mb-3 animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              <SkeletonProductCard className="w-[140px] shrink-0" />
              <SkeletonProductCard className="w-[140px] shrink-0" />
              <SkeletonProductCard className="w-[140px] shrink-0" />
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="h-5 w-40 bg-line/60 rounded mb-3 animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              <SkeletonProductCard className="w-[140px] shrink-0" />
              <SkeletonProductCard className="w-[140px] shrink-0" />
              <SkeletonProductCard className="w-[140px] shrink-0" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {lateNightProducts.length > 0 && (
            <ProductRail
              title="Late night cravings"
              products={lateNightProducts}
              cartItems={items}
              onAdd={(prod) => increment(prod, showToast)}
              onIncrement={(prod) => increment(prod, showToast)}
              onDecrement={(prod) => decrement(prod.id)}
              onCapReached={showToast}
              onClickProduct={(prod) => setSelectedProductForSheet(prod)}
            />
          )}

          {bestsellerProducts.length > 0 && (
            <ProductRail
              title="Campus bestsellers"
              products={bestsellerProducts}
              cartItems={items}
              onAdd={(prod) => increment(prod, showToast)}
              onIncrement={(prod) => increment(prod, showToast)}
              onDecrement={(prod) => decrement(prod.id)}
              onCapReached={showToast}
              onClickProduct={(prod) => setSelectedProductForSheet(prod)}
            />
          )}

          {newProducts.length > 0 && (
            <ProductRail
              title="New arrivals"
              products={newProducts}
              cartItems={items}
              onAdd={(prod) => increment(prod, showToast)}
              onIncrement={(prod) => increment(prod, showToast)}
              onDecrement={(prod) => decrement(prod.id)}
              onCapReached={showToast}
              onClickProduct={(prod) => setSelectedProductForSheet(prod)}
            />
          )}
        </>
      )}

      {/* 5. Floating Cart Bar */}
      <CartBar
        totalItems={totalCount}
        totalPrice={itemsTotal}
        onViewCart={() => navigate('/cart')}
      />

      {/* 6. Product Sheet */}
      <ProductSheet
        product={selectedProductForSheet}
        allProducts={products}
        isOpen={Boolean(selectedProductForSheet)}
        onClose={() => setSelectedProductForSheet(null)}
        cartQty={selectedProductForSheet ? items[selectedProductForSheet.id] || 0 : 0}
        cartItems={items}
        onAdd={(prod) => increment(prod, showToast)}
        onIncrement={(prod) => increment(prod, showToast)}
        onDecrement={(prod) => decrement(prod.id)}
        onCapReached={showToast}
        onSelectSimilarProduct={(simProd) => setSelectedProductForSheet(simProd)}
      />

      {/* 7. Location Selector BottomSheet */}
      <BottomSheet
        isOpen={isLocationSheetOpen}
        onClose={() => setIsLocationSheetOpen(false)}
        title="Choose delivery point"
      >
        <div className="flex flex-col gap-2 pb-4">
          {deliveryPoints.map((dp) => {
            const isSelected = dp.id === (activeDeliveryPoint?.id ?? selectedPointId);
            return (
              <button
                key={dp.id}
                type="button"
                onClick={() => {
                  setSelectedPointId(dp.id);
                  setIsLocationSheetOpen(false);
                  showToast(`Delivery location set to ${dp.name}`);
                }}
                className={cn(
                  'w-full min-h-[52px] p-3 rounded-card border flex items-center justify-between',
                  'text-left transition-colors duration-state',
                  isSelected
                    ? 'border-brand bg-brand-soft text-brand font-bold'
                    : 'border-line bg-surface text-ink hover:bg-canvas'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      isSelected ? 'bg-brand text-surface' : 'bg-canvas text-ink-2'
                    )}
                  >
                    <MapPin size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="type-body font-bold">{dp.name}</div>
                    <div className="type-caption text-ink-2">
                      {dp.campus} · {dp.eta_minutes} mins ETA
                    </div>
                  </div>
                </div>

                {isSelected && <Check size={18} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
};
