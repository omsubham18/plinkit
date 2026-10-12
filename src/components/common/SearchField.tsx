import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchFieldProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onClick?: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value = '',
  onChange,
  onClear,
  onFocus,
  onClick,
  autoFocus = false,
  readOnly = false,
  placeholder = 'Search snacks, drinks, essentials',
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full h-12 px-3.5 rounded-input bg-canvas border border-line/60 flex items-center gap-2.5',
        'transition-all duration-state focus-within:bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        className
      )}
    >
      <Search size={20} strokeWidth={1.75} className="text-ink-2 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        autoFocus={autoFocus}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full bg-transparent type-body text-ink placeholder:text-ink-3 focus:outline-none"
      />
      {value && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="Clear search"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-3 hover:text-ink transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};
