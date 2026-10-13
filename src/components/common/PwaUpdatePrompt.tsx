import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates periodically (every hour)
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] px-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="bg-ink text-surface px-4 py-3 rounded-2xl shadow-floating flex items-center justify-between gap-3 border border-line/20">
        <span className="type-caption font-semibold">
          Update available, tap to refresh
        </span>
        <button
          type="button"
          onClick={() => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          }}
          className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-pressed text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={13} className="animate-spin-slow" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
