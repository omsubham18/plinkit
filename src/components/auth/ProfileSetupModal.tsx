import React, { useState, useEffect, useMemo } from 'react';
import { User, MapPin, Phone, Home, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/authStore';
import { useProfile, useUpsertProfile } from '@/lib/profile';
import { useCatalogue } from '@/lib/catalogue';
import { useDeliveryPointStore } from '@/lib/deliveryPointStore';
import { useToast } from '@/components/common/Toast';

export interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Delivery profile',
  subtitle = 'We need your name, phone number, and hostel room to deliver your order.',
}) => {
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const { mutateAsync: upsertProfile, isPending } = useUpsertProfile();
  const { data: catalogue } = useCatalogue();
  const { selectedPointId, setSelectedPointId } = useDeliveryPointStore();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pointId, setPointId] = useState('');
  const [room, setRoom] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const deliveryPoints = useMemo(
    () => catalogue?.deliveryPoints || [],
    [catalogue?.deliveryPoints]
  );

  // Initialize form state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setPointId(profile.delivery_point_id || selectedPointId || deliveryPoints[0]?.id || '');
      setRoom(profile.room || '');
    } else if (user) {
      const googleName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        '';
      setFullName(googleName);
      setPointId(selectedPointId || deliveryPoints[0]?.id || '');
    }
  }, [profile, user, selectedPointId, deliveryPoints]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanRoom = room.trim();

    if (!cleanName) {
      setValidationError('Please enter your full name.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setValidationError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!pointId) {
      setValidationError('Please select a delivery point.');
      return;
    }

    if (!cleanRoom) {
      setValidationError('Please enter your room or location details.');
      return;
    }

    try {
      await upsertProfile({
        full_name: cleanName,
        phone: cleanPhone,
        delivery_point_id: pointId,
        room: cleanRoom,
      });

      setSelectedPointId(pointId);
      showToast('Profile saved successfully');

      if (onSuccess) {
        onSuccess();
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Failed to save delivery profile.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-surface rounded-t-[20px] sm:rounded-[14px] border border-line p-5 shadow-float animate-slide-up flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <User size={20} strokeWidth={2} />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="w-10 h-10 -mr-2 -mt-2 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas active:bg-line/60"
            >
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 id="profile-modal-title" className="type-title text-ink font-bold">
            {title}
          </h2>
          <p className="type-body text-ink-2 mt-1">{subtitle}</p>
        </div>

        {validationError && (
          <div className="p-3 rounded-[12px] bg-danger/10 border border-danger/20 text-danger type-caption">
            {validationError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-fullname" className="type-caption font-semibold text-ink">
              Full name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 pointer-events-none">
                <User size={18} strokeWidth={1.75} />
              </span>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Student name"
                className="w-full h-12 pl-10 pr-3.5 rounded-[12px] bg-canvas border border-line text-ink type-body focus:bg-surface focus:border-brand focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* 10-digit Phone */}
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-phone" className="type-caption font-semibold text-ink">
              Mobile number (10-digit)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 pointer-events-none">
                <Phone size={18} strokeWidth={1.75} />
              </span>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full h-12 pl-10 pr-3.5 rounded-[12px] bg-canvas border border-line text-ink type-body font-mono focus:bg-surface focus:border-brand focus:outline-none transition-colors"
                required
              />
            </div>
            <span className="type-caption text-ink-3">Used by delivery runner to coordinate arrival.</span>
          </div>

          {/* Delivery Point Select */}
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-point" className="type-caption font-semibold text-ink">
              Campus delivery point
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 pointer-events-none">
                <MapPin size={18} strokeWidth={1.75} />
              </span>
              <select
                id="profile-point"
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                className="w-full h-12 pl-10 pr-3.5 rounded-[12px] bg-canvas border border-line text-ink type-body appearance-none focus:bg-surface focus:border-brand focus:outline-none transition-colors"
                required
              >
                {deliveryPoints.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.name} ({dp.campus})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room / Location */}
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-room" className="type-caption font-semibold text-ink">
              Room or location
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 pointer-events-none">
                <Home size={18} strokeWidth={1.75} />
              </span>
              <input
                id="profile-room"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Room 304, Block B"
                className="w-full h-12 pl-10 pr-3.5 rounded-[12px] bg-canvas border border-line text-ink type-body focus:bg-surface focus:border-brand focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-2 mt-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="w-full h-12 font-bold"
            >
              {isPending ? 'Saving details...' : 'Save & continue'}
            </Button>
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose} className="w-full">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
