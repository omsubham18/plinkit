import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Plus,
  Edit2,
  X,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { PriceTag } from '@/components/common/PriceTag';
import {
  updateStoreSettings,
  upsertDeliveryPoint,
  toggleDeliveryPointActive,
} from '@/lib/admin';
import type { SettingsRow, DeliveryPointRow } from '@/types/database';

export interface AdminSettingsTabProps {
  settings: SettingsRow | null;
  deliveryPoints: DeliveryPointRow[];
  onRefreshSettings: () => Promise<void>;
  onRefreshDeliveryPoints: () => Promise<void>;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  deliveryPoints,
  onRefreshSettings,
  onRefreshDeliveryPoints,
}) => {
  const { showToast } = useToast();

  // Settings form state
  const [formData, setFormData] = useState<Partial<SettingsRow>>({
    opens_at: settings?.opens_at?.slice(0, 5) || '18:00',
    closes_at: settings?.closes_at?.slice(0, 5) || '01:00',
    min_order_value: settings?.min_order_value ?? 99,
    delivery_fee: settings?.delivery_fee ?? 15,
    free_delivery_above: settings?.free_delivery_above ?? 299,
    max_active_orders_per_user: settings?.max_active_orders_per_user ?? 2,
    support_phone: settings?.support_phone || '+919876543210',
    notice_text: settings?.notice_text || '',
  });

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Delivery points modal state
  const [editingPoint, setEditingPoint] = useState<Partial<DeliveryPointRow> | null>(null);
  const [isSavingPoint, setIsSavingPoint] = useState(false);

  // Check if store hours cross midnight
  const closesPastMidnight = (() => {
    const openH = parseInt((formData.opens_at || '18:00').split(':')[0], 10);
    const closeH = parseInt((formData.closes_at || '01:00').split(':')[0], 10);
    return closeH < openH;
  })();

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);

    try {
      const payload: Partial<SettingsRow> = {
        opens_at: formData.opens_at ? `${formData.opens_at}:00` : '18:00:00',
        closes_at: formData.closes_at ? `${formData.closes_at}:00` : '01:00:00',
        min_order_value: Number(formData.min_order_value),
        delivery_fee: Number(formData.delivery_fee),
        free_delivery_above: Number(formData.free_delivery_above),
        max_active_orders_per_user: Number(formData.max_active_orders_per_user),
        support_phone: formData.support_phone?.trim() || '',
        notice_text: formData.notice_text?.trim() || null,
      };

      const res = await updateStoreSettings(payload);
      if (res.success) {
        showToast('Store settings saved successfully');
        await onRefreshSettings();
      } else {
        showToast(res.error || 'Failed to save settings');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Delivery Points handlers
  const handleOpenAddPointModal = () => {
    setEditingPoint({
      campus: 'MANIT',
      name: '',
      eta_minutes: 15,
      delivery_fee_override: null,
      sort_order: deliveryPoints.length + 1,
      is_active: true,
    });
  };

  const handleOpenEditPointModal = (dp: DeliveryPointRow) => {
    setEditingPoint({ ...dp });
  };

  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoint || !editingPoint.name?.trim() || !editingPoint.campus?.trim()) {
      showToast('Campus and Point Name are required');
      return;
    }

    setIsSavingPoint(true);
    try {
      const res = await upsertDeliveryPoint(editingPoint);
      if (res.success) {
        showToast(`Delivery point "${res.deliveryPoint?.name}" saved`);
        setEditingPoint(null);
        await onRefreshDeliveryPoints();
      } else {
        showToast(res.error || 'Failed to save delivery point');
      }
    } finally {
      setIsSavingPoint(false);
    }
  };

  const handleTogglePointActive = async (dp: DeliveryPointRow) => {
    const nextState = !dp.is_active;
    const res = await toggleDeliveryPointActive(dp.id, nextState);
    if (res.success) {
      showToast(`Point "${dp.name}" ${nextState ? 'activated' : 'deactivated'}`);
      await onRefreshDeliveryPoints();
    } else {
      showToast(res.error || 'Failed to change point status');
    }
  };

  // Group delivery points by campus
  const campusGroups = deliveryPoints.reduce<Record<string, DeliveryPointRow[]>>((acc, dp) => {
    if (!acc[dp.campus]) acc[dp.campus] = [];
    acc[dp.campus].push(dp);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-8">
      {/* 1. Operating Hours & Store Rules Form */}
      <section className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
        <div>
          <h2 className="type-title font-bold text-ink flex items-center gap-2">
            <Clock size={20} className="text-brand" />
            <span>Operating Hours & Store Rules</span>
          </h2>
          <p className="type-caption text-ink-2">
            Hours are evaluated in Asia/Kolkata timezone and support schedules extending past midnight.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Hours Row */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <span className="type-subtitle font-bold text-ink block">Trading Hours (IST)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  Opening Time (IST)
                </label>
                <input
                  type="time"
                  required
                  value={formData.opens_at}
                  onChange={(e) => setFormData({ ...formData, opens_at: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-semibold focus:outline-none focus:border-brand shadow-xs"
                />
              </div>

              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  Closing Time (IST)
                </label>
                <input
                  type="time"
                  required
                  value={formData.closes_at}
                  onChange={(e) => setFormData({ ...formData, closes_at: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-semibold focus:outline-none focus:border-brand shadow-xs"
                />
              </div>
            </div>

            {closesPastMidnight && (
              <div className="flex items-center gap-2 text-xs text-brand font-medium pt-1">
                <AlertCircle size={15} />
                <span>Closing time is past midnight (trades into next morning).</span>
              </div>
            )}
          </div>

          {/* Fees & Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Minimum Order (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.min_order_value}
                onChange={(e) => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-bold focus:outline-none focus:border-brand shadow-xs"
              />
            </div>

            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Delivery Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-bold focus:outline-none focus:border-brand shadow-xs"
              />
            </div>

            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Free Delivery Above (₹)
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.free_delivery_above}
                onChange={(e) =>
                  setFormData({ ...formData, free_delivery_above: Number(e.target.value) })
                }
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-bold focus:outline-none focus:border-brand shadow-xs"
              />
            </div>

            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Max Active Orders / User
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.max_active_orders_per_user}
                onChange={(e) =>
                  setFormData({ ...formData, max_active_orders_per_user: Number(e.target.value) })
                }
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm font-bold focus:outline-none focus:border-brand shadow-xs"
              />
            </div>
          </div>

          {/* Support Phone & Customer Notice Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Support WhatsApp / Phone
              </label>
              <input
                type="text"
                required
                value={formData.support_phone}
                onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                placeholder="+919876543210"
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm focus:outline-none focus:border-brand shadow-xs"
              />
            </div>

            <div>
              <label className="type-caption font-semibold text-ink-2 block mb-1">
                Customer Notice Banner (Optional)
              </label>
              <input
                type="text"
                value={formData.notice_text || ''}
                onChange={(e) => setFormData({ ...formData, notice_text: e.target.value })}
                placeholder="e.g. Heavy rain in Bhopal — delivery might take 20 mins"
                className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm focus:outline-none focus:border-brand shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              type="submit"
              disabled={isSavingSettings}
              className="h-11 px-6 font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Save size={16} strokeWidth={2} />
              <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Delivery Points Management */}
      <section className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="type-title font-bold text-ink flex items-center gap-2">
              <MapPin size={20} className="text-brand" />
              <span>Campus Delivery Points ({deliveryPoints.length})</span>
            </h2>
            <p className="type-caption text-ink-2">
              Specific hostels, gates, and delivery drop-off points for each campus.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleOpenAddPointModal}
            className="h-10 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add delivery point</span>
          </Button>
        </div>

        {/* Grouped by Campus */}
        <div className="space-y-6">
          {Object.entries(campusGroups).map(([campus, points]) => (
            <div key={campus} className="space-y-3">
              <h3 className="type-subtitle font-bold text-ink border-b border-line pb-1.5">
                {campus} ({points.length} points)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {points.map((dp) => (
                  <div
                    key={dp.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      !dp.is_active ? 'bg-canvas/50 border-line/60 opacity-60' : 'bg-surface border-line'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="type-subtitle font-bold text-ink">{dp.name}</span>
                        <span
                          className={`type-caption px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            dp.is_active
                              ? 'bg-emerald-50 text-success border border-emerald-200'
                              : 'bg-slate-100 text-ink-3 border border-slate-200'
                          }`}
                        >
                          {dp.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="type-caption text-ink-2 mt-0.5">
                        ETA: <span className="font-semibold text-ink">{dp.eta_minutes} mins</span>
                        {dp.delivery_fee_override !== null && (
                          <span className="ml-2">
                            · Fee: <PriceTag amount={dp.delivery_fee_override} />
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePointActive(dp)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                          dp.is_active
                            ? 'text-ink-2 border-line hover:text-danger'
                            : 'text-success border-emerald-200 bg-emerald-50'
                        }`}
                      >
                        {dp.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <Button
                        variant="secondary"
                        onClick={() => handleOpenEditPointModal(dp)}
                        className="h-8 px-2.5 text-xs font-bold"
                      >
                        <Edit2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add / Edit Delivery Point Modal */}
      {editingPoint && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-line max-w-md w-full p-6 shadow-floating space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="type-title font-bold text-ink">
                {editingPoint.id ? `Edit ${editingPoint.name}` : 'Add Delivery Point'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingPoint(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSavePoint} className="space-y-4">
              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  Campus Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPoint.campus || ''}
                  onChange={(e) => setEditingPoint({ ...editingPoint, campus: e.target.value })}
                  placeholder="e.g. MANIT, AIIMS Bhopal, IISER"
                  className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  Drop-off Point Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPoint.name || ''}
                  onChange={(e) => setEditingPoint({ ...editingPoint, name: e.target.value })}
                  placeholder="e.g. Hostel 4 Gate or Main Admin Block"
                  className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    ETA (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingPoint.eta_minutes ?? 15}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, eta_minutes: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Fee Override (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingPoint.delivery_fee_override ?? ''}
                    onChange={(e) =>
                      setEditingPoint({
                        ...editingPoint,
                        delivery_fee_override: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Default fee"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dp-is-active"
                  checked={editingPoint.is_active ?? true}
                  onChange={(e) =>
                    setEditingPoint({ ...editingPoint, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-brand rounded"
                />
                <label htmlFor="dp-is-active" className="text-sm font-semibold text-ink">
                  Point is active for student delivery selection
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingPoint(null)}
                  disabled={isSavingPoint}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSavingPoint}>
                  {isSavingPoint ? 'Saving...' : 'Save Point'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
