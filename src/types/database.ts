export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pay_on_delivery';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaidVia = 'upi' | 'cash';
export type SubstitutionPref = 'call_me' | 'replace_similar' | 'remove_item';
export type ProductRail = 'late_night' | 'bestsellers' | 'new';

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          image_url: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          image_url: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          image_url?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          category_id: string;
          subcategory: string | null;
          name: string;
          brand: string;
          size_label: string;
          mrp: number;
          price: number;
          stock_qty: number;
          max_per_order: number;
          image_url: string | null;
          keywords: string[];
          description: string | null;
          manufacturer: string | null;
          country_of_origin: string;
          rail: ProductRail | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          category_id: string;
          subcategory?: string | null;
          name: string;
          brand: string;
          size_label: string;
          mrp: number;
          price: number;
          stock_qty?: number;
          max_per_order?: number;
          image_url?: string | null;
          keywords?: string[];
          description?: string | null;
          manufacturer?: string | null;
          country_of_origin?: string;
          rail?: ProductRail | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          category_id?: string;
          subcategory?: string | null;
          name?: string;
          brand?: string;
          size_label?: string;
          mrp?: number;
          price?: number;
          stock_qty?: number;
          max_per_order?: number;
          image_url?: string | null;
          keywords?: string[];
          description?: string | null;
          manufacturer?: string | null;
          country_of_origin?: string;
          rail?: ProductRail | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_points: {
        Row: {
          id: string;
          campus: string;
          name: string;
          eta_minutes: number;
          delivery_fee_override: number | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          campus: string;
          name: string;
          eta_minutes: number;
          delivery_fee_override?: number | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          campus?: string;
          name?: string;
          eta_minutes?: number;
          delivery_fee_override?: number | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          delivery_point_id: string | null;
          room: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone: string;
          delivery_point_id?: string | null;
          room?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          delivery_point_id?: string | null;
          room?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_delivery_point_id_fkey';
            columns: ['delivery_point_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_points';
            referencedColumns: ['id'];
          },
        ];
      };
      admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          store_open: boolean;
          opens_at: string;
          closes_at: string;
          min_order_value: number;
          delivery_fee: number;
          free_delivery_above: number;
          max_active_orders_per_user: number;
          support_phone: string;
          notice_text: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          store_open?: boolean;
          opens_at?: string;
          closes_at?: string;
          min_order_value?: number;
          delivery_fee?: number;
          free_delivery_above?: number;
          max_active_orders_per_user?: number;
          support_phone?: string;
          notice_text?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          store_open?: boolean;
          opens_at?: string;
          closes_at?: string;
          min_order_value?: number;
          delivery_fee?: number;
          free_delivery_above?: number;
          max_active_orders_per_user?: number;
          support_phone?: string;
          notice_text?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_no: number;
          client_request_id: string;
          user_id: string;
          status: OrderStatus;
          delivery_point_id: string;
          room: string;
          customer_name: string;
          customer_phone: string;
          items_total: number;
          delivery_fee: number;
          grand_total: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          paid_via: PaidVia | null;
          substitution_pref: SubstitutionPref;
          note: string | null;
          cancel_reason: string | null;
          placed_at: string;
          accepted_at: string | null;
          packed_at: string | null;
          out_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          order_no?: number;
          client_request_id: string;
          user_id: string;
          status?: OrderStatus;
          delivery_point_id: string;
          room: string;
          customer_name: string;
          customer_phone: string;
          items_total: number;
          delivery_fee: number;
          grand_total: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          paid_via?: PaidVia | null;
          substitution_pref: SubstitutionPref;
          note?: string | null;
          cancel_reason?: string | null;
          placed_at?: string;
          accepted_at?: string | null;
          packed_at?: string | null;
          out_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          order_no?: number;
          client_request_id?: string;
          user_id?: string;
          status?: OrderStatus;
          delivery_point_id?: string;
          room?: string;
          customer_name?: string;
          customer_phone?: string;
          items_total?: number;
          delivery_fee?: number;
          grand_total?: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          paid_via?: PaidVia | null;
          substitution_pref?: SubstitutionPref;
          note?: string | null;
          cancel_reason?: string | null;
          placed_at?: string;
          accepted_at?: string | null;
          packed_at?: string | null;
          out_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_delivery_point_id_fkey';
            columns: ['delivery_point_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_points';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          name_snapshot: string;
          size_snapshot: string;
          unit_price: number;
          mrp: number;
          qty: number;
          line_total: number;
          removed: boolean;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          name_snapshot: string;
          size_snapshot: string;
          unit_price: number;
          mrp: number;
          qty: number;
          line_total: number;
          removed?: boolean;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          name_snapshot?: string;
          size_snapshot?: string;
          unit_price?: number;
          mrp?: number;
          qty?: number;
          line_total?: number;
          removed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      search_misses: {
        Row: {
          id: string;
          query: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          query: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          query?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      item_requests: {
        Row: {
          id: string;
          text: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          text?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_errors: {
        Row: {
          id: string;
          message: string;
          route: string | null;
          user_agent: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message: string;
          route?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message?: string;
          route?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      place_order: {
        Args: {
          p_client_request_id: string;
          p_items: Json;
          p_delivery_point_id: string;
          p_room: string;
          p_substitution_pref: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      cancel_my_order: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      admin_set_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      admin_adjust_stock: {
        Args: {
          p_product_id: string;
          p_delta: number;
        };
        Returns: Json;
      };
      admin_set_payment: {
        Args: {
          p_order_id: string;
          p_status: string;
          p_paid_via?: string | null;
        };
        Returns: Json;
      };
      admin_remove_order_item: {
        Args: {
          p_order_item_id: string;
        };
        Returns: Json;
      };
    };
  };
}

// Convenience Row aliases
export type CategoryRow = Database['public']['Tables']['categories']['Row'];
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type DeliveryPointRow = Database['public']['Tables']['delivery_points']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type SettingsRow = Database['public']['Tables']['settings']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
