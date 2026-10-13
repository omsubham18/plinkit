#!/usr/bin/env node
/**
 * scripts/security-test.mjs
 *
 * Adversarial security tests for the plinkit database.
 * Uses SUPABASE_SECRET_KEY only for setup / teardown (creating test users,
 * products, categories, and temporarily changing settings).
 * Every test action runs as a normal signed-in user via the anon key.
 *
 * Run: npm run test:security
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ── helpers ──────────────────────────────────────────────────────────────────

function loadEnv() {
  const p = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) { console.error('.env.local not found'); process.exit(1); }
  const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  const env = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL    = env.VITE_SUPABASE_URL;
const ANON_KEY        = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY     = env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

/** Admin (service-role) client — setup/teardown only */
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/** Anon client factory — each user gets their own client */
function anonClient(accessToken) {
  const c = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  return c;
}

// ── test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function pass(name) {
  console.log(`  PASS  ${name}`);
  passed++;
}
function fail(name, detail) {
  console.log(`  FAIL  ${name}`);
  if (detail) console.log(`        ${detail}`);
  failed++;
}

// ── test data IDs (deterministic) ────────────────────────────────────────────

const TEST_CATEGORY_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const TEST_PRODUCT_A   = 'aaaaaaaa-0000-0000-0000-000000000002';
const TEST_PRODUCT_B   = 'aaaaaaaa-0000-0000-0000-000000000003';
const TEST_PRODUCT_INACTIVE = 'aaaaaaaa-0000-0000-0000-000000000004';
const TEST_PRODUCT_CHEAP    = 'aaaaaaaa-0000-0000-0000-000000000005';
const TEST_DP_ID       = 'd1000000-0000-0000-0000-000000000001'; // existing active delivery point

const USER_A_EMAIL = 'sectest-a@plinkit-test.local';
const USER_A_PASS  = 'TestPass!999A';
const USER_B_EMAIL = 'sectest-b@plinkit-test.local';
const USER_B_PASS  = 'TestPass!999B';

// ── setup ────────────────────────────────────────────────────────────────────

let userAId, userBId, tokenA, tokenB, clientA, clientB;
let savedSettings;

