// Loads the public catalogue from the database (products + offers), shaped for the assistant.
// Uses the public (anon) key, so row-level security limits it to what any shopper can see.

export type Category = "electronics" | "clothing" | "beauty";

export type PlatformOffer = {
  platform: string; // "Amazon" | "Flipkart" (comparison only)
  price: number; // INR
  rating?: number;
  bankOffer?: string;
  coupon?: string;
  voucher?: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  subcategory: string;
  price: number; // our price (Newtags), INR
  mrp: number;
  rating: number;
  reviews: number;
  image?: string;
  description: string;
  tags: string[];
  ourOffers?: { bankOffer?: string; coupon?: string; voucher?: string };
  comparison?: PlatformOffer[];
};

type Perk = { text: string };
type OfferRow = {
  price_amount: number; rating: number | null; stock: string;
  bank_offers: Perk[]; coupons: Perk[]; vouchers: Perk[];
  retailers: { name: string; is_own: boolean };
};
type ProductRow = {
  id: string; name: string; brand: string | null; category: string; subcategory: string | null; description: string | null;
  base_price_amount: number; mrp_amount: number | null; rating: number | null; review_count: number; tags: string[];
  product_images: { url: string; sort_order: number }[];
  offers: OfferRow[];
};

const join = (list: Perk[] | undefined) => (list?.length ? list.map((p) => p.text).join(" · ") : undefined);

let cache: { at: number; data: Product[] } | null = null;
const TTL_MS = 60_000;

export async function getCatalog(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Supabase environment is missing");

  const select = "id,name,brand,category,subcategory,description,base_price_amount,mrp_amount,rating,review_count,tags," +
    "product_images(url,sort_order),offers(price_amount,rating,stock,bank_offers,coupons,vouchers,retailers(name,is_own))";
  const res = await fetch(`${url}/rest/v1/products?select=${encodeURIComponent(select)}&is_active=eq.true`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Catalogue query failed: ${res.status}`);
  const rows = (await res.json()) as ProductRow[];

  const data: Product[] = rows
    .map((r) => {
      const own = r.offers.find((o) => o.retailers?.is_own);
      if (!own || own.stock === "out_of_stock") return null; // only products customers can buy here
      const others = r.offers.filter((o) => !o.retailers?.is_own);
      const img = [...(r.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
      const p: Product = {
        id: r.id,
        name: r.name,
        brand: r.brand ?? "",
        category: r.category as Category,
        subcategory: r.subcategory ?? "",
        price: own.price_amount / 100,
        mrp: (r.mrp_amount ?? own.price_amount) / 100,
        rating: Number(r.rating ?? 0),
        reviews: r.review_count,
        image: img && /^https:\/\//.test(img) ? img : undefined,
        description: r.description ?? "",
        tags: r.tags ?? [],
        ourOffers: { bankOffer: join(own.bank_offers), coupon: join(own.coupons), voucher: join(own.vouchers) },
        comparison: others.map((o) => ({
          platform: o.retailers.name,
          price: o.price_amount / 100,
          rating: o.rating == null ? undefined : Number(o.rating),
          bankOffer: join(o.bank_offers),
          coupon: join(o.coupons),
          voucher: join(o.vouchers),
        })),
      };
      return p;
    })
    .filter((p): p is Product => p !== null);

  cache = { at: Date.now(), data };
  return data;
}
