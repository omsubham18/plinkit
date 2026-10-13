import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

export interface CartLineItem {
  product: Product;
  qty: number;
  lineTotal: number;
  savings: number;
}

interface CartState {
  items: Record<string, number>; // productId -> quantity
  addItem: (product: Product, onCapReached?: (reason: string) => void) => boolean;
  increment: (product: Product, onCapReached?: (reason: string) => void) => boolean;
  decrement: (productId: string) => void;
  removeItem: (productId: string) => void;
  setItemQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  getItemQty: (productId: string) => number;
  reconcile: (products: Product[]) => string[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},

      getItemQty: (productId: string) => {
        return get().items[productId] || 0;
      },

      addItem: (product: Product, onCapReached?: (reason: string) => void) => {
        return get().increment(product, onCapReached);
      },

      increment: (product: Product, onCapReached?: (reason: string) => void) => {
        const currentQty = get().items[product.id] || 0;
        const maxPerOrder = product.max_per_order ?? 5;
        const stock = product.stock_qty;

        if (stock <= 0) {
          onCapReached?.(`${product.name} is out of stock`);
          return false;
        }

        if (currentQty >= stock) {
          onCapReached?.(`Only ${stock} available in stock`);
          return false;
        }

        if (currentQty >= maxPerOrder) {
          onCapReached?.(`Maximum order limit is ${maxPerOrder}`);
          return false;
        }

        set((state) => ({
          items: {
            ...state.items,
            [product.id]: currentQty + 1,
          },
        }));
        return true;
      },

      decrement: (productId: string) => {
        const currentQty = get().items[productId] || 0;
        if (currentQty <= 1) {
          set((state) => {
            const next = { ...state.items };
            delete next[productId];
            return { items: next };
          });
        } else {
          set((state) => ({
            items: {
              ...state.items,
              [productId]: currentQty - 1,
            },
          }));
        }
      },

      removeItem: (productId: string) => {
        set((state) => {
          const next = { ...state.items };
          delete next[productId];
          return { items: next };
        });
      },

      setItemQty: (productId: string, qty: number) => {
        if (qty <= 0) {
          get().removeItem(productId);
        } else {
          set((state) => ({
            items: {
              ...state.items,
              [productId]: qty,
            },
          }));
        }
      },

      clearCart: () => {
        set({ items: {} });
      },

      /**
       * Reconciles cart against latest catalogue products.
       * Runs after every refresh (on focus, every 60s, or on cold start).
       */
      reconcile: (products: Product[]) => {
        const currentItems = get().items;
        const nextItems = { ...currentItems };
        const notifications: string[] = [];
        const productMap = new Map<string, Product>();

        for (const p of products) {
          productMap.set(p.id, p);
        }

        let changed = false;

        for (const [productId, qty] of Object.entries(currentItems)) {
          const product = productMap.get(productId);

          // 1. If product is missing or inactive or out of stock: remove
          if (!product || !product.is_active || product.stock_qty <= 0) {
            delete nextItems[productId];
            changed = true;
            const name = product ? product.name : 'An item';
            notifications.push(`${name} is out of stock. We removed it from your cart.`);
            continue;
          }

          // 2. If quantity exceeds current stock: clamp
          if (qty > product.stock_qty) {
            nextItems[productId] = product.stock_qty;
            changed = true;
            notifications.push(
              `Adjusted ${product.name} quantity to ${product.stock_qty} due to limited stock.`
            );
            continue;
          }

          // 3. If quantity exceeds max_per_order: clamp
          const maxPerOrder = product.max_per_order ?? 5;
          if (qty > maxPerOrder) {
            nextItems[productId] = maxPerOrder;
            changed = true;
            notifications.push(
              `Adjusted ${product.name} quantity to ${maxPerOrder} due to order limit.`
            );
          }
        }

        if (changed) {
          set({ items: nextItems });
        }

        return notifications;
      },
    }),
    {
      name: 'plinkit-cart',
    }
  )
);

/**
 * Helper to compute cart totals and line items from products list
 */
export function getCartSummary(
  items: Record<string, number>,
  products: Product[]
): {
  totalCount: number;
  itemsTotal: number;
  totalSavings: number;
  lineItems: CartLineItem[];
} {
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  let totalCount = 0;
  let itemsTotal = 0;
  let totalSavings = 0;
  const lineItems: CartLineItem[] = [];

  for (const [productId, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    const product = productMap.get(productId);
    if (!product) continue;

    const lineTotal = product.price * qty;
    const savings = Math.max(0, (product.mrp - product.price) * qty);

    totalCount += qty;
    itemsTotal += lineTotal;
    totalSavings += savings;

    lineItems.push({
      product,
      qty,
      lineTotal,
      savings,
    });
  }

  return {
    totalCount,
    itemsTotal,
    totalSavings,
    lineItems,
  };
}
