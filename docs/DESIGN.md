# DESIGN.MD (DESIGN SYSTEM)

[BRAND] — design system (v1)

One look, used everywhere. If a screen needs something that is not here, add it here first, then use it.

## Principles
1. **The product photo is the hero.** White cards, quiet chrome, one accent colour.
2. **Thumb first.** Everything a customer needs is reachable one-handed at 360–430 px.
3. **Nothing jumps.** Space is reserved for every image and every value that loads later. Skeletons, not spinners.
4. **Say it once.** One typeface, one accent, one radius family, one shadow.

## Tokens

### Colour
| Token | Value | Use |
| :--- | :--- | :--- |
| `--brand` | `#2451E6` | Primary actions, links, active states, cart bar |
| `--brand-pressed` | `#1B3FC0` | Pressed state |
| `--brand-soft` | `#EEF2FF` | Tinted background behind brand-coloured text |
| `--ink` | `#0F172A` | Headings and body text |
| `--ink-2` | `#475569` | Secondary text, MRP, captions, "Out of stock" |
| `--ink-3` | `#94A3B8` | Placeholders and disabled controls only. Never for information |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--canvas` | `#F5F6F8` | Page background |
| `--line` | `#E6E8EC` | Borders, dividers |
| `--success` | `#15803D` | Delivered, savings |
| `--warning` | `#B45309` | Low stock, closing soon, an order waiting too long |
| `--danger` | `#DC2626` | Errors, destructive actions |

**Category tile tints**, used in order and repeated:
- `#FFF4E5`
- `#EAF4FF`
- `#EEF9F0`
- `#FDEFF2`
- `#F3EEFF`
- `#FFF9DB`
- `#E8F7F7`
- `#F4F1EC`

**Rules:** The brand colour appears only on things you can tap, and on the cart bar. Body text is never brand-coloured. "Out of stock" is neutral, not red. The brand colour is the owner's to change: one token, and the whole app follows.

### Type
Plus Jakarta Sans, variable, self-hosted (no third-party font request). Fallback: `system-ui`. Prices and quantities use tabular numbers.

| Style | Size / line height | Weight | Use |
| :--- | :--- | :--- | :--- |
| display | 22 / 28 | 700 | Screen titles |
| title | 18 / 24 | 700 | Section titles, header ETA |
| subtitle | 16 / 22 | 600 | Prices, buttons |
| body | 14 / 20 | 500 | Product names, text |
| caption | 12 / 16 | 500 | Size, MRP, hints |
| label | 11 / 14 | 700, uppercase, +4% tracking | Badges only |

Nothing a customer must read is smaller than 12 px.

### Space, shape, depth, motion
- **Space** — 4-point scale: 4, 8, 12, 16, 20, 24, 32. Screen gutter 16. Card padding 12. Grid gap 12.
- **Radius** — card 14, button and input 12, image 10, chip and pill 999.
- **Depth** — cards have a 1 px `--line` border and no shadow. Only floating things (cart bar, sheets, toasts) cast one shadow: `0 8px 24px rgba(15, 23, 42, 0.12)`.
- **Motion** — 160 ms ease-out for state changes, 240 ms for sheets. No bounce, no parallax. Honour `prefers-reduced-motion`.
- **Icons** — lucide-react, 20 px, stroke 1.75. No emoji anywhere in the interface.

## Layout
- **Storefront:** single column, max width 480 px, centred on `--canvas` on larger screens.
- **Product grid:** 2 columns from 360 px.
- **Category grid:** 4 columns.
- Fixed elements respect device safe areas. The cart bar floats above the bottom inset.
- **Operator console:** cards on phones, a two-pane layout from 900 px.

## Components
- **AppHeader** — line 1: "Delivery in 12 min" (title) with a status dot. Line 2: the delivery point with a chevron, tap to change. Closed state: "Closed · Opens 6:00 pm". Account icon on the right.
- **SearchField** — 48 px high, `--canvas` fill, search icon, placeholder "Search snacks, drinks, essentials".
- **CategoryTile** — square, tinted background, illustration on top, name below (caption, weight 600), at most 2 lines, centred.
- **ProductCard** — square image area (white, image contained with an 8 px inset); size_label (caption, `--ink-2`); name (body, weight 600, clamped to 2 lines with a fixed height so cards in a row align); price (subtitle, 700) with MRP struck through (caption, `--ink-2`) only when MRP is higher; AddStepper bottom right. Badge top left, "10% OFF" in label style on `--brand-soft`, only when discount is 5% or more.
  - *States:* default · in cart · low stock ("Only 2 left", caption in `--warning`, when stock is 3 or less) · out of stock (image at 50% opacity, neutral "Out of stock" pill, no add button, "See similar" link) · no image (neutral placeholder with category icon) · loading (skeleton of identical size).
- **AddStepper** — default: outlined "ADD" button (`--brand` border and text, 36 px high, at least 72 px wide, tap area padded to 44 px). In cart: solid `--brand` stepper "− 2 +" with the same footprint, so nothing shifts. At stock or per-order cap the plus is disabled and a toast explains why.
- **PriceTag** — "₹45": rupee sign, no space, no decimals.
- **ProductRail** — title with "See all"; horizontal scroll with snap; cards 140 px wide.
- **CartBar** — floating, `--brand` fill, white text: "3 items · ₹245" on the left, "View cart" with a chevron on the right. Slides in when cart has items.
- **BillSummary** — rows for item total, delivery fee (or "Free") and total; a savings line in `--success` when price is below MRP; a nudge line such as "Add ₹40 more for free delivery".
- **BottomSheet** — drag handle, at most 90% of viewport height, closes on swipe down and on backdrop tap.
- **StatusTimeline** — vertical: Placed, Accepted, Packed, Out for delivery, Delivered, each with its time once reached; current step in `--brand`.
- **Button** — primary (solid `--brand`), secondary (outline), ghost. 48 px high. One primary per screen.
- **Chip** — pill filter. Selected: `--brand-soft` fill with `--brand` text.
- **Toast** — one line, at the bottom, above cart bar, dismisses after 2.5 s.
- **EmptyState** — icon, one sentence, one action.
- **ErrorState** — one sentence and "Try again".
- **Skeletons** — card, tile, row and bill variants matching real component sizes exactly.

## Imagery
- **Product photos:** square, plain white background, product filling about 80% of frame, shot straight on. Stored as WebP, 600 px, under about 40 KB.
- **Category tiles:** one illustration style for all of them, on tint colours above.
- **Logo:** a wordmark in display style plus one simple original glyph. Placeholder until owner supplies a final mark.
- Our own photos and illustrations only.

## Copy
Sentence case. Short. No exclamation marks, no placeholder text, no invented numbers. Say what happened and what to do next: "Maggi Masala is out of stock. We removed it from your cart."

## Quality bar — check every customer screen against this
1. Nothing shifts when images or data arrive.
2. Every tappable thing is at least 44 × 44 px.
3. Product names never overflow, and card bottoms align across a row.
4. Prices follow the PriceTag format everywhere.
5. Works at 360 px with no horizontal scroll.
6. Loading, empty and error states exist and look designed.
7. Text contrast is at least 4.5 : 1, and focus is visible.
8. Only tokens from this file are used. No stray colours, sizes or shadows.
