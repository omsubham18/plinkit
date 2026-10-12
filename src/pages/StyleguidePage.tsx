import React, { useState } from 'react';
import { ProductCard } from '@/components/common/ProductCard';
import { AddStepper } from '@/components/common/AddStepper';
import { ProductRail } from '@/components/common/ProductRail';
import { CategoryTile } from '@/components/common/CategoryTile';
import { AppHeader } from '@/components/common/AppHeader';
import { SearchField } from '@/components/common/SearchField';
import { BillSummary } from '@/components/common/BillSummary';
import { StatusTimeline } from '@/components/common/StatusTimeline';
import { BottomSheet } from '@/components/common/BottomSheet';
import { CartBar } from '@/components/common/CartBar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/common/Toast';
import { EmptyState, ErrorState } from '@/components/common/FeedbackStates';
import {
  SkeletonProductCard,
  SkeletonCategoryTile,
  SkeletonProductRow,
  SkeletonBillSummary,
} from '@/components/ui/Skeletons';
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_TIMELINE_STEPS,
  MOCK_DELIVERY_POINTS,
} from '@/data/mockData';
import { Product } from '@/types';
import { Layers } from 'lucide-react';

export const StyleguidePage: React.FC = () => {
  const { showToast } = useToast();

  // Interactive styleguide state
  const [activeTab, setActiveTab] = useState<'components' | 'mock-home' | 'mock-category'>('components');
  const [stepperQty, setStepperQty] = useState(2);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState('Chips');
  const [cart, setCart] = useState<Record<string, number>>({
    p1: 1,
    p2: 2,
    p3: 1,
  });

  // Calculate live cart total
  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === id);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  const handleAddToCart = (product: Product) => {
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

  // Specific state mock products for the component matrix
  const defaultProduct = MOCK_PRODUCTS[0]; // p1: chips
  const lowStockProduct = MOCK_PRODUCTS[3]; // p4: peanuts (stock: 2)
  const outOfStockProduct = MOCK_PRODUCTS[5]; // p6: coffee (stock: 0)
  const longNameProduct: Product = {
    ...MOCK_PRODUCTS[10],
    id: 'p-long',
    name: 'A5 Ruled Wirebound Spiral Notebook with Micro-perforated Pages and Waterproof Frosted Poly Cover with Smooth Ball Pen',
  };
  const noImageProduct: Product = {
    ...MOCK_PRODUCTS[2],
    id: 'p-no-img',
    name: 'Artisan Bakery Dark Chocolate Butter Crunchies',
    image_url: undefined,
  };

  return (
    <div className="w-full flex flex-col pb-28">
      {/* Styleguide Header */}
      <div className="bg-surface border-b border-line p-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="type-label text-brand bg-brand-soft px-2 py-0.5 rounded-sm">
              Design System v1
            </span>
            <h1 className="type-title text-ink font-bold mt-1">Plinkit Styleguide</h1>
          </div>
          <span className="type-caption text-ink-2 font-mono">390 px Mobile View</span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex gap-1.5 p-1 bg-canvas rounded-button border border-line">
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-1.5 text-center type-caption font-bold rounded-input transition-colors ${
              activeTab === 'components'
                ? 'bg-surface text-brand shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Components Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mock-home')}
            className={`flex-1 py-1.5 text-center type-caption font-bold rounded-input transition-colors ${
              activeTab === 'mock-home'
                ? 'bg-surface text-brand shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Mock Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mock-category')}
            className={`flex-1 py-1.5 text-center type-caption font-bold rounded-input transition-colors ${
              activeTab === 'mock-category'
                ? 'bg-surface text-brand shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Mock Category
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COMPONENT & STATE MATRIX */}
      {/* ======================================================== */}
      {activeTab === 'components' && (
        <div className="p-4 space-y-8">
          {/* SECTION: PRODUCT CARD STATES */}
          <section>
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-line">
              <Layers size={18} className="text-brand" />
              <h2 className="type-title text-ink font-bold">ProductCard States</h2>
            </div>
            <p className="type-caption text-ink-2 mb-4">
              Shows every ProductCard state in 2-column grid. Clamped 2-line title ensures perfect row alignment.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* State 1: Default in-stock */}
              <div>
                <div className="type-label text-ink-2 mb-1.5">1. Default (in stock)</div>
                <ProductCard
                  product={defaultProduct}
                  cartQty={0}
                  onAdd={handleAddToCart}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onCapReached={showToast}
                />
              </div>

              {/* State 2: In Cart */}
              <div>
                <div className="type-label text-brand mb-1.5">2. In Cart (Qty 2)</div>
                <ProductCard
                  product={MOCK_PRODUCTS[1]}
                  cartQty={2}
                  onAdd={handleAddToCart}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onCapReached={showToast}
                />
              </div>

              {/* State 3: Low Stock */}
              <div>
                <div className="type-label text-warning mb-1.5">3. Low Stock (&lt;= 3)</div>
                <ProductCard
                  product={lowStockProduct}
                  cartQty={0}
                  onAdd={handleAddToCart}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onCapReached={showToast}
                />
              </div>

              {/* State 4: Out of Stock */}
              <div>
                <div className="type-label text-ink-3 mb-1.5">4. Out of Stock</div>
                <ProductCard
                  product={outOfStockProduct}
                  cartQty={0}
                  onSeeSimilar={() => showToast('Browsing in-stock alternatives')}
                />
              </div>

              {/* State 5: Long Product Name (alignment test) */}
              <div>
                <div className="type-label text-ink-2 mb-1.5">5. Long Name (Clamped)</div>
                <ProductCard
                  product={longNameProduct}
                  cartQty={1}
                  onAdd={handleAddToCart}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onCapReached={showToast}
                />
              </div>

              {/* State 6: No Image Placeholder */}
              <div>
                <div className="type-label text-ink-2 mb-1.5">6. No Image Fallback</div>
                <ProductCard
                  product={noImageProduct}
                  cartQty={0}
                  onAdd={handleAddToCart}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onCapReached={showToast}
                />
              </div>

              {/* State 7: Loading Skeleton */}
              <div className="col-span-2 sm:col-span-1">
                <div className="type-label text-ink-3 mb-1.5">7. Loading (Skeleton)</div>
                <SkeletonProductCard />
              </div>
            </div>
          </section>

          {/* SECTION: ADD STEPPER */}
          <section className="bg-surface p-4 rounded-card border border-line">
            <h3 className="type-subtitle text-ink font-bold mb-2">AddStepper States</h3>
            <p className="type-caption text-ink-2 mb-4">
              Identical 36x76px footprint between outline ADD and solid stepper so nothing shifts on tap.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="type-caption text-ink-2">Default</span>
                <AddStepper
                  qty={0}
                  onAdd={() => setStepperQty(1)}
                  onIncrement={() => {}}
                  onDecrement={() => {}}
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="type-caption text-ink-2">In Cart</span>
                <AddStepper
                  qty={stepperQty}
                  onAdd={() => setStepperQty(1)}
                  onIncrement={() => setStepperQty((q) => q + 1)}
                  onDecrement={() => setStepperQty((q) => Math.max(0, q - 1))}
                  onCapReached={showToast}
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="type-caption text-ink-2">Cap Reached (Disabled +)</span>
                <AddStepper
                  qty={5}
                  maxQty={5}
                  onAdd={() => {}}
                  onIncrement={() => {}}
                  onDecrement={() => {}}
                  onCapReached={showToast}
                />
              </div>
            </div>
          </section>

          {/* SECTION: BUTTONS & CHIPS */}
          <section className="bg-surface p-4 rounded-card border border-line space-y-4">
            <h3 className="type-subtitle text-ink font-bold">Button & Chip Primitives</h3>
            <div className="flex flex-col gap-2.5">
              <Button variant="primary" onClick={() => showToast('Primary button clicked')}>
                Primary Action (48 px)
              </Button>
              <Button variant="secondary" onClick={() => showToast('Secondary button clicked')}>
                Secondary Action
              </Button>
              <Button variant="ghost" onClick={() => showToast('Ghost button clicked')}>
                Ghost Action
              </Button>
              <Button variant="primary" isLoading>
                Loading Action
              </Button>
            </div>

            <div className="pt-2">
              <div className="type-caption font-bold text-ink-2 mb-2">Pill Filter Chips</div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Chips', 'Drinks', 'Cookies', 'Essentials'].map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    selected={selectedChip === chip}
                    onClick={() => setSelectedChip(chip)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* SECTION: BILL SUMMARY */}
          <section className="space-y-4">
            <h3 className="type-subtitle text-ink font-bold">BillSummary Component</h3>
            <BillSummary
              itemsTotal={245}
              deliveryFee={15}
              freeDeliveryThreshold={299}
              totalSavings={35}
            />
            <BillSummary
              itemsTotal={350}
              deliveryFee={0}
              freeDeliveryThreshold={299}
              totalSavings={50}
            />
          </section>

          {/* SECTION: ORDER STATUS TIMELINE */}
          <section className="bg-surface p-4 rounded-card border border-line">
            <h3 className="type-subtitle text-ink font-bold mb-2">StatusTimeline Component</h3>
            <StatusTimeline steps={MOCK_TIMELINE_STEPS} />
          </section>

          {/* SECTION: INTERACTIVE TRIGGERS */}
          <section className="bg-surface p-4 rounded-card border border-line space-y-3">
            <h3 className="type-subtitle text-ink font-bold">Interactive Triggers</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setIsSheetOpen(true)}
              >
                Open BottomSheet
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast('2.5s notification toast above cart bar')}
              >
                Trigger Toast
              </Button>
            </div>
          </section>

          {/* SECTION: EMPTY & ERROR STATES */}
          <section className="space-y-3">
            <h3 className="type-subtitle text-ink font-bold">Feedback States</h3>
            <EmptyState
              message="No products found in this category."
              actionLabel="Browse all"
              onAction={() => showToast('Navigating to all products')}
            />
            <ErrorState
              message="Failed to load campus catalogue. Check your network."
              onRetry={() => showToast('Retrying request')}
            />
          </section>

          {/* SECTION: SKELETONS SUITE */}
          <section className="space-y-3">
            <h3 className="type-subtitle text-ink font-bold">Skeletons Suite</h3>
            <div className="grid grid-cols-4 gap-2.5">
              <SkeletonCategoryTile />
              <SkeletonCategoryTile />
              <SkeletonCategoryTile />
              <SkeletonCategoryTile />
            </div>
            <SkeletonProductRow />
            <SkeletonBillSummary />
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FULLY COMPOSED MOCK HOME SCREEN */}
      {/* ======================================================== */}
      {activeTab === 'mock-home' && (
        <div className="flex flex-col w-full">
          {/* Header */}
          <AppHeader
            deliveryEta={12}
            deliveryPointName="Hostel 3 Gate"
            onChangeDeliveryPoint={() => setIsSheetOpen(true)}
            onAccountClick={() => showToast('Account clicked')}
          />

          {/* Search Field */}
          <div className="p-4 pb-2">
            <SearchField onClick={() => showToast('Opening search...')} readOnly />
          </div>

          {/* 4-Column Category Grid */}
          <section className="px-4 py-3">
            <h2 className="type-title text-ink font-bold mb-3">Explore categories</h2>
            <div className="grid grid-cols-4 gap-2.5">
              {MOCK_CATEGORIES.map((c) => (
                <CategoryTile
                  key={c.id}
                  category={c}
                  onClick={() => {
                    setActiveTab('mock-category');
                    showToast(`Viewing ${c.name}`);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Product Rails */}
          <ProductRail
            title="Late night cravings"
            products={MOCK_PRODUCTS.filter((p) => p.rail === 'late_night')}
            cartItems={cart}
            onAdd={handleAddToCart}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onSeeSimilar={() => showToast('Finding similar products')}
            onCapReached={showToast}
          />

          <ProductRail
            title="Campus bestsellers"
            products={MOCK_PRODUCTS.filter((p) => p.rail === 'bestsellers')}
            cartItems={cart}
            onAdd={handleAddToCart}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onSeeSimilar={() => showToast('Finding similar products')}
            onCapReached={showToast}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: FULLY COMPOSED MOCK CATEGORY SCREEN */}
      {/* ======================================================== */}
      {activeTab === 'mock-category' && (
        <div className="flex flex-col w-full">
          {/* Header */}
          <div className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between sticky top-[69px] z-30">
            <h2 className="type-title text-ink font-bold">All Products (12)</h2>
            <span className="type-caption text-ink-2 font-medium">In-stock first</span>
          </div>

          {/* Subcategory Chips */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar bg-surface border-b border-line/60">
            {['All', 'Chips', 'Noodles', 'Cookies', 'Drinks', 'Care'].map((c) => (
              <Chip
                key={c}
                label={c}
                selected={selectedChip === c}
                onClick={() => setSelectedChip(c)}
              />
            ))}
          </div>

          {/* 2-Column Product Grid */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {MOCK_PRODUCTS.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                cartQty={cart[prod.id] || 0}
                onAdd={handleAddToCart}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSeeSimilar={() => showToast(`Finding alternatives for ${prod.name}`)}
                onCapReached={showToast}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interactive BottomSheet Demo */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Delivery point"
      >
        <div className="flex flex-col gap-2">
          {MOCK_DELIVERY_POINTS.map((dp) => (
            <button
              key={dp.id}
              type="button"
              onClick={() => {
                setIsSheetOpen(false);
                showToast(`Delivering to ${dp.name}`);
              }}
              className="p-3 rounded-card border border-line flex items-center justify-between text-left hover:bg-canvas"
            >
              <div>
                <div className="type-body font-bold text-ink">{dp.name}</div>
                <div className="type-caption text-ink-2">
                  {dp.campus} · {dp.eta_minutes} mins
                </div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Floating CartBar at bottom */}
      <CartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        onViewCart={() => showToast(`Opening cart: ${totalItems} items, ₹${totalPrice}`)}
      />
    </div>
  );
};
