// Supabase Edge Function "catalog-import": builds the real catalogue from Google Shopping (SerpApi).
//
// How it runs: someone with database access adds a row to public.import_jobs
// (query + category), then calls this function. It claims ONE pending job and:
//   1. searches Google Shopping for the query (1 SerpApi search),
//   2. picks the most-reviewed distinct products (max_products of them),
//   3. for each, opens the Google product page to get every store's offer (1 search each),
//   4. saves the product, its images, every store's price/rating/offers, and a Neutags price.
// Calling it with no pending job does nothing, so the public URL can't spend the SerpApi quota.
//
// Rules (see README):
// - Store links are never saved: customers buy only on Neutags; other stores are comparison-only.
// - Neutags price = 2% below the lowest store price found (a hackathon pricing rule, change PRICE_RULE).
// - SERPAPI_KEY is a Supabase secret, never in the browser.

// Accepts the names the secret was saved under in the dashboard ("serpi api" is the current one).
const serpKey = () => Deno.env.get("SERPAPI_KEY") ?? Deno.env.get("serpi api") ?? Deno.env.get("SERPI_API") ?? Deno.env.get("serpapi");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWN_RETAILER = "semil"; // id of the Neutags row in public.retailers
const PRICE_RULE = 0.98; // Neutags price = lowest store price x 0.98
const MAX_JOBS_PER_DAY = 12; // each job costs 1 + max_products SerpApi searches

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`db ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const upsert = (table: string, rows: object | object[], conflict = "id") =>
  db(`${table}?on_conflict=${conflict}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });

