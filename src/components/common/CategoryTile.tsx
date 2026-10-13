import React from 'react';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

export interface CategoryTileProps {
  category: Category;
  onClick?: () => void;
  className?: string;
}

const TINT_CLASSES: Record<number, string> = {
  1: 'bg-[var(--tint-1)]',
  2: 'bg-[var(--tint-2)]',
  3: 'bg-[var(--tint-3)]',
  4: 'bg-[var(--tint-4)]',
  5: 'bg-[var(--tint-5)]',
  6: 'bg-[var(--tint-6)]',
  7: 'bg-[var(--tint-7)]',
  8: 'bg-[var(--tint-8)]',
};

export const CategoryTile: React.FC<CategoryTileProps> = ({
  category,
  onClick,
  className,
}) => {
  const tintClass = TINT_CLASSES[category.tintIndex] || 'bg-[var(--tint-1)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full aspect-square rounded-card p-2 flex flex-col items-center justify-between',
        'border border-line/60 transition-transform duration-state active:scale-[0.97] select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        tintClass,
        className
      )}
    >
      <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            width={56}
            height={56}
            decoding="async"
            className="w-full h-full object-contain max-h-[56px] transition-transform duration-state group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface/80 flex items-center justify-center text-ink-2 type-title">
            {category.name.charAt(0)}
          </div>
        )}
      </div>

      <span className="type-caption font-semibold text-ink text-center line-clamp-2 w-full px-0.5 leading-tight">
        {category.name}
      </span>
    </button>
  );
};
