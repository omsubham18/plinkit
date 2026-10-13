import MiniSearch from 'minisearch';
import { supabase } from './supabase';
import { getSimilarProducts } from './catalogue';
import type { Product, Category } from '@/types';
import type { SearchMissInsert, ItemRequestInsert } from '@/types/database';

export interface SearchDoc {
  id: string;
  name: string;
  brand: string;
  keywordsText: string;
  subcategory: string;
  categoryName: string;
  size_label: string;
}

export interface OutOfStockSearchResult {
  product: Product;
  similar: Product[];
}

export interface SearchTieredResults {
  inStockTier1: Product[]; // Exact and prefix matches in-stock
  inStockTier2: Product[]; // Fuzzy matches in-stock
  outOfStockTier3: OutOfStockSearchResult[]; // Out-of-stock matches with alternatives
  totalCount: number;
}

/**
 * Normalises a search query according to SPEC Section 8:
 * Lowercase, trimmed, punctuation and repeated spaces removed.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a MiniSearch index from the active catalogue products.
 * Weighted strictly according to SPEC Section 8:
 * name (10), brand (6), keywords (5), subcategory (4), category (3), size_label (2).
 */
export function buildSearchIndex(
  products: Product[],
  categories: Category[]
): MiniSearch<SearchDoc> {
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
  }

  const miniSearch = new MiniSearch<SearchDoc>({
    fields: ['name', 'brand', 'keywordsText', 'subcategory', 'categoryName', 'size_label'],
    storeFields: ['id'],
    searchOptions: {
      boost: {
        name: 10,
        brand: 6,
        keywordsText: 5,
        subcategory: 4,
        categoryName: 3,
        size_label: 2,
      },
      prefix: true,
      fuzzy: (term) => (term.length >= 6 ? 2 : term.length >= 3 ? 1 : false),
    },
  });

  const docs: SearchDoc[] = products
    .filter((p) => p.is_active)
    .map((p) => ({
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

/**
 * Executes tiered search ordering per SPEC Section 8:
 * 1. in-stock exact and prefix matches,
 * 2. in-stock fuzzy matches,
 * 3. out-of-stock matches, dimmed, each followed by a "Similar in stock" row.
 */
export function searchCatalogue(
  query: string,
  index: MiniSearch<SearchDoc>,
  products: Product[]
): SearchTieredResults {
  const clean = normalizeQuery(query);
  if (!clean) {
    return {
      inStockTier1: [],
      inStockTier2: [],
      outOfStockTier3: [],
      totalCount: 0,
    };
  }

  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  // 1. Exact and prefix search pass (no fuzzy)
  const exactOrPrefixHits = index.search(clean, {
    prefix: true,
    fuzzy: false,
    combineWith: 'OR',
  });

  // 2. Full search pass with fuzzy tolerance enabled
  const allHits = index.search(clean, {
    prefix: true,
    fuzzy: (term) => (term.length >= 6 ? 2 : term.length >= 3 ? 1 : false),
    combineWith: 'OR',
  });

  const inStockTier1: Product[] = [];
  const inStockTier2: Product[] = [];
  const outOfStockTier3: OutOfStockSearchResult[] = [];

  const seenIds = new Set<string>();

  // Process exact / prefix hits first
  for (const hit of exactOrPrefixHits) {
    const p = productMap.get(hit.id);
    if (!p || seenIds.has(p.id)) continue;
    seenIds.add(p.id);

    if (p.stock_qty > 0) {
      inStockTier1.push(p);
    } else {
      outOfStockTier3.push({
        product: p,
        similar: getSimilarProducts(p, products),
      });
    }
  }

  // Process remaining fuzzy hits
  for (const hit of allHits) {
    const p = productMap.get(hit.id);
    if (!p || seenIds.has(p.id)) continue;
    seenIds.add(p.id);

    if (p.stock_qty > 0) {
      inStockTier2.push(p);
    } else {
      outOfStockTier3.push({
        product: p,
        similar: getSimilarProducts(p, products),
      });
    }
  }

  return {
    inStockTier1,
    inStockTier2,
    outOfStockTier3,
    totalCount: inStockTier1.length + inStockTier2.length + outOfStockTier3.length,
  };
}

/**
 * Log search miss to Supabase search_misses table per SPEC Section 8:
 * Only when query has >= 3 chars, returned nothing, and after user paused 1.5s or left screen.
 */
export async function logSearchMiss(query: string): Promise<void> {
  const clean = query.trim().slice(0, 80);
  if (clean.length < 3) return;

  try {
    const row: SearchMissInsert = { query: clean };
    await supabase.from('search_misses').insert(row);
  } catch (err) {
    // Non-blocking telemetry
    console.warn('Failed to log search miss:', err);
  }
}

/**
 * Submits an item request to Supabase item_requests table per SPEC Section 8:
 * Writing up to 120 characters from customer.
 */
export async function submitItemRequest(
  text: string
): Promise<{ success: boolean; error?: string }> {
  const clean = text.trim().slice(0, 120);
  if (!clean) {
    return { success: false, error: 'Request text cannot be empty' };
  }

  try {
    const row: ItemRequestInsert = { text: clean };
    const { error } = await supabase.from('item_requests').insert(row);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit request',
    };
  }
}
