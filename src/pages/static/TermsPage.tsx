import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
        <h1 className="type-title text-ink font-bold">Terms of Service</h1>
      </div>

      {/* DRAFT Banner */}
      <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/30 text-warning flex items-start gap-2.5">
        <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
        <div className="type-caption font-semibold">
          DRAFT: owner to review
          <div className="font-normal opacity-90 mt-0.5">
            Subject to final legal review by [BUSINESS_NAME] before launch.
          </div>
        </div>
      </div>

      {/* Legal Text */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-4 text-ink type-body">
        <div>
          <h2 className="type-subtitle font-bold text-ink">1. Service Scope</h2>
          <p className="mt-1.5 text-ink-2 leading-relaxed">
            These terms govern orders placed with <strong>[BUSINESS_NAME]</strong>, located at [BUSINESS_ADDRESS], Bhopal. We provide delivery exclusively to approved hostel gates and campus delivery points across neighbouring Bhopal campuses.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">2. Pricing and Maximum Retail Price (MRP)</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            All prices are stated in whole Indian Rupees (₹). Product selling prices never exceed the printed Maximum Retail Price (MRP). Delivery fees are calculated based on your order subtotal and delivery point.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">3. Payment Terms</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            All orders are fulfilled on a <strong>Pay on delivery</strong> basis. Payment must be completed upon physical handover at the designated delivery point via UPI QR code or exact cash.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">4. Customer Responsibilities</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            Students must provide a valid 10-digit Indian phone number and be present at the delivery point when the runner arrives. Repeated failure to collect placed orders may result in temporary account restrictions.
          </p>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">5. Regulatory Compliance</h2>
          <p className="mt-1 text-ink-2 leading-relaxed">
            Food handling and packaged goods comply with the Food Safety and Standards Act. FSSAI Registration: <strong>[FSSAI_LICENSE_NUMBER]</strong>. For queries, contact support at <strong>[SUPPORT_PHONE]</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
