import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Home,
  LogOut,
  ShoppingBag,
  FileText,
  Shield,
  HelpCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/authStore';
import { useProfile, useUpsertProfile } from '@/lib/profile';
import { useCatalogue } from '@/lib/catalogue';
import { useDeliveryPointStore } from '@/lib/deliveryPointStore';
import { useToast } from '@/components/common/Toast';
import { SignInPromptModal } from '@/components/auth/SignInPromptModal';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { mutateAsync: upsertProfile, isPending: savingProfile } = useUpsertProfile();
  const { data: catalogue } = useCatalogue();
  const { setSelectedPointId } = useDeliveryPointStore();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pointId, setPointId] = useState('');
  const [room, setRoom] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deliveryPoints = useMemo(
    () => catalogue?.deliveryPoints || [],
    [catalogue?.deliveryPoints]
  );
  const currentPoint = deliveryPoints.find((p) => p.id === (profile?.delivery_point_id || pointId));

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setPointId(profile.delivery_point_id || deliveryPoints[0]?.id || '');
      setRoom(profile.room || '');
    } else if (user) {
      const googleName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        '';
      setFullName(googleName);
      setPointId(deliveryPoints[0]?.id || '');
    }
  }, [profile, user, deliveryPoints]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanRoom = room.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!pointId) {
      setErrorMsg('Please select your campus delivery point.');
      return;
    }

    if (!cleanRoom) {
      setErrorMsg('Please enter your room or location details.');
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
      setIsEditing(false);
      showToast('Profile updated successfully');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    showToast('Signed out of Plinkit');
    navigate('/');
  };

  return (
    <div className="p-4 flex flex-col gap-5 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line/60"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Account</h1>
      </div>

      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        returnTo="/account"
      />

      {/* Loading Skeleton */}
      {(authLoading || profileLoading) && (
        <div className="bg-surface border border-line rounded-[14px] p-5 flex flex-col gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-canvas" />
          <div className="h-6 w-48 bg-canvas rounded" />
          <div className="h-4 w-32 bg-canvas rounded" />
        </div>
      )}

      {/* Unauthenticated State */}
      {!authLoading && !user && (
        <div className="bg-surface border border-line rounded-[14px] p-6 text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-2">
            <User size={30} strokeWidth={1.75} />
          </div>
          <h2 className="type-title font-bold text-ink">Sign in to your account</h2>
          <p className="type-body text-ink-2 max-w-[280px]">
            Sign in with Google to view your order history and manage your campus delivery details.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowSignInModal(true)}
            className="w-full mt-2"
          >
            Continue with Google
          </Button>
        </div>
      )}

      {/* Authenticated Profile Section */}
      {!authLoading && user && (
        <div className="flex flex-col gap-4">
          {/* User Info & Delivery Details Card */}
          <div className="bg-surface border border-line rounded-[14px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold type-title">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="type-subtitle font-bold text-ink">
                    {profile?.full_name || 'Campus Student'}
                  </span>
                  <span className="type-caption text-ink-2 truncate max-w-[200px]">
                    {user.email}
                  </span>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="type-caption font-semibold text-brand hover:underline px-2 py-1"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Readonly Summary */}
            {!isEditing && (
              <div className="border-t border-line pt-3 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 text-ink-2 type-body">
                  <Phone size={16} strokeWidth={1.75} className="text-brand shrink-0" />
                  <span>{profile?.phone || 'No phone added yet'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-ink-2 type-body">
                  <MapPin size={16} strokeWidth={1.75} className="text-brand shrink-0" />
                  <span>
                    {currentPoint ? `${currentPoint.name} (${currentPoint.campus})` : 'No delivery point selected'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-ink-2 type-body">
                  <Home size={16} strokeWidth={1.75} className="text-brand shrink-0" />
                  <span>{profile?.room || 'No room added'}</span>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && (
              <form onSubmit={handleSaveProfile} className="border-t border-line pt-3 flex flex-col gap-3">
                {errorMsg && (
                  <div className="p-2.5 rounded-[10px] bg-danger/10 border border-danger/20 text-danger type-caption">
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-name" className="type-caption font-semibold text-ink">
                    Full name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3 rounded-[10px] bg-canvas border border-line type-body text-ink focus:bg-surface focus:border-brand focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-phone" className="type-caption font-semibold text-ink">
                    10-digit mobile number
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full h-11 px-3 rounded-[10px] bg-canvas border border-line type-body text-ink font-mono focus:bg-surface focus:border-brand focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-point" className="type-caption font-semibold text-ink">
                    Campus delivery point
                  </label>
                  <select
                    id="edit-point"
                    value={pointId}
                    onChange={(e) => setPointId(e.target.value)}
                    className="w-full h-11 px-3 rounded-[10px] bg-canvas border border-line type-body text-ink focus:bg-surface focus:border-brand focus:outline-none"
                    required
                  >
                    {deliveryPoints.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} ({dp.campus})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-room" className="type-caption font-semibold text-ink">
                    Room or location
                  </label>
                  <input
                    id="edit-room"
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full h-11 px-3 rounded-[10px] bg-canvas border border-line type-body text-ink focus:bg-surface focus:border-brand focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingProfile}
                    className="flex-1 flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    <span>{savingProfile ? 'Saving...' : 'Save'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Navigation Link: Orders */}
          <Link
            to="/orders"
            className="bg-surface border border-line rounded-[14px] p-4 flex items-center justify-between hover:bg-canvas transition-colors"
          >
            <div className="flex items-center gap-3 text-ink">
              <ShoppingBag size={20} strokeWidth={1.75} className="text-brand" />
              <span className="type-body font-semibold">Your orders</span>
            </div>
            <span className="type-caption text-ink-3 font-semibold">View history →</span>
          </Link>
        </div>
      )}

      {/* Static Legal & Support Links */}
      <div className="bg-surface border border-line rounded-[14px] overflow-hidden flex flex-col divide-y divide-line">
        <Link
          to="/about"
          className="p-3.5 flex items-center justify-between text-ink hover:bg-canvas transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={18} strokeWidth={1.75} className="text-ink-2" />
            <span className="type-body font-medium">About & Contact</span>
          </div>
          <span className="type-caption text-ink-3">→</span>
        </Link>

        <Link
          to="/terms"
          className="p-3.5 flex items-center justify-between text-ink hover:bg-canvas transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText size={18} strokeWidth={1.75} className="text-ink-2" />
            <span className="type-body font-medium">Terms of Service</span>
          </div>
          <span className="type-caption text-ink-3">→</span>
        </Link>

        <Link
          to="/privacy"
          className="p-3.5 flex items-center justify-between text-ink hover:bg-canvas transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield size={18} strokeWidth={1.75} className="text-ink-2" />
            <span className="type-body font-medium">Privacy Policy</span>
          </div>
          <span className="type-caption text-ink-3">→</span>
        </Link>

        <Link
          to="/refunds"
          className="p-3.5 flex items-center justify-between text-ink hover:bg-canvas transition-colors"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={18} strokeWidth={1.75} className="text-ink-2" />
            <span className="type-body font-medium">Cancellation & Refunds</span>
          </div>
          <span className="type-caption text-ink-3">→</span>
        </Link>
      </div>

      {/* Sign Out Button */}
      {user && (
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full text-danger hover:bg-danger/10 flex items-center justify-center gap-2 mt-2"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sign out</span>
        </Button>
      )}
    </div>
  );
};
