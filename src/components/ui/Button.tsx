import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    'h-12 px-5 rounded-button font-bold type-subtitle flex items-center justify-center transition-colors duration-state select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand text-surface hover:bg-brand-pressed active:bg-brand-pressed',
    secondary: 'border border-line bg-surface text-ink hover:bg-canvas active:bg-canvas',
    ghost: 'bg-transparent text-ink hover:bg-canvas active:bg-canvas',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin mr-2" size={20} />
      ) : null}
      {children}
    </button>
  );
};
