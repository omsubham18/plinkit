# SPEC.MD (PRODUCT SPEC)

[BRAND] — product spec (v1)

Replace [BRAND] everywhere once the name is final. Values marked (setting) are launch defaults the owner changes in the operator console.

## 1. What this is
A phone-first web app (installable PWA) for students at three neighbouring campuses in Bhopal to order snacks, drinks and daily essentials from ONE store that holds its own stock. Orders go to a fixed list of hostels and gates in about 15 minutes. One store, one catalogue, one operator team. It is not a marketplace.

## 2. People
- **Customer** — a student on a phone, usually late in the evening, often on weak hostel Wi-Fi. Wants to order in under a minute.
- **Operator (admin)** — the owner or packer at the store, on a laptop or phone. Must never miss an order and must change stock in seconds.
- **Runner** — uses the same operator order screen on a phone. There is no separate runner app.

## 3. v1 scope — build exactly this

### Storefront
1. **Home** — store status, chosen delivery point and its ETA, search field, category grid, two or three product rails.
2. **Category page** — products of one category, optional subcategory chips, in-stock items first.
3. **Product sheet** — image, name, size, price, MRP, description, manufacturer and country of origin when present, similar items.
4. **Search** — instant, typo-tolerant, alias-aware, never a dead end (section 8).
5. **Cart** — quantity steppers everywhere, floating cart bar, bill breakdown, minimum-order and free-delivery nudges.
6. **Sign-in** — Google, asked only at checkout. One-time profile: name, mobile number, delivery point, room.
7. **Checkout** — address summary, substitution preference, optional note, payment = pay on delivery (UPI or cash).
8. **Orders** — live status timeline, history, order again, cancel while still "placed". Items the store had to remove are shown as unavailable.
9. **Static pages** — About & Contact, Terms, Privacy, Cancellation & Refunds.

### Operator console (/admin, admins only)
10. **Orders** — live queue with sound, one-tap status changes, remove an item that turns out to be unavailable, call or WhatsApp the customer, mark paid, pack list.
11. **Stock** — instant search, −/+ quantity, one-tap out of stock, low-stock filter.
12. **Products and categories** — add and edit, photo upload with automatic compression, CSV import and export.
13. **Settings** — open/closed, hours, fees, minimum order, support phone, notice text, delivery points.
14. **Today** — orders, revenue (with the split collected by UPI and by cash), average order value, cancellations, top items, orders per hour, failed searches, item requests.
15. **Alerts** — every new order and every customer cancellation is posted to the operators' Telegram group.

## 4. Not in v1 — do not build or stub
Payment gateway or wallet · coupons and referrals · ratings and reviews · multiple stores or vendors · maps or GPS · runner app · live runner tracking · SMS or OTP · customer push notifications · native apps · scheduled delivery slots · multiple languages · dark mode · staff roles beyond admin.

## 5. Data model
All money is whole rupees stored as integers. All timestamps are UTC (timestamptz) and displayed in Asia/Kolkata.

- **categories** — id, name, slug (unique), image_url, sort_order, is_active.
- **products** — id, sku (unique), category_id, subcategory (optional text), name, brand, size_label (e.g. "70 g"), mrp, price (price <= mrp, both > 0), stock_qty (>= 0), max_per_order (default 5), image_url, keywords (text[]: aliases, misspellings, Hinglish), description, manufacturer, country_of_origin (default "India"), rail (null | late_night | bestsellers | new), is_active, created_at, updated_at.
- **delivery_points** — id, campus, name, eta_minutes, delivery_fee_override (nullable), sort_order, is_active.
- **profiles** — id (= auth user id), full_name, phone, delivery_point_id, room, created_at, updated_at.
- **admins** — user_id. Rows are added by hand in the Supabase dashboard. No client can ever write to this table.
- **settings** — a single row: store_open (manual switch), opens_at, closes_at (local time; closing may be after midnight), min_order_value, delivery_fee, free_delivery_above, max_active_orders_per_user, support_phone, notice_text.
- **orders** — id, order_no (short human number from a sequence starting at 1001), client_request_id (uuid, unique), user_id, status, delivery_point_id, room, customer_name and customer_phone (snapshots), items_total, delivery_fee, grand_total, payment_method (pay_on_delivery), payment_status (unpaid | paid), paid_via (upi | cash, nullable), substitution_pref (call_me | replace_similar | remove_item), note, cancel_reason, placed_at, accepted_at, packed_at, out_at, delivered_at, cancelled_at.
- **order_items** — id, order_id, product_id, name_snapshot, size_snapshot, unit_price, mrp, qty, line_total, removed (boolean, default false).
- **search_misses** — id, query (at most 80 characters), user_id (nullable), created_at.
- **item_requests** — id, text (at most 120 characters), user_id (nullable), created_at.
- **client_errors** — id, message (at most 500 characters), route, user_agent, user_id (nullable), created_at.

The last three tables are insert-only for clients, signed in or not, because most searching happens before sign-in. No client can read them.

**Launch defaults (setting):**
hours 18:00–01:00 · minimum order ₹99 · delivery fee ₹15 · free delivery above ₹299 · at most 2 active orders per user.

