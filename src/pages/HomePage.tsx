import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/common/AppHeader';
import { SearchField } from '@/components/common/SearchField';
import { CategoryTile } from '@/components/common/CategoryTile';
import { ProductRail } from '@/components/common/ProductRail';
import { CartBar } from '@/components/common/CartBar';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useToast } from '@/components/common/Toast';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_DELIVERY_POINTS } from '@/data/mockData';
import { Product, DeliveryPoint } from '@/types';
import { MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [deliveryPoint, setDeliveryPoint] = useState<DeliveryPoint>(MOCK_DELIVERY_POINTS[0]);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({
    p1: 1,
    p2: 2,
  });

  const lateNightProducts = MOCK_PRODUCTS.filter((p) => p.rail === 'late_night');
  const bestsellerProducts = MOCK_PRODUCTS.filter((p) => p.rail === 'bestsellers');

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === id);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  const handleAdd = (product: Product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    showToast(`Added ${product.name} to cart`);
  };

  const handleIncrement = (product: Product) => {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
  };

  const handleDecrement = (product: Product) => {
    setCart((prev) => {
      const current = prev[product.id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return { ...prev, [product.id]: current - 1 };
    });
  };

  return (
    <div className="flex flex-col w-full pb-6">
      {/* 1. App Header */}
      <AppHeader
        deliveryEta={deliveryPoint.eta_minutes}
        deliveryPointName={deliveryPoint.name}
        onChangeDeliveryPoint={() => setIsLocationSheetOpen(true)}
        onAccountClick={() => navigate('/account')}
      />

      {/* 2. Instant Search Field */}
      <div className="p-4 pb-2">
        <SearchField
          onClick={() => navigate('/search')}
          readOnly
        />
      </div>

      {/* 3. Category Grid: 4 columns per DESIGN.md */}
      <section className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="type-title text-ink font-bold tracking-tight">
            Explore categories
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {MOCK_CATEGORIES.map((category) => (
            <CategoryTile
              key={category.id}
              category={category}
              onClick={() => navigate(`/c/${category.slug}`)}
            />
          ))}
        </div>
      </section>

      {/* 4. Product Rails */}
      <ProductRail
        title="Late night cravings"
        products={lateNightProducts}
        cartItems={cart}
        onSeeAll={() => navigate('/c/chips-crisps')}
        onAdd={handleAdd}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onSeeSimilar={() => navigate('/c/cold-drinks')}
        onCapReached={showToast}
      />

      <ProductRail
        title="Campus bestsellers"
        products={bestsellerProducts}
        cartItems={cart}
        onSeeAll={() => navigate('/c/instant-noodles')}
        onAdd={handleAdd}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onSeeSimilar={() => navigate('/c/biscuits-cookies')}
        onCapReached={showToast}
      />

      {/* 5. Floating Cart Bar */}
      <CartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        onViewCart={() => navigate('/cart')}
      />

      {/* Location Selector BottomSheet */}
      <BottomSheet
        isOpen={isLocationSheetOpen}
        onClose={() => setIsLocationSheetOpen(false)}
        title="Choose delivery point"
      >
        <div className="flex flex-col gap-2">
          {MOCK_DELIVERY_POINTS.map((dp) => {
            const isSelected = dp.id === deliveryPoint.id;
            return (
              <button
                key={dp.id}
                type="button"
                onClick={() => {
                  setDeliveryPoint(dp);
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