// ---- text helpers (normalize_text() from price_engine.py) ----
const normalize = (t: unknown) => String(t ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const slugify = (t: string) => normalize(t).replace(/ /g, "-").slice(0, 60).replace(/-+$/, "");
async function shortHash(text: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() ? Number(v.replace(/[^0-9.]/g, "")) || null : null);
const paise = (rupees: number) => Math.round(rupees * 100);
const clampRating = (r: unknown) => { const n = num(r); return n == null ? null : Math.min(5, Math.max(0, n)); };
const textsOf = (v: unknown): string[] => {
  if (!v) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(textsOf);
  if (typeof v === "object") return textsOf((v as Record<string, unknown>).text ?? (v as Record<string, unknown>).title ?? (v as Record<string, unknown>).snippet);
  return [];
};
const stripLinks = (t: string) => t.replace(/https?:\/\/\S+|www\.\S+/gi, "").trim();

// ---- SerpApi ----
async function serp(params: Record<string, string>) {
  const apiKey = serpKey()!;
  const qs = new URLSearchParams({ ...params, gl: "in", hl: "en", api_key: apiKey });
  const res = await fetch(`https://serpapi.com/search.json?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(`SerpApi ${params.engine}: ${res.status} ${String(data?.error ?? "").slice(0, 200)}`);
  return data;
}

type Listing = {
  title?: string; source?: string; extracted_price?: number; extracted_old_price?: number; rating?: number; reviews?: number;
  thumbnail?: string; serpapi_thumbnail?: string; product_id?: string; immersive_product_page_token?: string; delivery?: string;
  extensions?: string[];
};
type Store = {
  name?: string; title?: string; extracted_price?: number; price?: string; extracted_original_price?: number; original_price?: string;
  rating?: number; reviews?: number; details_and_offers?: unknown; tag?: string; shipping?: string; delivery?: string; discount?: string;
};

async function productPage(l: Listing): Promise<{ stores: Store[]; info: Record<string, unknown> }> {
  let data: Record<string, unknown> | null = null;
  if (l.immersive_product_page_token) data = await serp({ engine: "google_immersive_product", page_token: l.immersive_product_page_token });
  else if (l.product_id) data = await serp({ engine: "google_product", product_id: l.product_id, offers: "1" });
  const info = (data?.product_results ?? {}) as Record<string, unknown>;
  let stores = (info.stores ?? (data as Record<string, unknown> | null)?.sellers_results ?? []) as Store[];
  if (!Array.isArray(stores)) stores = (stores as { online_sellers?: Store[] }).online_sellers ?? [];
  // Fall back to the single listing from the search when the product page has no store list.
  if (!stores.length && l.source && l.extracted_price) {
    stores = [{ name: l.source, extracted_price: l.extracted_price, extracted_original_price: l.extracted_old_price, rating: l.rating, reviews: l.reviews, delivery: l.delivery }];
  }
  return { stores, info };
}

// ---- retailers ----
const KNOWN: { id: string; match: RegExp }[] = [
  { id: "amazon", match: /amazon/i },
  { id: "flipkart", match: /flipkart/i },
];
const PALETTE = ["#1f6feb", "#8250df", "#0a7f5a", "#bf3989", "#9a6700", "#cf222e", "#116329", "#0550ae"];
const retailerCache = new Map<string, boolean>();
async function retailerFor(storeName: string): Promise<string | null> {
  const name = stripLinks(storeName).replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name || /neutags|newtags/i.test(name)) return null;
  const known = KNOWN.find((k) => k.match.test(name));
  const id = known?.id ?? slugify(name.replace(/\.(com|in|co\.in)$/i, ""));
  if (!id) return null;
  if (!retailerCache.has(id)) {
    const [row] = await db(`retailers?select=id&id=eq.${encodeURIComponent(id)}`);
    if (!row) {
      const color = PALETTE[parseInt((await shortHash(id)).slice(0, 2), 16) % PALETTE.length];
      await upsert("retailers", { id, name, mark: name[0].toUpperCase(), brand_color: color, feature_title: "Price check", feature_description: "Comparison only", is_own: false, sort_order: 50, source: "google_shopping" });
    }
    retailerCache.set(id, true);
  }
  return id;
}

function perksOf(s: Store) {
  const lines = [...new Set([...textsOf(s.details_and_offers), ...textsOf(s.tag), ...textsOf(s.discount)].map((t) => stripLinks(t).slice(0, 120)).filter(Boolean))];
  const bank_offers: { text: string }[] = [], coupons: { text: string }[] = [], vouchers: { text: string }[] = [];
  for (const text of lines) {
    if (/bank|card|emi|cashback|upi/i.test(text)) bank_offers.push({ text });
    else if (/coupon|code|% off|₹\s*\d+\s*off/i.test(text)) coupons.push({ text });
    else if (/voucher|gift|reward|super ?coins/i.test(text)) vouchers.push({ text });
  }
  return { bank_offers: bank_offers.slice(0, 3), coupons: coupons.slice(0, 3), vouchers: vouchers.slice(0, 2) };
}

const THEME: Record<string, string> = { electronics: "#9fb4c7", clothing: "#c9b79c", beauty: "#e07a9b" };
const RETURNS: Record<string, number> = { electronics: 7, clothing: 10, beauty: 7 };

type Job = { id: number; query: string; category: string; max_products: number };

async function runJob(job: Job) {
  const search = await serp({ engine: "google_shopping", q: job.query });
  let calls = 1;
  const listings: Listing[] = (search?.shopping_results ?? []).filter(
    (l: Listing) => l.title && typeof l.extracted_price === "number" && l.extracted_price > 0 && (l.immersive_product_page_token || l.product_id),
  );

  // Most-reviewed first, one per model (first three words, e.g. "realme buds t310"), skipping models already in the catalogue.
  const modelKey = (t: unknown) => normalize(t).split(" ").slice(0, 3).join(" ");
  const existing: { name: string }[] = await db("products?select=name&source=eq.google_shopping&is_active=eq.true");
  const seen = new Set<string>(existing.map((p) => modelKey(p.name)));
  const candidates = listings
    .slice(0, 30)
    .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
    .filter((l) => { const k = modelKey(l.title); if (seen.has(k)) return false; seen.add(k); return true; });

  const saved: { id: string; name: string; stores: number }[] = [];
  let attempts = 0;
  for (const l of candidates) {
    if (saved.length >= job.max_products || attempts >= job.max_products + 2) break; // cap SerpApi searches per job
    attempts++;
    let page: Awaited<ReturnType<typeof productPage>>;
    try { page = await productPage(l); calls++; } catch (e) { console.error("product page", e); continue; }

    // One offer per store: keep the cheapest listing of each.
    const byRetailer = new Map<string, Store>();
    for (const s of page.stores) {
      const price = num(s.extracted_price) ?? num(s.price);
      if (!s.name || !price || price <= 0) continue;
      const rid = await retailerFor(s.name);
      if (!rid) continue;
      const prev = byRetailer.get(rid);
      if (!prev || price < (num(prev.extracted_price) ?? num(prev.price) ?? Infinity)) byRetailer.set(rid, { ...s, extracted_price: price });
    }
    if (byRetailer.size < 2) continue; // a comparison needs at least two other stores

    const title = String(page.info.title ?? l.title).replace(/\s+/g, " ").trim().slice(0, 140);
    const externalRef = `gs:${normalize(title).slice(0, 100)}`;
    const pid = `gs-${await shortHash(externalRef)}`;
    const storePrices = [...byRetailer.values()].map((s) => s.extracted_price!);
    const low = Math.min(...storePrices);
    const ourPrice = Math.max(1, Math.floor(low * PRICE_RULE));
    const mrp = Math.max(ourPrice, ...[...byRetailer.values()].map((s) => num(s.extracted_original_price) ?? num(s.original_price) ?? 0), num(l.extracted_old_price) ?? 0);
    const rating = clampRating(page.info.rating ?? l.rating);
    const reviews = Math.round(num(page.info.reviews) ?? l.reviews ?? 0);
    const brand = String(page.info.brand ?? title.split(" ")[0]).slice(0, 40);
    const about = textsOf((page.info as Record<string, unknown>).about_the_product ?? page.info.description).join(" ");
    const description = stripLinks(about).slice(0, 400) || `${title}. Prices compared across ${byRetailer.size} store${byRetailer.size > 1 ? "s" : ""} on Google Shopping.`;
    const images = [
      ...textsOf((page.info.thumbnails as unknown[]) ?? []),
      ...((page.info.thumbnails as unknown[]) ?? []).filter((t): t is string => typeof t === "string"),
      l.serpapi_thumbnail, l.thumbnail,
    ].filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u));
    const uniqueImages = [...new Set(images)].slice(0, 4);

    await upsert("products", {
      id: pid, slug: `${slugify(title)}-${pid.slice(3)}`, name: title, brand, category: job.category,
      subcategory: job.query.slice(0, 40), subtitle: `${brand} ${job.query}`.slice(0, 80), description,
      base_price_amount: paise(ourPrice), mrp_amount: paise(mrp), theme_color: THEME[job.category],
      rating, review_count: reviews, tags: [...new Set([...normalize(job.query).split(" "), normalize(brand)])].filter(Boolean),
      stats: [{ label: "Stores compared", value: String(byRetailer.size + 1) }, { label: "Lowest elsewhere", value: `₹${low.toLocaleString("en-IN")}` }],
      features: [], materials: [], is_active: true, source: "google_shopping", external_ref: externalRef,
    });
    if (uniqueImages.length) await upsert("product_images", uniqueImages.map((url, i) => ({ id: `${pid}-img${i}`, product_id: pid, url, alt: title, sort_order: i })));
    await upsert("product_variants", { id: `${pid}-std`, product_id: pid, name: "Standard", available: true });

    const now = new Date().toISOString();
    const offers = [{
      id: `offer_${OWN_RETAILER}_${pid}`, product_id: pid, variant_id: `${pid}-std`, retailer_id: OWN_RETAILER,
      price_amount: paise(ourPrice), mrp_amount: paise(mrp), rating, review_count: reviews,
      delivery_label: "2–4 days", delivery_days: 4, delivery_price_amount: ourPrice >= 499 ? 0 : 4900, stock: "in_stock",
      returns_days: RETURNS[job.category], bank_offers: [], coupons: [], vouchers: [], last_checked_at: now, source: "manual",
    }];
    for (const [rid, s] of byRetailer) {
      const deliveryText = stripLinks([...textsOf(s.delivery), ...textsOf(s.shipping)].join(" · ")).slice(0, 40);
      const fee = /free/i.test(deliveryText) ? 0 : (num(deliveryText.match(/₹\s*([\d,.]+)/)?.[1]) ?? 0);
      const oMrp = num(s.extracted_original_price) ?? num(s.original_price);
      offers.push({
        id: `offer_${rid}_${pid}`, product_id: pid, variant_id: `${pid}-std`, retailer_id: rid,
        price_amount: paise(s.extracted_price!), mrp_amount: oMrp ? paise(oMrp) : null as unknown as number,
        rating: clampRating(s.rating), review_count: Math.round(num(s.reviews) ?? 0),
        delivery_label: deliveryText || "See store", delivery_days: null as unknown as number, delivery_price_amount: paise(fee),
        stock: "in_stock", returns_days: null as unknown as number, ...perksOf(s), last_checked_at: now, source: "google_shopping",
      });
    }
    await upsert("offers", offers);
    // Drop store offers that this product no longer has.
    const keep = offers.map((o) => `"${o.id}"`).join(",");
    await db(`offers?product_id=eq.${pid}&source=eq.google_shopping&id=not.in.(${keep})`, { method: "DELETE" });
    // Tell the "prices" function this product is fresh today, so it doesn't search again.
    await db("price_refreshes", { method: "POST", body: JSON.stringify({ product_id: pid, matched: byRetailer.size }) });

    saved.push({ id: pid, name: title, stores: byRetailer.size });
  }
  return { searches: calls, found: listings.length, saved };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!serpKey()) return json({ status: "not_configured" });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const today = await db(`import_jobs?select=id&status=in.(done,error)&finished_at=gte.${since}`);
  if (today.length >= MAX_JOBS_PER_DAY) return json({ status: "quota" });

  const job: Job | null = await db("rpc/claim_import_job", { method: "POST", body: "{}" });
  if (!job?.id) return json({ status: "idle" });

  try {
    const result = await runJob(job);
    await db(`import_jobs?id=eq.${job.id}`, { method: "PATCH", body: JSON.stringify({ status: "done", finished_at: new Date().toISOString(), result }) });
    return json({ status: "done", job: job.id, ...result });
  } catch (e) {
    console.error("import error", e);
    await db(`import_jobs?id=eq.${job.id}`, { method: "PATCH", body: JSON.stringify({ status: "error", finished_at: new Date().toISOString(), result: { error: String(e).slice(0, 300) } }) });
    return json({ status: "error", job: job.id }, 500);
  }
});
