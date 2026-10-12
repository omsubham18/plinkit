import React from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[44px] px-4 py-2 rounded-chip type-caption font-semibold flex items-center justify-center',
        'border transition-colors duration-state select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        selected
          ? 'bg-brand-soft text-brand border-brand-soft font-bold'
          : 'bg-surface text-ink-2 border-line hover:border-ink-3'
        ,
        className
      )}
    >
      {label}
    </button>
  );
};
