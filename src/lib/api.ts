// Data layer: reads the catalogue and offers from Supabase and manages the cart.
// Money comes from the database in paise (integer minor units); the UI works in rupees.

import { supabase, supabaseConfigured } from './supabase'

export type Retailer = {
  id: string
  name: string
  mark: string
  brandColor: string
  featureTitle: string
  featureDescription: string
  isOwn: boolean
}

export type BankOffer = { text: string; bank?: string | null; discountPercent?: number | null; maxDiscount?: number | null; flatDiscount?: number | null }
export type Coupon = { text: string; code?: string | null; flatDiscount?: number | null; percent?: number | null }
export type Voucher = { text: string; value?: number | null }

export type Offer = {
  id: string
  productId: string
  retailer: Retailer
  price: number
  mrp: number | null
  rating: number | null
  reviews: number
  deliveryLabel: string
  deliveryDays: number | null
  deliveryPrice: number
  stock: 'in_stock' | 'low_stock' | 'out_of_stock'
  returnsDays: number | null
  bankOffers: BankOffer[]
  coupons: Coupon[]
  vouchers: Voucher[]
  lastCheckedAt: string
  /** price after the best coupon anyone can use, plus delivery. Bank offers are excluded: they depend on the card. */
  effectivePrice: number
  couponSaving: number
}

export type Product = {
  id: string
  name: string
  brand: string
  category: string // display label, e.g. "Electronics"
  categoryKey: string // "electronics"
  subcategory: string
  price: number // our price
  mrp: number | null
  eyebrow: string
  description: string
  image: string
  gallery: { url: string; alt: string }[]
  color: string
  rating: number
  reviews: number
  tags: string[]
  stats: { label: string; value: string }[]
  features: { title: string; description: string }[]
  materials: { label: string; value: string }[]
}

export type CartQuoteItem = {
  offerId: string
  productId: string
  productName: string
  imageUrl: string | null
  themeColor: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  available: boolean
}

export type CartQuote = {
  quoteId: string
  expiresAt: string
  items: CartQuoteItem[]
  subtotal: number
  delivery: number
  tax: number
  total: number
}

const rupees = (paise: number | null | undefined) => (paise == null ? 0 : paise / 100)
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

function ensureConfigured() {
  if (!supabaseConfigured) throw new Error('The store is not connected yet. Add the Supabase values to .env and restart.')
}

function friendly(error: { message?: string } | null, fallback: string): never {
  console.error(error)
  throw new Error(navigator.onLine === false ? 'You seem to be offline. Check your connection and try again.' : fallback)
}

type ProductRow = {
  id: string; name: string; brand: string | null; category: string; subcategory: string | null; subtitle: string | null
  description: string | null; base_price_amount: number; mrp_amount: number | null; theme_color: string | null
  rating: number | null; review_count: number; tags: string[]; stats: unknown; features: unknown; materials: unknown
  product_images: { url: string; alt: string; sort_order: number }[]
}

function mapProduct(r: ProductRow): Product {
  const gallery = [...(r.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(({ url, alt }) => ({ url, alt }))
  return {
    id: r.id,
    name: r.name,
    brand: r.brand ?? '',
    category: titleCase(r.category),
    categoryKey: r.category,
    subcategory: r.subcategory ?? '',
    price: rupees(r.base_price_amount),
    mrp: r.mrp_amount == null ? null : rupees(r.mrp_amount),
    eyebrow: r.subtitle ?? '',
    description: r.description ?? '',
    image: gallery[0]?.url ?? '',
    gallery,
    color: r.theme_color ?? '#d8d4c8',
    rating: Number(r.rating ?? 0),
    reviews: r.review_count,
    tags: r.tags ?? [],
    stats: Array.isArray(r.stats) ? (r.stats as Product['stats']) : [],
    features: Array.isArray(r.features) ? (r.features as Product['features']) : [],
    materials: Array.isArray(r.materials) ? (r.materials as Product['materials']) : [],
  }
}

const PRODUCT_SELECT =
  'id,name,brand,category,subcategory,subtitle,description,base_price_amount,mrp_amount,theme_color,rating,review_count,tags,stats,features,materials,product_images(url,alt,sort_order)'

export async function fetchProducts(): Promise<Product[]> {
  ensureConfigured()
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).order('category').order('name')
  if (error) friendly(error, 'We could not load the collection. Please try again.')
  return (data as unknown as ProductRow[]).map(mapProduct)
}

function couponValue(c: Coupon, price: number) {
  if (c.percent) return Math.round((price * c.percent) / 100)
  return Math.min(price, rupees(c.flatDiscount ?? 0))
}

type OfferRow = {
  id: string; product_id: string; price_amount: number; mrp_amount: number | null; rating: number | null; review_count: number
  delivery_label: string | null; delivery_days: number | null; delivery_price_amount: number; stock: Offer['stock']
  returns_days: number | null; bank_offers: BankOffer[]; coupons: Coupon[]; vouchers: Voucher[]; last_checked_at: string
  retailers: { id: string; name: string; mark: string; brand_color: string; feature_title: string | null; feature_description: string | null; is_own: boolean }
}

export async function fetchOffers(productId: string): Promise<Offer[]> {
  ensureConfigured()
  const { data, error } = await supabase
    .from('offers')
    .select('id,product_id,price_amount,mrp_amount,rating,review_count,delivery_label,delivery_days,delivery_price_amount,stock,returns_days,bank_offers,coupons,vouchers,last_checked_at,retailers(id,name,mark,brand_color,feature_title,feature_description,is_own)')
    .eq('product_id', productId)
  if (error) friendly(error, 'We could not load the price comparison. Please try again.')
  return (data as unknown as OfferRow[]).map((o) => {
    const price = rupees(o.price_amount)
    const couponSaving = Math.max(0, ...(o.coupons ?? []).map((c) => couponValue(c, price)))
    const deliveryPrice = rupees(o.delivery_price_amount)
    return {
      id: o.id,
      productId: o.product_id,
      retailer: {
        id: o.retailers.id,
        name: o.retailers.name,
        mark: o.retailers.mark,
        brandColor: o.retailers.brand_color,
        featureTitle: o.retailers.feature_title ?? '',
        featureDescription: o.retailers.feature_description ?? '',
        isOwn: o.retailers.is_own,
      },
      price,
      mrp: o.mrp_amount == null ? null : rupees(o.mrp_amount),
      rating: o.rating == null ? null : Number(o.rating),
      reviews: o.review_count,
      deliveryLabel: o.delivery_label ?? '',
      deliveryDays: o.delivery_days,
      deliveryPrice,
      stock: o.stock,
      returnsDays: o.returns_days,
      bankOffers: o.bank_offers ?? [],
      coupons: o.coupons ?? [],
      vouchers: o.vouchers ?? [],
      lastCheckedAt: o.last_checked_at,
      couponSaving,
      effectivePrice: price - couponSaving + deliveryPrice,
    }
  })
}

// ---- Cart (server-side, keyed by a random token kept in this browser) ----

const TOKEN_KEY = 'newtags-cart-token'
let memoryToken: string | null = null

export function cartToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY)
    if (existing) return existing
    const t = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, t)
    return t
  } catch {
    memoryToken ??= crypto.randomUUID()
    return memoryToken
  }
}

