import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import { NotFoundPage } from '@/pages/Placeholders';
import { useToast } from '@/components/common/Toast';
import { AdminHeader, type AdminTab } from '@/components/admin/AdminHeader';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminStockTab } from '@/components/admin/AdminStockTab';
import { AdminProductsTab } from '@/components/admin/AdminProductsTab';
import { AdminCategoriesTab } from '@/components/admin/AdminCategoriesTab';
import { AdminSettingsTab } from '@/components/admin/AdminSettingsTab';
import { AdminTodayTab } from '@/components/admin/AdminTodayTab';
import { AdminPackView } from '@/components/admin/AdminPackView';
import {
  checkIsAdmin,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminSettings,
  updateStoreSettings,
  adminSetOrderStatus,
  adminSetPayment,
  adminRemoveOrderItem,
  adminAdjustStock,
  fetchAdminCategories,
  fetchAdminDeliveryPoints,
  fetchTodayAnalytics,
  fetchFailedSearches7Days,
  fetchItemRequests,
  type AdminOrderWithItems,
  type TodayAnalyticsData,
} from '@/lib/admin';
import {
  playOrderChime,
  startRepeatingChime,
  stopRepeatingChime,
  startFlashingTitle,
  stopFlashingTitle,
  requestScreenWakeLock,
  releaseScreenWakeLock,
  testAndUnlockAudio,
  setupWakeLockVisibilityListener,
} from '@/lib/adminAlerts';
import type {
  OrderStatus,
  PaymentStatus,
  PaidVia,
  ProductRow,
  SettingsRow,
  CategoryRow,
  DeliveryPointRow,
  ItemRequestRow,
} from '@/types/database';

