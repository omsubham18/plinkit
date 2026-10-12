import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageSearch size={36} strokeWidth={1.75} className="text-ink-3" />,
  message,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-surface rounded-card border border-line',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="type-body text-ink-2 max-w-[260px] mb-6">
        {message}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} className="min-w-[140px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong while loading this data.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-surface rounded-card border border-line',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
        <AlertCircle size={28} strokeWidth={1.75} />
      </div>
      <p className="type-body text-ink-2 max-w-[280px] mb-6">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="min-w-[140px]">
          Try again
        </Button>
      )}
    </div>
  );
};
