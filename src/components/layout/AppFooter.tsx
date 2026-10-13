import React from 'react';
import { Link } from 'react-router-dom';

export const AppFooter: React.FC = () => {
  return (
    <footer className="w-full bg-surface border-t border-line mt-auto px-4 py-6 flex flex-col gap-4 text-center">
      {/* Legal Links */}
      <nav aria-label="Legal and company links" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link
          to="/about"
          className="type-caption text-ink-2 hover:text-brand transition-colors"
        >
          About & Contact
        </Link>
        <span className="text-line select-none">•</span>
        <Link
          to="/terms"
          className="type-caption text-ink-2 hover:text-brand transition-colors"
        >
          Terms of Service
        </Link>
        <span className="text-line select-none">•</span>
        <Link
          to="/privacy"
          className="type-caption text-ink-2 hover:text-brand transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="text-line select-none">•</span>
        <Link
          to="/refunds"
          className="type-caption text-ink-2 hover:text-brand transition-colors"
        >
          Cancellation & Refunds
        </Link>
      </nav>

      {/* Campus Info & Brand */}
      <div className="flex flex-col gap-1">
        <p className="type-caption text-ink-2">
          Instant campus delivery · Bhopal, Madhya Pradesh
        </p>
        <p className="type-caption text-ink-2">
          © {new Date().getFullYear()} Plinkit Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
