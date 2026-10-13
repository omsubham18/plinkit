import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const RefundsPage: React.FC = () => {
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
        <h1 className="type-title text-ink font-bold">Cancellation & Refunds</h1>
      </div>

      {/* DRAFT Banner */}
      <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/30 text-warning flex items-start gap-2.5">
        <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
        <div className="type-caption font-semibold">
          DRAFT: owner to review
          <div className="font-normal opacity-90 mt-0.5">
            Subject to final store review by [BUSINESS_NAME].
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-4 text-ink type-body">
        <div>
          <h2 className="type-subtitle font-bold text-ink">1. Order Cancellation Policy</h2>
          <p className="mt-1.5 text-ink-2 leading-relaxed">
            You may cancel an order directly from the order tracking screen without charge <strong>while its status is "Placed"</strong> (before the store operator accepts and packs the order). Once an order is accepted or packed, cancellation is locked to prevent food waste.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">2. Store Item Removals</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            If an item in your order becomes unavailable before packing, our operator will adjust your bill accordingly or contact you based on your substitution preference. Removed items are immediately subtracted from your final bill, and your delivery fee will never increase due to a store item removal.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">3. Damaged or Incorrect Items</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            Because orders are paid upon delivery, please inspect packaged goods at the time of delivery. If an item is damaged or incorrect, hand it back to the runner and pay only for the remaining items.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">4. Customer Support Contact</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            For urgent issues regarding active deliveries, reach out immediately via WhatsApp or call our support desk at <strong>[SUPPORT_PHONE]</strong> or email <strong>[SUPPORT_EMAIL]</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
