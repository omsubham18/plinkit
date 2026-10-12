-- Migration: 20261012100000_create_schema_and_tables.sql
-- Description: Core schema, tables, constraints, foreign keys, and indexes for plinkit.
-- Spec: docs/SPEC.md Section 5 (Data model)

-- 1. Sequence for human-readable order numbers (starts at 1001)
create sequence if not exists public.order_no_seq start with 1001;

-- 2. categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index if not exists idx_categories_active_sort
  on public.categories (is_active, sort_order);

-- 3. products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory text,
  name text not null,
  brand text not null,
  size_label text not null,
  mrp integer not null check (mrp > 0),
  price integer not null check (price > 0 and price <= mrp),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  max_per_order integer not null default 5 check (max_per_order > 0),
  image_url text,
  keywords text[] not null default '{}',
  description text,
  manufacturer text,
  country_of_origin text not null default 'India',
  rail text check (rail is null or rail in ('late_night', 'bestsellers', 'new')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category
  on public.products (category_id, is_active);

create index if not exists idx_products_active_rail
  on public.products (is_active, rail);

create index if not exists idx_products_stock
  on public.products (stock_qty)
  where is_active = true;

-- 4. delivery_points table
create table if not exists public.delivery_points (
  id uuid primary key default gen_random_uuid(),
  campus text not null,
  name text not null,
  eta_minutes integer not null check (eta_minutes > 0),
  delivery_fee_override integer check (delivery_fee_override is null or delivery_fee_override >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index if not exists idx_delivery_points_active
  on public.delivery_points (is_active, sort_order);

-- 5. profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  delivery_point_id uuid references public.delivery_points(id) on delete set null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. admins table
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7. settings table (singleton row pattern)
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  store_open boolean not null default true,
  opens_at time not null default '18:00:00',
  closes_at time not null default '01:00:00',
  min_order_value integer not null default 99 check (min_order_value >= 0),
  delivery_fee integer not null default 15 check (delivery_fee >= 0),
  free_delivery_above integer not null default 299 check (free_delivery_above >= 0),
  max_active_orders_per_user integer not null default 2 check (max_active_orders_per_user > 0),
  support_phone text not null default '',
  notice_text text,
  updated_at timestamptz not null default now()
);

-- 8. orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no integer not null unique default nextval('public.order_no_seq'),
  client_request_id uuid not null unique,
  user_id uuid not null references auth.users(id),
  status text not null default 'placed' check (status in ('placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_point_id uuid not null references public.delivery_points(id),
  room text not null,
  customer_name text not null,
  customer_phone text not null,
  items_total integer not null check (items_total >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  grand_total integer not null check (grand_total >= 0),
  payment_method text not null default 'pay_on_delivery' check (payment_method = 'pay_on_delivery'),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  paid_via text check (paid_via is null or paid_via in ('upi', 'cash')),
  substitution_pref text not null check (substitution_pref in ('call_me', 'replace_similar', 'remove_item')),
  note text,
  cancel_reason text,
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  packed_at timestamptz,
  out_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists idx_orders_user_placed
  on public.orders (user_id, placed_at desc);

create index if not exists idx_orders_status_placed
  on public.orders (status, placed_at desc);

create index if not exists idx_orders_active_user
  on public.orders (user_id)
  where status not in ('delivered', 'cancelled');

-- 9. order_items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name_snapshot text not null,
  size_snapshot text not null,
  unit_price integer not null check (unit_price > 0),
  mrp integer not null check (mrp >= unit_price),
  qty integer not null check (qty > 0),
  line_total integer not null check (line_total = unit_price * qty),
  removed boolean not null default false
);

create index if not exists idx_order_items_order
  on public.order_items (order_id);

create index if not exists idx_order_items_product
  on public.order_items (product_id);

-- 10. search_misses table (insert-only telemetry, query <= 80 chars)
create table if not exists public.search_misses (
  id uuid primary key default gen_random_uuid(),
  query text not null check (char_length(query) <= 80),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_misses_created
  on public.search_misses (created_at desc);

-- 11. item_requests table (insert-only telemetry, text <= 120 chars)
create table if not exists public.item_requests (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) <= 120),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_item_requests_created
  on public.item_requests (created_at desc);

-- 12. client_errors table (insert-only telemetry, message <= 500 chars)
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) <= 500),
  route text,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_errors_created
  on public.client_errors (created_at desc);
