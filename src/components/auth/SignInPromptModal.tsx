import React, { useState } from 'react';
import { LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/authStore';
import { InAppBrowserModal } from './InAppBrowserModal';

export interface SignInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
  title?: string;
  subtitle?: string;
}

export const SignInPromptModal: React.FC<SignInPromptModalProps> = ({
  isOpen,
  onClose,
  returnTo = '/checkout',
  title = 'Sign in with Google',
  subtitle = 'Sign in to place orders, track live status, and save your hostel delivery point.',
}) => {
  const { signInWithGoogle } = useAuthStore();
  const [showInAppNotice, setShowInAppNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen && !showInAppNotice) return null;

  const handleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await signInWithGoogle(returnTo);
    setIsSubmitting(false);

    if (result.blockedInApp) {
      setShowInAppNotice(true);
      return;
    }

    if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <>
      <InAppBrowserModal
        isOpen={showInAppNotice}
        onClose={() => setShowInAppNotice(false)}
      />

      {isOpen && !showInAppNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-[420px] bg-surface rounded-t-[20px] sm:rounded-[14px] border border-line p-5 shadow-float animate-slide-up flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <LogIn size={20} strokeWidth={2} />
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

            {/* Description */}
            <div>
              <h2 id="signin-modal-title" className="type-title text-ink font-bold">
                {title}
              </h2>
              <p className="type-body text-ink-2 mt-1.5">{subtitle}</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-[12px] bg-danger/10 border border-danger/20 text-danger type-caption">
                {errorMessage}
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="primary"
                onClick={handleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5"
              >
                {/* SVG Google 'G' glyph */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
              </Button>

              <Button variant="ghost" onClick={onClose} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
