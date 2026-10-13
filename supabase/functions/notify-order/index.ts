// supabase/functions/notify-order/index.ts
// Supabase Edge Function: Order Alerts on Telegram (Prompt 10)
// Loads order securely via service role and dispatches formatted alerts to the operators' Telegram group.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface WebhookPayload {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  order_id?: string;
  orderId?: string;
  event?: "order_created" | "order_cancelled";
}

interface OrderItemRow {
  name_snapshot: string;
  size_snapshot: string;
  qty: number;
  unit_price: number;
  line_total: number;
  removed: boolean;
}

interface OrderRecord {
  id: string;
  order_no: number;
  status: string;
  room: string;
  customer_name: string;
  customer_phone: string;
  items_total: number;
  delivery_fee: number;
  grand_total: number;
  substitution_pref: string;
  note: string | null;
  cancel_reason: string | null;
  placed_at: string;
  cancelled_at: string | null;
  delivery_point?: {
    name: string;
    campus: string;
  } | null;
}

/**
 * Escapes characters for Telegram HTML formatting.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Maps substitution preference to human-readable label with icon.
 */
export function formatSubstitutionPref(pref: string): string {
  switch (pref) {
    case "call_me":
      return "📞 Call me";
    case "replace_similar":
      return "🔄 Replace with similar";
    case "remove_item":
      return "❌ Remove item";
    default:
      return pref || "None specified";
  }
}

/**
 * Formats a new order into a compact, high-signal Telegram alert.
 */
export function buildNewOrderMessage(
  order: OrderRecord,
  items: OrderItemRow[],
  adminBaseUrl: string,
): string {
  const deliveryPointName = order.delivery_point?.name ?? "Campus point";
  const campus = order.delivery_point?.campus ?? "";
  const location = campus
    ? `${escapeHtml(deliveryPointName)} (${escapeHtml(campus)}), Room ${escapeHtml(order.room)}`
    : `${escapeHtml(deliveryPointName)}, Room ${escapeHtml(order.room)}`;

  const activeItems = items.filter((i) => !i.removed);
  const itemsList = activeItems.length > 0
    ? activeItems
      .map(
        (i) =>
          `• ${i.qty}x ${escapeHtml(i.name_snapshot)}${i.size_snapshot ? ` (${escapeHtml(i.size_snapshot)})` : ""}`,
      )
      .join("\n")
    : "• No items";

  const totalItemCount = activeItems.reduce((acc, i) => acc + i.qty, 0);
  const noteSection = order.note && order.note.trim()
    ? `\n📝 <b>Note:</b> ${escapeHtml(order.note.trim())}`
    : "";

  const adminUrl = `${adminBaseUrl.replace(/\/+$/, "")}/admin`;

  return [
    `🛍️ <b>New Order #${order.order_no}</b>`,
    `📍 <b>${location}</b>`,
    `👤 ${escapeHtml(order.customer_name)} (<code>${escapeHtml(order.customer_phone)}</code>)`,
    ``,
    `📦 <b>Items (${totalItemCount}):</b>`,
    itemsList,
    ``,
    `💰 <b>Total: ₹${order.grand_total}</b> (Items: ₹${order.items_total} + Delivery: ₹${order.delivery_fee})`,
    `🔄 <b>Sub pref:</b> ${formatSubstitutionPref(order.substitution_pref)}${noteSection}`,
    ``,
    `🔗 <a href="${adminUrl}">Open in Admin Console</a>`,
  ].join("\n");
}

/**
 * Formats an order cancellation alert.
 */
