import { supabase } from './supabase';
import type {
  OrderRow,
  OrderItemRow,
  OrderStatus,
  PaymentStatus,
  PaidVia,
  ProductRow,
  SettingsRow,
  CategoryRow,
  DeliveryPointRow,
  ItemRequestRow,
  SearchMissRow,
} from '@/types/database';

export type AdminOrderWithItems = OrderRow & {
  order_items: OrderItemRow[];
};

export interface TodayAnalyticsData {
  totalOrders: number;
  itemsSold: number;
  totalRevenue: number;
  upiRevenue: number;
  cashRevenue: number;
  aov: number;
  cancellationsCount: number;
  cancellationRate: number;
  hourlyOrders: Array<{ hourIST: number; count: number; revenue: number }>;
  topItems: Array<{ productId: string; name: string; qty: number; revenue: number }>;
  outOfStockCount: number;
  outOfStockProducts: ProductRow[];
}

/**
 * Checks if the current authenticated user is registered in public.admins.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) {
    return false;
  }

  const { data, error } = await supabase.rpc('is_admin');
  if (error || typeof data !== 'boolean') {
    return false;
  }
  return data;
}

/**
 * Fetches all orders with their order_items for store operators.
 */
export async function fetchAdminOrders(): Promise<AdminOrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('placed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as unknown as AdminOrderWithItems[]) ?? [];
}

/**
 * Advances order status or cancels an order with a reason.
 */
export async function adminSetOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  reason?: string
): Promise<{ success: boolean; order?: OrderRow; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_reason: reason || null,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  return data as unknown as { success: boolean; order?: OrderRow; error?: string; message?: string };
}

/**
 * Sets payment status and payment mode (UPI / Cash).
 */
