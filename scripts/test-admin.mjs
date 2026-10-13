#!/usr/bin/env node
/**
 * scripts/test-admin.mjs
 *
 * Automated verification of Operator Console database functions and security rules:
 * 1. Rejection of non-admin calls to all admin RPCs & settings table (RLS + authorization).
 * 2. Authorization of verified admin.
 * 3. Stock adjustments (increment, negative-rejection, one-tap zero).
 * 4. Status progression sequence (placed -> accepted -> packed -> out_for_delivery -> delivered).
 * 5. Cancellation with mandatory reason & deterministic stock restoration.
 * 6. Line item removal before packing (product stock zeroed, totals recalculated).
 * 7. Payment status tracking (unpaid -> paid via UPI/cash).
 * 8. Store settings open/closed switch.
 *
 * Run: npm run test:admin
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const adminService = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAuthClient(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

const runId = crypto.randomUUID().slice(0, 8);
let testUserIdCustomer = null;
let testUserCustomerClient = null;
let testUserIdAdmin = null;
let testUserAdminClient = null;

let testProductA = null;
let testProductB = null;
let testDeliveryPoint = null;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`FAIL: ${message}`);
  }
}

async function setup() {
  console.log(`Setting up test environment (runId: ${runId})...`);

  // 1. Get an active delivery point
  const { data: dp } = await adminService
    .from('delivery_points')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();
  testDeliveryPoint = dp;

  // 2. Create test products
  const { data: cat } = await adminService
    .from('categories')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: prodA } = await adminService
    .from('products')
    .insert({
      sku: `TEST-ADM-A-${runId}`,
      category_id: cat.id,
      name: `Admin Test Product A ${runId}`,
      brand: 'TestBrand',
      size_label: '100 g',
      mrp: 100,
      price: 80,
      stock_qty: 20,
      max_per_order: 5,
      keywords: ['test'],
      is_active: true,
      country_of_origin: 'India',
    })
    .select()
    .single();
  testProductA = prodA;

  const { data: prodB } = await adminService
    .from('products')
    .insert({
      sku: `TEST-ADM-B-${runId}`,
      category_id: cat.id,
      name: `Admin Test Product B ${runId}`,
      brand: 'TestBrand',
      size_label: '200 g',
      mrp: 150,
      price: 120,
      stock_qty: 15,
      max_per_order: 5,
      keywords: ['test'],
      is_active: true,
      country_of_origin: 'India',
    })
    .select()
    .single();
  testProductB = prodB;

  // 3. Create normal customer user
  // 3. Create normal customer user
  const customerEmail = `cust-${runId}@example.com`;
  const { data: custAuth, error: custCreateErr } = await adminService.auth.admin.createUser({
    email: customerEmail,
    password: `Pass-${runId}-123!`,
    email_confirm: true,
  });
  if (custCreateErr) throw custCreateErr;
  testUserIdCustomer = custAuth.user.id;

  await adminService.from('profiles').insert({
    id: testUserIdCustomer,
    full_name: 'Test Customer',
    phone: '9876543210',
    delivery_point_id: testDeliveryPoint.id,
    room: 'Room 101',
  });

  const anonClientForAuth = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: custSign, error: custSignErr } = await anonClientForAuth.auth.signInWithPassword({
    email: customerEmail,
    password: `Pass-${runId}-123!`,
  });
  if (custSignErr) throw custSignErr;
  testUserCustomerClient = createAuthClient(custSign.session.access_token);

  // 4. Create admin user
  const adminEmail = `admin-${runId}@example.com`;
  const { data: admAuth, error: admCreateErr } = await adminService.auth.admin.createUser({
    email: adminEmail,
    password: `Pass-${runId}-123!`,
    email_confirm: true,
  });
  if (admCreateErr) throw admCreateErr;
  testUserIdAdmin = admAuth.user.id;

  // Insert into admins table
  const { error: admInsertErr } = await adminService.from('admins').insert({ user_id: testUserIdAdmin });
  if (admInsertErr) throw admInsertErr;

  const { data: admSign, error: admSignErr } = await anonClientForAuth.auth.signInWithPassword({
    email: adminEmail,
    password: `Pass-${runId}-123!`,
  });
  if (admSignErr) throw admSignErr;
  testUserAdminClient = createAuthClient(admSign.session.access_token);

  // Ensure store settings allow orders
  await adminService.from('settings').update({ store_open: true, opens_at: '00:00:00', closes_at: '23:59:59' }).eq('id', 1);

  console.log('Setup completed successfully.\n');
}

async function runTests() {
  console.log('=== 1. Non-Admin Security Rejection Tests ===');

  // Non-admin call to admin_set_order_status
  const { error: err1 } = await testUserCustomerClient.rpc('admin_set_order_status', {
    p_order_id: crypto.randomUUID(),
    p_new_status: 'accepted',
  });
  assert(err1 && /unauthorized/i.test(err1.message), 'Non-admin rejected by admin_set_order_status');

  // Non-admin call to admin_adjust_stock
  const { error: err2 } = await testUserCustomerClient.rpc('admin_adjust_stock', {
    p_product_id: testProductA.id,
    p_delta: 5,
  });
  assert(err2 && /unauthorized/i.test(err2.message), 'Non-admin rejected by admin_adjust_stock');

  // Non-admin call to admin_set_payment
  const { error: err3 } = await testUserCustomerClient.rpc('admin_set_payment', {
    p_order_id: crypto.randomUUID(),
    p_status: 'paid',
    p_paid_via: 'upi',
  });
  assert(err3 && /unauthorized/i.test(err3.message), 'Non-admin rejected by admin_set_payment');

  // Non-admin call to admin_remove_order_item
  const { error: err4 } = await testUserCustomerClient.rpc('admin_remove_order_item', {
    p_order_item_id: crypto.randomUUID(),
  });
  assert(err4 && /unauthorized/i.test(err4.message), 'Non-admin rejected by admin_remove_order_item');

  // Non-admin direct update to settings
  const { data: setRes, error: err5 } = await testUserCustomerClient
    .from('settings')
    .update({ store_open: false })
    .eq('id', 1)
    .select();
  assert(err5 || (setRes && setRes.length === 0), 'Non-admin blocked from updating settings table by RLS');

  console.log('\n=== 2. Admin Authentication & is_admin Verification ===');
  const { data: isAdmCustomer } = await testUserCustomerClient.rpc('is_admin');
  assert(isAdmCustomer === false, 'Customer is_admin returns false');

  const { data: isAdmAdmin } = await testUserAdminClient.rpc('is_admin');
  assert(isAdmAdmin === true, 'Admin is_admin returns true');

  console.log('\n=== 3. Stock Management (admin_adjust_stock) ===');
  // Increment stock by +5
  const { data: resInc, error: errInc } = await testUserAdminClient.rpc('admin_adjust_stock', {
    p_product_id: testProductA.id,
    p_delta: 5,
  });
  assert(!errInc && resInc?.success && resInc?.product?.stock_qty === 25, 'Admin can increment stock by +5 (20 -> 25)');

  // Attempt to reduce stock below 0
  const { error: errNeg } = await testUserAdminClient.rpc('admin_adjust_stock', {
    p_product_id: testProductA.id,
    p_delta: -30,
  });
  assert(errNeg && /negative/i.test(errNeg.message), 'Negative stock rejected with "Stock quantity cannot be negative"');

  // Restore stock back to 20
  await testUserAdminClient.rpc('admin_adjust_stock', { p_product_id: testProductA.id, p_delta: -5 });

  console.log('\n=== 4. Order Lifecycle & Status Progression ===');
  // Customer places an order with both items
  const clientReqId = crypto.randomUUID();
  const { data: placeRes } = await testUserCustomerClient.rpc('place_order', {
    p_client_request_id: clientReqId,
    p_items: [
      { product_id: testProductA.id, qty: 1 },
      { product_id: testProductB.id, qty: 1 },
    ],
    p_delivery_point_id: testDeliveryPoint.id,
    p_room: 'Room 101',
    p_substitution_pref: 'call_me',
    p_note: 'Deliver at rear gate',
  });
  const orderId = placeRes?.order?.id;
  assert(placeRes?.success && orderId, 'Customer placed test order successfully');

  // Verify stock decremented on order placement (Prod A: 20 -> 19, Prod B: 15 -> 14)
  const { data: prodACheck } = await adminService.from('products').select('stock_qty').eq('id', testProductA.id).single();
  assert(prodACheck.stock_qty === 19, 'Stock decremented on placement (20 -> 19)');

  // Advance placed -> accepted
  const { data: acceptRes, error: acceptErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_new_status: 'accepted',
  });
  assert(!acceptErr && acceptRes?.success && acceptRes?.order?.status === 'accepted', 'Admin advanced placed -> accepted');

  // Admin removes item B before packing
  const { data: orderItems, error: itemsFetchErr } = await adminService.from('order_items').select('*').eq('order_id', orderId);
  if (itemsFetchErr) console.error('Error fetching order items:', itemsFetchErr);
  const itemB = orderItems?.find((i) => i.product_id === testProductB.id);
  assert(!!itemB, 'Found order item B in order_items');

  if (itemB) {
    const { data: removeRes, error: removeErr } = await testUserAdminClient.rpc('admin_remove_order_item', {
      p_order_item_id: itemB.id,
    });
    assert(!removeErr && removeRes?.success, 'Admin successfully removed unavailable item B before packing');

    // Verify item B product stock was zeroed per SPEC Section 7
    const { data: prodBZeroCheck } = await adminService.from('products').select('stock_qty').eq('id', testProductB.id).single();
    assert(prodBZeroCheck.stock_qty === 0, 'Unavailable product B stock automatically zeroed to 0 in catalogue');

    // Verify grand total was recalculated (item B line total deducted)
    const { data: orderAfterRemoval } = await adminService.from('orders').select('*').eq('id', orderId).single();
    assert(orderAfterRemoval.items_total === testProductA.price, 'Items total recalculated correctly after removal');
  }

  // Advance accepted -> packed
  const { data: packRes, error: packErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_new_status: 'packed',
  });
  assert(!packErr && packRes?.success && packRes?.order?.status === 'packed', 'Admin advanced accepted -> packed');

  // Verify removing items after packing is refused
  const itemA = orderItems.find((i) => i.product_id === testProductA.id);
  const { data: failRemoveRes } = await testUserAdminClient.rpc('admin_remove_order_item', {
    p_order_item_id: itemA.id,
  });
  assert(failRemoveRes?.success === false && failRemoveRes?.error === 'order_already_packed', 'Item removal refused once order is packed');

  // Advance packed -> out_for_delivery
  const { data: outRes, error: outErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_new_status: 'out_for_delivery',
  });
  assert(!outErr && outRes?.success && outRes?.order?.status === 'out_for_delivery', 'Admin advanced packed -> out_for_delivery');

  // Advance out_for_delivery -> delivered
  const { data: delivRes, error: delivErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_new_status: 'delivered',
  });
  assert(!delivErr && delivRes?.success && delivRes?.order?.status === 'delivered', 'Admin advanced out_for_delivery -> delivered');

  console.log('\n=== 5. Payment Recording (admin_set_payment) ===');
  // Mark paid: upi
  const { data: payUpi, error: payUpiErr } = await testUserAdminClient.rpc('admin_set_payment', {
    p_order_id: orderId,
    p_status: 'paid',
    p_paid_via: 'upi',
  });
  assert(!payUpiErr && payUpi?.order?.payment_status === 'paid' && payUpi?.order?.paid_via === 'upi', 'Marked paid via UPI');

  // Mark paid: cash
  const { data: payCash } = await testUserAdminClient.rpc('admin_set_payment', {
    p_order_id: orderId,
    p_status: 'paid',
    p_paid_via: 'cash',
  });
  assert(payCash?.order?.paid_via === 'cash', 'Updated payment to Cash');

  // Mark unpaid
  const { data: payUnpaid } = await testUserAdminClient.rpc('admin_set_payment', {
    p_order_id: orderId,
    p_status: 'unpaid',
  });
  assert(payUnpaid?.order?.payment_status === 'unpaid' && payUnpaid?.order?.paid_via === null, 'Reverted payment to Unpaid');

  console.log('\n=== 6. Cancellation with Mandatory Reason & Stock Restoration ===');
  // Restore stock of product A to 20 before cancellation test
  await adminService.from('products').update({ stock_qty: 20 }).eq('id', testProductA.id);

  // Place second order
  const { data: placeRes2 } = await testUserCustomerClient.rpc('place_order', {
    p_client_request_id: crypto.randomUUID(),
    p_items: [{ product_id: testProductA.id, qty: 2 }],
    p_delivery_point_id: testDeliveryPoint.id,
    p_room: 'Room 202',
    p_substitution_pref: 'remove_item',
  });
  const orderId2 = placeRes2?.order?.id;
  assert(placeRes2?.success && orderId2, 'Placed second order for cancellation test (stock: 20 -> 18)');

  // Attempt cancel without reason -> should fail
  const { error: cancelNoReasonErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId2,
    p_new_status: 'cancelled',
    p_reason: '',
  });
  assert(cancelNoReasonErr && /reason required/i.test(cancelNoReasonErr.message), 'Cancellation without reason rejected by database');

  // Cancel with reason -> succeeds and restores stock
  const { data: cancelWithReason, error: cancelErr } = await testUserAdminClient.rpc('admin_set_order_status', {
    p_order_id: orderId2,
    p_new_status: 'cancelled',
    p_reason: 'Hostel gate closed by warden',
  });
  assert(!cancelErr && cancelWithReason?.order?.status === 'cancelled' && cancelWithReason?.order?.cancel_reason === 'Hostel gate closed by warden', 'Cancellation succeeded with reason');

  // Verify stock restored back to 20
  const { data: prodARestored } = await adminService.from('products').select('stock_qty').eq('id', testProductA.id).single();
  assert(prodARestored.stock_qty === 20, 'Stock of cancelled order restored (18 -> 20)');

  console.log('\n=== 7. Store Open/Closed Settings Update ===');
  const { error: closeStoreErr } = await testUserAdminClient
    .from('settings')
    .update({ store_open: false })
    .eq('id', 1);
  assert(!closeStoreErr, 'Admin successfully toggled store_open to false');

  const { data: settingsClosed } = await adminService.from('settings').select('store_open').eq('id', 1).single();
  assert(settingsClosed.store_open === false, 'Settings store_open verified as false');

  // Restore store_open to true
  await testUserAdminClient.from('settings').update({ store_open: true }).eq('id', 1);
  const { data: settingsOpen } = await adminService.from('settings').select('store_open').eq('id', 1).single();
  assert(settingsOpen.store_open === true, 'Settings store_open restored to true');
}

async function teardown() {
  console.log('\nCleaning up test artifacts...');
  try {
    // Clean up test products
    if (testProductA) await adminService.from('products').delete().eq('id', testProductA.id);
    if (testProductB) await adminService.from('products').delete().eq('id', testProductB.id);

    // Clean up test admin row
    if (testUserIdAdmin) await adminService.from('admins').delete().eq('user_id', testUserIdAdmin);

    // Clean up test users
    if (testUserIdCustomer) await adminService.auth.admin.deleteUser(testUserIdCustomer);
    if (testUserIdAdmin) await adminService.auth.admin.deleteUser(testUserIdAdmin);
  } catch (err) {
    console.warn('Teardown warning:', err);
  }
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await teardown();
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passedTests}/${totalTests} PASS`);
  console.log(`========================================`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
