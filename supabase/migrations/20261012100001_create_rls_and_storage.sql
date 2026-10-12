-- Migration: 20261012100001_create_rls_and_storage.sql
-- Description: Row Level Security on every table, storage bucket policies, and Realtime setup.
-- Spec: docs/SPEC.md Section 11 (Security) and AGENTS.md rules

-- 1. Helper function is_admin()
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- 2. Enable Row Level Security on every table
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_points enable row level security;
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.search_misses enable row level security;
alter table public.item_requests enable row level security;
alter table public.client_errors enable row level security;

-- 3. RLS Policies: categories
-- Anyone can read active categories; Admins can read all.
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete
  to authenticated
  using (public.is_admin());

-- 4. RLS Policies: products
-- Anyone can read active products; Admins can read all.
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete
  to authenticated
  using (public.is_admin());

-- 5. RLS Policies: delivery_points
-- Anyone can read active delivery points; Admins can read all.
drop policy if exists delivery_points_select on public.delivery_points;
create policy delivery_points_select on public.delivery_points
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists delivery_points_insert on public.delivery_points;
create policy delivery_points_insert on public.delivery_points
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists delivery_points_update on public.delivery_points;
create policy delivery_points_update on public.delivery_points
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists delivery_points_delete on public.delivery_points;
create policy delivery_points_delete on public.delivery_points
  for delete
  to authenticated
  using (public.is_admin());

-- 6. RLS Policies: profiles
-- Users can read and update their own profile; Admins can read all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- 7. RLS Policies: admins
-- Authenticated users can check their own admin status; Admins can view all.
-- No client write policies: rows are added strictly by hand in Supabase dashboard.
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 8. RLS Policies: settings
-- Anyone can read settings; only Admins can update. Singleton row cannot be deleted.
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 9. RLS Policies: orders
-- Users can read only their own orders; Admins can read all.
-- No direct client insert, update, or delete: all writes occur through audited SECURITY DEFINER functions.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 10. RLS Policies: order_items
-- Users can read order items belonging to their own orders; Admins can read all.
-- No direct client insert, update, or delete.
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- 11. RLS Policies: search_misses
-- Anyone can insert within length limit; only Admins can read or delete.
drop policy if exists search_misses_select on public.search_misses;
create policy search_misses_select on public.search_misses
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists search_misses_insert on public.search_misses;
create policy search_misses_insert on public.search_misses
  for insert
  to anon, authenticated
  with check (char_length(query) <= 80);

drop policy if exists search_misses_delete on public.search_misses;
create policy search_misses_delete on public.search_misses
  for delete
  to authenticated
  using (public.is_admin());

-- 12. RLS Policies: item_requests
-- Anyone can insert within length limit; only Admins can read or delete.
drop policy if exists item_requests_select on public.item_requests;
create policy item_requests_select on public.item_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists item_requests_insert on public.item_requests;
create policy item_requests_insert on public.item_requests
  for insert
  to anon, authenticated
  with check (char_length(text) <= 120);

drop policy if exists item_requests_delete on public.item_requests;
create policy item_requests_delete on public.item_requests
  for delete
  to authenticated
  using (public.is_admin());

-- 13. RLS Policies: client_errors
-- Anyone can insert within length limit; only Admins can read or delete.
drop policy if exists client_errors_select on public.client_errors;
create policy client_errors_select on public.client_errors
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors
  for insert
  to anon, authenticated
  with check (char_length(message) <= 500);

drop policy if exists client_errors_delete on public.client_errors;
create policy client_errors_delete on public.client_errors
  for delete
  to authenticated
  using (public.is_admin());

-- 14. Storage bucket: product-images
-- Public read, admin-only write.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists storage_product_images_select on storage.objects;
create policy storage_product_images_select on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists storage_product_images_insert on storage.objects;
create policy storage_product_images_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists storage_product_images_update on storage.objects;
create policy storage_product_images_update on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists storage_product_images_delete on storage.objects;
create policy storage_product_images_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- 15. Realtime: Enabled on orders only
alter table public.orders replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
