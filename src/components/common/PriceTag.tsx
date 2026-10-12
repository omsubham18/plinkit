import React from 'react';
import { cn, formatPrice } from '@/lib/utils';

export interface PriceTagProps {
  amount: number;
  className?: string;
}

export const PriceTag: React.FC<PriceTagProps> = ({ amount, className }) => {
  return (
    <span className={cn('tabular-nums font-semibold', className)}>
      {formatPrice(amount)}
    </span>
  );
};
