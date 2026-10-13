-- Migration: 20261013100000_order_notifications_trigger.sql
-- Description: Asynchronously triggers notify-order Edge Function on new order creation and cancellation.
-- Spec: docs/SPEC.md Section 3 (Scope item 15: Alerts on Telegram) & Prompt 10

-- 1. Enable pg_net extension for async HTTP calls
create extension if not exists pg_net with schema extensions;

-- 2. Create trigger function with strict exception guard
create or replace function public.on_order_created_or_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event text;
  v_payload jsonb;
begin
  -- Identify event: new order creation or status change to cancelled
  if (TG_OP = 'INSERT') then
    v_event := 'order_created';
  elsif (TG_OP = 'UPDATE' and new.status = 'cancelled' and (old.status is null or old.status != 'cancelled')) then
    v_event := 'order_cancelled';
  else
    return new;
  end if;

  -- Build payload with order_id and event type
  v_payload := jsonb_build_object(
    'order_id', new.id,
    'event', v_event,
    'type', TG_OP,
    'record', jsonb_build_object(
      'id', new.id,
      'order_no', new.order_no,
      'status', new.status,
      'cancel_reason', new.cancel_reason
    )
  );

  -- Asynchronously post to notify-order edge function
  -- Exception guard: Telegram or HTTP failures must NEVER block or fail order placement.
  begin
    perform net.http_post(
      url := 'https://kiqjchkdhmdqxdqomeho.supabase.co/functions/v1/notify-order',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := v_payload,
      timeout_milliseconds := 5000
    );
  exception when others then
    -- Log warning in Postgres log and allow transaction to commit successfully
    raise warning 'Order notification dispatch failed for order %: %', new.id, SQLERRM;
  end;

  return new;
end;
$$;

-- 3. Attach trigger to public.orders table
drop trigger if exists trigger_notify_order on public.orders;
create trigger trigger_notify_order
  after insert or update of status on public.orders
  for each row
  execute function public.on_order_created_or_cancelled();
