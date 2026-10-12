import React from 'react';
import { ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppHeaderProps {
  deliveryEta?: number;
  deliveryPointName?: string;
  isStoreOpen?: boolean;
  opensAtText?: string;
  onChangeDeliveryPoint?: () => void;
  onAccountClick?: () => void;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  deliveryEta = 12,
  deliveryPointName = 'Hostel 3 Gate',
  isStoreOpen = true,
  opensAtText = '6:00 pm',
  onChangeDeliveryPoint,
  onAccountClick,
  className,
}) => {
  return (
    <header
      className={cn(
        'w-full bg-surface border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-40',
        className
      )}
    >
      {/* Left: ETA / Status + Delivery Point Location */}
      <div className="flex flex-col justify-center">
        {/* Line 1: Delivery Status */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full inline-block shrink-0',
              isStoreOpen ? 'bg-success animate-pulse' : 'bg-warning'
            )}
            aria-hidden="true"
          />
          <h1 className="type-title text-ink font-bold tracking-tight">
            {isStoreOpen
              ? `Delivery in ${deliveryEta} min`
              : `Closed · Opens ${opensAtText}`}
          </h1>
        </div>

        {/* Line 2: Delivery Point Selector */}
        <button
          type="button"
          onClick={onChangeDeliveryPoint}
          className="flex items-center gap-1 text-ink-2 hover:text-ink type-caption font-semibold mt-0.5 text-left active:opacity-75 focus-visible:outline-none"
        >
          <span className="truncate max-w-[240px]">{deliveryPointName}</span>
          <ChevronDown size={14} strokeWidth={2.2} className="text-ink-2 shrink-0" />
        </button>
      </div>

      {/* Right: Account Icon Button (min 44x44 px tap target) */}
      <button
        type="button"
        onClick={onAccountClick}
        aria-label="Account and profile"
        className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
      >
        <div className="w-9 h-9 rounded-full bg-canvas border border-line flex items-center justify-center">
          <User size={20} strokeWidth={1.75} className="text-ink" />
        </div>
      </button>
    </header>
  );
};