export async function adminSetPayment(
  orderId: string,
  status: PaymentStatus,
  paidVia?: PaidVia | null
): Promise<{ success: boolean; order?: OrderRow; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('admin_set_payment', {
    p_order_id: orderId,
    p_status: status,
    p_paid_via: paidVia || null,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  return data as unknown as { success: boolean; order?: OrderRow; error?: string; message?: string };
}

/**
 * Removes an unavailable order item before packing. Zeroes stock and updates totals.
 */
export async function adminRemoveOrderItem(
  orderItemId: string
): Promise<{ success: boolean; order?: OrderRow; removed_item_id?: string; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('admin_remove_order_item', {
    p_order_item_id: orderItemId,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  return data as unknown as { success: boolean; order?: OrderRow; removed_item_id?: string; error?: string; message?: string };
}

/**
 * Adjusts product inventory stock by delta (+1, -1, or negative to zero out).
 */
export async function adminAdjustStock(
  productId: string,
  delta: number
): Promise<{ success: boolean; product?: ProductRow; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('admin_adjust_stock', {
    p_product_id: productId,
    p_delta: delta,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  return data as unknown as { success: boolean; product?: ProductRow; error?: string; message?: string };
}

/**
 * Fetches all products for the Stock tab.
 */
export async function fetchAdminProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ProductRow[]) ?? [];
}

/**
 * Fetches store settings (hours, store_open switch, fees).
 */
export async function fetchAdminSettings(): Promise<SettingsRow | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SettingsRow) ?? null;
}

/**
 * Updates store settings (store_open switch, operating hours).
 */
export async function updateStoreSettings(
  updates: Partial<SettingsRow>
): Promise<{ success: boolean; settings?: SettingsRow; error?: string }> {
  const { data, error } = await supabase
    .from('settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, settings: data as SettingsRow };
}

/**
 * Computes business day range (06:00 to 06:00 Asia/Kolkata) per SPEC Section 10.
 */
export function getBusinessDayRangeIST(): { startMs: number; endMs: number } {
  // Current time in IST offset (+05:30 = +330 mins)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcMs + 330 * 60000);

  const istHour = istDate.getHours();
  // If hour < 6, business day began at 06:00 yesterday in IST
  const baseDay = new Date(istDate);
  if (istHour < 6) {
    baseDay.setDate(baseDay.getDate() - 1);
  }

  baseDay.setHours(6, 0, 0, 0);
  // Convert IST 06:00 back to UTC timestamp
  const startMs = baseDay.getTime() - 330 * 60000;
  const endMs = startMs + 24 * 60 * 60 * 1000;

  return { startMs, endMs };
}

/**
 * Checks if a UTC timestamp belongs to today's 06:00–06:00 IST business day.
 */
export function isTodayBusinessDay(timestampUtc: string | null | undefined): boolean {
  if (!timestampUtc) return false;
  const timeMs = new Date(timestampUtc).getTime();
  const { startMs, endMs } = getBusinessDayRangeIST();
  return timeMs >= startMs && timeMs < endMs;
}

/**
 * Formats a UTC timestamp into 12-hour Asia/Kolkata time (e.g. "6:30 pm").
 */
export function formatISTTime(timestampUtc: string | null | undefined): string {
  if (!timestampUtc) return '';
  const date = new Date(timestampUtc);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

/**
 * Formats database TIME strings ("18:00:00") into readable 12-hour strings (e.g. "6:00 pm").
 */
export function formatTimeSlot(timeStr: string): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const h = parseInt(hourStr, 10);
  const m = minStr || '00';
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${ampm}`;
}

/**
 * Formats operating hours (e.g. "6:00 pm – 1:00 am").
 */
export function formatISTHours(opensAt: string, closesAt: string): string {
  if (!opensAt || !closesAt) return '';
  return `${formatTimeSlot(opensAt)} – ${formatTimeSlot(closesAt)}`;
}

/**
 * Computes elapsed minutes since an order was placed.
 */
export function getElapsedMinutes(placedAtUtc: string): number {
  const diffMs = Date.now() - new Date(placedAtUtc).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/**
 * Returns color classes and labels based on elapsed time per SPEC Section 10:
 * amber after 5 mins, red after 10 mins.
 */
export function getTimingBadge(minutes: number): {
  colorClass: string;
  badgeBg: string;
  badgeBorder: string;
  label: string;
} {
  if (minutes >= 10) {
    return {
      colorClass: 'text-danger font-bold',
      badgeBg: 'bg-red-50 text-danger border-red-200',
      badgeBorder: 'border-danger',
      label: `${minutes}m ago`,
    };
  }
  if (minutes >= 5) {
    return {
      colorClass: 'text-warning font-semibold',
      badgeBg: 'bg-amber-50 text-warning border-amber-200',
      badgeBorder: 'border-warning',
      label: `${minutes}m ago`,
    };
  }
  return {
    colorClass: 'text-ink-2',
    badgeBg: 'bg-canvas text-ink-2 border-line',
    badgeBorder: 'border-line',
    label: `${minutes}m ago`,
  };
}

/**
 * ── PRODUCTS CRUD ──
 */

export async function upsertProduct(
  product: Partial<ProductRow>
): Promise<{ success: boolean; product?: ProductRow; error?: string }> {
  const isNew = !product.id;
  const now = new Date().toISOString();

  const payload: Partial<ProductRow> = {
    ...product,
    updated_at: now,
  };
  if (isNew) {
    payload.created_at = now;
  }

  const { data, error } = await supabase
    .from('products')
    .upsert(payload as ProductRow, { onConflict: 'sku' })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, product: data as ProductRow };
}

export async function deactivateProduct(
  productId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function bulkUpsertProducts(
  products: Partial<ProductRow>[]
): Promise<{ success: boolean; created: number; updated: number; errors: string[] }> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  // Check existing SKUs to distinguish created vs updated
  const { data: existing } = await supabase.from('products').select('sku');
  const existingSkus = new Set((existing || []).map((p) => p.sku.toUpperCase()));

  for (const prod of products) {
    try {
      const isExisting = prod.sku && existingSkus.has(prod.sku.toUpperCase());
      const res = await upsertProduct(prod);
      if (res.success) {
        if (isExisting) {
          updated++;
        } else {
          created++;
        }
      } else {
        errors.push(`SKU ${prod.sku}: ${res.error}`);
      }
    } catch (err) {
      errors.push(`SKU ${prod.sku}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    created,
    updated,
    errors,
  };
}

/**
 * ── CATEGORIES CRUD ──
 */

export async function fetchAdminCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]) ?? [];
}

export async function upsertCategory(
  category: Partial<CategoryRow>
): Promise<{ success: boolean; category?: CategoryRow; error?: string }> {
  const { data, error } = await supabase
    .from('categories')
    .upsert(category as CategoryRow, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, category: data as CategoryRow };
}

export async function reorderCategories(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Reordering failed' };
  }
}

/**
 * ── DELIVERY POINTS CRUD ──
 */

export async function fetchAdminDeliveryPoints(): Promise<DeliveryPointRow[]> {
  const { data, error } = await supabase
    .from('delivery_points')
    .select('*')
    .order('campus', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as DeliveryPointRow[]) ?? [];
}

export async function upsertDeliveryPoint(
  dp: Partial<DeliveryPointRow>
): Promise<{ success: boolean; deliveryPoint?: DeliveryPointRow; error?: string }> {
  const { data, error } = await supabase
    .from('delivery_points')
    .upsert(dp as DeliveryPointRow)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, deliveryPoint: data as DeliveryPointRow };
}

