import React from 'react';
import { Product } from '@/types';
import { BottomSheet } from './BottomSheet';
import { PriceTag } from './PriceTag';
import { AddStepper } from './AddStepper';
import { ProductRail } from './ProductRail';
import { getSimilarProducts } from '@/lib/catalogue';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductSheetProps {
  product: Product | null;
  allProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  cartQty: number;
  cartItems: Record<string, number>;
  onAdd: (product: Product) => void;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
  onCapReached?: (reason: string) => void;
  onSelectSimilarProduct?: (product: Product) => void;
}

export const ProductSheet: React.FC<ProductSheetProps> = ({
  product,
  allProducts,
  isOpen,
  onClose,
  cartQty,
  cartItems,
  onAdd,
  onIncrement,
  onDecrement,
  onCapReached,
  onSelectSimilarProduct,
}) => {
  if (!product) return null;

  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = !isOutOfStock && product.stock_qty <= 3;
  const discountPercent =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const hasDiscountBadge = discountPercent >= 5;

  const similarProducts = getSimilarProducts(product, allProducts);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={product.name}>
      <div className="flex flex-col gap-4 pb-6">
        {/* Product Hero Image Area */}
        <div className="relative w-full aspect-square max-h-[300px] bg-surface rounded-card border border-line/60 p-4 flex items-center justify-center overflow-hidden mx-auto">
          {hasDiscountBadge && !isOutOfStock && (
            <div className="absolute top-3 left-3 z-10 bg-brand-soft text-brand type-label px-2 py-0.5 rounded-sm shadow-xs font-bold">
              {discountPercent}% OFF
            </div>
          )}

          {isLowStock && (
            <div className="absolute top-3 right-3 z-10 bg-warning/10 text-warning type-caption font-semibold px-2 py-0.5 rounded-xs">
              Only {product.stock_qty} left
            </div>
          )}

          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={400}
              height={400}
              decoding="async"
              className={cn(
                'w-full h-full object-contain transition-opacity duration-state aspect-square',
                isOutOfStock && 'opacity-50 grayscale-20'
              )}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-canvas/40 rounded-image text-ink-3">
              <Package size={48} strokeWidth={1.5} />
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center p-3">
              <span className="bg-canvas border border-line text-ink-2 type-caption font-bold px-3 py-1.5 rounded-pill shadow-xs">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Pricing, Name & AddStepper Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex-1">
            <div className="type-caption text-ink-2 font-medium mb-0.5">
              {product.size_label}
            </div>
            <h2 className="type-title text-ink font-bold tracking-tight">
              {product.name}
            </h2>
            {product.brand && (
              <div className="type-caption text-ink-2 font-semibold mt-0.5">
                by {product.brand}
              </div>
            )}

            <div className="flex items-baseline gap-2 mt-2">
              <span className="type-title font-bold text-ink">
                <PriceTag amount={product.price} />
              </span>
              {product.mrp > product.price && (
                <span className="type-caption text-ink-2 line-through font-normal">
                  <PriceTag amount={product.mrp} />
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 pt-1">
            <AddStepper
              qty={cartQty}
              stockQty={product.stock_qty}
              maxQty={product.max_per_order ?? 5}
              disabled={isOutOfStock}
              onAdd={() => onAdd(product)}
              onIncrement={() => onIncrement(product)}
              onDecrement={() => onDecrement(product)}
              onCapReached={onCapReached}
            />
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="border-t border-line/60 pt-3">
            <h4 className="type-body font-bold text-ink mb-1">Product details</h4>
            <p className="type-body text-ink-2 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Legal & Statutory Details per SPEC Section 13 */}
        <div className="border-t border-line/60 pt-3 flex flex-col gap-1 text-ink-2 type-caption">
          {product.country_of_origin && (
            <div>
              <span className="font-semibold text-ink">Country of origin:</span>{' '}
              {product.country_of_origin}
            </div>
          )}
          {product.manufacturer && (
            <div>
              <span className="font-semibold text-ink">Marketed & Packed by:</span>{' '}
              {product.manufacturer}
            </div>
          )}
          <div>
            <span className="font-semibold text-ink">Net Quantity:</span>{' '}
            {product.size_label}
          </div>
        </div>

        {/* Similar Items per SPEC Section 9 */}
        {similarProducts.length > 0 && (
          <div className="border-t border-line/60 pt-3 -mx-4">
            <ProductRail
              title="Similar items in stock"
              products={similarProducts}
              cartItems={cartItems}
              onAdd={onAdd}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onCapReached={onCapReached}
              onClickProduct={(simProd) => onSelectSimilarProduct?.(simProd)}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
