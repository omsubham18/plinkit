import React from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductRailProps {
  title: string;
  products: Product[];
  cartItems?: Record<string, number>;
  onSeeAll?: () => void;
  onAdd?: (product: Product) => void;
  onIncrement?: (product: Product) => void;
  onDecrement?: (product: Product) => void;
  onSeeSimilar?: (product: Product) => void;
  onCapReached?: (reason: string) => void;
  onClickProduct?: (product: Product) => void;
  className?: string;
}

export const ProductRail: React.FC<ProductRailProps> = ({
  title,
  products,
  cartItems = {},
  onSeeAll,
  onAdd,
  onIncrement,
  onDecrement,
  onSeeSimilar,
  onCapReached,
  onClickProduct,
  className,
}) => {
  return (
    <section className={cn('py-3', className)}>
      {/* Rail Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h2 className="type-title text-ink font-bold tracking-tight">{title}</h2>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="min-h-[44px] flex items-center gap-0.5 type-caption font-bold text-brand hover:underline focus-visible:outline-none"
          >
            <span>See all</span>
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Snap Scroll Container */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2 no-scrollbar scroll-smooth">
        {products.map((product) => (
          <div key={product.id} className="w-[140px] shrink-0 snap-start flex">
            <ProductCard
              product={product}
              cartQty={cartItems[product.id] || 0}
              onAdd={onAdd}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onSeeSimilar={onSeeSimilar}
              onCapReached={onCapReached}
              onClick={onClickProduct}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