export async function toggleDeliveryPointActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('delivery_points')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function reorderDeliveryPoints(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('delivery_points')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Reordering failed' };
  }
}

/**
 * ── TODAY ANALYTICS & REPORTS ──
 */

export async function fetchTodayAnalytics(): Promise<TodayAnalyticsData> {
  const { startMs, endMs } = getBusinessDayRangeIST();
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  // Fetch orders placed in today's business day
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('placed_at', startIso)
    .lt('placed_at', endIso);

  if (ordersErr) throw ordersErr;

  const orderList = (orders as unknown as AdminOrderWithItems[]) || [];

  let totalRevenue = 0;
  let upiRevenue = 0;
  let cashRevenue = 0;
  let itemsSold = 0;
  let cancellationsCount = 0;
  const nonCancelledOrders: AdminOrderWithItems[] = [];

  // 24 Hourly buckets (0 to 23 hours in IST)
  const hourlyMap = new Map<number, { count: number; revenue: number }>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { count: 0, revenue: 0 });
  }

  // Aggregate items across non-cancelled orders
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();

  for (const o of orderList) {
    // Determine IST hour
    const date = new Date(o.placed_at);
    const istTimeStr = date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    const istHour = parseInt(istTimeStr.split(':')[0], 10);

    const bucket = hourlyMap.get(istHour) || { count: 0, revenue: 0 };
    bucket.count++;

    if (o.status === 'cancelled') {
      cancellationsCount++;
    } else {
      nonCancelledOrders.push(o);
      totalRevenue += o.grand_total;
      bucket.revenue += o.grand_total;

      if (o.paid_via === 'upi' || (o.payment_status === 'paid' && !o.paid_via)) {
        upiRevenue += o.grand_total;
      } else if (o.paid_via === 'cash') {
        cashRevenue += o.grand_total;
      }

      for (const it of o.order_items) {
        if (!it.removed) {
          itemsSold += it.qty;
          const prev = itemMap.get(it.product_id) || { name: it.name_snapshot, qty: 0, revenue: 0 };
          prev.qty += it.qty;
          prev.revenue += it.line_total;
          itemMap.set(it.product_id, prev);
        }
      }
    }
  }

  const totalOrders = orderList.length;
  const validOrdersCount = nonCancelledOrders.length;
  const aov = validOrdersCount > 0 ? Math.round(totalRevenue / validOrdersCount) : 0;
  const cancellationRate = totalOrders > 0 ? Math.round((cancellationsCount / totalOrders) * 100) : 0;

  // Hourly array ordered from 06:00 IST to 05:00 IST next day
  const hourlyOrders: Array<{ hourIST: number; count: number; revenue: number }> = [];
  for (let i = 0; i < 24; i++) {
    const h = (6 + i) % 24;
    const stats = hourlyMap.get(h) || { count: 0, revenue: 0 };
    hourlyOrders.push({ hourIST: h, count: stats.count, revenue: stats.revenue });
  }

  // Top 10 items
  const topItems = Array.from(itemMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 10);

  // Out of stock products
  const { data: prods } = await supabase
    .from('products')
    .select('*')
    .eq('stock_qty', 0)
    .order('name', { ascending: true });

  const outOfStockProducts = (prods as ProductRow[]) || [];

  return {
    totalOrders,
    itemsSold,
    totalRevenue,
    upiRevenue,
    cashRevenue,
    aov,
    cancellationsCount,
    cancellationRate,
    hourlyOrders,
    topItems,
    outOfStockCount: outOfStockProducts.length,
    outOfStockProducts,
  };
}

export async function fetchFailedSearches7Days(): Promise<
  Array<{ query: string; count: number; last_at: string }>
> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('search_misses')
    .select('*')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const groupMap = new Map<string, { count: number; last_at: string }>();
  for (const item of (data as SearchMissRow[]) || []) {
    const q = item.query.toLowerCase().trim();
    const prev = groupMap.get(q) || { count: 0, last_at: item.created_at };
    prev.count++;
    if (new Date(item.created_at) > new Date(prev.last_at)) {
      prev.last_at = item.created_at;
    }
    groupMap.set(q, prev);
  }

  return Array.from(groupMap.entries())
    .map(([query, d]) => ({ query, count: d.count, last_at: d.last_at }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

export async function fetchItemRequests(): Promise<ItemRequestRow[]> {
  const { data, error } = await supabase
    .from('item_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data as ItemRequestRow[]) || [];
}

export async function fetchOrdersForDateRange(
  startUtc: string,
  endUtc: string
): Promise<AdminOrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('placed_at', startUtc)
    .lte('placed_at', endUtc)
    .order('placed_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as AdminOrderWithItems[]) || [];
}