async function setup() {
  console.log('\n── SETUP ──\n');

  // Save current settings
  const { data: s } = await admin.from('settings').select('*').eq('id', 1).single();
  savedSettings = s;

  // Ensure store is open and hours wide open for tests
  await admin.from('settings').update({
    store_open: true,
    opens_at: '00:00:00',
    closes_at: '23:59:59',
    min_order_value: 99,
    delivery_fee: 15,
    free_delivery_above: 299,
    max_active_orders_per_user: 2
  }).eq('id', 1);

  // Create test category
  await admin.from('categories').upsert({
    id: TEST_CATEGORY_ID,
    name: 'SEC Test Cat',
    slug: 'sec-test-cat',
    image_url: '/test.jpg',
    sort_order: 999,
    is_active: true
  }, { onConflict: 'slug' });

  // Create test products
  const products = [
    {
      id: TEST_PRODUCT_A, sku: 'SEC-A-01', category_id: TEST_CATEGORY_ID,
      name: 'Sec Test Product A', brand: 'Test', size_label: '100 g',
      mrp: 100, price: 80, stock_qty: 10, max_per_order: 3,
      is_active: true, keywords: ['test']
    },
    {
      id: TEST_PRODUCT_B, sku: 'SEC-B-02', category_id: TEST_CATEGORY_ID,
      name: 'Sec Test Product B', brand: 'Test', size_label: '50 g',
      mrp: 50, price: 40, stock_qty: 1, max_per_order: 5,
      is_active: true, keywords: ['test']
    },
    {
      id: TEST_PRODUCT_INACTIVE, sku: 'SEC-INACT-03', category_id: TEST_CATEGORY_ID,
      name: 'Sec Inactive Product', brand: 'Test', size_label: '10 g',
      mrp: 200, price: 150, stock_qty: 10, max_per_order: 5,
      is_active: false, keywords: ['test']
    },
    {
      id: TEST_PRODUCT_CHEAP, sku: 'SEC-CHEAP-04', category_id: TEST_CATEGORY_ID,
      name: 'Sec Cheap Product', brand: 'Test', size_label: '5 g',
      mrp: 10, price: 5, stock_qty: 100, max_per_order: 5,
      is_active: true, keywords: ['test']
    }
  ];
  for (const p of products) {
    await admin.from('products').upsert(p, { onConflict: 'sku' });
  }

  // Create test users via admin auth API
  async function ensureUser(email, password) {
    // Try to create; if exists, sign in
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (created?.user) return created.user.id;
    if (createErr?.message?.includes('already been registered') || createErr?.message?.includes('already exists')) {
      // list and find
      const { data: list } = await admin.auth.admin.listUsers();
      const u = list?.users?.find(u => u.email === email);
      if (u) return u.id;
    }
    throw new Error(`Cannot create user ${email}: ${createErr?.message}`);
  }

  userAId = await ensureUser(USER_A_EMAIL, USER_A_PASS);
  userBId = await ensureUser(USER_B_EMAIL, USER_B_PASS);

  // Create profiles for test users
  await admin.from('profiles').upsert({
    id: userAId, full_name: 'Test User A', phone: '+919999900001',
    delivery_point_id: TEST_DP_ID, room: 'A101'
  });
  await admin.from('profiles').upsert({
    id: userBId, full_name: 'Test User B', phone: '+919999900002',
    delivery_point_id: TEST_DP_ID, room: 'B201'
  });

  // Sign in as user A and B to get tokens
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: signA } = await anon.auth.signInWithPassword({ email: USER_A_EMAIL, password: USER_A_PASS });
  tokenA = signA.session.access_token;
  clientA = anonClient(tokenA);

  const { data: signB } = await anon.auth.signInWithPassword({ email: USER_B_EMAIL, password: USER_B_PASS });
  tokenB = signB.session.access_token;
  clientB = anonClient(tokenB);

  console.log('  Setup complete.\n');
}

// ── teardown ─────────────────────────────────────────────────────────────────

async function teardown() {
  console.log('\n── TEARDOWN ──\n');

  // Remove user A from admins (may have been added for admin tests)
  await admin.from('admins').delete().eq('user_id', userAId);

  // Cancel all test orders via direct table update (service-role bypasses RLS
  // but cannot call SECURITY DEFINER functions that check auth.uid())
  const { data: testOrders } = await admin.from('orders')
    .select('id, status')
    .in('user_id', [userAId, userBId]);

  if (testOrders) {
    for (const o of testOrders) {
      if (!['delivered', 'cancelled'].includes(o.status)) {
        await admin.from('orders').update({
          status: 'cancelled',
          cancel_reason: 'security test cleanup',
          cancelled_at: new Date().toISOString()
        }).eq('id', o.id);
      }
    }
    // Delete order_items and orders
    for (const o of testOrders) {
      await admin.from('order_items').delete().eq('order_id', o.id);
    }
    await admin.from('orders').delete().in('user_id', [userAId, userBId]);
  }

  // Delete test products, category
  await admin.from('products').delete().in('sku', ['SEC-A-01', 'SEC-B-02', 'SEC-INACT-03', 'SEC-CHEAP-04']);
  await admin.from('categories').delete().eq('slug', 'sec-test-cat');

  // Delete test profiles
  await admin.from('profiles').delete().in('id', [userAId, userBId]);

  // Delete test users
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);

  // Restore settings
  if (savedSettings) {
    const { id, ...rest } = savedSettings;
    await admin.from('settings').update(rest).eq('id', 1);
  }

  console.log('  Teardown complete.\n');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

/** Reset stock for a product to a given value */
async function resetStock(productId, qty) {
  await admin.from('products').update({ stock_qty: qty }).eq('id', productId);
}

/** Place an order as user A and return result */
async function placeAsA(items, overrides = {}) {
  return clientA.rpc('place_order', {
    p_client_request_id: uuid(),
    p_items: items,
    p_delivery_point_id: TEST_DP_ID,
    p_room: 'A101',
    p_substitution_pref: 'call_me',
    p_note: null,
    ...overrides
  });
}

