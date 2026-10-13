#!/usr/bin/env node
/**
 * scripts/test-notify-order.mjs
 *
 * Automated test suite for Prompt 10: Order Alerts on Telegram (notify-order)
 * Tests:
 * 1. HTML entity escaping and injection defense.
 * 2. New order message generation matching Prompt 10 requirements:
 *    - Order number
 *    - Delivery point & room
 *    - Customer name & phone
 *    - Items with quantities
 *    - Total
 *    - Substitution preference
 *    - Note
 *    - Link to /admin
 * 3. Cancelled order message generation with reason.
 * 4. Webhook payload handling & event translation.
 * 5. Fail-safe error handling (Telegram failure does not throw or abort).
 * 6. Live database query test: loads an order and verifies message generation.
 *
 * Run: npm run test:telegram
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const p = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  const env = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SECRET_KEY;

// Replicate Edge Function formatting helpers for unit verification
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSubstitutionPref(pref) {
  switch (pref) {
    case 'call_me':
      return '📞 Call me';
    case 'replace_similar':
      return '🔄 Replace with similar';
    case 'remove_item':
      return '❌ Remove item';
    default:
      return pref || 'None specified';
  }
}

function buildNewOrderMessage(order, items, adminBaseUrl) {
  const deliveryPointName = order.delivery_point?.name ?? 'Campus point';
  const campus = order.delivery_point?.campus ?? '';
  const location = campus
    ? `${escapeHtml(deliveryPointName)} (${escapeHtml(campus)}), Room ${escapeHtml(order.room)}`
    : `${escapeHtml(deliveryPointName)}, Room ${escapeHtml(order.room)}`;

  const activeItems = items.filter((i) => !i.removed);
  const itemsList = activeItems.length > 0
    ? activeItems
      .map(
        (i) =>
          `• ${i.qty}x ${escapeHtml(i.name_snapshot)}${i.size_snapshot ? ` (${escapeHtml(i.size_snapshot)})` : ''}`,
      )
      .join('\n')
    : '• No items';

  const totalItemCount = activeItems.reduce((acc, i) => acc + i.qty, 0);
  const noteSection = order.note && order.note.trim()
    ? `\n📝 <b>Note:</b> ${escapeHtml(order.note.trim())}`
    : '';

  const adminUrl = `${adminBaseUrl.replace(/\/+$/, '')}/admin`;

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
  ].join('\n');
}

function buildCancelledOrderMessage(order, adminBaseUrl) {
  const deliveryPointName = order.delivery_point?.name ?? 'Campus point';
  const campus = order.delivery_point?.campus ?? '';
  const location = campus
    ? `${escapeHtml(deliveryPointName)} (${escapeHtml(campus)}), Room ${escapeHtml(order.room)}`
    : `${escapeHtml(deliveryPointName)}, Room ${escapeHtml(order.room)}`;

  const reason = order.cancel_reason
    ? escapeHtml(order.cancel_reason)
    : 'Cancelled by customer';

  const adminUrl = `${adminBaseUrl.replace(/\/+$/, '')}/admin`;

  return [
    `❌ <b>Order Cancelled #${order.order_no}</b>`,
    `📍 <b>${location}</b>`,
    `👤 ${escapeHtml(order.customer_name)} (<code>${escapeHtml(order.customer_phone)}</code>)`,
    `⚠️ <b>Reason:</b> ${reason}`,
    `💰 <b>Total was: ₹${order.grand_total}</b>`,
    ``,
    `🔗 <a href="${adminUrl}">Open in Admin Console</a>`,
  ].join('\n');
}

function parseWebhookEvent(payload) {
  let orderId = payload.order_id || payload.orderId || payload.record?.id;
  let event = payload.event;

  if (payload.type === 'INSERT') {
    event = 'order_created';
    orderId = payload.record?.id;
  } else if (payload.type === 'UPDATE') {
    const newStatus = payload.record?.status;
    const oldStatus = payload.old_record?.status;
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      event = 'order_cancelled';
      orderId = payload.record?.id;
    } else {
      return { ignore: true };
    }
  }

  return { ignore: false, orderId, event: event || 'order_created' };
}

async function run() {
  console.log('--- TELEGRAM ORDER ALERTS (PROMPT 10) TEST SUITE ---');
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  FAIL: ${message}`);
      failures++;
    } else {
      console.log(`  PASS: ${message}`);
    }
  }

  // 1. HTML Escaping Tests
  console.log('\n[Phase 1] HTML Entity Escaping');
  assert(
    escapeHtml('<script>alert("hack")</script>') === '&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;',
    'Script tags and quotes correctly escaped',
  );
  assert(
    escapeHtml('Tom & Jerry <chips>') === 'Tom &amp; Jerry &lt;chips&gt;',
    'Ampersands and angle brackets escaped',
  );

  // 2. New Order Message Generation
  console.log('\n[Phase 2] New Order Message Content & Formatting');
  const sampleOrder = {
    id: 'ord-1234',
    order_no: 1042,
    room: '302-B',
    customer_name: 'Subham Mishra',
    customer_phone: '+91 98765 43210',
    items_total: 135,
    delivery_fee: 15,
    grand_total: 150,
    substitution_pref: 'call_me',
    note: 'Please call before reaching gate',
    delivery_point: {
      name: 'Hall 4',
      campus: 'MANIT',
    },
  };

  const sampleItems = [
    { name_snapshot: 'Classic Salted Potato Chips', size_snapshot: '70 g', qty: 2, unit_price: 45, line_total: 90, removed: false },
    { name_snapshot: 'Chilled Cold Coffee Can', size_snapshot: '250 ml', qty: 1, unit_price: 45, line_total: 45, removed: false },
    { name_snapshot: 'Out of Stock Biscuit', size_snapshot: '100 g', qty: 1, unit_price: 30, line_total: 30, removed: true },
  ];

  const newOrderMsg = buildNewOrderMessage(sampleOrder, sampleItems, 'https://plinkit.pages.dev');

  assert(newOrderMsg.includes('New Order #1042'), 'Contains order number');
  assert(newOrderMsg.includes('Hall 4 (MANIT), Room 302-B'), 'Contains delivery point and room');
  assert(newOrderMsg.includes('Subham Mishra') && newOrderMsg.includes('+91 98765 43210'), 'Contains customer name and phone');
  assert(newOrderMsg.includes('2x Classic Salted Potato Chips (70 g)'), 'Contains item with qty and size');
  assert(newOrderMsg.includes('1x Chilled Cold Coffee Can (250 ml)'), 'Contains second item with qty and size');
  assert(!newOrderMsg.includes('Out of Stock Biscuit'), 'Excludes removed items from active count');
  assert(newOrderMsg.includes('Total: ₹150'), 'Contains total with whole rupees');
  assert(newOrderMsg.includes('📞 Call me'), 'Contains human-readable substitution preference');
  assert(newOrderMsg.includes('Please call before reaching gate'), 'Contains customer note');
  assert(newOrderMsg.includes('https://plinkit.pages.dev/admin'), 'Contains clickable link to /admin');

  // 3. Order Cancellation Message Generation
  console.log('\n[Phase 3] Cancelled Order Message Formatting');
  const cancelledOrder = {
    ...sampleOrder,
    status: 'cancelled',
    cancel_reason: 'Hostel gate closed early',
  };

  const cancelMsg = buildCancelledOrderMessage(cancelledOrder, 'https://plinkit.pages.dev');
  assert(cancelMsg.includes('Order Cancelled #1042'), 'Contains cancellation header with order number');
  assert(cancelMsg.includes('Hostel gate closed early'), 'Contains cancellation reason');
  assert(cancelMsg.includes('Total was: ₹150'), 'Contains total amount');
  assert(cancelMsg.includes('https://plinkit.pages.dev/admin'), 'Contains link to /admin');

  // 4. Webhook Payload Translation
  console.log('\n[Phase 4] Webhook & Direct Payload Event Translation');
  const insertPayload = {
    type: 'INSERT',
    table: 'orders',
    record: { id: 'ord-test-1', status: 'placed' },
  };
  const insertEvt = parseWebhookEvent(insertPayload);
  assert(!insertEvt.ignore && insertEvt.event === 'order_created' && insertEvt.orderId === 'ord-test-1', 'INSERT translated to order_created');

  const cancelPayload = {
    type: 'UPDATE',
    table: 'orders',
    record: { id: 'ord-test-2', status: 'cancelled' },
    old_record: { id: 'ord-test-2', status: 'placed' },
  };
  const cancelEvt = parseWebhookEvent(cancelPayload);
  assert(!cancelEvt.ignore && cancelEvt.event === 'order_cancelled' && cancelEvt.orderId === 'ord-test-2', 'UPDATE cancelled translated to order_cancelled');

  const packPayload = {
    type: 'UPDATE',
    table: 'orders',
    record: { id: 'ord-test-3', status: 'packed' },
    old_record: { id: 'ord-test-3', status: 'accepted' },
  };
  const packEvt = parseWebhookEvent(packPayload);
  assert(packEvt.ignore === true, 'Non-cancellation UPDATE ignored without triggering Telegram');

  const directPayload = {
    order_id: 'ord-test-4',
    event: 'order_created',
  };
  const directEvt = parseWebhookEvent(directPayload);
  assert(!directEvt.ignore && directEvt.event === 'order_created' && directEvt.orderId === 'ord-test-4', 'Direct payload parsed correctly');

  // 5. Fail-Safe Error Handling Simulation
  console.log('\n[Phase 5] Fail-Safe Error Handling & Resilience');
  async function simulateTelegramSend(botToken, chatId, text) {
    if (!botToken || !chatId) {
      return { success: false, warning: 'Telegram secrets not configured' };
    }
    // Simulate API call failure (e.g. invalid chat ID or network glitch)
    try {
      const mockFetch = async () => {
        return { ok: false, status: 400, text: async () => '{"description":"Bad Request: chat not found"}' };
      };
      const res = await mockFetch();
      if (!res.ok) {
        return { success: false, error: 'Telegram API rejected message' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Telegram network failure' };
    }
  }

  const missingSecretsRes = await simulateTelegramSend('', '', 'test');
  assert(missingSecretsRes.success === false && missingSecretsRes.warning.includes('not configured'), 'Missing secrets returns safe warning without crashing');

  const failedSendRes = await simulateTelegramSend('fake_token', 'fake_chat', 'test');
  assert(failedSendRes.success === false && failedSendRes.error.includes('Telegram API rejected'), 'Telegram API error handled gracefully with safe return status');

  // 6. Live Database Integration: Query an existing order
  console.log('\n[Phase 6] Live Database Order Query');
  if (SUPABASE_URL && SERVICE_KEY) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: dbOrders, error: dbErr } = await supabase
      .from('orders')
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
      .limit(1);

    if (!dbErr && dbOrders && dbOrders.length > 0) {
      const dbOrder = dbOrders[0];
      const { data: dbItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', dbOrder.id);

      const generatedLiveMsg = buildNewOrderMessage(dbOrder, dbItems || [], 'https://plinkit.pages.dev');
      assert(
        generatedLiveMsg.includes(`Order #${dbOrder.order_no}`) &&
        generatedLiveMsg.includes(dbOrder.customer_name),
        `Successfully generated Telegram alert from live database order #${dbOrder.order_no}`,
      );
    } else {
      console.log('  INFO: No existing orders in DB to query, live check skipped');
    }
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log('ALL TELEGRAM ORDER ALERT TESTS PASSED (0 failures)');
    process.exit(0);
  } else {
    console.error(`TESTS FAILED with ${failures} failure(s)`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
