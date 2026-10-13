import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Category, Product, DeliveryPoint } from '@/types';
import type {
  CategoryRow,
  ProductRow,
  DeliveryPointRow,
  SettingsRow,
} from '@/types/database';

export interface CatalogueData {
  categories: Category[];
  products: Product[];
  deliveryPoints: DeliveryPoint[];
  settings: SettingsRow | null;
  updatedAt: number;
}

const CACHE_STORAGE_KEY = 'plinkit-catalogue-cache';

function getStoredCatalogue(): CatalogueData | undefined {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return undefined;
  }
}

function saveStoredCatalogue(data: CatalogueData) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache catalogue in localStorage:', err);
  }
}

export async function fetchFullCatalogue(): Promise<CatalogueData> {
  const [categoriesRes, productsRes, deliveryPointsRes, settingsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('delivery_points')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('settings')
      .select('*')
      .single(),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;
  if (deliveryPointsRes.error) throw deliveryPointsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const rawCategories = (categoriesRes.data || []) as unknown as CategoryRow[];
  const rawProducts = (productsRes.data || []) as unknown as ProductRow[];
  const rawDeliveryPoints = (deliveryPointsRes.data || []) as unknown as DeliveryPointRow[];
  const rawSettings = settingsRes.data as unknown as SettingsRow;

  const categories: Category[] = rawCategories.map((cat, idx) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image_url: cat.image_url,
    tintIndex: (((cat.sort_order ?? idx) % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
    sort_order: cat.sort_order,
    is_active: cat.is_active,
  }));

  const products: Product[] = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    category_id: p.category_id,
    subcategory: p.subcategory,
    name: p.name,
    brand: p.brand,
    size_label: p.size_label,
    mrp: p.mrp,
    price: p.price,
    stock_qty: p.stock_qty,
    max_per_order: p.max_per_order,
    image_url: p.image_url ?? undefined,
    keywords: p.keywords ?? [],
    description: p.description ?? undefined,
    manufacturer: p.manufacturer ?? undefined,
    country_of_origin: p.country_of_origin,
    rail: p.rail,
    is_active: p.is_active,
  }));

  const deliveryPoints: DeliveryPoint[] = rawDeliveryPoints.map((dp) => ({
    id: dp.id,
    campus: dp.campus,
    name: dp.name,
    eta_minutes: dp.eta_minutes,
    delivery_fee_override: dp.delivery_fee_override,
    sort_order: dp.sort_order,
    is_active: dp.is_active,
  }));

  const catalogue: CatalogueData = {
    categories,
    products,
    deliveryPoints,
    settings: rawSettings,
    updatedAt: Date.now(),
  };

  saveStoredCatalogue(catalogue);
  return catalogue;
}

export function useCatalogue() {
  return useQuery({
    queryKey: ['catalogue'],
    queryFn: fetchFullCatalogue,
    initialData: getStoredCatalogue,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Evaluates whether the store is open in Asia/Kolkata timezone.
 * Handles closing times past midnight (e.g., opens 18:00, closes 01:00).
 */
export function checkStoreStatus(settings?: SettingsRow | null): {
  isOpen: boolean;
  opensAtFormatted: string;
  closesAtFormatted: string;
  noticeText: string | null;
} {
  if (!settings) {
    return {
      isOpen: true,
      opensAtFormatted: '6:00 pm',
      closesAtFormatted: '1:00 am',
      noticeText: null,
    };
  }

  // Format time strings like "18:00:00" to "6:00 pm"
  const formatTime = (timeStr: string) => {
    try {
      const parts = timeStr.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1] || '0', 10);
      const period = h >= 12 ? 'pm' : 'am';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  };

  const opensAtFormatted = formatTime(settings.opens_at);
  const closesAtFormatted = formatTime(settings.closes_at);
  const noticeText = settings.notice_text;

  // Manual master switch
  if (!settings.store_open) {
    return {
      isOpen: false,
      opensAtFormatted,
      closesAtFormatted,
      noticeText,
    };
  }

  try {
    // Current time in Asia/Kolkata
    const now = new Date();
    const kolkataTimeStr = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
    const [currH, currM] = kolkataTimeStr.split(':').map((s) => parseInt(s, 10));
    const currentMinutes = currH * 60 + currM;

    const [openH, openM] = settings.opens_at.split(':').map((s) => parseInt(s, 10));
    const openMinutes = openH * 60 + openM;

    const [closeH, closeM] = settings.closes_at.split(':').map((s) => parseInt(s, 10));
    const closeMinutes = closeH * 60 + closeM;

    let isWithinOperatingHours = false;
    if (closeMinutes < openMinutes) {
      // Closes after midnight (e.g. 18:00 [1080] to 01:00 [60])
      isWithinOperatingHours = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    } else {
      isWithinOperatingHours = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    return {
      isOpen: isWithinOperatingHours,
      opensAtFormatted,
      closesAtFormatted,
      noticeText,
    };
  } catch {
    return {
      isOpen: settings.store_open,
      opensAtFormatted,
      closesAtFormatted,
      noticeText,
    };
  }
}

/**
 * SPEC Section 9:
 * Similar items for a product: in stock, same subcategory first,
 * then same category, nearest in price, excluding itself, at most 6.
 */
export function getSimilarProducts(product: Product, allProducts: Product[]): Product[] {
  const inStock = allProducts.filter(
    (p) => p.id !== product.id && p.stock_qty > 0 && p.is_active && p.category_id === product.category_id
  );

  inStock.sort((a, b) => {
    const aSameSub = product.subcategory && a.subcategory === product.subcategory ? 1 : 0;
    const bSameSub = product.subcategory && b.subcategory === product.subcategory ? 1 : 0;
    if (aSameSub !== bSameSub) {
      return bSameSub - aSameSub;
    }
    const aDiff = Math.abs(a.price - product.price);
    const bDiff = Math.abs(b.price - product.price);
    return aDiff - bDiff;
  });

  return inStock.slice(0, 6);
}