// ── tests ────────────────────────────────────────────────────────────────────

async function testTamperedPriceIgnored() {
  const name = 'tampered price is ignored';
  await resetStock(TEST_PRODUCT_A, 10);
  // Client sends items with a fake price field — place_order should ignore it
  const items = [{ product_id: TEST_PRODUCT_A, qty: 2, price: 1 }];
  const { data } = await placeAsA(items);
  if (!data?.success) { fail(name, `Order failed: ${data?.error}`); return; }
  // items_total should be 2 * 80 = 160, not 2 * 1 = 2
  const total = data.order.items_total;
  if (total === 160) pass(name);
  else fail(name, `Expected items_total=160, got ${total}`);
  // Cancel to free up active order slot
  await clientA.rpc('cancel_my_order', { p_order_id: data.order.id });
}

async function testQtyAboveStock() {
  const name = 'quantity above stock rejected';
  await resetStock(TEST_PRODUCT_A, 2);
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: 3 }]);
  if (data?.success === false && data?.error === 'stock_or_item_issue') pass(name);
  else fail(name, JSON.stringify(data));
}

async function testQtyAboveMaxPerOrder() {
  const name = 'quantity above max_per_order rejected';
  await resetStock(TEST_PRODUCT_A, 10);
  // max_per_order = 3
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: 4 }]);
  if (data?.success === false && data?.error === 'stock_or_item_issue') pass(name);
  else fail(name, JSON.stringify(data));
}

async function testQtyZero() {
  const name = 'quantity zero rejected';
  await resetStock(TEST_PRODUCT_A, 10);
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: 0 }]);
  if (data?.success === false) pass(name);
  else fail(name, JSON.stringify(data));
}

async function testQtyNegative() {
  const name = 'quantity negative rejected';
  await resetStock(TEST_PRODUCT_A, 10);
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: -1 }]);
  if (data?.success === false) pass(name);
  else fail(name, JSON.stringify(data));
}

async function testMinOrderValue() {
  const name = 'order below minimum rejected';
  await resetStock(TEST_PRODUCT_CHEAP, 100);
  // cheap product: price=5, order 2 = 10, min_order_value = 99
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_CHEAP, qty: 2 }]);
  if (data?.success === false && data?.error === 'min_order_value_not_met') pass(name);
  else fail(name, JSON.stringify(data));
}

async function testStoreClosed() {
  const name = 'store closed rejected';
  // Temporarily close the store
  await admin.from('settings').update({ store_open: false }).eq('id', 1);
  await resetStock(TEST_PRODUCT_A, 10);
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: 2 }]);
  // Restore
  await admin.from('settings').update({ store_open: true }).eq('id', 1);
  if (data?.success === false && data?.error === 'store_closed') pass(name);
  else fail(name, JSON.stringify(data));
}

async function testInactiveProduct() {
  const name = 'inactive product rejected';
  const { data } = await placeAsA([{ product_id: TEST_PRODUCT_INACTIVE, qty: 1 }]);
  if (data?.success === false && data?.error === 'stock_or_item_issue') pass(name);
  else fail(name, JSON.stringify(data));
}

async function testUserIsolation() {
  const nameOrders = 'user A cannot read user B orders';
  const nameProfile = 'user A cannot read user B profile';

  // Create an order as user B
  await resetStock(TEST_PRODUCT_A, 10);
  const { data: orderData } = await clientB.rpc('place_order', {
    p_client_request_id: uuid(),
    p_items: [{ product_id: TEST_PRODUCT_A, qty: 2 }],
    p_delivery_point_id: TEST_DP_ID,
    p_room: 'B201',
    p_substitution_pref: 'call_me',
    p_note: null
  });

  if (!orderData?.success) {
    fail(nameOrders, `Setup failed: ${orderData?.error}`);
    fail(nameProfile, 'skipped');
    return;
  }
  const orderBId = orderData.order.id;

  // User A tries to read user B's order
  const { data: readOrders } = await clientA.from('orders').select('*').eq('id', orderBId);
  if (!readOrders || readOrders.length === 0) pass(nameOrders);
  else fail(nameOrders, `User A read ${readOrders.length} rows from B's order`);

  // User A tries to read user B's profile
  const { data: readProfiles } = await clientA.from('profiles').select('*').eq('id', userBId);
  if (!readProfiles || readProfiles.length === 0) pass(nameProfile);
  else fail(nameProfile, `User A read B's profile`);

  // Cleanup: cancel B's order
  await clientB.rpc('cancel_my_order', { p_order_id: orderBId });
}

