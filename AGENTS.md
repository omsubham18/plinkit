# AGENTS.MD (RULES FILE)

[BRAND] — rules for every task

Read `docs/SPEC.md`, `docs/DESIGN.md` and `docs/PROGRESS.md` before planning anything. They are the source of truth. If a request conflicts with them, stop and ask the owner.

## The product in one line
A single-store quick-commerce web app for three neighbouring campuses in Bhopal: students order snacks and essentials on their phones, and the store's own stock is delivered to a fixed list of hostels and gates.

## Stack (do not change without asking)
Vite + React + TypeScript, React Router, Tailwind CSS, shadcn/ui primitives, lucide-react icons. TanStack Query for server data. Zustand (persisted) for the cart. Supabase: Postgres, Auth (Google), Realtime, Storage, Edge Functions. Region: Mumbai. MiniSearch for product search in the browser. vite-plugin-pwa for install and the offline shell. Hosting: Cloudflare Pages, static build in `dist/`. There is no custom backend server. Use the current stable version of each. Do not mix configuration styles from different major versions.

## Rules that are never broken
1. The browser is untrusted. Prices, fees, totals, stock and order status are computed and enforced in Postgres (functions + Row Level Security). The client never inserts into `orders` or `order_items` directly and never sends a price the server trusts.
2. Row Level Security is on for every table, with explicit policies. No table is left open "for now".
3. Only the Supabase publishable (anon) key appears in client code. Never the secret / service-role key. Secrets live in `.env.local` (git-ignored) or in Supabase function secrets.
4. Every schema change is a new timestamped SQL file in `supabase/migrations/`. Never edit a migration that has already been applied.
5. Money is whole rupees stored as integers. Times are stored in UTC and shown in Asia/Kolkata.
6. Storefront UI uses only the tokens and components in `docs/DESIGN.md`. No one-off colours, font sizes, shadows or spacing. No emoji as icons.
7. Phone first. Design and test at 360–430 px. The storefront is a centred column of at most 480 px on larger screens.
8. Every screen has loading (skeleton), empty and error states. No blank screens. No raw error text shown to customers.
9. Build only what `docs/SPEC.md` lists for v1. Do not add or stub anything from its "Not in v1" list. Do not add a dependency without saying why.
10. Our own brand only. Do not copy another company's name, logo, colours, screenshots, icons or product photos.

## How to work
Plan first for anything that touches the database, sign-in, checkout, or more than three files. Wait for approval. Keep changes inside the task. Do not refactor unrelated code. When done: run typecheck, lint and build, and fix what fails. Then append an entry to `docs/PROGRESS.md`: what was built, decisions made, anything left open, and the exact steps a human can follow to verify it. Report honestly. If something is unfinished, untested or mocked, say so in the first line of your summary. Never say a test passed unless you ran it and saw it pass.
