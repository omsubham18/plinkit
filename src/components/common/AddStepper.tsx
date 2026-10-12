import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddStepperProps {
  qty: number;
  maxQty?: number;
  stockQty?: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onCapReached?: (message: string) => void;
  className?: string;
  disabled?: boolean;
}

export const AddStepper: React.FC<AddStepperProps> = ({
  qty,
  maxQty = 5,
  stockQty,
  onAdd,
  onIncrement,
  onDecrement,
  onCapReached,
  className,
  disabled = false,
}) => {
  const isCapped =
    (stockQty !== undefined && qty >= stockQty) || (maxQty !== undefined && qty >= maxQty);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCapped) {
      const reason =
        stockQty !== undefined && qty >= stockQty
          ? `Only ${stockQty} available in stock`
          : `Maximum order limit is ${maxQty}`;
      onCapReached?.(reason);
      return;
    }
    onIncrement();
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDecrement();
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (stockQty !== undefined && stockQty <= 0) {
      onCapReached?.('Item is currently out of stock');
      return;
    }
    onAdd();
  };

  if (qty <= 0) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        {/* Ensures tap target is at least 44x44 px */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          aria-label="Add item to cart"
          className={cn(
            'h-9 min-w-[76px] px-3.5 rounded-button border border-brand bg-surface text-brand',
            'type-subtitle font-bold text-center flex items-center justify-center tracking-wide',
            'transition-colors duration-state active:bg-brand-soft select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
            disabled && 'opacity-50 cursor-not-allowed border-ink-3 text-ink-3'
          )}
        >
          ADD
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div
        className={cn(
          'h-9 min-w-[76px] px-1 rounded-button bg-brand text-surface',
          'flex items-center justify-between shadow-sm select-none transition-colors duration-state',
          'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-1'
        )}
      >
        <button
          type="button"
          onClick={handleDecrement}
          aria-label="Decrease quantity"
          className="w-7 h-7 flex items-center justify-center text-surface active:opacity-75 transition-opacity"
        >
          <Minus size={16} strokeWidth={2.2} />
        </button>

        <span className="type-subtitle font-bold text-surface tabular-nums px-1 text-center min-w-[18px]">
          {qty}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={isCapped}
          aria-label="Increase quantity"
          className={cn(
            'w-7 h-7 flex items-center justify-center text-surface active:opacity-75 transition-opacity',
            isCapped && 'opacity-40 cursor-not-allowed'
          )}
        >
          <Plus size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
