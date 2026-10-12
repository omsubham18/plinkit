import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '@/components/common/ProductCard';
import { Chip } from '@/components/ui/Chip';
import { CartBar } from '@/components/common/CartBar';
import { useToast } from '@/components/common/Toast';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/data/mockData';
import { Product } from '@/types';
import { ArrowLeft, Search } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();

  const currentCategory =
    MOCK_CATEGORIES.find((c) => c.slug === slug) || MOCK_CATEGORIES[0];

  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({
    p1: 2,
  });

  const subcategories = ['All', 'Chips', 'Noodles', 'Cookies', 'Beverages', 'Essentials'];

  // In-stock items first per SPEC section 3.2
  const sortedProducts = [...MOCK_PRODUCTS].sort((a, b) => {
    if (a.stock_qty <= 0 && b.stock_qty > 0) return 1;
    if (a.stock_qty > 0 && b.stock_qty <= 0) return -1;
    return 0;
  });

  const filteredProducts =
    selectedSubcategory === 'All'
      ? sortedProducts
      : sortedProducts.filter(
          (p) =>
            p.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase() ||
            p.name.toLowerCase().includes(selectedSubcategory.toLowerCase())
        );

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

      {/* Subcategory Chips Filter Row */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar border-b border-line/60 bg-surface">
        {subcategories.map((sub) => (
          <Chip
            key={sub}
            label={sub}
            selected={selectedSubcategory === sub}
            onClick={() => setSelectedSubcategory(sub)}
          />
        ))}
      </div>

      {/* Product Grid: 2 columns from 360 px per DESIGN.md */}
      <main className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="type-caption text-ink-2 font-medium">
            Showing {filteredProducts.length} items
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQty={cart[product.id] || 0}
              onAdd={handleAdd}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onSeeSimilar={(p) => showToast(`Finding alternatives for ${p.name}`)}
              onCapReached={showToast}
            />
          ))}
        </div>
      </main>

      {/* Floating Cart Bar */}
      <CartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        onViewCart={() => navigate('/cart')}
      />
    </div>
  );
};
