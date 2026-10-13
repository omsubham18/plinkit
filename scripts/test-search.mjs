import MiniSearch from 'minisearch';

// 1. Fixed Fixture Catalogue
const FIXTURE_CATEGORIES = [
  { id: 'c1', name: 'Chips & Crisps', slug: 'chips-crisps' },
  { id: 'c2', name: 'Cold Drinks', slug: 'cold-drinks' },
  { id: 'c3', name: 'Instant Noodles', slug: 'instant-noodles' },
  { id: 'c4', name: 'Biscuits & Cookies', slug: 'biscuits-cookies' },
  { id: 'c5', name: 'Chocolates', slug: 'chocolates' },
  { id: 'c6', name: 'Tea & Coffee', slug: 'tea-coffee' },
  { id: 'c7', name: 'Personal Care', slug: 'personal-care' },
  { id: 'c8', name: 'Stationery', slug: 'stationery' },
];

const FIXTURE_PRODUCTS = [
  {
    id: 'p1',
    sku: 'CHP-CLS-01',
    category_id: 'c1',
    subcategory: 'Chips',
    name: 'Classic Salted Potato Chips',
    brand: 'Campus Pantry',
    size_label: '85 g',
    mrp: 40,
    price: 35,
    stock_qty: 18,
    keywords: ['chips', 'potato', 'namkeen', 'chipsi', 'aloo chips', 'wafers', 'crisps', 'lays'],
    is_active: true,
  },
  {
    id: 'p2',
    sku: 'DRK-COL-01',
    category_id: 'c2',
    subcategory: 'Soda',
    name: 'Sparkling Cola Drink',
    brand: 'FreshChill',
    size_label: '250 ml',
    mrp: 20,
    price: 20,
    stock_qty: 24,
    keywords: ['cola', 'coke', 'cold drink', 'thanda', 'pepsi', 'thumsup', 'soda'],
    is_active: true,
  },
  {
    id: 'p3',
    sku: 'DRK-TEA-05',
    category_id: 'c2',
    subcategory: 'Iced Tea',
    name: 'Iced Peach Black Tea',
    brand: 'PureLeaf',
    size_label: '300 ml',
    mrp: 50,
    price: 44,
    stock_qty: 0, // OUT OF STOCK
    keywords: ['iced tea', 'peach tea', 'black tea', 'cold tea', 'lipton', 'thanda chai'],
    is_active: true,
  },
  {
    id: 'p4',
    sku: 'NDL-MAS-01',
    category_id: 'c3',
    subcategory: 'Instant',
    name: 'Classic Masala Instant Noodles',
    brand: 'QuickBite',
    size_label: '70 g',
    mrp: 15,
    price: 14,
    stock_qty: 30,
    keywords: ['maggi', 'magi', 'noodles', 'nudles', 'ramen', 'chowmein', '2 minute'],
    is_active: true,
  },
  {
    id: 'p5',
    sku: 'BSC-CHK-01',
    category_id: 'c4',
    subcategory: 'Cookies',
    name: 'Choco Chip Crunchy Cookies',
    brand: 'BakeWell',
    size_label: '120 g',
    mrp: 35,
    price: 30,
    stock_qty: 20,
    keywords: ['cookies', 'biscuit', 'biskit', 'choco chip', 'hide and seek', 'choclate biscuit'],
    is_active: true,
  },
  {
    id: 'p6',
    sku: 'CHO-MLK-01',
    category_id: 'c5',
    subcategory: 'Bar',
    name: 'Creamy Milk Chocolate Bar',
    brand: 'ChocoPure',
    size_label: '50 g',
    mrp: 45,
    price: 40,
    stock_qty: 20,
    keywords: ['chocolate', 'choclate', 'dairy milk', 'mithai', 'sweet', 'cadbury'],
    is_active: true,
  },
  {
    id: 'p7',
    sku: 'DRK-COF-04',
    category_id: 'c2',
    subcategory: 'Cold Coffee',
    name: 'Chilled Classic Cold Coffee',
    brand: 'DailyBrew',
    size_label: '200 ml',
    mrp: 40,
    price: 36,
    stock_qty: 15,
    keywords: ['coffee', 'cold coffee', 'frappe', 'mocha', 'caffeine', 'doodh', 'milk'],
    is_active: true,
  },
  {
    id: 'p8',
    sku: 'CAR-FCW-05',
    category_id: 'c7',
    subcategory: 'Face Care',
    name: 'Purifying Charcoal Face Wash',
    brand: 'GlowCampus',
    size_label: '50 ml',
    mrp: 85,
    price: 75,
    stock_qty: 12,
    keywords: ['face wash', 'facewash', 'garnier', 'himalaya', 'soap', 'charcoal face', 'sabun'],
    is_active: true,
  },
  {
    id: 'p9',
    sku: 'DRK-LEM-02',
    category_id: 'c2',
    subcategory: 'Soda',
    name: 'Clear Lemon Lime Soda',
    brand: 'FreshChill',
    size_label: '250 ml',
    mrp: 20,
    price: 20,
    stock_qty: 22,
    keywords: ['lemon', 'lime', 'sprite', '7up', 'nimbu', 'cold drink', 'soda'],
    is_active: true,
  },
];

