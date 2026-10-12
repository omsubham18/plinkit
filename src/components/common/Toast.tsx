/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2500); // exactly 2.5s per DESIGN.md
    return () => clearTimeout(timer);
  }, [toastMessage]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[448px]',
            'px-4 py-3 rounded-card bg-ink text-surface type-body shadow-floating text-center',
            'transition-all duration-state animate-in fade-in slide-in-from-bottom-2'
          )}
        >
          {toastMessage}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
