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
