import React from 'react';
import { Product } from '@/types';
import { AddStepper } from './AddStepper';
import { PriceTag } from './PriceTag';
import { SkeletonProductCard } from '@/components/ui/Skeletons';
import { Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductCardProps {
  product: Product;
  cartQty?: number;
  onAdd?: (product: Product) => void;
  onIncrement?: (product: Product) => void;
  onDecrement?: (product: Product) => void;
  onSeeSimilar?: (product: Product) => void;
  onCapReached?: (reason: string) => void;
  onClick?: (product: Product) => void;
  isLoading?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQty = 0,
  onAdd,
  onIncrement,
  onDecrement,
  onSeeSimilar,
  onCapReached,
  onClick,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return <SkeletonProductCard className={className} />;
  }

  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = !isOutOfStock && product.stock_qty <= 3;
  const discountPercent =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const hasDiscountBadge = discountPercent >= 5;

  const handleCardClick = () => {
    onClick?.(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full bg-surface rounded-card border border-line p-3 flex flex-col justify-between',
        'relative transition-colors duration-state select-none cursor-pointer',
        className
      )}
    >
      <div>
        {/* Square Image Area (white background, contained with 8px inset) */}
        <div className="relative w-full aspect-square bg-surface rounded-image border border-line/40 p-2 flex items-center justify-center overflow-hidden mb-2">
          {/* Discount badge top left */}
          {hasDiscountBadge && !isOutOfStock && (
            <div className="absolute top-1.5 left-1.5 z-10 bg-brand-soft text-brand type-label px-1.5 py-0.5 rounded-sm shadow-xs font-bold">
              {discountPercent}% OFF
            </div>
          )}

          {/* Low stock pill indicator top right */}
          {isLowStock && (
            <div className="absolute top-1.5 right-1.5 z-10 bg-warning/10 text-warning type-caption font-semibold px-1.5 py-0.5 rounded-xs">
              Only {product.stock_qty} left
            </div>
          )}

          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={200}
              height={200}
              decoding="async"
              className={cn(
                'w-full h-full object-contain transition-opacity duration-state',
                isOutOfStock && 'opacity-50 grayscale-20'
              )}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-canvas/60 rounded-image text-ink-3">
              <Package size={32} strokeWidth={1.5} />
            </div>
          )}

          {/* Out of stock neutral overlay pill */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center p-2">
              <span className="bg-canvas border border-line text-ink-2 type-caption font-bold px-2.5 py-1 rounded-pill shadow-xs">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Size Label */}
        <div className="type-caption text-ink-2 font-medium mb-1 truncate">
          {product.size_label}
        </div>

        {/* Product Name Clamped to exactly 2 lines with fixed height 40px so bottoms align */}
        <h3 className="type-body font-semibold text-ink h-10 line-clamp-2 leading-5 mb-2 overflow-hidden text-ellipsis">
          {product.name}
        </h3>
      </div>

      {/* Bottom Pricing & Stepper Row */}
      <div className="pt-1 flex items-end justify-between min-h-[44px]">
        {/* Pricing */}
        <div className="flex flex-col justify-end">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="type-subtitle font-bold text-ink">
              <PriceTag amount={product.price} />
            </span>
            {product.mrp > product.price && (
              <span className="type-caption text-ink-2 line-through font-normal tabular-nums">
                <PriceTag amount={product.mrp} />
              </span>
            )}
          </div>
        </div>

        {/* Action Button or Out of stock resolution */}
        <div className="flex items-center justify-end">
          {isOutOfStock ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeeSimilar?.(product);
              }}
              className="min-h-[44px] px-2 type-caption font-bold text-brand hover:underline flex items-center gap-1 active:opacity-75 focus-visible:outline-none"
            >
              <Sparkles size={13} strokeWidth={2} />
              See similar
            </button>
          ) : (
            <AddStepper
              qty={cartQty}
              stockQty={product.stock_qty}
              maxQty={product.max_per_order || 5}
              onAdd={() => onAdd?.(product)}
              onIncrement={() => onIncrement?.(product)}
              onDecrement={() => onDecrement?.(product)}
              onCapReached={onCapReached}
            />
          )}
        </div>
      </div>
    </div>
  );
};
