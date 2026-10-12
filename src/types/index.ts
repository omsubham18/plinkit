export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  tintIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  category_id: string;
  subcategory?: string;
  name: string;
  brand: string;
  size_label: string;
  mrp: number;
  price: number;
  stock_qty: number;
  max_per_order?: number;
  image_url?: string;
  description?: string;
  manufacturer?: string;
  country_of_origin?: string;
  rail?: 'late_night' | 'bestsellers' | 'new' | null;
  is_active: boolean;
}

export interface DeliveryPoint {
  id: string;
  campus: string;
  name: string;
  eta_minutes: number;
  delivery_fee_override?: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  time?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}
