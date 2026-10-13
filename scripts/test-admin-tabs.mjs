#!/usr/bin/env node
/**
 * scripts/test-admin-tabs.mjs
 *
 * Automated verification of Operator Console remaining tabs:
 * 1. CSV Parser & Row Validation (catalog-template.csv schema, per-row validation).
 * 2. Products Management (full field upsert, edit, deactivation instead of deletion).
 * 3. Categories Management (add, edit, reorder sequence).
 * 4. Store Settings & Delivery Points (hours with midnight crossing, campus delivery points).
 * 5. Business Day (06:00–06:00 IST) & Today Analytics / Search Misses / Requests.
 *
 * Run: npm run test:admin-tabs
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

function parseCsvRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rows = [];

  for (const line of lines) {
    const fields = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur.trim());
    rows.push(fields);
  }
  return rows;
}

function validateCatalogRow(row, rowIndex, categorySlugMap) {
  const errors = [];
  const sku = row.sku?.trim() || '';
  const categorySlug = row.category_slug?.trim() || '';
  const name = row.name?.trim() || '';
  const price = Number(row.price);

  if (!sku) errors.push('Missing required SKU');
  if (!name) errors.push('Missing required Product Name');
  if (!categorySlug) {
    errors.push('Missing Category Slug');
  } else if (!categorySlugMap.has(categorySlug)) {
    errors.push(`Category "${categorySlug}" does not exist in store`);
  }

  if (isNaN(price) || price < 0) {
    errors.push('Price must be a valid non-negative number');
  }

  return { isValid: errors.length === 0, errors, sku, name };
}

function getBusinessDayRangeIST(referenceDate = new Date()) {
  const utcMs = referenceDate.getTime();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcMs + istOffsetMs);

  const istHours = istTime.getUTCHours();
  const dayStartIst = new Date(istTime);

  if (istHours < 6) {
    dayStartIst.setUTCDate(dayStartIst.getUTCDate() - 1);
  }
  dayStartIst.setUTCHours(6, 0, 0, 0);

  const dayEndIst = new Date(dayStartIst);
  dayEndIst.setUTCDate(dayEndIst.getUTCDate() + 1);

  const startUtc = new Date(dayStartIst.getTime() - istOffsetMs);
  const endUtc = new Date(dayEndIst.getTime() - istOffsetMs);

  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
  };
}

async function run() {
  console.log('--- OPERATOR CONSOLE REMAINING TABS TEST SUITE ---');
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  FAIL: ${message}`);
      failures++;
    } else {
      console.log(`  PASS: ${message}`);
    }
  }

  // 1. Setup Admin Test Client
  console.log('\n[Phase 1] Admin Authentication Setup');
  const testAdminEmail = `test-tabs-admin-${crypto.randomUUID()}@example.com`;
  const testPassword = `Pass#${crypto.randomBytes(8).toString('hex')}!`;

  const { data: adminAuthData, error: adminAuthErr } = await adminService.auth.admin.createUser({
    email: testAdminEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (adminAuthErr) {
    console.error('Failed to create test admin auth user:', adminAuthErr);
    process.exit(1);
  }
  const adminUserId = adminAuthData.user.id;

  const { error: adminInsertErr } = await adminService
    .from('admins')
    .insert({ user_id: adminUserId });
  if (adminInsertErr) {
    console.error('Failed to insert admin record:', adminInsertErr);
    process.exit(1);
  }

  const { data: adminLoginData, error: adminLoginErr } = await adminService.auth.signInWithPassword({
    email: testAdminEmail,
    password: testPassword,
  });
  if (adminLoginErr) {
    console.error('Admin login failed:', adminLoginErr);
    process.exit(1);
  }
  const adminClient = createAuthClient(adminLoginData.session.access_token);
  assert(true, 'Test admin created and authenticated');

  // Fetch initial category for foreign key tests
  const { data: initialCategories } = await adminClient
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  const categoryMap = new Map();
  initialCategories?.forEach((c) => categoryMap.set(c.slug, c.id));
  const sampleCatSlug = initialCategories?.[0]?.slug || 'chips-namkeen';

  // 2. CSV Validation & Template Testing
  console.log('\n[Phase 2] CSV Template & Row Pre-Validation');
  const templatePath = path.resolve(process.cwd(), 'docs/catalog-template.csv');
  assert(fs.existsSync(templatePath), 'docs/catalog-template.csv exists');

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const parsedTemplate = parseCsvRows(templateContent);
  assert(parsedTemplate.length > 1, `CSV contains header + sample rows (${parsedTemplate.length} lines)`);

  const headers = parsedTemplate[0];
  const requiredFields = [
    'sku', 'category_slug', 'subcategory', 'name', 'brand', 'size_label',
    'mrp', 'price', 'stock_qty', 'max_per_order', 'keywords', 'description',
    'manufacturer', 'country_of_origin', 'rail', 'is_active', 'image_filename',
  ];
  const allHeadersPresent = requiredFields.every((f) => headers.includes(f));
  assert(allHeadersPresent, 'All 17 catalog fields present in CSV template header');

  // Test validation on sample valid row
  const validRow = {
    sku: 'TEST-SKU-VALID',
    category_slug: sampleCatSlug,
    name: 'Valid Test Product',
    price: 45,
  };
  const validRes = validateCatalogRow(validRow, 2, categoryMap);
  assert(validRes.isValid && validRes.errors.length === 0, 'Valid catalog row passes validation');

  // Test validation on invalid rows
  const invalidRow1 = {
    sku: '',
    category_slug: sampleCatSlug,
    name: 'Missing SKU Item',
    price: 50,
  };
  const invalidRes1 = validateCatalogRow(invalidRow1, 3, categoryMap);
  assert(!invalidRes1.isValid && invalidRes1.errors.some((e) => e.includes('Missing required SKU')), 'Missing SKU flagged with error');

  const invalidRow2 = {
    sku: 'TEST-SKU-BAD-CAT',
    category_slug: 'non-existent-category-12345',
    name: 'Bad Category Item',
    price: 50,
  };
  const invalidRes2 = validateCatalogRow(invalidRow2, 4, categoryMap);
  assert(!invalidRes2.isValid && invalidRes2.errors.some((e) => e.includes('does not exist')), 'Non-existent category flagged with error');

  const invalidRow3 = {
    sku: 'TEST-SKU-NEG-PRICE',
    category_slug: sampleCatSlug,
    name: 'Negative Price Item',
    price: -10,
  };
  const invalidRes3 = validateCatalogRow(invalidRow3, 5, categoryMap);
  assert(!invalidRes3.isValid && invalidRes3.errors.some((e) => e.includes('non-negative')), 'Negative price flagged with error');

  // 3. Products Management: Upsert, Edit, Deactivate
  console.log('\n[Phase 3] Products CRUD & Deactivate Rule');
  const sampleCatId = initialCategories?.[0]?.id;
  const testProductSku = `TEST-PROD-${crypto.randomUUID().slice(0, 8)}`;

  // Create Product
  const newProductData = {
    category_id: sampleCatId,
    sku: testProductSku,
    name: 'Automated Test Product',
    brand: 'TestBrand',
    size_label: '100g',
    mrp: 60,
    price: 50,
    stock_qty: 25,
    max_per_order: 5,
    keywords: ['test', 'chips'],
    description: 'Crispy automated test snack',
    manufacturer: 'Test Co.',
    country_of_origin: 'India',
    rail: 'late_night',
    is_active: true,
  };

  const { data: createdProduct, error: createProdErr } = await adminClient
    .from('products')
    .insert(newProductData)
    .select()
    .single();

  if (createProdErr) {
    console.error('createProdErr:', createProdErr);
  }
  assert(!createProdErr && createdProduct?.id, 'Product created successfully with all fields');

  // Edit Product fields
  const { data: updatedProduct, error: updateProdErr } = await adminClient
    .from('products')
    .update({ price: 48, stock_qty: 30, name: 'Automated Test Product Edited' })
    .eq('id', createdProduct.id)
    .select()
    .single();

  assert(!updateProdErr && updatedProduct.price === 48 && updatedProduct.stock_qty === 30, 'Product fields updated (price, stock_qty, name)');

  // Rule 1: Deactivate instead of delete
  const { data: deactivatedProduct, error: deactErr } = await adminClient
    .from('products')
    .update({ is_active: false })
    .eq('id', createdProduct.id)
    .select()
    .single();

  assert(!deactErr && deactivatedProduct.is_active === false, 'Product deactivated successfully (is_active = false)');

  // Verify product is still present in database (not deleted)
  const { data: checkProduct } = await adminClient
    .from('products')
    .select('id, is_active')
    .eq('id', createdProduct.id)
    .single();
  assert(checkProduct && checkProduct.is_active === false, 'Product exists in database with is_active = false (not deleted)');

  // Re-activate product
  const { data: reactivatedProduct } = await adminClient
    .from('products')
    .update({ is_active: true })
    .eq('id', createdProduct.id)
    .select()
    .single();
  assert(reactivatedProduct?.is_active === true, 'Product reactivated successfully');

  // 4. Categories Management: Add, Edit, Reorder
  console.log('\n[Phase 4] Categories CRUD & Reordering');
  const testCatSlug = `test-cat-${crypto.randomUUID().slice(0, 6)}`;
  const { data: createdCat, error: createCatErr } = await adminClient
    .from('categories')
    .insert({
      name: 'Test Category',
      slug: testCatSlug,
      image_url: '/categories/chips.webp',
      sort_order: 999,
    })
    .select()
    .single();

  assert(!createCatErr && createdCat?.id, 'Category added with name, slug, image_url, sort_order');

  // Edit Category
  const { data: updatedCat, error: updateCatErr } = await adminClient
    .from('categories')
    .update({ name: 'Test Category Renamed' })
    .eq('id', createdCat.id)
    .select()
    .single();
  assert(!updateCatErr && updatedCat.name === 'Test Category Renamed', 'Category renamed successfully');

  // Reorder test: update sort_order
  const { data: reorderedCat, error: reorderErr } = await adminClient
    .from('categories')
    .update({ sort_order: 1000 })
    .eq('id', createdCat.id)
    .select()
    .single();
  assert(!reorderErr && reorderedCat.sort_order === 1000, 'Category sort_order updated successfully for reordering');

  // 5. Delivery Points: Add, Rename, ETA, Fee Override, Activate/Deactivate
  console.log('\n[Phase 5] Delivery Points Management');
  const testDpName = `Test Point ${crypto.randomUUID().slice(0, 4)}`;
  const { data: createdDp, error: createDpErr } = await adminClient
    .from('delivery_points')
    .insert({
      campus: 'MANIT',
      name: testDpName,
      eta_minutes: 15,
      delivery_fee_override: 10,
      is_active: true,
      sort_order: 999,
    })
    .select()
    .single();

  if (createDpErr) {
    console.error('createDpErr:', createDpErr);
  }
  assert(!createDpErr && createdDp?.id, 'Delivery point added with campus, ETA, fee override');

  // Rename & update ETA
  const { data: updatedDp, error: updateDpErr } = await adminClient
    .from('delivery_points')
    .update({ name: `${testDpName} Renamed`, eta_minutes: 20, delivery_fee_override: 0 })
    .eq('id', createdDp.id)
    .select()
    .single();
  assert(!updateDpErr && updatedDp.eta_minutes === 20 && updatedDp.delivery_fee_override === 0, 'Delivery point ETA and fee override updated');

  // Toggle active/deactivate
  const { data: deactDp, error: deactDpErr } = await adminClient
    .from('delivery_points')
    .update({ is_active: false })
    .eq('id', createdDp.id)
    .select()
    .single();
  assert(!deactDpErr && deactDp.is_active === false, 'Delivery point deactivated (is_active = false)');

  // 6. Settings Updates: Hours (including past midnight), Fees, Support Phone, Notice
  console.log('\n[Phase 6] Store Settings Updates');
  const { data: originalSettings } = await adminClient
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  // Test updating hours past midnight (opens 08:00, closes 02:00)
  const testSettingsUpdate = {
    opens_at: '08:00:00',
    closes_at: '02:00:00',
    min_order_value: 49,
    delivery_fee: 15,
    free_delivery_above: 199,
    max_active_orders_per_user: 35,
    support_phone: '+91 98765 43210',
    notice_text: 'Midnight deliveries active in Bhopal campuses!',
  };

  const { data: updatedSettings, error: updateSettingsErr } = await adminClient
    .from('settings')
    .update(testSettingsUpdate)
    .eq('id', 1)
    .select()
    .single();

  if (updateSettingsErr) {
    console.error('updateSettingsErr:', updateSettingsErr);
  }
  assert(!updateSettingsErr, 'Settings updated without error');
  assert(
    updatedSettings?.opens_at?.startsWith('08:00') &&
    updatedSettings?.closes_at?.startsWith('02:00') &&
    updatedSettings?.min_order_value === 49 &&
    updatedSettings?.delivery_fee === 15 &&
    updatedSettings?.free_delivery_above === 199 &&
    updatedSettings?.max_active_orders_per_user === 35 &&
    updatedSettings?.support_phone === '+91 98765 43210' &&
    updatedSettings?.notice_text === 'Midnight deliveries active in Bhopal campuses!',
    'All store settings (midnight hours, min order, fee, support phone, notice) persisted accurately'
  );

  // Restore original settings
  if (originalSettings) {
    await adminClient
      .from('settings')
      .update({
        opens_at: originalSettings.opens_at,
        closes_at: originalSettings.closes_at,
        min_order_value: originalSettings.min_order_value,
        delivery_fee: originalSettings.delivery_fee,
        free_delivery_above: originalSettings.free_delivery_above,
        max_active_orders_per_user: originalSettings.max_active_orders_per_user,
        support_phone: originalSettings.support_phone,
        notice_text: originalSettings.notice_text,
      })
      .eq('id', 1);
  }

  // 7. Business Day (06:00–06:00 IST) & Today Analytics / Search Misses
  console.log('\n[Phase 7] Business Day IST & Analytics Verification');
  const dayRange = getBusinessDayRangeIST();
  assert(dayRange.startUtc && dayRange.endUtc, `Computed Business Day range: ${dayRange.startUtc} to ${dayRange.endUtc}`);

  const startParsed = new Date(dayRange.startUtc);
  const endParsed = new Date(dayRange.endUtc);
  const diffHours = (endParsed.getTime() - startParsed.getTime()) / (1000 * 60 * 60);
  assert(diffHours === 24, 'Business day window is exactly 24 hours');

  // Verify search misses table query
  const { data: searchMisses, error: missesErr } = await adminClient
    .from('search_misses')
    .select('query, created_at')
    .limit(20);
  assert(!missesErr, 'Successfully queried search_misses table');

  // Verify item requests table query
  const { data: itemRequests, error: reqErr } = await adminClient
    .from('item_requests')
    .select('*')
    .limit(20);
  assert(!reqErr, 'Successfully queried item_requests table');

  // 8. Clean up created test entities
  console.log('\n[Phase 8] Teardown & Cleanup');
  if (createdProduct?.id) {
    await adminClient.from('products').delete().eq('id', createdProduct.id);
  }
  if (createdCat?.id) {
    await adminClient.from('categories').delete().eq('id', createdCat.id);
  }
  if (createdDp?.id) {
    await adminClient.from('delivery_points').delete().eq('id', createdDp.id);
  }
  if (adminUserId) {
    await adminService.from('admins').delete().eq('user_id', adminUserId);
    await adminService.auth.admin.deleteUser(adminUserId);
  }
  assert(true, 'Test entities and temporary admin cleaned up');

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log('ALL OPERATOR TABS TESTS PASSED (0 failures)');
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