async function testNonAdminCannotWrite() {
  const tests = [
    {
      name: 'non-admin cannot write products',
      fn: async () => {
        const { error } = await clientA.from('products').insert({
          id: uuid(), sku: 'HACK-01', category_id: TEST_CATEGORY_ID,
          name: 'Hacked Product', brand: 'Hacker', size_label: '1g',
          mrp: 10, price: 5, stock_qty: 999, keywords: ['hack']
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot write settings',
      fn: async () => {
        const { error } = await clientA.from('settings').update({ min_order_value: 0 }).eq('id', 1);
        // Supabase returns no error but 0 rows affected when RLS blocks
        const { data } = await admin.from('settings').select('min_order_value').eq('id', 1).single();
        if (data?.min_order_value === 0) return null; // it actually changed — fail
        return error || { message: 'blocked by RLS' };
      }
    },
    {
      name: 'non-admin cannot write orders directly',
      fn: async () => {
        const { error } = await clientA.from('orders').insert({
          id: uuid(), client_request_id: uuid(), user_id: userAId,
          status: 'placed', delivery_point_id: TEST_DP_ID, room: 'H1',
          customer_name: 'Hacker', customer_phone: '+91999',
          items_total: 1, delivery_fee: 0, grand_total: 1,
          substitution_pref: 'call_me'
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot write order_items directly',
      fn: async () => {
        const { error } = await clientA.from('order_items').insert({
          id: uuid(), order_id: uuid(), product_id: TEST_PRODUCT_A,
          name_snapshot: 'Hack', size_snapshot: '1g',
          unit_price: 1, mrp: 1, qty: 1, line_total: 1
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot write admins',
      fn: async () => {
        const { error } = await clientA.from('admins').insert({ user_id: userAId });
        return error;
      }
    },
    {
      name: 'non-admin cannot call admin_set_order_status',
      fn: async () => {
        const { error } = await clientA.rpc('admin_set_order_status', {
          p_order_id: uuid(), p_new_status: 'accepted'
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot call admin_adjust_stock',
      fn: async () => {
        const { error } = await clientA.rpc('admin_adjust_stock', {
          p_product_id: TEST_PRODUCT_A, p_delta: 9999
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot call admin_set_payment',
      fn: async () => {
        const { error } = await clientA.rpc('admin_set_payment', {
          p_order_id: uuid(), p_status: 'paid', p_paid_via: 'cash'
        });
        return error;
      }
    },
    {
      name: 'non-admin cannot call admin_remove_order_item',
      fn: async () => {
        const { error } = await clientA.rpc('admin_remove_order_item', {
          p_order_item_id: uuid()
        });
        return error;
      }
    }
  ];

  for (const t of tests) {
    const err = await t.fn();
    if (err) pass(t.name);
    else fail(t.name, 'no error returned — write succeeded');
  }
}

async function testIdempotency() {
  const name = 'same client_request_id twice creates one order';
  await resetStock(TEST_PRODUCT_A, 10);
  const crid = uuid();
  const args = {
    p_client_request_id: crid,
    p_items: [{ product_id: TEST_PRODUCT_A, qty: 2 }],
    p_delivery_point_id: TEST_DP_ID,
    p_room: 'A101',
    p_substitution_pref: 'call_me',
    p_note: null
  };
  const { data: r1 } = await clientA.rpc('place_order', args);
  const { data: r2 } = await clientA.rpc('place_order', args);

  if (r1?.success && r2?.success && r2?.idempotent === true && r1.order.id === r2.order.id) {
    pass(name);
  } else {
    fail(name, `r1=${JSON.stringify(r1)}, r2=${JSON.stringify(r2)}`);
  }
  // Cancel to free slot
  if (r1?.order?.id) await clientA.rpc('cancel_my_order', { p_order_id: r1.order.id });
}

async function testConcurrentLastUnit() {
  const name = 'two simultaneous orders for last unit: exactly one succeeds';
  await resetStock(TEST_PRODUCT_B, 1);

  const args = (crid) => ({
    p_client_request_id: crid,
    p_items: [{ product_id: TEST_PRODUCT_B, qty: 1 }],
    p_delivery_point_id: TEST_DP_ID,
    p_room: 'A101',
    p_substitution_pref: 'call_me',
    p_note: null
  });

  // We also need another high-value product to meet min_order_value
  // Product B is 40, below 99 minimum. Add product A to both carts.
  await resetStock(TEST_PRODUCT_A, 10);
  const itemsBoth = [
    { product_id: TEST_PRODUCT_B, qty: 1 },
    { product_id: TEST_PRODUCT_A, qty: 1 }
  ]; // total = 40 + 80 = 120 >= 99

  // Increase max_active_orders to allow both attempts
  await admin.from('settings').update({ max_active_orders_per_user: 10 }).eq('id', 1);

  const crid1 = uuid(), crid2 = uuid();
  const [r1, r2] = await Promise.all([
    clientA.rpc('place_order', {
      p_client_request_id: crid1, p_items: itemsBoth,
      p_delivery_point_id: TEST_DP_ID, p_room: 'A101',
      p_substitution_pref: 'call_me', p_note: null
    }),
    clientA.rpc('place_order', {
      p_client_request_id: crid2, p_items: itemsBoth,
      p_delivery_point_id: TEST_DP_ID, p_room: 'A101',
      p_substitution_pref: 'call_me', p_note: null
    })
  ]);

  const d1 = r1.data, d2 = r2.data;
  const s1 = d1?.success === true ? 1 : 0;
  const s2 = d2?.success === true ? 1 : 0;

  // Check stock is 0
  const { data: prod } = await admin.from('products').select('stock_qty').eq('id', TEST_PRODUCT_B).single();

  if (s1 + s2 === 1 && prod?.stock_qty === 0) {
    pass(name);
  } else {
    fail(name, `successes=${s1+s2}, stock=${prod?.stock_qty}, r1=${JSON.stringify(d1?.error)}, r2=${JSON.stringify(d2?.error)}`);
  }

  // Cleanup
  if (d1?.order?.id) await clientA.rpc('cancel_my_order', { p_order_id: d1.order.id });
  if (d2?.order?.id) await clientA.rpc('cancel_my_order', { p_order_id: d2.order.id });
  await admin.from('settings').update({ max_active_orders_per_user: 2 }).eq('id', 1);
}

async function testCancelRestoresStockOnce() {
  const name = 'cancelling restores stock exactly once, even if called twice';
  await resetStock(TEST_PRODUCT_A, 10);

  const { data: orderData } = await placeAsA([{ product_id: TEST_PRODUCT_A, qty: 2 }]);
  if (!orderData?.success) { fail(name, `place failed: ${orderData?.error}`); return; }

  // Stock should be 8 now
  const { data: before } = await admin.from('products').select('stock_qty').eq('id', TEST_PRODUCT_A).single();
  if (before?.stock_qty !== 8) { fail(name, `stock after order: ${before?.stock_qty}, expected 8`); return; }

  // Cancel once
  const { data: c1 } = await clientA.rpc('cancel_my_order', { p_order_id: orderData.order.id });
  // Cancel twice (should fail — order is already cancelled)
  const { data: c2 } = await clientA.rpc('cancel_my_order', { p_order_id: orderData.order.id });

  const { data: after } = await admin.from('products').select('stock_qty').eq('id', TEST_PRODUCT_A).single();

  if (c1?.success === true && c2?.success === false && after?.stock_qty === 10) {
    pass(name);
  } else {
    fail(name, `c1=${JSON.stringify(c1)}, c2=${JSON.stringify(c2)}, stock=${after?.stock_qty}`);
  }
}

async function testRemoveItemRecalculates() {
  const name1 = 'removing an item recalculates the total';
  const name2 = 'removing an item never raises the delivery fee';
  const name3 = 'removing an item sets that product stock to 0';

  // Temporarily make user A an admin so we can call admin_remove_order_item
  // (SECURITY DEFINER functions check auth.uid() via is_admin(), which
  //  doesn't work with the service-role key since it has no JWT identity)
  await admin.from('admins').upsert({ user_id: userAId });

  await resetStock(TEST_PRODUCT_A, 10);
  await resetStock(TEST_PRODUCT_B, 10);
  // Need to be below free_delivery_above (299) so delivery_fee is 15
  // Product A: 80 * 2 = 160, Product B: 40 * 1 = 40 => total = 200 < 299 => fee = 15
  const { data: orderData } = await placeAsA([
    { product_id: TEST_PRODUCT_A, qty: 2 },
    { product_id: TEST_PRODUCT_B, qty: 1 }
  ]);
  if (!orderData?.success) {
    fail(name1, `place failed: ${orderData?.error}`);
    fail(name2, 'skipped'); fail(name3, 'skipped');
    await admin.from('admins').delete().eq('user_id', userAId);
    return;
  }

  const orderId = orderData.order.id;
  const origFee = orderData.order.delivery_fee;

  // Get order items
  const { data: items } = await admin.from('order_items').select('*').eq('order_id', orderId);
  const itemB = items?.find(i => i.product_id === TEST_PRODUCT_B);
  if (!itemB) {
    fail(name1, 'cannot find item B in order'); fail(name2, 'skipped'); fail(name3, 'skipped');
    await admin.from('admins').delete().eq('user_id', userAId);
    return;
  }

  // Remove item B via admin function — called as user A who is now an admin
  const { data: removeResult, error: removeErr } = await clientA.rpc('admin_remove_order_item', {
    p_order_item_id: itemB.id
  });

  if (removeErr || !removeResult?.success) {
    fail(name1, `remove failed: ${removeErr?.message || removeResult?.error}`);
    fail(name2, 'skipped'); fail(name3, 'skipped');
    // Cleanup: cancel via direct update
    await admin.from('orders').update({ status: 'cancelled', cancel_reason: 'test cleanup', cancelled_at: new Date().toISOString() }).eq('id', orderId);
    await admin.from('admins').delete().eq('user_id', userAId);
    return;
  }

  const newOrder = removeResult.order;
  // items_total should be 80*2 = 160 (only product A remains)
  if (newOrder.items_total === 160) pass(name1);
  else fail(name1, `expected items_total=160, got ${newOrder.items_total}`);

  // delivery fee should not increase
  if (newOrder.delivery_fee <= origFee) pass(name2);
  else fail(name2, `delivery_fee increased from ${origFee} to ${newOrder.delivery_fee}`);

  // product B stock should be 0
  const { data: prodB } = await admin.from('products').select('stock_qty').eq('id', TEST_PRODUCT_B).single();
  if (prodB?.stock_qty === 0) pass(name3);
  else fail(name3, `expected stock=0, got ${prodB?.stock_qty}`);

  // Cleanup: cancel the order and revoke admin
  await clientA.rpc('admin_set_order_status', { p_order_id: orderId, p_new_status: 'cancelled', p_reason: 'test cleanup' });
  await admin.from('admins').delete().eq('user_id', userAId);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await setup();

    console.log('── TESTS ──\n');

    await testTamperedPriceIgnored();
    await testQtyAboveStock();
    await testQtyAboveMaxPerOrder();
    await testQtyZero();
    await testQtyNegative();
    await testMinOrderValue();
    await testStoreClosed();
    await testInactiveProduct();
    await testUserIsolation();
    await testNonAdminCannotWrite();
    await testIdempotency();
    await testConcurrentLastUnit();
    await testCancelRestoresStockOnce();
    await testRemoveItemRecalculates();

    console.log(`\n── RESULTS: ${passed} passed, ${failed} failed ──\n`);
  } catch (err) {
    console.error('\nFATAL:', err);
    failed++;
  } finally {
    await teardown();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
