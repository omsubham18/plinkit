import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Back & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Privacy Policy</h1>
      </div>

      {/* DRAFT Banner */}
      <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/30 text-warning flex items-start gap-2.5">
        <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
        <div className="type-caption font-semibold">
          DRAFT: owner to review
          <div className="font-normal opacity-90 mt-0.5">
            Subject to final review by [BUSINESS_NAME].
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-4 text-ink type-body">
        <div>
          <h2 className="type-subtitle font-bold text-ink">1. Information We Collect</h2>
          <p className="mt-1.5 text-ink-2 leading-relaxed">
            <strong>[BUSINESS_NAME]</strong> collects minimal personal details necessary to fulfill your campus orders:
          </p>
          <ul className="list-disc pl-5 mt-2 text-ink-2 flex flex-col gap-1">
            <li>Google OAuth profile: Name and verified email address.</li>
            <li>Contact details: 10-digit Indian phone number for delivery coordination.</li>
            <li>Delivery address: Selected campus hostel/gate and room number.</li>
            <li>Order records: Items ordered, totals, timestamps, and delivery status.</li>
          </ul>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">2. How Your Data Is Used</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            Your data is used solely to dispatch orders, contact you upon runner arrival, and maintain your order history. We do not sell your personal data or share it with third-party advertisers.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">3. Data Storage & Security</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            Customer data is stored securely in encrypted databases hosted in Mumbai, India. Strict database Row-Level Security policies ensure that only you and authorized store operators can view your orders.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">4. Contact & Deletion Requests</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            To request account deletion or data clarification, please contact our support team at <strong>[SUPPORT_EMAIL]</strong> or phone <strong>[SUPPORT_PHONE]</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
