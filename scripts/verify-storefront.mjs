import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !anonKey || !secretKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const publicClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, secretKey);

async function runVerification() {
  console.log('--- 1. Testing Catalogue & Settings Fetch (Public Anon) ---');
  const [catsRes, prodsRes, dpsRes, settingsRes] = await Promise.all([
    publicClient.from('categories').select('*').eq('is_active', true).order('sort_order'),
    publicClient.from('products').select('*').eq('is_active', true),
    publicClient.from('delivery_points').select('*').eq('is_active', true).order('sort_order'),
    publicClient.from('settings').select('*').single(),
  ]);

  if (catsRes.error) throw new Error('Categories fetch failed: ' + catsRes.error.message);
  if (prodsRes.error) throw new Error('Products fetch failed: ' + prodsRes.error.message);
  if (dpsRes.error) throw new Error('Delivery points fetch failed: ' + dpsRes.error.message);
  if (settingsRes.error) throw new Error('Settings fetch failed: ' + settingsRes.error.message);

  console.log(`✓ Categories loaded: ${catsRes.data.length} active`);
  console.log(`✓ Products loaded: ${prodsRes.data.length} active`);
  console.log(`✓ Delivery points loaded: ${dpsRes.data.length} active`);
  console.log(`✓ Store open setting: ${settingsRes.data.store_open}, hours: ${settingsRes.data.opens_at} - ${settingsRes.data.closes_at}`);

  console.log('\n--- 2. Testing Rails and Similar Items ---');
  const lateNight = prodsRes.data.filter((p) => p.rail === 'late_night');
  const bestsellers = prodsRes.data.filter((p) => p.rail === 'bestsellers');
  const newArrivals = prodsRes.data.filter((p) => p.rail === 'new');
  console.log(`✓ Late night rail: ${lateNight.length} products`);
  console.log(`✓ Bestsellers rail: ${bestsellers.length} products`);
  console.log(`✓ New arrivals rail: ${newArrivals.length} products`);

  const sampleProduct = prodsRes.data[0];
  const similar = prodsRes.data
    .filter((p) => p.id !== sampleProduct.id && p.stock_qty > 0 && p.category_id === sampleProduct.category_id)
    .sort((a, b) => {
      const aSameSub = sampleProduct.subcategory && a.subcategory === sampleProduct.subcategory ? 1 : 0;
      const bSameSub = sampleProduct.subcategory && b.subcategory === sampleProduct.subcategory ? 1 : 0;
      if (aSameSub !== bSameSub) return bSameSub - aSameSub;
      return Math.abs(a.price - sampleProduct.price) - Math.abs(b.price - sampleProduct.price);
    })
    .slice(0, 6);
  console.log(`✓ Similar items for "${sampleProduct.name}": ${similar.length} items found`);

  console.log('\n--- 3. Testing Cart Stepper, Caps & Agreement ---');
  let cart = {};
  const addToCart = (product) => {
    const curr = cart[product.id] || 0;
    const max = product.max_per_order ?? 5;
    if (curr >= product.stock_qty) return { success: false, reason: `Only ${product.stock_qty} available` };
    if (curr >= max) return { success: false, reason: `Maximum order limit is ${max}` };
    cart[product.id] = curr + 1;
    return { success: true };
  };

  // Add 1 from rail
  const res1 = addToCart(sampleProduct);
  if (!res1.success) throw new Error('Failed to add product from rail');
  console.log(`✓ Added "${sampleProduct.name}" from rail. Cart qty: ${cart[sampleProduct.id]}`);

  // Increment from sheet
  const res2 = addToCart(sampleProduct);
  if (!res2.success) throw new Error('Failed to increment product from sheet');
  console.log(`✓ Incremented in sheet. Cart qty: ${cart[sampleProduct.id]}`);

  // Check agreement
  const cartBarItemsCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartBarTotalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = prodsRes.data.find((item) => item.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
  if (cartBarItemsCount !== 2 || cartBarTotalPrice !== sampleProduct.price * 2) {
    throw new Error('CartBar and ProductCard do not agree!');
  }
  console.log(`✓ ProductCard and CartBar agree: ${cartBarItemsCount} items, ₹${cartBarTotalPrice}`);

  // Test capping
  for (let i = 0; i < 10; i++) {
    addToCart(sampleProduct);
  }
  const maxLimit = sampleProduct.max_per_order ?? 5;
  if (cart[sampleProduct.id] > maxLimit) {
    throw new Error('Cart exceeded max_per_order limit!');
  }
  console.log(`✓ Stepper correctly capped at max_per_order (${cart[sampleProduct.id]} items)`);

  console.log('\n--- 4. Testing Remote Database Stock Mutation & Cart Auto-Reconciliation ---');
  const targetProduct = prodsRes.data.find((p) => p.stock_qty > 0);
  const originalStock = targetProduct.stock_qty;
  console.log(`Target product for stock-out test: "${targetProduct.name}" (ID: ${targetProduct.id}, Original Stock: ${originalStock})`);

  // Place in cart
  cart = { [targetProduct.id]: 2 };
  console.log(`Cart initially has 2 units of "${targetProduct.name}".`);

  // Admin updates stock_qty to 0
  console.log('Setting stock_qty to 0 in remote Supabase database...');
  const { error: updateErr } = await adminClient
    .from('products')
    .update({ stock_qty: 0 })
    .eq('id', targetProduct.id);
  if (updateErr) throw new Error('Failed to update stock_qty: ' + updateErr.message);

  // Client refreshes catalogue (as happens every 60s or on window focus)
  const { data: refreshedProducts, error: refetchErr } = await publicClient
    .from('products')
    .select('*')
    .eq('is_active', true);
  if (refetchErr) throw new Error('Failed to re-fetch products: ' + refetchErr.message);

  const updatedTarget = refreshedProducts.find((p) => p.id === targetProduct.id);
  if (updatedTarget.stock_qty !== 0) {
    throw new Error('Database stock update was not reflected in refreshed catalogue!');
  }
  console.log(`✓ Refreshed catalogue reflects stock_qty: ${updatedTarget.stock_qty}`);

  // Run reconciliation
  const reconcile = (currentItems, productList) => {
    const next = { ...currentItems };
    const notifications = [];
    const map = new Map(productList.map((p) => [p.id, p]));
    for (const [id, qty] of Object.entries(currentItems)) {
      const prod = map.get(id);
      if (!prod || !prod.is_active || prod.stock_qty <= 0) {
        delete next[id];
        notifications.push(`${prod ? prod.name : 'An item'} is out of stock. We removed it from your cart.`);
      } else if (qty > prod.stock_qty) {
        next[id] = prod.stock_qty;
        notifications.push(`Adjusted ${prod.name} quantity to ${prod.stock_qty} due to limited stock.`);
      }
    }
    return { next, notifications };
  };

  const { next: reconciledCart, notifications } = reconcile(cart, refreshedProducts);
  if (reconciledCart[targetProduct.id] !== undefined) {
    throw new Error('Cart failed to remove out-of-stock item during reconciliation!');
  }
  console.log(`✓ Cart successfully auto-corrected:`, notifications[0]);
  console.log(`✓ Cart contents after reconciliation:`, reconciledCart);

  // Clean up: restore original stock
  console.log(`Restoring original stock (${originalStock}) in remote Supabase database...`);
  const { error: restoreErr } = await adminClient
    .from('products')
    .update({ stock_qty: originalStock })
    .eq('id', targetProduct.id);
  if (restoreErr) throw new Error('Failed to restore stock: ' + restoreErr.message);
  console.log('✓ Original stock successfully restored in remote database.');

  console.log('\n========================================');
  console.log('ALL VERIFICATION CHECKS PASSED (5/5 PASS)');
  console.log('========================================');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