export function buildCancelledOrderMessage(
  order: OrderRecord,
  adminBaseUrl: string,
): string {
  const deliveryPointName = order.delivery_point?.name ?? "Campus point";
  const campus = order.delivery_point?.campus ?? "";
  const location = campus
    ? `${escapeHtml(deliveryPointName)} (${escapeHtml(campus)}), Room ${escapeHtml(order.room)}`
    : `${escapeHtml(deliveryPointName)}, Room ${escapeHtml(order.room)}`;

  const reason = order.cancel_reason
    ? escapeHtml(order.cancel_reason)
    : "Cancelled by customer";

  const adminUrl = `${adminBaseUrl.replace(/\/+$/, "")}/admin`;

  return [
    `❌ <b>Order Cancelled #${order.order_no}</b>`,
    `📍 <b>${location}</b>`,
    `👤 ${escapeHtml(order.customer_name)} (<code>${escapeHtml(order.customer_phone)}</code>)`,
    `⚠️ <b>Reason:</b> ${reason}`,
    `💰 <b>Total was: ₹${order.grand_total}</b>`,
    ``,
    `🔗 <a href="${adminUrl}">Open in Admin Console</a>`,
  ].join("\n");
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let payload: WebhookPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1. Determine target order ID and event type
    let orderId = payload.order_id || payload.orderId || (payload.record?.id as string | undefined);
    let event = payload.event;

    // Database Webhook translation:
    if (payload.type === "INSERT") {
      event = "order_created";
      orderId = payload.record?.id as string | undefined;
    } else if (payload.type === "UPDATE") {
      const newStatus = payload.record?.status as string | undefined;
      const oldStatus = payload.old_record?.status as string | undefined;
      if (newStatus === "cancelled" && oldStatus !== "cancelled") {
        event = "order_cancelled";
        orderId = payload.record?.id as string | undefined;
      } else {
        // Ignored update (e.g. status transition accepted/packed/delivered)
        return new Response(
          JSON.stringify({ message: "Ignored status transition" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Default to order_created if not set
    if (!event) {
      event = "order_created";
    }

    // 2. Read Secrets from Environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://plinkit.pages.dev";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Query Order and Non-Removed Items Securely with Service Role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        status,
        room,
        customer_name,
        customer_phone,
        items_total,
        delivery_fee,
        grand_total,
        substitution_pref,
        note,
        cancel_reason,
        placed_at,
        cancelled_at,
        delivery_point:delivery_points (
          name,
          campus
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !orderData) {
      console.error(`Order not found or fetch error for order ID ${orderId}:`, orderErr);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: itemsData, error: itemsErr } = await supabase
      .from("order_items")
      .select("name_snapshot, size_snapshot, qty, unit_price, line_total, removed")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.error(`Failed to fetch items for order ID ${orderId}:`, itemsErr);
    }

    const items: OrderItemRow[] = itemsData ?? [];

    // 4. Construct Telegram Message Text
    let messageText: string;
    if (event === "order_cancelled" || orderData.status === "cancelled") {
      messageText = buildCancelledOrderMessage(orderData as unknown as OrderRecord, siteUrl);
    } else {
      messageText = buildNewOrderMessage(orderData as unknown as OrderRecord, items, siteUrl);
    }

    // 5. Fail-Safe Telegram Dispatch
    if (!telegramBotToken || !telegramChatId) {
      console.warn(
        "Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret is not set.",
      );
      return new Response(
        JSON.stringify({
          success: false,
          warning: "Telegram secrets not configured",
          order_no: orderData.order_no,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
      const tgRes = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: messageText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      if (!tgRes.ok) {
        const errorText = await tgRes.text();
        console.error(
          `Telegram API error: HTTP ${tgRes.status} for Order #${orderData.order_no}:`,
          errorText,
        );
        // Note: We return HTTP 200 with success: false so database triggers or webhooks do not repeat fail
        return new Response(
          JSON.stringify({
            success: false,
            error: "Telegram API rejected message",
            order_no: orderData.order_no,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const tgResult = await tgRes.json();
      return new Response(
        JSON.stringify({
          success: true,
          order_no: orderData.order_no,
          message_id: tgResult?.result?.message_id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (sendErr) {
      // Network or fetch timeout
      console.error(
        `Failed to reach Telegram API for Order #${orderData.order_no}:`,
        sendErr,
      );
      // Return 200 so database commits never fail
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram network failure",
          order_no: orderData.order_no,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("Unhandled error in notify-order function:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
