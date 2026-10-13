-- Migration: 20261012100005_RESTORE_stock_check.sql
-- PURPOSE: Restore the stock check that was removed by the previous migration.
-- This restores place_order to its correct, secure implementation.

create or replace function public.place_order(
  p_client_request_id uuid,
  p_items jsonb,
  p_delivery_point_id uuid,
  p_room text,
  p_substitution_pref text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile record;
  v_settings record;
  v_dp record;
  v_existing_order record;
  v_now_ist time;
  v_is_open boolean;
  v_active_orders_count integer;
  v_missing_count integer;
  v_stock_issues jsonb := '[]'::jsonb;
  v_prod record;
  v_items_total integer := 0;
  v_delivery_fee integer := 0;
  v_grand_total integer := 0;
  v_created_order record;
begin
  -- Concurrency control: Transaction advisory lock on client_request_id
  -- Serializes simultaneous identical requests and prevents duplicate stock decrements
  perform pg_advisory_xact_lock(hashtext('place_order'), hashtext(p_client_request_id::text));

  -- Rule 1: Require a signed-in, non-anonymous user with a complete profile
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'You must be signed in to place an order.'
    );
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true then
    return jsonb_build_object(
      'success', false,
      'error', 'anonymous_user_not_allowed',
      'message', 'Anonymous users cannot place orders.'
    );
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or trim(coalesce(v_profile.full_name, '')) = '' or trim(coalesce(v_profile.phone, '')) = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_incomplete',
      'message', 'Please complete your name and phone number in your profile before placing an order.'
    );
  end if;

  -- Rule 10: Idempotency by client_request_id
  select * into v_existing_order from public.orders where client_request_id = p_client_request_id;
  if found then
    if v_existing_order.user_id = v_user_id then
      return jsonb_build_object(
        'success', true,
        'order', row_to_json(v_existing_order),
        'idempotent', true
      );
    else
      return jsonb_build_object(
        'success', false,
        'error', 'client_request_id_conflict',
        'message', 'Invalid client request id.'
      );
    end if;
  end if;

  -- Rule 2: Store open and hours check in Asia/Kolkata
  select * into v_settings from public.settings where id = 1;
  if not found or v_settings.store_open is not true then
    return jsonb_build_object(
      'success', false,
      'error', 'store_closed',
      'message', 'The store is currently closed.'
    );
  end if;

  v_now_ist := (now() at time zone 'Asia/Kolkata')::time;
  if v_settings.opens_at = v_settings.closes_at then
    v_is_open := true;
  elsif v_settings.opens_at < v_settings.closes_at then
    v_is_open := (v_now_ist >= v_settings.opens_at and v_now_ist < v_settings.closes_at);
  else
    -- Operating hours cross midnight (e.g. 18:00 to 01:00)
    v_is_open := (v_now_ist >= v_settings.opens_at or v_now_ist < v_settings.closes_at);
  end if;

  if not v_is_open then
    return jsonb_build_object(
      'success', false,
      'error', 'store_closed',
      'message', 'The store is closed outside operating hours.'
    );
  end if;

  -- Rule 3: Require an active delivery point
  select * into v_dp from public.delivery_points where id = p_delivery_point_id and is_active = true;
  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_delivery_point',
      'message', 'Selected delivery point is not active.'
    );
  end if;

  -- Room and substitution preference validation
  if trim(coalesce(p_room, '')) = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'missing_room',
      'message', 'Delivery room or location is required.'
    );
  end if;

  if p_substitution_pref not in ('call_me', 'replace_similar', 'remove_item') then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_substitution_pref',
      'message', 'Invalid substitution preference.'
    );
  end if;

  -- Rule 8: Max active orders per user
  select count(*) into v_active_orders_count
  from public.orders
  where user_id = v_user_id
    and status not in ('delivered', 'cancelled');

  if v_active_orders_count >= v_settings.max_active_orders_per_user then
    return jsonb_build_object(
      'success', false,
      'error', 'max_active_orders_reached',
      'message', 'You have reached the maximum number of active orders.'
    );
  end if;

  -- Validate items payload (must be non-empty JSON array)
  if p_items is null or jsonb_typeof(p_items) != 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'cart_empty',
      'message', 'Cart cannot be empty.'
    );
  end if;

  -- Verify all requested products exist
  with cart_items as (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'qty')::integer) as qty
    from jsonb_array_elements(p_items) as item
    group by 1
  )
  select count(*) into v_missing_count
  from cart_items c
  where not exists (
    select 1 from public.products p where p.id = c.product_id
  );

  if v_missing_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_product',
      'message', 'One or more products in your cart do not exist.'
    );
  end if;

  -- Rule 9: Lock products in ascending order to prevent deadlocks (CTE-based, zero temp tables)
  for v_prod in
    with cart_items as (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'qty')::integer) as qty
      from jsonb_array_elements(p_items) as item
      group by 1
    )
    select p.*, c.qty as item_qty
    from public.products p
    join cart_items c on c.product_id = p.id
    order by p.id asc
    for update of p
  loop
    -- Rule 4: Product active, qty between 1 and max_per_order, stock sufficient
    if v_prod.item_qty <= 0 then
      v_stock_issues := v_stock_issues || jsonb_build_object(
        'product_id', v_prod.id,
        'name', v_prod.name,
        'requested_qty', v_prod.item_qty,
        'available_qty', v_prod.stock_qty,
        'current_price', v_prod.price,
        'reason', 'invalid_quantity'
      );
    elsif v_prod.is_active is not true then
      v_stock_issues := v_stock_issues || jsonb_build_object(
        'product_id', v_prod.id,
        'name', v_prod.name,
        'requested_qty', v_prod.item_qty,
        'available_qty', 0,
        'current_price', v_prod.price,
        'reason', 'inactive'
      );
    elsif v_prod.item_qty > v_prod.max_per_order then
      v_stock_issues := v_stock_issues || jsonb_build_object(
        'product_id', v_prod.id,
        'name', v_prod.name,
        'requested_qty', v_prod.item_qty,
        'available_qty', v_prod.stock_qty,
        'current_price', v_prod.price,
        'reason', 'exceeds_max_per_order'
      );
    elsif v_prod.stock_qty < v_prod.item_qty then
      v_stock_issues := v_stock_issues || jsonb_build_object(
        'product_id', v_prod.id,
        'name', v_prod.name,
        'requested_qty', v_prod.item_qty,
        'available_qty', v_prod.stock_qty,
        'current_price', v_prod.price,
        'reason', 'insufficient_stock'
      );
    end if;
  end loop;

  -- Rule 11: On stock/item failure, change nothing and return machine-readable issues
  if jsonb_array_length(v_stock_issues) > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'stock_or_item_issue',
      'message', 'Some items in your cart have stock or availability changes.',
      'details', v_stock_issues
    );
  end if;

  -- Rule 5: Read prices from the products table at that moment
  with cart_items as (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'qty')::integer) as qty
    from jsonb_array_elements(p_items) as item
    group by 1
  )
  select sum(p.price * c.qty)
  into v_items_total
  from cart_items c
  join public.products p on p.id = c.product_id;

  -- Rule 6: Require items_total >= min_order_value
  if v_items_total < v_settings.min_order_value then
    return jsonb_build_object(
      'success', false,
      'error', 'min_order_value_not_met',
      'message', format('Minimum order value is ₹%s. Your items total is ₹%s.', v_settings.min_order_value, v_items_total),
      'min_order_value', v_settings.min_order_value,
      'items_total', v_items_total
    );
  end if;

  -- Rule 7: Delivery fee calculation
  if v_items_total >= v_settings.free_delivery_above then
    v_delivery_fee := 0;
  elsif v_dp.delivery_fee_override is not null then
    v_delivery_fee := v_dp.delivery_fee_override;
  else
    v_delivery_fee := v_settings.delivery_fee;
  end if;

  v_grand_total := v_items_total + v_delivery_fee;

  -- Rule 9: Decrement stock for every item in the same transaction
  with cart_items as (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'qty')::integer) as qty
    from jsonb_array_elements(p_items) as item
    group by 1
  )
  update public.products p
  set stock_qty = p.stock_qty - c.qty,
      updated_at = now()
  from cart_items c
  where p.id = c.product_id;

  -- Create order record
  insert into public.orders (
    order_no,
    client_request_id,
    user_id,
    status,
    delivery_point_id,
    room,
    customer_name,
    customer_phone,
    items_total,
    delivery_fee,
    grand_total,
    payment_method,
    payment_status,
    paid_via,
    substitution_pref,
    note,
    placed_at
  ) values (
    nextval('public.order_no_seq'),
    p_client_request_id,
    v_user_id,
    'placed',
    p_delivery_point_id,
    trim(p_room),
    v_profile.full_name,
    v_profile.phone,
    v_items_total,
    v_delivery_fee,
    v_grand_total,
    'pay_on_delivery',
    'unpaid',
    null,
    p_substitution_pref,
    nullif(trim(p_note), ''),
    now()
  ) returning * into v_created_order;

  -- Create order items snapshots
  with cart_items as (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'qty')::integer) as qty
    from jsonb_array_elements(p_items) as item
    group by 1
  )
  insert into public.order_items (
    order_id,
    product_id,
    name_snapshot,
    size_snapshot,
    unit_price,
    mrp,
    qty,
    line_total,
    removed
  )
  select
    v_created_order.id,
    p.id,
    p.name,
    p.size_label,
    p.price,
    p.mrp,
    c.qty,
    p.price * c.qty,
    false
  from cart_items c
  join public.products p on p.id = c.product_id;

  return jsonb_build_object(
    'success', true,
    'order', row_to_json(v_created_order)
  );
end;
$$;

revoke all on function public.place_order(uuid, jsonb, uuid, text, text, text) from public;
grant execute on function public.place_order(uuid, jsonb, uuid, text, text, text) to authenticated;
