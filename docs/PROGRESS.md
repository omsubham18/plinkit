# Build Progress Log

## Session 1: Project Setup & Design System
- **Date**: 12 October 2026
- **Status**: Completed
- **Commit / State**: Look-A Design System & Scaffolding Baseline

### What Was Built
1. **Repository & Rules Foundation**:
   - `AGENTS.md` placed in root: untrusted browser, integer rupee money, phone-first 360–430 px (max 480 px centred), strict token usage, RLS policies.
   - `docs/SPEC.md`: Product spec for v1 quick-commerce campus store (15-min delivery, Bhopal campuses, single-store model).
   - `docs/DESIGN.md`: Visual design system contract (colors, 8 category tints, typography scale, 4-point spacing, depth, motion, quality bar).
   - `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` (names only).
   - `.gitignore`: Configured to ignore `.env.local`, `dist`, `node_modules`.

2. **Project Stack & Tooling**:
   - Vite 6 + React 18 + TypeScript 5.6 + Tailwind CSS 3.4.
   - Scripts configured in `package.json`: `dev`, `build`, `preview`, `typecheck`, `lint`.
   - Core libraries: `react-router-dom`, `lucide-react`, `@tanstack/react-query`, `zustand`, `@supabase/supabase-js`, `minisearch`.
   - Self-hosted font: `@fontsource-variable/plus-jakarta-sans` bundled locally in `dist/assets/` with zero third-party font calls.

3. **Design System Tokens & Utilities**:
   - CSS variables in `src/index.css`: `--brand`, `--brand-pressed`, `--brand-soft`, `--ink`, `--ink-2`, `--ink-3`, `--surface`, `--canvas`, `--line`, `--success`, `--warning`, `--danger`.
   - 8 Category tints: `--tint-1` through `--tint-8`.
   - Typography utilities: `type-display` (22/28 700), `type-title` (18/24 700), `type-subtitle` (16/22 600), `type-body` (14/20 500), `type-caption` (12/16 500), `type-label` (11/14 700 uppercase).
   - Tabular numbers (`.tabular-nums`) for all prices and quantities.

4. **17 Design System Components (`src/components/`)**:
   - `AppHeader`: Line 1 ETA/status with animated green status dot, line 2 delivery point with chevron, account button (44px tap target).
   - `SearchField`: 48px height, `--canvas` background, search icon.
   - `CategoryTile`: Square aspect ratio, rounded `card` (14px), tinted background, illustration, 2-line caption.
   - `ProductCard`: Square image on white with 8px inset, discount badge top-left (>=5%), size label, 2-line clamped title with fixed 40px height for aligned row bottoms, subtitle price + struck-through MRP, bottom-right AddStepper.
   - `AddStepper`: Fixed 36x76px footprint (outline ADD vs solid stepper) with zero layout shift; disabled plus on cap with toast trigger.
   - `PriceTag`: Formatted integer rupees ("₹45", no space, no decimals, tabular nums).
   - `ProductRail`: Section title with "See all" and horizontal snap scroll container.
   - `CartBar`: Floating bar fixed at bottom above safe area inset, `--brand` fill, floating shadow, smooth slide in/out.
   - `BillSummary`: Items total, delivery fee (or "Free"), savings in `--success`, and free delivery nudge banner.
   - `BottomSheet`: Top drag handle, max 90vh, backdrop tap and escape dismiss.
   - `StatusTimeline`: Vertical timeline (Placed -> Accepted -> Packed -> Out for delivery -> Delivered).
   - `Button`: Primary (solid `--brand`), Secondary (outline), Ghost; 48px height with 44px+ tap target.
   - `Chip`: Pill filter with active `--brand-soft` styling.
   - `Toast`: 2.5s auto-dismissing banner above CartBar.
   - `FeedbackStates`: `EmptyState` and `ErrorState`.
   - `Skeletons`: Card, tile, row, and bill skeleton variants matching real footprints.