export const AdminPage: React.FC = () => {
  const { user, isLoading: isAuthLoading, signOut } = useAuthStore();
  const { showToast } = useToast();

  // Stealth Access Control State
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Operator Console UI State
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return localStorage.getItem('plinkit-operator-online') === 'true';
  });
  const [isSoundBlocked, setIsSoundBlocked] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Data state
  const [orders, setOrders] = useState<AdminOrderWithItems[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPointRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [analytics, setAnalytics] = useState<TodayAnalyticsData | null>(null);
  const [failedSearches, setFailedSearches] = useState<Array<{ query: string; count: number; last_at: string }>>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequestRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingStore, setIsTogglingStore] = useState(false);

  // Pack view state
  const [packOrder, setPackOrder] = useState<AdminOrderWithItems | null>(null);

  // Ref for online state access inside subscriptions
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // 1. Verify Admin Status
  useEffect(() => {
    let isMounted = true;
    async function verify() {
      if (isAuthLoading) return;
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setIsVerifyingAdmin(false);
        }
        return;
      }

      try {
        const adminVerified = await checkIsAdmin();
        if (isMounted) {
          setIsAdmin(adminVerified);
          setIsVerifyingAdmin(false);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
          setIsVerifyingAdmin(false);
        }
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  // 2. Fetch Initial Console Data
  const refreshOrders = useCallback(async () => {
    try {
      const ordersData = await fetchAdminOrders();
      setOrders(ordersData);

      // Check if any placed orders exist for repeating chime
      const unacknowledgedCount = ordersData.filter((o) => o.status === 'placed').length;
      if (isOnlineRef.current && unacknowledgedCount > 0) {
        startRepeatingChime();
        startFlashingTitle(unacknowledgedCount);
      } else {
        stopRepeatingChime();
        stopFlashingTitle();
      }
    } catch (err) {
      console.error('Failed to refresh orders:', err);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const prods = await fetchAdminProducts();
      setProducts(prods);
    } catch (err) {
      console.error('Failed to refresh products:', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await fetchAdminSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to refresh settings:', err);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await fetchAdminCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  }, []);

  const refreshDeliveryPoints = useCallback(async () => {
    try {
      const pts = await fetchAdminDeliveryPoints();
      setDeliveryPoints(pts);
    } catch (err) {
      console.error('Failed to refresh delivery points:', err);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      const [todayData, misses, requests] = await Promise.all([
        fetchTodayAnalytics(),
        fetchFailedSearches7Days(),
        fetchItemRequests(),
      ]);
      setAnalytics(todayData);
      setFailedSearches(misses);
      setItemRequests(requests);
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;

    async function loadAll() {
      setIsLoadingData(true);
      await Promise.all([
        refreshOrders(),
        refreshProducts(),
        refreshSettings(),
        refreshCategories(),
        refreshDeliveryPoints(),
        refreshAnalytics(),
      ]);
      if (isMounted) {
        setIsLoadingData(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, refreshOrders, refreshProducts, refreshSettings, refreshCategories, refreshDeliveryPoints, refreshAnalytics]);

  // 3. Setup Wake Lock & Audio on "I'm online"
  useEffect(() => {
    if (!isAdmin) return;

    if (isOnline) {
      localStorage.setItem('plinkit-operator-online', 'true');
      requestScreenWakeLock();
      testAndUnlockAudio().then((unlocked) => {
        setIsSoundBlocked(!unlocked);
      });
    } else {
      localStorage.setItem('plinkit-operator-online', 'false');
      releaseScreenWakeLock();
      stopRepeatingChime();
      stopFlashingTitle();
    }

    const cleanupVisibility = setupWakeLockVisibilityListener(() => isOnlineRef.current);
    return () => {
      cleanupVisibility();
      releaseScreenWakeLock();
      stopRepeatingChime();
      stopFlashingTitle();
    };
  }, [isOnline, isAdmin]);

  // 4. Supabase Realtime Subscription for Orders
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          // Play instant chime and alert on INSERT of placed order
          if (payload.eventType === 'INSERT' && payload.new) {
            const newOrder = payload.new as { status?: string };
            if (newOrder.status === 'placed' && isOnlineRef.current) {
              playOrderChime();
            }
          }
          // Refresh live queue
          await refreshOrders();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
        }
      });

    // Browser online/offline listeners
    const handleOnline = () => {
      setIsConnected(true);
      refreshOrders();
      refreshSettings();
    };
    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAdmin, refreshOrders, refreshSettings]);

  // Handle "I'm online" toggle
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    if (nextState) {
      const unlocked = await testAndUnlockAudio();
      setIsSoundBlocked(!unlocked);
      if (unlocked) {
        playOrderChime();
        showToast('Online: new order chimes and wake lock active');
      } else {
        showToast('Online: sound blocked by browser');
      }
    } else {
      showToast('Offline: order chimes paused');
    }
  };

  const handleUnlockSound = async () => {
    const unlocked = await testAndUnlockAudio();
    setIsSoundBlocked(!unlocked);
    if (unlocked) {
      playOrderChime();
      showToast('Sound enabled successfully');
    }
  };

  // Handle store open/closed switch
  const handleToggleStoreOpen = async () => {
    if (!settings || isTogglingStore) return;
    const nextState = !settings.store_open;
    setIsTogglingStore(true);

    // Optimistic update
    setSettings({ ...settings, store_open: nextState });

    const res = await updateStoreSettings({ store_open: nextState });
    setIsTogglingStore(false);

    if (res.success) {
      showToast(nextState ? 'Store is now OPEN for orders' : 'Store is now CLOSED');
    } else {
      // Rollback
      setSettings(settings);
      showToast(res.error || 'Failed to update store status');
    }
  };

  // Handle Order Status Transition
  const handleSetStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    setIsUpdating(true);
    const res = await adminSetOrderStatus(orderId, newStatus, reason);
    setIsUpdating(false);

    if (res.success) {
      showToast(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      await refreshOrders();
      // If order being packed was updated, close or update pack view
      if (packOrder && packOrder.id === orderId) {
        if (newStatus === 'packed' || newStatus === 'cancelled') {
          setPackOrder(null);
        }
      }
    } else {
      showToast(res.message || 'Failed to update order status');
    }
  };

  // Handle Payment Marking
  const handleSetPayment = async (orderId: string, status: PaymentStatus, paidVia?: PaidVia) => {
    setIsUpdating(true);
    const res = await adminSetPayment(orderId, status, paidVia);
    setIsUpdating(false);

    if (res.success) {
      showToast(status === 'paid' ? `Payment recorded (${paidVia?.toUpperCase()})` : 'Marked unpaid');
      await refreshOrders();
    } else {
      showToast(res.message || 'Failed to update payment');
    }
  };

  // Handle Item Removal before packing
  const handleRemoveItem = async (orderItemId: string) => {
    setIsUpdating(true);
    const res = await adminRemoveOrderItem(orderItemId);
    setIsUpdating(false);

    if (res.success) {
      showToast('Item removed. Stock zeroed and total recalculated.');
      await Promise.all([refreshOrders(), refreshProducts()]);
      // Update packOrder if currently open
      if (packOrder) {
        const updated = await fetchAdminOrders();
        const found = updated.find((o) => o.id === packOrder.id);
        setPackOrder(found || null);
      }
    } else {
      showToast(res.message || 'Failed to remove item');
    }
  };

  // Handle Stock Adjustment
  const handleAdjustStock = async (productId: string, delta: number): Promise<boolean> => {
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock_qty: Math.max(0, p.stock_qty + delta) } : p
      )
    );

    const res = await adminAdjustStock(productId, delta);
    if (res.success) {
      if (res.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? (res.product as ProductRow) : p))
        );
      }
      return true;
    } else {
      // Rollback
      await refreshProducts();
      showToast(res.message || 'Failed to adjust stock');
      return false;
    }
  };

  // Stealth 404 Guard: while verifying or if not admin
  if (isVerifyingAdmin || isAuthLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" />
      </div>
    );
  }

  // Non-admins get the identical 404 page
  if (!isAdmin) {
    return <NotFoundPage />;
  }

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'placed' || o.status === 'accepted' || o.status === 'packed' || o.status === 'out_for_delivery'
  ).length;

  const lowStockCount = products.filter((p) => p.stock_qty > 0 && p.stock_qty <= 3).length;

  return (
    <div className="min-h-screen bg-canvas flex flex-col selection:bg-brand-soft selection:text-brand">
      {/* Console Header */}
      <AdminHeader
        settings={settings}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        isSoundBlocked={isSoundBlocked}
        onUnlockSound={handleUnlockSound}
        isConnected={isConnected}
        activeOrdersCount={activeOrdersCount}
        lowStockCount={lowStockCount}
        onToggleStoreOpen={handleToggleStoreOpen}
        isTogglingStore={isTogglingStore}
        onSignOut={signOut}
      />

      {/* Main Content: Orders Queue or Stock Management */}
      <main className="flex-1 pb-16">
        {isLoadingData ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin mx-auto mb-3" />
            <p className="type-caption text-ink-2">Loading store data...</p>
          </div>
        ) : activeTab === 'orders' ? (
          <AdminOrdersTab
            orders={orders}
            onSetStatus={handleSetStatus}
            onSetPayment={handleSetPayment}
            onRemoveItem={handleRemoveItem}
            onOpenPackView={setPackOrder}
            isUpdating={isUpdating}
          />
        ) : activeTab === 'stock' ? (
          <AdminStockTab
            products={products}
            onAdjustStock={handleAdjustStock}
            isUpdating={isUpdating}
          />
        ) : activeTab === 'products' ? (
          <AdminProductsTab
            products={products}
            categories={categories}
            onRefreshProducts={refreshProducts}
          />
        ) : activeTab === 'categories' ? (
          <AdminCategoriesTab
            categories={categories}
            onRefreshCategories={refreshCategories}
          />
        ) : activeTab === 'settings' ? (
          <AdminSettingsTab
            settings={settings}
            deliveryPoints={deliveryPoints}
            onRefreshSettings={refreshSettings}
            onRefreshDeliveryPoints={refreshDeliveryPoints}
          />
        ) : activeTab === 'today' ? (
          <AdminTodayTab
            analytics={analytics}
            failedSearches={failedSearches}
            itemRequests={itemRequests}
            onNavigateToStock={() => setActiveTab('stock')}
            onRefreshAnalytics={refreshAnalytics}
          />
        ) : null}
      </main>

      {/* Full-Screen Pack View Modal */}
      {packOrder && (
        <AdminPackView
          order={packOrder}
          onClose={() => setPackOrder(null)}
          onMarkPacked={(orderId) => handleSetStatus(orderId, 'packed')}
          onRemoveItem={handleRemoveItem}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
};

export default AdminPage;
