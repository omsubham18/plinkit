import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { copyCurrentUrl } from '@/lib/inAppBrowser';

export interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyCurrentUrl();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-app-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-[420px] bg-surface rounded-t-[20px] sm:rounded-[14px] border border-line p-5 shadow-float animate-slide-up flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <ExternalLink size={20} strokeWidth={2} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-10 h-10 -mr-2 -mt-2 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas active:bg-line/60"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Copy */}
        <div>
          <h2 id="in-app-title" className="type-title text-ink font-bold">
            Open in Chrome or Safari
          </h2>
          <p className="type-body text-ink-2 mt-1.5">
            Google sign-in is blocked inside apps like Instagram and Facebook for security reasons.
            Please copy this link and open it in your regular browser to continue.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <Button
            variant="primary"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                <span>Link copied</span>
              </>
            ) : (
              <>
                <Copy size={18} strokeWidth={2} />
                <span>Copy link</span>
              </>
            )}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
};
