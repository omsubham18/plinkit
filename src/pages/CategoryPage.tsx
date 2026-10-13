import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '@/components/common/ProductCard';
import { ProductSheet } from '@/components/common/ProductSheet';
import { Chip } from '@/components/ui/Chip';
import { CartBar } from '@/components/common/CartBar';
import { SkeletonProductCard } from '@/components/ui/Skeletons';
import { EmptyState } from '@/components/common/FeedbackStates';
import { useToast } from '@/components/common/Toast';
import { useCatalogue } from '@/lib/catalogue';
import { useCartStore, getCartSummary } from '@/lib/cartStore';
import { Product } from '@/types';
import { ArrowLeft, Search, PackageOpen } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();

  const { data: catalogue, isLoading } = useCatalogue();
  const categories = useMemo(() => catalogue?.categories || [], [catalogue?.categories]);
  const allProducts = useMemo(() => catalogue?.products || [], [catalogue?.products]);

  const { items, increment, decrement, reconcile } = useCartStore();

  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedProductForSheet, setSelectedProductForSheet] = useState<Product | null>(null);

  // Reconcile cart whenever products update
  useEffect(() => {
    if (allProducts.length > 0) {
      const notices = reconcile(allProducts);
      if (notices.length > 0) {
        showToast(notices[0]);
      }
    }
  }, [allProducts, reconcile, showToast]);

  const currentCategory = useMemo(
    () => categories.find((c) => c.slug === slug),
    [categories, slug]
  );

  // Products belonging to this category
  const categoryProducts = useMemo(() => {
    if (!currentCategory) return [];
    return allProducts.filter((p) => p.category_id === currentCategory.id);
  }, [allProducts, currentCategory]);

  // Distinct subcategories when present
  const subcategories = useMemo(() => {
    const subs = new Set<string>();
    for (const p of categoryProducts) {
      if (p.subcategory && p.subcategory.trim()) {
        subs.add(p.subcategory.trim());
      }
    }
    if (subs.size === 0) return [];
    return ['All', ...Array.from(subs)];
  }, [categoryProducts]);

  // Reset selected subcategory if slug changes
  useEffect(() => {
    setSelectedSubcategory('All');
  }, [slug]);

  // Filtered by subcategory and sorted: in-stock items first
  const displayProducts = useMemo(() => {
    let filtered = categoryProducts;
    if (selectedSubcategory !== 'All') {
      filtered = filtered.filter(
        (p) => p.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    return [...filtered].sort((a, b) => {
      const aInStock = a.stock_qty > 0 ? 1 : 0;
      const bInStock = b.stock_qty > 0 ? 1 : 0;
      if (aInStock !== bInStock) {
        return bInStock - aInStock; // in-stock first
      }
      return a.name.localeCompare(b.name);
    });
  }, [categoryProducts, selectedSubcategory]);

  const { totalCount, itemsTotal } = getCartSummary(items, allProducts);

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex flex-col w-full pb-8">
        <header className="sticky top-0 z-40 bg-surface border-b border-line px-3 py-2 flex items-center justify-between">
          <div className="h-6 w-32 bg-line/60 rounded animate-pulse" />
        </header>
        <div className="grid grid-cols-2 gap-3 p-4">
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="p-4 pt-12">
        <EmptyState
          icon={<PackageOpen size={36} strokeWidth={1.5} className="text-ink-2" />}
          message="Category not found."
          actionLabel="Return to home"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Category Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-line px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 className="type-title text-ink font-bold tracking-tight">
            {currentCategory.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/search')}
          aria-label="Search within category"
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line transition-colors"
        >
          <Search size={20} strokeWidth={1.75} />
        </button>
      </header>

      {/* Subcategory Chips Filter Row when present */}
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-line/60 bg-surface sticky top-[57px] z-30">
          {subcategories.map((sub) => (
            <Chip
              key={sub}
              label={sub}
              selected={selectedSubcategory === sub}
              onClick={() => setSelectedSubcategory(sub)}
            />
          ))}
        </div>
      )}

      {/* Product Grid: 2 columns from 360px per DESIGN.md */}
      <section className="p-4">
        {displayProducts.length === 0 ? (
          <div className="pt-8">
            <EmptyState
              icon={<PackageOpen size={36} strokeWidth={1.5} className="text-ink-2" />}
              message="No products found in this category."
              actionLabel="Explore other categories"
              onAction={() => navigate('/')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQty={items[product.id] || 0}
                onAdd={(prod) => increment(prod, showToast)}
                onIncrement={(prod) => increment(prod, showToast)}
                onDecrement={(prod) => decrement(prod.id)}
                onCapReached={showToast}
                onClick={(prod) => setSelectedProductForSheet(prod)}
                onSeeSimilar={(prod) => setSelectedProductForSheet(prod)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Cart Bar */}
      <CartBar
        totalItems={totalCount}
        totalPrice={itemsTotal}
        onViewCart={() => navigate('/cart')}
      />

      {/* Product Sheet */}
      <ProductSheet
        product={selectedProductForSheet}
        allProducts={allProducts}
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
    </div>
  );
};