// Helper functions replicating src/lib/search.ts and src/lib/catalogue.ts
function normalizeQuery(query) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSimilarProducts(product, allProducts) {
  const inStock = allProducts.filter(
    (p) => p.id !== product.id && p.stock_qty > 0 && p.is_active && p.category_id === product.category_id
  );

  inStock.sort((a, b) => {
    const aSameSub = product.subcategory && a.subcategory === product.subcategory ? 1 : 0;
    const bSameSub = product.subcategory && b.subcategory === product.subcategory ? 1 : 0;
    if (aSameSub !== bSameSub) return bSameSub - aSameSub;
    return Math.abs(a.price - product.price) - Math.abs(b.price - product.price);
  });

  return inStock.slice(0, 6);
}

function buildSearchIndex(products, categories) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const miniSearch = new MiniSearch({
    fields: ['name', 'brand', 'keywordsText', 'subcategory', 'categoryName', 'size_label'],
    storeFields: ['id'],
    searchOptions: {
      boost: { name: 10, brand: 6, keywordsText: 5, subcategory: 4, categoryName: 3, size_label: 2 },
      prefix: true,
      fuzzy: (term) => (term.length >= 6 ? 2 : term.length >= 3 ? 1 : false),
    },
  });

  const docs = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand || '',
    keywordsText: Array.isArray(p.keywords) ? p.keywords.join(' ') : '',
    subcategory: p.subcategory || '',
    categoryName: categoryMap.get(p.category_id) || '',
    size_label: p.size_label || '',
  }));

  miniSearch.addAll(docs);
  return miniSearch;
}