type Money = { amount: number; currency: string }
type QuoteRow = {
  quoteId: string; expiresAt: string; subtotal: Money; delivery: Money; tax: Money; total: Money
  items: { offerId: string; productId: string; productName: string; imageUrl: string | null; themeColor: string | null; quantity: number; unitPrice: Money; lineTotal: Money; available: boolean }[]
}

export async function fetchCart(): Promise<CartQuote> {
  ensureConfigured()
  const { data, error } = await supabase.rpc('cart_quote', { p_token: cartToken() })
  if (error) friendly(error, 'We could not load your bag. Please try again.')
  const q = data as QuoteRow
  return {
    quoteId: q.quoteId,
    expiresAt: q.expiresAt,
    items: q.items.map((i) => ({ ...i, unitPrice: rupees(i.unitPrice.amount), lineTotal: rupees(i.lineTotal.amount) })),
    subtotal: rupees(q.subtotal.amount),
    delivery: rupees(q.delivery.amount),
    tax: rupees(q.tax.amount),
    total: rupees(q.total.amount),
  }
}

/** Set the quantity of an offer in the bag (0 removes it). Only our own store's offers are accepted by the server. */
export async function setCartItem(offerId: string, quantity: number): Promise<void> {
  ensureConfigured()
  const { error } = await supabase.rpc('cart_set_item', { p_token: cartToken(), p_offer_id: offerId, p_quantity: Math.max(0, Math.min(10, quantity)) })
  if (error) friendly(error, 'We could not update your bag. Please try again.')
}

/** Our own store's offer id for a product (the one customers can buy). */
export const ownOfferId = (productId: string) => `offer_semil_${productId}`

// ---- AI shopping assistant (Supabase Edge Function "assistant") ----

export type AssistantReply = {
  type: 'ask' | 'suggest' | 'answer'
  message: string
  summary: string
  products: AssistantProduct[]
  quick_replies: string[]
  action: AssistantAction | null
  action_product: { id: string; name: string } | null
}

export type AssistantProduct = {
  id: string; name: string; brand: string; price: number; mrp: number; rating: number; reviews: number; image?: string
  ourOffers?: { bankOffer?: string; coupon?: string; voucher?: string }
  comparison?: { platform: string; price: number; rating?: number; bankOffer?: string; coupon?: string; voucher?: string }[]
  insight?: { rank: number; badge?: string; effective_price: number; lowest_other?: { platform: string; effective_price: number }; saving_vs_others: number }
}

export type AssistantAction =
  | { name: 'navigate'; page: 'home' | 'cart' }
  | { name: 'open_product'; product_id: string }
  | { name: 'compare'; product_id: string }
  | { name: 'add_to_cart'; product_id: string; qty: number }
  | { name: 'search'; query?: string; category?: 'electronics' | 'clothing' | 'beauty'; min_price?: number; max_price?: number }

export async function askAssistant(messages: { role: 'user' | 'assistant'; text: string }[], path: string): Promise<AssistantReply> {
  ensureConfigured()
  const { data, error } = await supabase.functions.invoke('assistant', { body: { messages, path } })
  if (error) {
    // The function returns a customer-safe { error } message; surface it when present.
    let message = 'Sorry, I could not answer just now. Please try again.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch { /* keep the default message */ }
    throw new Error(message)
  }
  return data as AssistantReply
}
