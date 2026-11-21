# Newtags (Figma Make frontend + Supabase)

React 19 + Vite + Tailwind v4 storefront. Catalogue, price comparison, bag and AI assistant run on the Supabase project **new hack** (`ommccsylnvterlfpqpau`, Mumbai, free plan).

## Run it

```bash
pnpm install
cp .env.example .env   # Supabase URL + publishable key (public values)
pnpm dev               # http://localhost:5173
```

`pnpm build` outputs `dist/`. On Vercel: framework "Vite", add the two `VITE_SUPABASE_*` variables.

## What talks to what

| UI | Supabase |
|---|---|
| Home collection, categories, search | `products` + `product_images` (public read) |
| Product page comparison (price, rating, bank offers, coupons, vouchers, delivery, returns) | `offers` + `retailers` (public read) |
| Bag | RPCs `cart_set_item(token, offer_id, qty)` and `cart_quote(token)`; the browser keeps a random cart token. Only Newtags's own offers can be added. |
| Robot assistant | Edge Function `assistant` (Gemini 2.5 Flash). Key is the Supabase secret `GEMINI_API_KEY`. |

Rules built in: customers buy **only** on Newtags. Amazon / Flipkart rows are comparison-only, with no outbound links and no buy button. The assistant can open products, open the comparison, search, open the bag and add to bag, and nothing beyond that (no checkout or payment).

Money is stored in paise (`25900` = ₹259.00). "You pay" = price − best coupon + delivery. Bank offers are listed but not subtracted, because they depend on the card.

## Replacing the sample data

The 37 products are samples. Load the real dataset into `products`, `product_variants`, `product_images`, `offers` (one row per product per retailer: `semil` = Newtags, `amazon`, `flipkart`). Offer perks are JSON arrays, e.g. `coupons = [{"code":"SAVE100","text":"₹100 off","flatDiscount":10000}]`.

## Files

- `src/lib/api.ts`: all data access (types follow BACKEND_INTEGRATION.md)
- `src/components/ShoppingAssistant.tsx`, `RobotLauncher.tsx`, `public/assistant/robot.png`
- `supabase/functions/assistant/`: Edge Function source
- `supabase/migrations/`: schema
- `reference/App.figma-demo.tsx`: the original demo-data App.tsx
- `vite.config.figma-make.ts`: the original Figma Make config (only works inside Make)
