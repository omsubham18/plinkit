import React from 'react';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';

export interface CartBarProps {
  totalItems: number;
  totalPrice: number;
  onViewCart?: () => void;
  className?: string;
}

export const CartBar: React.FC<CartBarProps> = ({
  totalItems,
  totalPrice,
  onViewCart,
  className,
}) => {
  const isVisible = totalItems > 0;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[448px]',
        'transition-all duration-state ease-out pointer-events-none',
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-12 opacity-0 pointer-events-none',
        className
      )}
    >
      <button
        type="button"
        onClick={onViewCart}
        aria-label={`View cart: ${totalItems} items, total ${formatPrice(totalPrice)}`}
        className={cn(
          'w-full h-14 px-4 rounded-button bg-brand text-surface shadow-floating',
          'flex items-center justify-between transition-transform duration-state active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
        )}
      >
        {/* Left: Item count & Total price */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface/15 flex items-center justify-center">
            <ShoppingBag size={18} strokeWidth={2.2} className="text-surface" />
          </div>
          <span className="type-subtitle font-bold text-surface tabular-nums">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} · {formatPrice(totalPrice)}
          </span>
        </div>

        {/* Right: View cart with chevron */}
        <div className="flex items-center gap-1 type-body font-bold text-surface">
          <span>View cart</span>
          <ChevronRight size={18} strokeWidth={2.2} />
        </div>
      </button>
    </div>
  );
};