## 6. Order rules — enforced in the database, never in the browser
Orders are created only by the database function `place_order`. It runs as one transaction and must:
1. Require a signed-in, non-anonymous user with a complete profile.
2. Reject if the store is closed: store_open is false, or current Asia/Kolkata time is outside opens_at–closes_at. Handle closing after midnight.
3. Require an active delivery point.
4. For every item: the product is active, qty is between 1 and max_per_order, and stock is sufficient.
5. Read prices from the products table at that moment. Any price sent by the client is ignored.
6. Require items_total >= min_order_value.
7. Set delivery_fee to the point's override or the default, and to 0 when items_total >= free_delivery_above.
8. Reject if user already has max_active_orders_per_user orders that are neither delivered nor cancelled.
9. Decrement stock for every item in the same transaction. Two simultaneous orders for the last unit: exactly one succeeds. No deadlocks.
10. Be idempotent: a second call with the same client_request_id from the same user returns the first order and changes nothing.
11. On failure change nothing, and return a machine-readable reason plus, for stock or price problems, the current price and available quantity of each affected item so the cart can correct itself.

## 7. Status flow
`placed` → `accepted` → `packed` → `out_for_delivery` → `delivered`
`cancelled` is reachable from placed, accepted and packed by an admin (reason required), and from placed by the customer. Cancelling restores the stock of every item exactly once. Each transition stamps its time. No other transitions are allowed, by anyone.
Before an order is packed, an admin can remove an item that turns out to be unavailable. The line is marked removed, not deleted. Totals are recalculated, the delivery fee never goes up because of a removal, and that product's stock is set to 0. Removing the last remaining item cancels the order.
Payment is marked separately by an admin: paid, via UPI or cash.

## 8. Search — must never dead-end
The whole active catalogue is loaded once and searched in the browser. Results appear as the user types, with no network call per keystroke.
Indexed fields, highest weight first: name, brand, keywords, subcategory, category, size_label.
Tolerates prefixes ("mag"), typos ("magi", "biskit", "choclate") and aliases stored in keywords ("doodh", "namkeen", "cold drink").
Result order:
1. in-stock exact and prefix matches,
2. in-stock fuzzy matches,
3. out-of-stock matches, dimmed, each followed by a "Similar in stock" row.

No match: say so plainly, then show bestsellers from the nearest category, then a one-tap "Request this item" that writes to item_requests.
Log a query to search_misses only when it has three or more characters, returned nothing, and the user paused 1.5 s or left the screen. Never per keystroke.
Empty search screen: recent searches (stored on device, at most 6, clearable), popular searches, category shortcuts.

## 9. Catalogue loading and similar items
One request loads active categories and products. It is cached and persisted on the device so repeat visits render instantly, then refreshed on focus and every 60 seconds.
After each refresh the cart is reconciled: items that went out of stock, were deactivated or changed price are corrected, and the user is told once.
Similar items for a product: in stock, same subcategory first, then same category, nearest in price, excluding itself, at most 6.

## 10. Operator console details
- **New-order alert** — after one tap on an "I'm online" switch, a repeating chime plays until the order is acknowledged, the tab title flashes, and the screen is kept awake. A visible warning appears if sound is blocked or the live connection drops. It reconnects automatically.
- **Order card** — order number, minutes since placed (amber after 5, red after 10), delivery point and room, name, phone (tap to call), items and quantities, total, payment status, substitution preference, note.
Every admin action goes through a database function or an admin-only policy. Hiding a button is not security.
"Today" means the business day 06:00–06:00 Asia/Kolkata, because the store trades past midnight. CSV import follows `docs/catalog-template.csv`, validates every row before writing anything, and upserts by sku.

## 11. Security
Row Level Security on every table. Anyone, signed in or not, can read: active categories, active products, active delivery points, settings. Anyone, signed in or not, can insert into search_misses, item_requests and client_errors, within length limits. Nobody but an admin can read them.
A signed-in user can read and update only their own profile, and read only their own orders and order items. No client inserts, updates or deletes orders or order_items directly. Only `place_order`, `cancel_my_order` and admin functions do.
Admins (members of admins table) can read everything and write products, categories, delivery points, settings and order status. Admins table has no client-side insert, update or delete policy at all. Product images: public read, admin-only upload. The Supabase secret key never appears in client bundle or repository.

## 12. Non-functional
- **Phone first** — designed and tested at 360–430 px. Storefront stays a centred column of at most 480 px on larger screens. Operator console is responsive for phone and laptop.
- **Fast on hostel Wi-Fi and 4G** — home is usable within about 2.5 seconds on a mid-range Android phone; images are lazy-loaded with reserved space; customers never download operator console code.
- **Resilient** — cart survives reloads; every request has a clear retry; placing the same order twice by accident is impossible (section 6, rule 10).
- **Accessible basics** — 44 px tap targets, visible focus, 4.5:1 text contrast, reduced motion respected.
- **Language** — English interface. Product keywords may include Hinglish.

## 13. Legal display
Every product shows its MRP and net quantity. The selling price can never exceed MRP (database constraint). The product sheet shows manufacturer and country of origin when the owner has entered them. Footer pages carry business name, address, support phone and food-licence number once the owner supplies them. Nothing from another company's brand is used: no names, logos, colours, screenshots, icons or product photos.

## 14. Owner to fill before launch
Brand name · delivery points per campus · opening hours · fees and minimum order · support phone · business details for the footer pages · the real catalogue and photos.
