import { supabase } from './supabase';
import type { OrderRow, OrderItemRow } from '@/types/database';
import type { SubstitutionPref } from '@/types/database';

export interface PlaceOrderItemInput {
  product_id: string;
  qty: number;
}

export interface PlaceOrderInput {
  client_request_id: string;
  items: PlaceOrderItemInput[];
  delivery_point_id: string;
  room: string;
  substitution_pref: SubstitutionPref;
  note?: string | null;
}

export interface PlaceOrderSuccess {
  success: true;
  order: OrderRow;
  idempotent?: boolean;
}

export interface StockIssueDetail {
  product_id: string;
  name: string;
  requested_qty: number;
  available_qty: number;
  current_price: number;
  reason: 'invalid_quantity' | 'inactive' | 'exceeds_max_per_order' | 'insufficient_stock';
}

export interface PlaceOrderFailure {
  success: false;
  error: string;
  message: string;
  details?: StockIssueDetail[];
  min_order_value?: number;
  items_total?: number;
}

export type PlaceOrderResult = PlaceOrderSuccess | PlaceOrderFailure;

/**
 * Places an order via the PostgreSQL transaction-safe place_order RPC function.
 * Enforces stock, prices, minimum order value, operating hours, and idempotency.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { data, error } = await supabase.rpc('place_order', {
    p_client_request_id: input.client_request_id,
    p_items: input.items as unknown as import('@/types/database').Json,
    p_delivery_point_id: input.delivery_point_id,
    p_room: input.room,
    p_substitution_pref: input.substitution_pref,
    p_note: input.note || null,
  });

  if (error) {
    return {
      success: false,
      error: 'rpc_error',
      message: error.message,
    };
  }

  return data as unknown as PlaceOrderResult;
}

/**
 * Cancels an order via the PostgreSQL cancel_my_order RPC function.
 * Allowed only while the order is in 'placed' status. Restores inventory stock.
 */
export async function cancelMyOrder(orderId: string): Promise<{
  success: boolean;
  order?: OrderRow;
  error?: string;
  message?: string;
}> {
  const { data, error } = await supabase.rpc('cancel_my_order', {
    p_order_id: orderId,
  });

  if (error) {
    return {
      success: false,
      error: 'rpc_error',
      message: error.message,
    };
  }

  return data as unknown as {
    success: boolean;
    order?: OrderRow;
    error?: string;
    message?: string;
  };
}

export type CustomerOrderWithItems = OrderRow & {
  order_items: OrderItemRow[];
};

/**
 * Fetches order history for the authenticated customer, newest first.
 */
export async function fetchCustomerOrders(): Promise<CustomerOrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('placed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as unknown as CustomerOrderWithItems[]) ?? [];
}

/**
 * Fetches a single order by ID along with its order_items.
 */
export async function fetchOrderDetails(
  orderId: string
): Promise<{ order: OrderRow; items: OrderItemRow[] } | null> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    throw orderErr;
  }

  if (!order) {
    return null;
  }

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('name_snapshot', { ascending: true });

  if (itemsErr) {
    throw itemsErr;
  }

  return {
    order,
    items: items ?? [],
  };
}

/**
 * Subscribes to Realtime UPDATE events on a specific order.
 */
export function subscribeToOrderUpdates(
  orderId: string,
  onUpdate: (order: OrderRow) => void
): () => void {
  const channel = supabase
    .channel(`order-status-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as OrderRow);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
