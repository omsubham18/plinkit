import type { ProductRow, CategoryRow } from '@/types/database';
import type { AdminOrderWithItems } from './admin';
import { formatISTTime } from './admin';

export interface CsvValidationError {
  row: number;
  sku?: string;
  field: string;
  message: string;
}

export interface ParsedCatalogRow {
  sku: string;
  category_id: string;
  category_slug: string;
  subcategory: string | null;
  name: string;
  brand: string;
  size_label: string;
  mrp: number;
  price: number;
  stock_qty: number;
  max_per_order: number;
  keywords: string[];
  description: string | null;
  manufacturer: string | null;
  country_of_origin: string;
  rail: 'late_night' | 'bestsellers' | 'new' | null;
  is_active: boolean;
  image_filename?: string;
}

/**
 * Robust RFC-4180 CSV line parser supporting quoted fields, escaped quotes, and commas.
 */
export function parseCsvRows(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Validates each row of the catalog CSV against database constraints and categories.
 */
export function validateCatalogCsv(
  csvText: string,
  categories: CategoryRow[]
): {
  validRows: ParsedCatalogRow[];
  errors: CsvValidationError[];
  headers: string[];
} {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      validRows: [],
      errors: [{ row: 1, field: 'file', message: 'CSV file is empty or missing data rows' }],
      headers: [],
    };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase().trim());
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => headerMap.set(h, idx));

  // Required header fields
  const requiredHeaders = ['sku', 'category_slug', 'name', 'price', 'mrp'];
  for (const rh of requiredHeaders) {
    if (!headerMap.has(rh)) {
      return {
        validRows: [],
        errors: [{ row: 1, field: rh, message: `Missing required header column: "${rh}"` }],
        headers: rawHeaders,
      };
    }
  }

  const catMap = new Map<string, string>();
  for (const c of categories) {
    catMap.set(c.slug.toLowerCase().trim(), c.id);
  }

  const validRows: ParsedCatalogRow[] = [];
  const errors: CsvValidationError[] = [];
  const seenSkus = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1; // 1-based display index

    const getCol = (colName: string): string => {
      const idx = headerMap.get(colName);
      return idx !== undefined && idx < row.length ? row[idx].trim() : '';
    };

    const sku = getCol('sku').toUpperCase();
    const catSlug = getCol('category_slug').toLowerCase();
    const name = getCol('name');
    const priceStr = getCol('price');
    const mrpStr = getCol('mrp');
    const stockStr = getCol('stock_qty') || '0';
    const maxOrderStr = getCol('max_per_order') || '5';
    const subcategory = getCol('subcategory') || null;
    const brand = getCol('brand') || 'Plinkit';
    const sizeLabel = getCol('size_label') || '1 unit';
    const desc = getCol('description') || null;
    const manufacturer = getCol('manufacturer') || null;
    const country = getCol('country_of_origin') || 'India';
    const railRaw = getCol('rail').toLowerCase();
    const isActiveStr = getCol('is_active').toLowerCase();
    const imgFilename = getCol('image_filename') || undefined;
    const keywordsStr = getCol('keywords');

    let rowHasError = false;

    if (!sku) {
      errors.push({ row: rowNum, field: 'sku', message: 'SKU cannot be empty' });
      rowHasError = true;
    } else if (seenSkus.has(sku)) {
      errors.push({ row: rowNum, sku, field: 'sku', message: `Duplicate SKU "${sku}" within CSV` });
      rowHasError = true;
    } else {
      seenSkus.add(sku);
    }

    if (!name) {
      errors.push({ row: rowNum, sku, field: 'name', message: 'Product name cannot be empty' });
      rowHasError = true;
    }

    const categoryId = catMap.get(catSlug);
    if (!catSlug || !categoryId) {
      errors.push({
        row: rowNum,
        sku,
        field: 'category_slug',
        message: `Category slug "${catSlug}" does not exist in store categories`,
      });
      rowHasError = true;
    }

    const price = parseInt(priceStr, 10);
    const mrp = parseInt(mrpStr, 10);

    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, sku, field: 'price', message: 'Price must be a positive whole rupee integer' });
      rowHasError = true;
    }

    if (isNaN(mrp) || mrp <= 0) {
      errors.push({ row: rowNum, sku, field: 'mrp', message: 'MRP must be a positive whole rupee integer' });
      rowHasError = true;
    }

    if (!isNaN(price) && !isNaN(mrp) && price > mrp) {
      errors.push({
        row: rowNum,
        sku,
        field: 'price',
        message: `Price (₹${price}) cannot exceed MRP (₹${mrp})`,
      });
      rowHasError = true;
    }

    const stockQty = parseInt(stockStr, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      errors.push({ row: rowNum, sku, field: 'stock_qty', message: 'Stock quantity cannot be negative' });
      rowHasError = true;
    }

    const maxPerOrder = parseInt(maxOrderStr, 10);
    if (isNaN(maxPerOrder) || maxPerOrder <= 0) {
      errors.push({ row: rowNum, sku, field: 'max_per_order', message: 'Max per order must be at least 1' });
      rowHasError = true;
    }

    let rail: 'late_night' | 'bestsellers' | 'new' | null = null;
    if (railRaw) {
      if (['late_night', 'bestsellers', 'new'].includes(railRaw)) {
        rail = railRaw as 'late_night' | 'bestsellers' | 'new';
      } else {
        errors.push({
          row: rowNum,
          sku,
          field: 'rail',
          message: `Rail must be empty or one of: late_night, bestsellers, new`,
        });
        rowHasError = true;
      }
    }

    const keywords = keywordsStr
      ? keywordsStr.split(/[,;]/).map((k) => k.trim()).filter((k) => k.length > 0)
      : [];

    const isActive = isActiveStr === '' || isActiveStr === 'true' || isActiveStr === '1';

    if (!rowHasError && categoryId) {
      validRows.push({
        sku,
        category_id: categoryId,
        category_slug: catSlug,
        subcategory,
        name,
        brand,
        size_label: sizeLabel,
        mrp,
        price,
        stock_qty: stockQty,
        max_per_order: maxPerOrder,
        keywords,
        description: desc,
        manufacturer,
        country_of_origin: country,
        rail,
        is_active: isActive,
        image_filename: imgFilename,
      });
    }
  }

  return { validRows, errors, headers: rawHeaders };
}

