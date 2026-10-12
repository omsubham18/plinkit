import React from 'react';
import { PriceTag } from './PriceTag';
import { formatPrice, cn } from '@/lib/utils';
import { Sparkles, Truck } from 'lucide-react';

export interface BillSummaryProps {
  itemsTotal: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  totalSavings?: number;
  className?: string;
}

export const BillSummary: React.FC<BillSummaryProps> = ({
  itemsTotal,
  deliveryFee,
  freeDeliveryThreshold = 299,
  totalSavings = 0,
  className,
}) => {
  const isFreeDelivery = itemsTotal >= freeDeliveryThreshold || deliveryFee === 0;
  const effectiveDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const grandTotal = itemsTotal + effectiveDeliveryFee;
  const amountNeededForFreeDelivery = freeDeliveryThreshold - itemsTotal;

  return (
    <div
      className={cn(
        'w-full bg-surface rounded-card border border-line p-4 flex flex-col gap-3',
        className
      )}
    >
      <h3 className="type-title text-ink font-bold pb-1 border-b border-line">
        Bill details
      </h3>

      {/* Free delivery nudge banner */}
      {itemsTotal > 0 && (
        <div
          className={cn(
            'px-3 py-2 rounded-button type-caption font-semibold flex items-center gap-2',
            isFreeDelivery
              ? 'bg-success/10 text-success'
              : 'bg-brand-soft text-brand'
          )}
        >
          {isFreeDelivery ? (
            <>
              <Sparkles size={16} strokeWidth={2} />
              <span>You unlocked free delivery on this order</span>
            </>
          ) : (
            <>
              <Truck size={16} strokeWidth={2} />
              <span>
                Add {formatPrice(amountNeededForFreeDelivery)} more for free delivery
              </span>
            </>
          )}
        </div>
      )}

      {/* Items total row */}
      <div className="flex items-center justify-between type-body text-ink-2">
        <span>Items total</span>
        <span className="text-ink font-semibold">
          <PriceTag amount={itemsTotal} />
        </span>
      </div>

      {/* Delivery fee row */}
      <div className="flex items-center justify-between type-body text-ink-2">
        <span>Delivery fee</span>
        {isFreeDelivery ? (
          <span className="text-success font-bold uppercase type-caption tracking-wide">
            Free
          </span>
        ) : (
          <span className="text-ink font-semibold">
            <PriceTag amount={effectiveDeliveryFee} />
          </span>
        )}
      </div>

      {/* Savings line in --success if applicable */}
      {totalSavings > 0 && (
        <div className="flex items-center justify-between type-caption font-bold text-success bg-success/5 p-2 rounded-button">
          <span>Total savings</span>
          <span>−<PriceTag amount={totalSavings} /></span>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-line my-0.5" />

      {/* Grand Total */}
      <div className="flex items-center justify-between type-subtitle font-bold text-ink">
        <span>To pay</span>
        <span className="type-title text-brand">
          <PriceTag amount={grandTotal} />
        </span>
      </div>
    </div>
  );
};
