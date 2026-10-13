import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useCatalogue } from '@/lib/catalogue';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: catalogue } = useCatalogue();
  const settings = catalogue?.settings;

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
        <h1 className="type-title text-ink font-bold">About & Contact</h1>
      </div>

      {/* DRAFT Banner */}
      <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/30 text-warning flex items-start gap-2.5">
        <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
        <div className="type-caption font-semibold">
          DRAFT: owner to review
          <div className="font-normal opacity-90 mt-0.5">
            Please replace all bracketed placeholders before public store launch.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-4 text-ink type-body">
        <div>
          <h2 className="type-subtitle font-bold text-ink">About Us</h2>
          <p className="mt-1.5 text-ink-2 leading-relaxed">
            <strong>[BUSINESS_NAME]</strong> is a single-store quick commerce delivery service operating for students across three neighbouring campuses in Bhopal. We manage our own inventory to ensure fast, reliable delivery of snacks, beverages, and daily essentials straight to hostel gates.
          </p>
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-3">
          <h2 className="type-subtitle font-bold text-ink">Business & Contact Details</h2>

          <div className="flex items-start gap-3 text-ink-2">
            <MapPin size={18} strokeWidth={1.75} className="shrink-0 text-brand mt-0.5" />
            <div>
              <span className="font-semibold text-ink block">Registered Address:</span>
              <span>[BUSINESS_ADDRESS], Bhopal, Madhya Pradesh</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-ink-2">
            <Phone size={18} strokeWidth={1.75} className="shrink-0 text-brand mt-0.5" />
            <div>
              <span className="font-semibold text-ink block">Support Phone / WhatsApp:</span>
              <span>{settings?.support_phone || '[SUPPORT_PHONE]'}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-ink-2">
            <Mail size={18} strokeWidth={1.75} className="shrink-0 text-brand mt-0.5" />
            <div>
              <span className="font-semibold text-ink block">Customer Email:</span>
              <span>[SUPPORT_EMAIL]</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-ink-2">
            <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 text-brand mt-0.5" />
            <div>
              <span className="font-semibold text-ink block">Food Safety & Standards (FSSAI):</span>
              <span>License No. [FSSAI_LICENSE_NUMBER]</span>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <h2 className="type-subtitle font-bold text-ink">Operating Hours</h2>
          <p className="mt-1 text-ink-2">
            Daily from {settings?.opens_at ? settings.opens_at.slice(0, 5) : '18:00'} to {settings?.closes_at ? settings.closes_at.slice(0, 5) : '01:00'} IST. Orders are delivered in approximately 15 minutes to designated campus delivery points.
          </p>
        </div>
      </div>
    </div>
  );
};
