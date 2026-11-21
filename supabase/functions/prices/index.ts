// Supabase Edge Function "prices": refreshes Amazon and Flipkart prices for one product from
// Google Shopping (SerpApi), using the same matching rules as backend/price_service/price_engine.py.
// POST { productId: string }  ->  { status: "updated" | "fresh" | "quota" | "no_match", matched?: string[] }
//
// - The SerpApi key is the Supabase secret SERPAPI_KEY (never in the browser).
// - Results are cached in the offers table: a product is looked up at most once a day, and
//   the whole site makes at most DAILY_CAP lookups a day, to stay inside SerpApi's free quota.
// - Store links are NOT saved: customers buy only on Neutags, other stores are comparison-only.

// Accepts the names the secret was saved under in the dashboard ("serpi api" is the current one).
const serpKey = () => Deno.env.get("SERPAPI_KEY") ?? Deno.env.get("serpi api") ?? Deno.env.get("SERPI_API") ?? Deno.env.get("serpapi");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const REFRESH_EVERY_MS = 24 * 60 * 60 * 1000;
const DAILY_CAP = 25;
const MIN_OVERLAP = 0.6; // same threshold as find_matching_products() in price_engine.py

const RETAILERS = [
  { id: "amazon", match: /amazon/i },
  { id: "flipkart", match: /flipkart/i },
];

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`db ${path.split("?")[0]} ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// normalize_text() from price_engine.py
const normalize = (t: string) => (t ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
function overlap(query: string, title: string) {
  const q = new Set(normalize(query).split(" ").filter(Boolean));
  const t = new Set(normalize(title).split(" ").filter(Boolean));
  if (!q.size) return 0;
  let n = 0;
  q.forEach((w) => { if (t.has(w)) n++; });
  return n / q.size;
}

type ShoppingItem = {
  title?: string; source?: string; extracted_price?: number; rating?: number; reviews?: number; delivery?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let productId = "";
  try {
    const body = await req.json();
    productId = typeof body?.productId === "string" ? body.productId.slice(0, 64) : "";
  } catch { /* handled below */ }
  if (!/^[\w-]+$/.test(productId)) return json({ error: "Invalid product." }, 400);

  const apiKey = serpKey();
  if (!apiKey) return json({ status: "not_configured" });

  try {
    const now = Date.now();
    const since = new Date(now - REFRESH_EVERY_MS).toISOString();

    const recent = await db(`price_refreshes?select=at&product_id=eq.${productId}&at=gte.${since}&limit=1`);
    if (recent.length) return json({ status: "fresh" });

    const today = await db(`price_refreshes?select=id&at=gte.${since}`);
    if (today.length >= DAILY_CAP) return json({ status: "quota" });

    const [product] = await db(`products?select=id,name,brand&id=eq.${productId}&is_active=eq.true`);
    if (!product) return json({ error: "Unknown product." }, 404);

    // Record the lookup before calling SerpApi, so parallel visitors don't spend the quota twice.
    const [log] = await db("price_refreshes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ product_id: productId }) });

    const params = new URLSearchParams({ engine: "google_shopping", q: product.name, gl: "in", hl: "en", api_key: apiKey });
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) {
      console.error("SerpApi error", res.status, (await res.text()).slice(0, 300));
      return json({ status: "error" }, 502);
    }
    const data = await res.json();
    const items: ShoppingItem[] = data?.shopping_results ?? [];

    const matched: string[] = [];
    for (const r of RETAILERS) {
      const best = items
        .filter((i) => i.source && r.match.test(i.source) && typeof i.extracted_price === "number" && i.extracted_price > 0)
        .map((i) => ({ i, score: overlap(product.name, i.title ?? "") }))
        .filter((x) => x.score >= MIN_OVERLAP)
        .sort((a, b) => b.score - a.score || a.i.extracted_price! - b.i.extracted_price!)[0];
      if (!best) continue;

      const row = {
        id: `offer_${r.id}_${productId}`,
        product_id: productId,
        retailer_id: r.id,
        price_amount: Math.round(best.i.extracted_price! * 100),
        rating: typeof best.i.rating === "number" ? Math.min(5, Math.max(0, best.i.rating)) : null,
        review_count: typeof best.i.reviews === "number" ? best.i.reviews : 0,
        ...(best.i.delivery && best.i.delivery.length <= 40 ? { delivery_label: best.i.delivery } : {}),
        last_checked_at: new Date().toISOString(),
        source: "google_shopping",
      };
      await db("offers?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
      matched.push(r.id);
    }

    await db(`price_refreshes?id=eq.${log.id}`, { method: "PATCH", body: JSON.stringify({ matched: matched.length }) });
    return json({ status: matched.length ? "updated" : "no_match", matched });
  } catch (e) {
    console.error("prices error", e);
    return json({ status: "error" }, 500);
  }
});
