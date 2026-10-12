import React from 'react';
import { cn } from '@/lib/utils';

export const SkeletonProductCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full bg-surface rounded-card border border-line p-3 flex flex-col justify-between select-none',
        className
      )}
    >
      <div>
        {/* Square image area */}
        <div className="w-full aspect-square bg-canvas rounded-image animate-pulse mb-2.5" />
        {/* Size label */}
        <div className="w-12 h-3.5 bg-canvas rounded animate-pulse mb-1.5" />
        {/* Product name clamped to 2 lines height 40px */}
        <div className="h-10 flex flex-col justify-start gap-1 mb-2">
          <div className="w-full h-3.5 bg-canvas rounded animate-pulse" />
          <div className="w-3/4 h-3.5 bg-canvas rounded animate-pulse" />
        </div>
      </div>
      {/* Price and stepper row */}
      <div className="flex items-center justify-between pt-1">
        <div className="w-14 h-5 bg-canvas rounded animate-pulse" />
        <div className="w-[76px] h-9 bg-canvas rounded-button animate-pulse" />
      </div>
    </div>
  );
};

export const SkeletonCategoryTile: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full aspect-square rounded-card border border-line p-2 flex flex-col items-center justify-between bg-canvas/60 animate-pulse',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-canvas animate-pulse mt-1" />
      <div className="w-12 h-3 bg-canvas rounded animate-pulse mb-1" />
    </div>
  );
};

export const SkeletonProductRow: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between p-3 bg-surface rounded-card border border-line',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-image bg-canvas animate-pulse" />
        <div className="flex flex-col gap-1.5">
          <div className="w-28 h-3.5 bg-canvas rounded animate-pulse" />
          <div className="w-16 h-3 bg-canvas rounded animate-pulse" />
        </div>
      </div>
      <div className="w-16 h-8 bg-canvas rounded-button animate-pulse" />
    </div>
  );
};

export const SkeletonBillSummary: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full p-4 rounded-card bg-surface border border-line flex flex-col gap-3',
        className
      )}
    >
      <div className="flex justify-between">
        <div className="w-20 h-4 bg-canvas rounded animate-pulse" />
        <div className="w-12 h-4 bg-canvas rounded animate-pulse" />
      </div>
      <div className="flex justify-between">
        <div className="w-24 h-4 bg-canvas rounded animate-pulse" />
        <div className="w-10 h-4 bg-canvas rounded animate-pulse" />
      </div>
      <div className="h-px bg-line my-1" />
      <div className="flex justify-between">
        <div className="w-16 h-5 bg-canvas rounded animate-pulse" />
        <div className="w-16 h-5 bg-canvas rounded animate-pulse" />
      </div>
    </div>
  );
};
