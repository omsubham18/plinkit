import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface OfflineScreenProps {
  onRetry?: () => void;
}

/**
 * Friendly offline app shell screen per SPEC Section 3 & Quality Bar.
 */
export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-canvas flex items-center justify-center text-ink-2 mb-4 border border-line">
        <WifiOff size={32} strokeWidth={1.75} />
      </div>

      <h1 className="type-display font-bold text-ink mb-2">
        You're offline
      </h1>

      <p className="type-body text-ink-2 max-w-[280px] mb-6">
        Check your connection and try again to view fresh items and place orders.
      </p>

      <Button
        variant="primary"
        onClick={handleReload}
        className="w-full max-w-[200px] flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        <span>Try again</span>
      </Button>
    </div>
  );
};

/**
 * Floating offline banner notifying customer if connection drops while browsing.
 */
export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-warning sticky top-0 z-30"
    >
      <WifiOff size={15} strokeWidth={2} />
      <span className="type-caption font-semibold">
        You're offline · Showing saved items
      </span>
    </div>
  );
};