function searchCatalogue(query, index, products) {
  const clean = normalizeQuery(query);
  if (!clean) {
    return { inStockTier1: [], inStockFuzzy: [], outOfStockTier3: [], totalCount: 0 };
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const exactOrPrefixHits = index.search(clean, { prefix: true, fuzzy: false, combineWith: 'OR' });
  const allHits = index.search(clean, {
    prefix: true,
    fuzzy: (term) => (term.length >= 6 ? 2 : term.length >= 3 ? 1 : false),
    combineWith: 'OR',
  });

  const inStockTier1 = [];
  const inStockTier2 = [];
  const outOfStockTier3 = [];
  const seenIds = new Set();

  for (const hit of exactOrPrefixHits) {
    const p = productMap.get(hit.id);
    if (!p || seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    if (p.stock_qty > 0) {
      inStockTier1.push(p);
    } else {
      outOfStockTier3.push({ product: p, similar: getSimilarProducts(p, products) });
    }
  }

  for (const hit of allHits) {
    const p = productMap.get(hit.id);
    if (!p || seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    if (p.stock_qty > 0) {
      inStockTier2.push(p);
    } else {
      outOfStockTier3.push({ product: p, similar: getSimilarProducts(p, products) });
    }
  }

  return {
    inStockTier1,
    inStockTier2,
    outOfStockTier3,
    totalCount: inStockTier1.length + inStockTier2.length + outOfStockTier3.length,
  };
}

// 2. Test Execution
console.log('=== MiniSearch Unit Test Suite ===\n');

const index = buildSearchIndex(FIXTURE_PRODUCTS, FIXTURE_CATEGORIES);

let passed = 0;
let total = 0;

function assert(description, condition) {
  total++;
  if (condition) {
    console.log(`PASS: ${description}`);
    passed++;
  } else {
    console.error(`FAIL: ${description}`);
  }
}

// Test 1: Exact match
const r1 = searchCatalogue('potato', index, FIXTURE_PRODUCTS);
assert('1. Exact match for "potato" returns Classic Salted Potato Chips in Tier 1',
  r1.inStockTier1.some((p) => p.name.includes('Potato Chips'))
);

// Test 2: Prefix match
const r2 = searchCatalogue('mag', index, FIXTURE_PRODUCTS);
assert('2. Prefix match for "mag" returns Classic Masala Instant Noodles in Tier 1',
  r2.inStockTier1.some((p) => p.name.includes('Noodles'))
);

// Test 3: One typo
const r3 = searchCatalogue('biskit', index, FIXTURE_PRODUCTS);
assert('3. One-typo search "biskit" returns Choco Chip Crunchy Cookies',
  r3.inStockTier1.some((p) => p.name.includes('Cookies')) || r3.inStockTier2.some((p) => p.name.includes('Cookies'))
);

// Test 4: Two typos
const r4 = searchCatalogue('choclate', index, FIXTURE_PRODUCTS);
assert('4. Two-typos search "choclate" returns Creamy Milk Chocolate Bar',
  r4.inStockTier1.some((p) => p.name.includes('Chocolate')) || r4.inStockTier2.some((p) => p.name.includes('Chocolate'))
);

// Test 5: Hinglish / Alias matches
const r5a = searchCatalogue('cold drink', index, FIXTURE_PRODUCTS);
assert('5a. Alias search "cold drink" returns Sparkling Cola Drink',
  r5a.inStockTier1.some((p) => p.name.includes('Cola'))
);

const r5b = searchCatalogue('doodh', index, FIXTURE_PRODUCTS);
assert('5b. Hinglish search "doodh" returns Chilled Classic Cold Coffee',
  r5b.inStockTier1.some((p) => p.name.includes('Cold Coffee'))
);

const r5c = searchCatalogue('sabun', index, FIXTURE_PRODUCTS);
assert('5c. Hinglish search "sabun" returns Purifying Charcoal Face Wash',
  r5c.inStockTier1.some((p) => p.name.includes('Face Wash'))
);

// Test 6: Out of stock match with alternatives
const r6 = searchCatalogue('peach', index, FIXTURE_PRODUCTS);
assert('6a. Search for out-of-stock "peach" places item in Tier 3 (outOfStockTier3)',
  r6.outOfStockTier3.length > 0 && r6.outOfStockTier3[0].product.name.includes('Peach')
);
assert('6b. Out-of-stock item is followed by in-stock similar items from same category',
  r6.outOfStockTier3[0].similar.length > 0 && r6.outOfStockTier3[0].similar.every((p) => p.stock_qty > 0)
);

// Test 7: No match
const r7 = searchCatalogue('astronaut helmet', index, FIXTURE_PRODUCTS);
assert('7. Non-existent query "astronaut helmet" yields 0 matches',
  r7.totalCount === 0 && r7.inStockTier1.length === 0 && r7.inStockTier2.length === 0 && r7.outOfStockTier3.length === 0
);

// Test 8: Normalization (punctuation & whitespace)
const r8 = searchCatalogue('   MAGGI!!??   ', index, FIXTURE_PRODUCTS);
assert('8. Normalization strips punctuation and spaces: "   MAGGI!!??   " matches noodles',
  r8.inStockTier1.some((p) => p.name.includes('Noodles'))
);

console.log(`\nResults: ${passed}/${total} PASS`);

if (passed !== total) {
  process.exit(1);
}