5. **App Shell, Routing & Cloudflare Pages Deep Links**:
   - Layout: Centred 480px column on canvas (`max-w-[480px] mx-auto min-h-screen bg-surface md:shadow-sm`).
   - Routes: `/`, `/c/:slug`, `/search`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account`, `/admin`, `/styleguide`, `*` (404).
   - Cloudflare Pages SPA fallback: `public/_redirects` (`/*  /index.html  200`). Verified that deep links return HTTP 200.

6. **Assets**:
   - 8 Category 3D isometric tile illustrations on exact tint colors: chips, drinks, noodles, biscuits, chocolates, dairy, care, stationery.
   - 12 Unbranded generic product photos/illustrations on pure white backgrounds filling 80% of frame (no logos, mascots, or brand text).

7. **Interactive `/styleguide` Route**:
   - Tab 1 (Component Matrix): Every state of ProductCard (default, in-cart, low stock, out of stock, long name, no image, skeleton), AddStepper states, Button variants, Chips, BillSummary, StatusTimeline, BottomSheet, and Toast.
   - Tab 2 (Mock Home): Composed storefront with AppHeader, SearchField, 4-column CategoryGrid, two ProductRails, and floating CartBar.
   - Tab 3 (Mock Category): Composed category page with subcategory chips and 2-column product grid with 12 sample items.

### Verification Results
- `npm run typecheck`: PASS (0 errors)
- `npm run lint`: PASS (0 errors, 0 warnings)
- `npm run build`: PASS (bundled in 8.24s, self-hosted woff2 fonts in `dist/assets/`, `dist/_redirects` verified)
- Server preview: Running on `http://localhost:4173/`
- Deep linking: All 11 tested routes return 200 OK

### Exact Steps for Human Verification on Phone / Browser
1. Run `npm run preview` (or `npm run dev`).
2. Open `http://localhost:4173/styleguide` on your phone or in DevTools responsive mode set to 390px (iPhone 14/15):
   - **Quality Check 1 (No layout shift)**: Tap "ADD" on any card; observe that the stepper toggles to `[-] 1 [+]` without shifting the card size, bottom border, or neighbouring cards.
   - **Quality Check 2 (Tap targets >= 44x44 px)**: Confirm the ADD button, stepper controls, account button, back arrows, and chips are effortless to tap with your thumb.
   - **Quality Check 3 (Card bottoms align)**: On the 2-column product grid, observe that card bottoms remain perfectly level across every row regardless of product name length.
   - **Quality Check 4 (Price format)**: Verify all prices use `₹` without space or decimals and numbers are tabular.
   - **Quality Check 5 (360-390 px no horizontal scroll)**: Verify the storefront column fits cleanly inside 390px with zero horizontal scroll on the outer page.
   - **Quality Check 6 (Loading, empty, error states)**: Observe the skeleton cards, EmptyState, and ErrorState in the matrix.
   - **Quality Check 7 (Contrast & tokens)**: Confirm `--brand` appears only on interactive elements and the cart bar.
   - **Quality Check 8 (Copy)**: Verify short sentence case copy with no exclamation marks.

## Session 2: Database Architecture, Migrations & Client Setup
- **Date**: 12 October 2026
- **Status**: Local Files Created & Verified; Remote Database Not Yet Applied (Supabase not connected)
- **Commit / State**: 4 SQL Migrations in `supabase/migrations/`, TypeScript Database Definitions, and Supabase Client Setup

### What Was Built
1. **Schema & Tables Migration (`supabase/migrations/20261012100000_create_schema_and_tables.sql`)**:
   - Sequence `order_no_seq` starting at 1001 for customer order numbers.
   - All 11 tables from `docs/SPEC.md`: `categories`, `products`, `delivery_points`, `profiles`, `admins`, `settings` (singleton row `id = 1`), `orders`, `order_items`, `search_misses`, `item_requests`, `client_errors`.
   - Whole-rupee integer storage for all monetary amounts; UTC timestamps with Asia/Kolkata presentation.
   - Constraints: `price <= mrp`, `price > 0`, `mrp > 0`, `stock_qty >= 0`, `max_per_order > 0`, telemetry length bounds.
   - Indexes: active items, sort orders, status queries, foreign keys.

2. **RLS & Storage Migration (`supabase/migrations/20261012100001_create_rls_and_storage.sql`)**:
   - RLS enabled on all 11 tables.
   - `public.is_admin()` helper function with `SECURITY DEFINER` and fixed `search_path = public`.
   - Zero client write policies on `admins`, `orders`, and `order_items`.
   - Public read for active categories, products, delivery points, and settings.
   - Authenticated access to own profile, orders, and order items.
   - Insert-only policies on search misses, item requests, and client errors.
   - Storage bucket `product-images` with public read and admin-only upload/modification policies.
   - Supabase Realtime publication enabled strictly on `public.orders` with `REPLICA IDENTITY FULL`.

3. **Business Functions Migration (`supabase/migrations/20261012100002_create_order_and_admin_functions.sql`)**:
   - `place_order`: Single atomic transaction enforcing all 11 order rules (non-anonymous auth, profile check, midnight rollover handling in Asia/Kolkata, deadlock-safe `FOR UPDATE` ascending locking, server-side pricing, minimum order, free delivery calculations, idempotency, and machine-readable failure details).
   - `cancel_my_order`: Enforces customer cancellation strictly from `placed` status, restoring stock for active items.
   - `admin_set_order_status`: Enforces status sequence, stamps timestamps (`accepted_at`, `packed_at`, `out_at`, `delivered_at`, `cancelled_at`), requires cancellation reason, and restores stock for non-removed items.
   - `admin_adjust_stock`: Admin stock changes with non-negative guard.
   - `admin_set_payment`: Admin payment tracking (`unpaid` / `paid` via `upi` / `cash`).
   - `admin_remove_order_item`: Removes unavailable item before packing, zeroes product stock, preserves delivery fee, and cancels order if 0 items remain.

4. **Sample Seed Migration (`supabase/migrations/20261012100003_seed_sample_data.sql`)**:
   - 8 categories matching `docs/DESIGN.md`.
   - 40 unbranded realistic campus products across all categories with whole rupee prices, Hinglish keywords, and visual test states (including 2 low-stock and 2 out-of-stock items).
   - 10 delivery points across 3 Bhopal campuses with realistic ETAs.
   - Singleton settings row with launch defaults and testing hours (`00:00:00` to `23:59:59`).

5. **TypeScript Definitions & Client Integration**:
   - `src/types/database.ts`: Complete TypeScript schema and RPC types.
   - `src/types/index.ts`: Integrated database row models and RPC types.
   - `src/lib/supabase.ts`: Typed Supabase client with graceful development fallback.
   - `src/vite-env.d.ts`: Vite environment definitions.

### Decisions Made
- Kept schema constraints strictly aligned with `docs/SPEC.md` without inventing arbitrary phone or slug regex rules.
- Replaced temporary table in `place_order` with CTEs to eliminate PL/pgSQL OID plan cache invalidation risks under transaction connection pooling.
- Guaranteed deterministic stock restoration on cancellation by aggregating active order-item quantities with `GROUP BY product_id`.
- Serialized concurrent identical `place_order` requests using transaction advisory lock on `client_request_id` to eliminate race conditions and double stock decrements.
- Maintained delivery fee invariance on item removal so customer delivery fee never increases after store removes an item.
- Added explicit null check for `p_delta` in `admin_adjust_stock` and array-type check for `p_items`.
- Added idempotent `DROP POLICY IF EXISTS` guards to ensure safe re-execution of storage and table policies.

### Anything Left Open
- Add `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SECRET_KEY` to `.env.local` to execute Playbook Prompt 4 (adversarial security tests).

### Verification Results
- Static SQL Review: PASS (syntax, RLS coverage on all 11 tables, search_path and grant/revoke security on all 7 functions, transaction safety, advisory lock idempotency, zero temp table OID invalidations).
- `npm run typecheck`: PASS (0 errors)
- `npm run lint`: PASS (0 errors, 0 warnings)
- `npm run build`: PASS (bundled in 6.85s)

### Exact Steps for Human Verification
1. Inspect `supabase/migrations/` and verify the four SQL files match the specifications.
2. Run `npm run typecheck` to confirm all TypeScript interfaces match the database schema.
3. Run `npm run lint` and `npm run build` to confirm zero build regressions.

## Session 3: Remote Supabase Migration Deployment
- **Date**: 12 October 2026
- **Status**: Completed & Verified on Remote Database
- **Commit / State**: Commit `0020cb9` (`main` and `look-a`), Remote Supabase Project `kiqjchkdhmdqxdqomeho`

### What Was Built & Deployed
1. **Automated Migration Runner**:
   - `scripts/push-db.mjs` and `npm run db:push` script added to `package.json` to push migrations directly via session pooler with URL encoding support.
2. **Migration Fixes**:
   - Fixed product seed UUIDs in `supabase/migrations/20261012100003_seed_sample_data.sql` from non-hex `p1000000-...` to standard hex `b1000000-...`.
3. **Applied to Remote Supabase Database (`kiqjchkdhmdqxdqomeho`)**:
   - `20261012100000_create_schema_and_tables.sql`: 11 tables (`categories`, `products`, `delivery_points`, `profiles`, `admins`, `settings`, `orders`, `order_items`, `search_misses`, `item_requests`, `client_errors`), `order_no_seq` sequence, constraints, indexes.
   - `20261012100001_create_rls_and_storage.sql`: Row Level Security enabled on all 11 tables, public read policies, strict zero-client-write policies on orders and admins, `product-images` storage bucket, Supabase Realtime publication on `orders`.
   - `20261012100002_create_order_and_admin_functions.sql`: All 6 transaction-safe RPC functions (`place_order`, `cancel_my_order`, `admin_set_order_status`, `admin_adjust_stock`, `admin_set_payment`, `admin_remove_order_item`) plus `is_admin()`.
   - `20261012100003_seed_sample_data.sql`: 8 categories, 40 unbranded realistic products, 10 campus delivery points, launch settings row.

### Verification Results
- Remote Database Table Stats (`supabase inspect db table-stats`):
  - `public.products`: 40 rows
  - `public.categories`: 8 rows
  - `public.delivery_points`: 10 rows
  - `public.settings`: 1 row
  - `public.orders`: 0 rows
  - `public.order_items`: 0 rows
- `npm run typecheck`: PASS (0 errors)
- `npm run lint`: PASS (0 errors, 0 warnings)
- `npm run build`: PASS (bundled in 7.20s)

### Anything Left Open
- Add `VITE_SUPABASE_ANON_KEY` to `.env.local` for client-side API authentication.
- Ready to proceed to Playbook Prompt 4 (adversarial security tests).

### Exact Steps for Human Verification
1. Open Supabase Dashboard for project `kiqjchkdhmdqxdqomeho` -> **Table Editor**.
2. Verify all 11 tables exist.
3. Check `categories` (8 rows), `products` (40 rows), `delivery_points` (10 rows), and `settings` (1 row).
4. Run `npm run build` locally to confirm 0 compilation errors.