/**
 * Exports store products catalogue to CSV string.
 */
export function exportProductsToCsv(products: ProductRow[], categories: CategoryRow[]): string {
  const catSlugMap = new Map<string, string>();
  categories.forEach((c) => catSlugMap.set(c.id, c.slug));

  const headers = [
    'sku',
    'category_slug',
    'subcategory',
    'name',
    'brand',
    'size_label',
    'mrp',
    'price',
    'stock_qty',
    'max_per_order',
    'keywords',
    'description',
    'manufacturer',
    'country_of_origin',
    'rail',
    'is_active',
  ];

  const escapeCsv = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = products.map((p) => [
    p.sku,
    catSlugMap.get(p.category_id) || '',
    escapeCsv(p.subcategory),
    escapeCsv(p.name),
    escapeCsv(p.brand),
    escapeCsv(p.size_label),
    p.mrp,
    p.price,
    p.stock_qty,
    p.max_per_order,
    escapeCsv(p.keywords?.join(', ')),
    escapeCsv(p.description),
    escapeCsv(p.manufacturer),
    escapeCsv(p.country_of_origin),
    p.rail || '',
    p.is_active ? 'true' : 'false',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Exports orders for date range to CSV string.
 */
export function exportOrdersToCsv(orders: AdminOrderWithItems[]): string {
  const headers = [
    'order_no',
    'placed_at_ist',
    'customer_name',
    'customer_phone',
    'room',
    'items_count',
    'items_total',
    'delivery_fee',
    'grand_total',
    'payment_status',
    'paid_via',
    'status',
    'cancel_reason',
    'items_summary',
  ];

  const escapeCsv = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = orders.map((o) => {
    const itemsSummary = o.order_items
      .map((i) => `${i.qty}x ${i.name_snapshot} (${i.size_snapshot})`)
      .join('; ');

    return [
      o.order_no,
      formatISTTime(o.placed_at),
      escapeCsv(o.customer_name),
      o.customer_phone,
      escapeCsv(o.room),
      o.order_items.length,
      o.items_total,
      o.delivery_fee,
      o.grand_total,
      o.payment_status,
      o.paid_via || '',
      o.status,
      escapeCsv(o.cancel_reason),
      escapeCsv(itemsSummary),
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Triggers a client-side CSV download in browser.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
