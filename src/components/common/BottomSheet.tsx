import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity duration-sheet animate-in fade-in"
      />

      {/* Sheet Container: Max 90vh, centred column 480px, floating shadow */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-[480px] max-h-[90vh] bg-surface rounded-t-[20px] shadow-floating',
          'flex flex-col overflow-hidden z-10 transition-transform duration-sheet ease-out',
          'animate-in slide-in-from-bottom',
          className
        )}
      >
        {/* Top Drag Handle Pill */}
        <div
          className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing"
          onClick={onClose}
        >
          <div className="w-12 h-1.5 rounded-full bg-ink-3/40" />
        </div>

        {/* Header with Title and Close button */}
        {title && (
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-line">
            <h2 className="type-title text-ink font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas active:bg-line transition-colors"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
