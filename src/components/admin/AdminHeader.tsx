import React from 'react';
import { VolumeX, WifiOff, Bell, BellOff, Store, LogOut } from 'lucide-react';
import { formatISTHours } from '@/lib/admin';
import type { SettingsRow } from '@/types/database';

export type AdminTab = 'orders' | 'stock' | 'products' | 'categories' | 'settings' | 'today';

export interface AdminHeaderProps {
  settings: SettingsRow | null;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  isSoundBlocked: boolean;
  onUnlockSound: () => void;
  isConnected: boolean;
  activeOrdersCount: number;
  lowStockCount: number;
  onToggleStoreOpen: () => void;
  isTogglingStore: boolean;
  onSignOut: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  settings,
  activeTab,
  onTabChange,
  isOnline,
  onToggleOnline,
  isSoundBlocked,
  onUnlockSound,
  isConnected,
  activeOrdersCount,
  lowStockCount,
  onToggleStoreOpen,
  isTogglingStore,
  onSignOut,
}) => {
  const storeIsOpen = settings?.store_open ?? false;
  const hoursText = settings ? formatISTHours(settings.opens_at, settings.closes_at) : '';

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-40">
      {/* Warning Banners */}
      {!isConnected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-warning">
          <div className="flex items-center gap-2">
            <WifiOff size={18} strokeWidth={2} />
            <span className="type-caption font-semibold">
              Live connection dropped. Reconnecting automatically...
            </span>
          </div>
          <span className="type-caption text-warning underline">Reconnecting</span>
        </div>
      )}

      {isOnline && isSoundBlocked && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3 text-danger">
          <div className="flex items-center gap-2">
            <VolumeX size={18} strokeWidth={2} />
            <span className="type-caption font-semibold">
              Audio blocked by browser. Chime cannot play.
            </span>
          </div>
          <button
            type="button"
            onClick={onUnlockSound}
            className="type-caption font-bold bg-danger text-white px-3 py-1 rounded-lg hover:opacity-90 active:scale-95 transition-all"
          >
            Enable sound
          </button>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Store Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Store size={22} strokeWidth={2} className="text-brand" />
            <span className="type-title text-ink font-bold tracking-tight">Console</span>
          </div>

          {/* Store Switch & Operating Hours */}
          <div className="flex items-center gap-2 pl-3 border-l border-line">
            <button
              type="button"
              onClick={onToggleStoreOpen}
              disabled={isTogglingStore}
              aria-label="Toggle store status"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                storeIsOpen
                  ? 'bg-emerald-50 text-success border-emerald-300 hover:bg-emerald-100'
                  : 'bg-canvas text-ink-2 border-line hover:bg-surface'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  storeIsOpen ? 'bg-success animate-pulse' : 'bg-ink-3'
                }`}
              />
              <span>{storeIsOpen ? 'Open' : 'Closed'}</span>
            </button>

            {hoursText && (
              <span className="type-caption text-ink-2 hidden sm:inline">
                {hoursText}
              </span>
            )}
          </div>
        </div>

        {/* Right Controls: Online Switch & Sign Out */}
        <div className="flex items-center gap-2">
          {/* "I'm online" Switch */}
          <button
            type="button"
            onClick={onToggleOnline}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isOnline
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-canvas text-ink-2 border-line hover:text-ink'
            }`}
          >
            {isOnline ? (
              <>
                <Bell size={16} strokeWidth={2} className="animate-bounce" />
                <span>I'm online</span>
              </>
            ) : (
              <>
                <BellOff size={16} strokeWidth={1.75} />
                <span>I'm offline</span>
              </>
            )}
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-ink-2 hover:text-danger hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Horizontal scroll on phone) */}
      <div className="px-4 flex gap-1 border-t border-line/50 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => onTabChange('orders')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Orders</span>
          {activeOrdersCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                activeTab === 'orders'
                  ? 'bg-brand-soft text-brand'
                  : 'bg-canvas text-ink-2'
              }`}
            >
              {activeOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('stock')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'stock'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-warning border border-amber-200 tabular-nums">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('products')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'products'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Products</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('categories')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'categories'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Categories</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'settings'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('today')}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'today'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <span>Today</span>
        </button>
      </div>
    </header>
  );
};
