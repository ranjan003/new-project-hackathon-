import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCart, fetchOffers, fetchProducts, inr, ownOfferId, refreshPrices, setCartItem, type CartQuote, type Offer, type Product } from './lib/api'
import ShoppingAssistant from './components/ShoppingAssistant'

// Customers buy ONLY on Neutags. Amazon and Flipkart offers are shown for comparison and never link out.

type View =
  | { name: 'home' }
  | { name: 'product'; id: string; compare?: boolean }
  | { name: 'store'; id: string }
  | { name: 'cart' }

export type Filters = { query: string; category: string; minPrice?: number; maxPrice?: number }

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

function Icon({ name }: { name: 'search' | 'heart' | 'arrow' | 'back' | 'check' | 'cart' | 'chat' | 'close' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.4a5.5 5.5 0 0 0 1.1-8.9Z" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    cart: <><path d="M3 4h2l2 11h10l2-7H7" /><circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function ProductImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed || !src ? (
    <div className={`image-fallback ${className}`} role="img" aria-label={`${alt} image unavailable`}>
      <svg aria-hidden="true" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="54" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M48 92c11-35 53-46 68-7M57 76v29M105 70v40" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
      <span>{alt}</span>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  )
}

function StatusBlock({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="status-block" role={onRetry ? 'alert' : 'status'}>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </div>
  )
}

const galleryOf = (p: Product) => (p.gallery.length ? p.gallery.map((g) => g.url) : [p.image])
const offOf = (p: Product) => (p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0)
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))

function Header({ onHome, onSearch, searchOpen, saved, cartCount, onCart }: { onHome: () => void; onSearch: () => void; searchOpen: boolean; saved: number; cartCount: number; onCart: () => void }) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onHome} aria-label="Neutags home">NEUTAGS<span>.</span></button>
      <nav aria-label="Primary navigation">
        <button onClick={onHome}>Discover</button>
        <button onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>Collections</button>
        <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
      </nav>
      <div className="header-actions">
        <button className="icon-button" onClick={onSearch} aria-label="Search products" aria-pressed={searchOpen}><Icon name="search" /></button>
        <button className="saved-button" aria-label={`${saved} saved products`}><Icon name="heart" /><span>{saved}</span></button>
        <button className="saved-button" onClick={onCart} aria-label={`Bag, ${cartCount} items`}><Icon name="cart" /><span>{cartCount}</span></button>
      </div>
    </header>
  )
}

function ProductShowcase({ product, position, saved, onSave, onSelect }: { product: Product; position: number; saved: boolean; onSave: () => void; onSelect: () => void }) {
  const gallery = galleryOf(product)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (gallery.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setFrame((index) => (index + 1) % gallery.length), 3900 + (position % 6) * 180)
    return () => window.clearInterval(timer)
  }, [gallery.length, position])

  const move = (direction: number) => setFrame((index) => (index + direction + gallery.length) % gallery.length)
  const off = offOf(product)

  return (
    <article className={`showcase ${position % 2 ? 'showcase-reverse' : ''}`} style={{ '--showcase-color': product.color } as React.CSSProperties}>
      <div className="showcase-visual">
        <div className="showcase-frame" key={`${product.id}-${frame}`}>
          <ProductImage src={gallery[frame]} alt={`${product.name}, view ${frame + 1}`} />
        </div>
        <span className="showcase-count">{String(frame + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
        <button className={`carousel-heart ${saved ? 'active' : ''}`} onClick={onSave} aria-label={`${saved ? 'Remove' : 'Save'} ${product.name}`} aria-pressed={saved}><Icon name="heart" /></button>
        {gallery.length > 1 && (
          <>
            <div className="showcase-arrows">
              <button onClick={() => move(-1)} aria-label={`Previous ${product.name} image`}><Icon name="back" /></button>
              <button onClick={() => move(1)} aria-label={`Next ${product.name} image`}><Icon name="arrow" /></button>
            </div>
            <div className="showcase-dots" aria-label={`${product.name} image selection`}>
              {gallery.map((image, index) => (
                <button key={image + index} className={frame === index ? 'active' : ''} onClick={() => setFrame(index)} aria-label={`Show image ${index + 1}`} aria-current={frame === index ? 'true' : undefined} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="showcase-copy">
        <p className="kicker">{String(position + 1).padStart(2, '0')} / {product.category}</p>
        <div>
          <span>{product.eyebrow}</span>
          <h3>{product.name}</h3>
          <p>★ {product.rating} from {product.reviews.toLocaleString('en-IN')} reviews. Compared with Amazon, Flipkart and other stores on price, bank offers, coupons and vouchers.</p>
        </div>
        <div className="showcase-action">
          <strong>{inr(product.price)}{off > 0 && <small className="price-off"> {off}% off MRP</small>}</strong>
          <button onClick={onSelect}>View comparison <Icon name="arrow" /></button>
        </div>
      </div>
    </article>
  )
}

// Words people type for the same thing, so "phone" finds smartphones and "headphones" finds earbuds.
const SEARCH_SYNONYMS: Record<string, string[]> = {
  phone: ['smartphone'], mobile: ['smartphone'], earphone: ['earbuds'], headphone: ['earbuds'], tws: ['earbuds'],
  watch: ['smartwatch'], shoe: ['shoes'], sneaker: ['shoes'], dryer: ['dryer'], cleanser: ['face wash', 'cleanser'],
  facewash: ['face wash'], kurti: ['kurta'], speakers: ['speaker'],
}
const stem = (w: string) => w.replace(/(es|s)$/, '')
function matchesSearch(p: Product, words: string[]) {
  const hay = `${p.name} ${p.brand} ${p.category} ${p.subcategory} ${p.tags.join(' ')}`.toLowerCase()
  return words.every((w) => {
    const options = [w, stem(w), ...(SEARCH_SYNONYMS[w] ?? []), ...(SEARCH_SYNONYMS[stem(w)] ?? [])]
    return options.some((o) => o.length > 1 && hay.includes(o))
  })
}

function Home({ products, onSelect, saved, onSave, filters, setFilters, cartCount, onCart, onRetry }: {
  products: Load<Product[]>; onSelect: (product: Product) => void; saved: string[]; onSave: (id: string) => void
  filters: Filters; setFilters: (f: Filters) => void; cartCount: number; onCart: () => void; onRetry: () => void
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(filters.query))
  const all = products.status === 'ready' ? products.data : []
  const categories = useMemo(() => ['All', ...Array.from(new Set(all.map((p) => p.category)))], [all])
  const shown = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const words = q.split(/\s+/).filter(Boolean)
    return all.filter((p) => {
      if (filters.category !== 'All' && p.category !== filters.category) return false
      if (filters.maxPrice != null && p.price > filters.maxPrice) return false
      if (filters.minPrice != null && p.price < filters.minPrice) return false
      if (!words.length) return true
      return matchesSearch(p, words)
    })
  }, [all, filters])
  const suggestions = filters.query.trim() ? shown.slice(0, 6) : []
  const showResults = () => {
    setSearchOpen(false)
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
  }
  const priceFilter = filters.maxPrice != null || filters.minPrice != null

  useEffect(() => { if (filters.query) setSearchOpen(true) }, [filters.query])

  return (
    <div>
      <Header onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onSearch={() => setSearchOpen(!searchOpen)} searchOpen={searchOpen} saved={saved.length} cartCount={cartCount} onCart={onCart} />
      {searchOpen && (
        <div className="search-row">
          <label htmlFor="product-search">Search the collection</label>
          <input id="product-search" type="search" autoFocus value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            onKeyDown={(event) => { if (event.key === 'Enter') showResults(); if (event.key === 'Escape') setSearchOpen(false) }}
            placeholder="Try “earbuds”, “phone” or “face wash”" />
          {filters.query.trim() && products.status === 'ready' && (
            <div className="search-results" role="listbox" aria-label="Matching products">
              {suggestions.map((p) => (
                <button key={p.id} role="option" aria-selected={false} onClick={() => { setSearchOpen(false); onSelect(p) }}>
                  {p.image && <img src={p.image} alt="" />}
                  <span className="search-result-name">{p.name}</span>
                  <span className="search-result-price">{inr(p.price)}</span>
                </button>
              ))}
              {!suggestions.length && <p className="search-empty">No products match “{filters.query.trim()}”. Try earbuds, phone, speaker, watch, shoes, kurta, face wash or hair dryer.</p>}
              {shown.length > 0 && <button className="search-all" onClick={showResults}>See all {shown.length} result{shown.length === 1 ? '' : 's'}</button>}
            </div>
          )}
        </div>
      )}
      <main>
        <section className="hero">
          <p className="kicker">One search. Every good choice.</p>
          <h1>Objects worth<br /><em>considering.</em></h1>
          <p className="hero-copy">We compare Amazon, Flipkart and other stores for you, offers included, so you can buy here with confidence.</p>
          <button className="round-link" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Explore collection"><Icon name="arrow" /></button>
          <span className="edition">EDIT / 001<br />NOVEMBER 2026</span>
        </section>

        <section className="collection" id="collection">
          <div className="section-top">
            <div>
              <p className="kicker">The considered edit</p>
              <h2>Shop less.<br />Choose better.</h2>
            </div>
            <div className="filters" role="tablist" aria-label="Product categories">
              {categories.map((item) => (
                <button key={item} role="tab" aria-selected={filters.category === item} onClick={() => setFilters({ ...filters, category: item })}>{item}</button>
              ))}
            </div>
          </div>
          {priceFilter && (
            <p className="active-filter">
              Showing {filters.minPrice != null ? `from ${inr(filters.minPrice)} ` : ''}{filters.maxPrice != null ? `up to ${inr(filters.maxPrice)}` : ''}
              <button onClick={() => setFilters({ ...filters, minPrice: undefined, maxPrice: undefined })}>Clear price filter</button>
            </p>
          )}
          {products.status === 'loading' && <StatusBlock title="Loading the collection…" />}
          {products.status === 'error' && <StatusBlock title="The collection didn't load." message={products.message} onRetry={onRetry} />}
          {products.status === 'ready' && !all.length && <StatusBlock title="No products yet." message="The catalogue is empty. Products will appear here as soon as they are added." />}
          <div className="showcase-stack">
            {shown.map((product, index) => (
              <ProductShowcase key={product.id} product={product} position={index} saved={saved.includes(product.id)} onSave={() => onSave(product.id)} onSelect={() => onSelect(product)} />
            ))}
          </div>
          {products.status === 'ready' && all.length > 0 && !shown.length && <p className="empty-state">No objects found. Try another search.</p>}
        </section>

        <section className="manifesto" id="about">
          <p>Price is only part of the story.</p>
          <h2>We check the price, the bank offers, the coupons and the reviews, so “best” actually means best <em>for you.</em></h2>
          <span>Compared clearly. Bought safely, here.</span>
        </section>
      </main>
      <footer><span>NEUTAGS.</span><p>Good things, found well.</p><small>© 2026</small></footer>
    </div>
  )
}

function OfferPerks({ offer }: { offer: Offer }) {
  const lines = [
    ...offer.bankOffers.map((b) => ({ kind: 'Bank offer', text: b.text })),
    ...offer.coupons.map((c) => ({ kind: 'Coupon', text: c.text })),
    ...offer.vouchers.map((v) => ({ kind: 'Voucher', text: v.text })),
  ]
  if (!lines.length) return <span className="no-perks">No bank offers, coupons or vouchers right now.</span>
  return (
    <ul className="perk-list">
      {lines.map((l, i) => <li key={i}><b>{l.kind}</b> {l.text}</li>)}
    </ul>
  )
}

type OfferSort = 'recommended' | 'price' | 'rating' | 'delivery'

function ProductPage({ product, focusCompare, onBack, saved, onSave, onBuy }: { product: Product; focusCompare?: boolean; onBack: () => void; saved: boolean; onSave: () => void; onBuy: () => void }) {
  const [sort, setSort] = useState<OfferSort>('recommended')
  const [heroFrame, setHeroFrame] = useState(0)
  const [offers, setOffers] = useState<Load<Offer[]>>({ status: 'loading' })
  const gallery = galleryOf(product)

  const load = useCallback(() => {
    setOffers({ status: 'loading' })
    fetchOffers(product.id).then((data) => setOffers({ status: 'ready', data }), (e: Error) => setOffers({ status: 'error', message: e.message }))
  }, [product.id])
  useEffect(load, [load])

  // Ask for live Amazon/Flipkart prices; reload the table only if something changed.
  useEffect(() => {
    let alive = true
    refreshPrices(product.id).then((status) => {
      if (alive && status === 'updated') fetchOffers(product.id).then((data) => alive && setOffers({ status: 'ready', data }), () => {})
    })
    return () => { alive = false }
  }, [product.id])

  useEffect(() => {
    if (gallery.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setHeroFrame((frame) => (frame + 1) % gallery.length), 4600)
    return () => window.clearInterval(timer)
  }, [gallery.length])

  useEffect(() => {
    if (focusCompare) window.setTimeout(() => document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth' }), 200)
  }, [focusCompare, product.id])

  const list = offers.status === 'ready' ? offers.data : []
  const own = list.find((o) => o.retailer.isOwn)
  const others = list.filter((o) => !o.retailer.isOwn)
  const lowestOther = others.length ? Math.min(...others.map((o) => o.effectivePrice)) : null
  const sorted = [...list].sort((a, b) =>
    sort === 'price' ? a.effectivePrice - b.effectivePrice
      : sort === 'rating' ? (b.rating ?? 0) - (a.rating ?? 0)
        : sort === 'delivery' ? (a.deliveryDays ?? 99) - (b.deliveryDays ?? 99)
          : Number(b.retailer.isOwn) - Number(a.retailer.isOwn) || a.effectivePrice - b.effectivePrice)

  const off = offOf(product)
  const stats: [string, string][] = [[`${product.rating}★`, 'Rating'], [off ? `${off}%` : compact(product.reviews), off ? 'Off MRP' : 'Reviews']]
  const features = product.features.length >= 2 ? product.features : [
    { title: 'Every offer, side by side.', description: 'Bank offers, coupons and vouchers from each store are listed below, not just the sticker price.' },
    { title: 'Compare there. Buy here.', description: 'Other stores are shown for comparison only. You check out securely on Neutags.' },
  ]
  const materials = product.materials.length ? product.materials.map((m) => [m.label, m.value] as [string, string]) : [
    ['Brand', product.brand], ['Type', product.subcategory], ['MRP', product.mrp ? inr(product.mrp) : '—'],
  ] as [string, string][]

  return (
    <div className="product-page">
      <header className="detail-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Back to edit</button>
        <button className="wordmark" onClick={onBack}>NEUTAGS<span>.</span></button>
        <button className={`icon-button ${saved ? 'active' : ''}`} onClick={onSave} aria-label={`${saved ? 'Remove' : 'Save'} ${product.name}`} aria-pressed={saved}><Icon name="heart" /></button>
      </header>

      <main>
        <section className="product-visual" style={{ '--product-color': product.color } as React.CSSProperties}>
          <div className="detail-title">
            <p>{product.category} / {product.subcategory}</p>
            <h1>{product.name}</h1>
            <span>{product.eyebrow}</span>
          </div>
          <div className="detail-image" key={`${product.id}-${heroFrame}`}>
            <ProductImage src={gallery[heroFrame]} alt={`${product.name}, view ${heroFrame + 1}`} />
          </div>
          <div className="hero-spec hero-spec-one"><strong>{stats[0][0]}</strong><span>{stats[0][1]}</span></div>
          <div className="hero-spec hero-spec-two"><strong>{stats[1][0]}</strong><span>{stats[1][1]}</span></div>
          <div className="sound-mark" aria-hidden="true">{[18, 34, 48, 28, 56, 38, 22, 44, 31].map((height, index) => <i key={index} style={{ height }} />)}</div>
          <p className="scroll-note">Scroll to compare <span>↓</span></p>
        </section>

        <section className="product-story">
          <div className="story-intro">
            <p className="kicker">The object / In detail</p>
            <h2>Rated {product.rating}★ by {compact(product.reviews)} buyers.</h2>
            <p>{product.description}</p>
          </div>
          <div className="feature-grid">
            <div className="feature-image feature-reveal">
              <ProductImage src={gallery[(heroFrame + 1) % gallery.length]} alt={`${product.name} detail`} />
              <span>Designed around you</span>
            </div>
            <div className="feature-card feature-dark feature-reveal">
              <span className="feature-index">01</span>
              <div className="mini-wave" aria-hidden="true">{[12, 26, 43, 22, 52, 31, 15, 37, 20].map((height, index) => <i key={index} style={{ height }} />)}</div>
              <h3>{features[0].title}</h3>
              <p>{features[0].description}</p>
            </div>
            <div className="feature-card feature-light feature-reveal">
              <span className="feature-index">02</span>
              <div className="orbit-graphic" aria-hidden="true"><i /><i /><span /></div>
              <h3>{features[1].title}</h3>
              <p>{features[1].description}</p>
            </div>
            <div className="feature-card feature-accent feature-reveal">
              <span className="feature-index">03</span>
              <strong>{own?.returnsDays ?? '—'}</strong><small>day returns</small>
              <h3>Made for every day.</h3>
              <p>{own ? `Delivered ${own.deliveryLabel.toLowerCase()}${own.deliveryPrice ? ` for ${inr(own.deliveryPrice)}` : ', free'}, with ${own.returnsDays}-day returns from Neutags.` : 'Delivery and returns details load with the comparison.'}</p>
            </div>
            <div className="material-card feature-reveal">
              <p className="kicker">At a glance</p>
              <div className="swatches"><i /><i /><i /></div>
              {materials.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
        </section>

        <section className="compare-section" id="compare">
          <div className="comparison-ticker" aria-hidden="true"><span>COMPARE CLEARLY • CHOOSE CONFIDENTLY • </span><span>COMPARE CLEARLY • CHOOSE CONFIDENTLY • </span></div>
          <div className="compare-heading">
            <div><p className="kicker">Live comparison</p><h2>{list.length ? `${['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][list.length] ?? list.length} places.` : 'Every place.'}<br />Compare your way.</h2></div>
            <label>Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value as OfferSort)}>
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price after coupons</option>
                <option value="rating">Highest rating</option>
                <option value="delivery">Fastest delivery</option>
              </select>
            </label>
          </div>
          {offers.status === 'loading' && <StatusBlock title="Checking prices…" />}
          {offers.status === 'error' && <StatusBlock title="The comparison didn't load." message={offers.message} onRetry={load} />}
          {offers.status === 'ready' && !list.length && <StatusBlock title="No prices yet." message="We haven't checked prices for this product yet." />}
          {list.length > 1 && (() => {
            const byPrice = [...list].sort((a, b) => a.effectivePrice - b.effectivePrice)
            const best = byPrice[0], worst = byPrice[byPrice.length - 1]
            return (
              <p className="compare-summary">
                Across {list.length} stores: lowest <strong>{inr(best.effectivePrice)}</strong> at {best.retailer.name}, highest {inr(worst.effectivePrice)} at {worst.retailer.name}. Difference {inr(worst.effectivePrice - best.effectivePrice)}.
              </p>
            )
          })()}
          {list.length > 0 && (
            <div className="equal-offers" aria-label={`Store comparison for ${product.name}`}>
              <div className="equal-offers-head">
                <span>Retailer</span><span>Bank offers, coupons, vouchers</span><span>Rating</span><span>Delivery</span><span>You pay</span><span />
              </div>
              {sorted.map((offer, index) => (
                <article className={`equal-offer ${offer.retailer.isOwn ? 'own-offer' : ''}`} key={offer.id}>
                  <div className="equal-store">
                    <span className="equal-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="equal-thumb"><ProductImage src={product.image} alt="" /></div>
                    <span className="equal-mark" style={{ color: offer.retailer.brandColor }}>{offer.retailer.mark}</span>
                    <div><h3>{offer.retailer.name}</h3><small>{offer.retailer.isOwn ? 'Buy here' : 'For comparison only'}</small>{!offer.retailer.isOwn && <small className={`price-source ${offer.source === 'google_shopping' ? 'live' : ''}`}>{offer.source === 'google_shopping' ? `Live price · Google Shopping, ${new Date(offer.lastCheckedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Sample price'}</small>}</div>
                  </div>
                  <div className="retailer-feature"><Icon name="check" /><div><strong>{offer.retailer.featureTitle}</strong><OfferPerks offer={offer} /></div></div>
                  <div className="equal-rating"><strong>★ {offer.rating ?? '—'}</strong><span>{offer.reviews ? `${compact(offer.reviews)} reviews` : 'Store rating'}</span></div>
                  <div className="equal-delivery"><strong>{offer.deliveryLabel}</strong><span>{offer.deliveryPrice ? `${inr(offer.deliveryPrice)} delivery` : 'Free delivery'}</span></div>
                  <div className="equal-price">
                    <strong>{inr(offer.effectivePrice)}</strong>
                    <span>{offer.couponSaving ? `${inr(offer.price)} − ${inr(offer.couponSaving)} coupon` : `Listed ${inr(offer.price)}`}{offer.deliveryPrice ? ` + delivery` : ''}</span>
                    {offer.retailer.isOwn && lowestOther != null && offer.effectivePrice < lowestOther && <em className="saving">{inr(lowestOther - offer.effectivePrice)} less than elsewhere</em>}
                  </div>
                  {offer.retailer.isOwn
                    ? <button onClick={onBuy} aria-label={`Buy ${product.name} on Neutags`}><Icon name="arrow" /></button>
                    : <span className="compare-only" aria-label="Comparison only">—</span>}
                </article>
              ))}
            </div>
          )}
          <p className="price-note">Other stores' prices come from Google Shopping and are shown for comparison only. You can buy only on Neutags. Bank offers depend on your card and are not included in “You pay”. {list[0] ? `Last checked ${new Date(list[0].lastCheckedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}</p>
        </section>
      </main>
      <footer><span>NEUTAGS.</span><p>Compare clearly. Choose confidently.</p><small>© 2026</small></footer>
    </div>
  )
}

function StoreProductPage({ product, cartCount, inCart, onBack, onAdd, onCart }: { product: Product; cartCount: number; inCart: boolean; onBack: () => void; onAdd: () => Promise<void>; onCart: () => void }) {
  const [image, setImage] = useState(0)
  const [offer, setOffer] = useState<Load<Offer | null>>({ status: 'loading' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const gallery = galleryOf(product)

  const load = useCallback(() => {
    setOffer({ status: 'loading' })
    fetchOffers(product.id).then((list) => setOffer({ status: 'ready', data: list.find((o) => o.retailer.isOwn) ?? null }), (e: Error) => setOffer({ status: 'error', message: e.message }))
  }, [product.id])
  useEffect(load, [load])

  const add = async (thenCart: boolean) => {
    setAddError('')
    setAdding(true)
    try {
      if (!inCart) await onAdd()
      if (thenCart) onCart()
    } catch (e) {
      setAddError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const o = offer.status === 'ready' ? offer.data : null
  const soldOut = o?.stock === 'out_of_stock'

  return (
    <div className="store-page">
      <header className="commerce-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Comparison</button>
        <span className="wordmark">NEUTAGS<span>.</span></span>
        <button className="cart-button" onClick={onCart}><Icon name="cart" /> Bag <b>{cartCount}</b></button>
      </header>
      <main className="store-product">
        <div className="store-gallery">
          <div className="store-main-image" key={image}><ProductImage src={gallery[image]} alt={`${product.name}, product view ${image + 1}`} /></div>
          <div className="store-thumbs">
            {gallery.map((src, index) => <button key={src + index} className={image === index ? 'active' : ''} onClick={() => setImage(index)} aria-label={`Show view ${index + 1}`}><ProductImage src={src} alt="" /></button>)}
          </div>
        </div>
        <section className="purchase-panel">
          <div className="retailer-chip"><span style={{ color: '#d94b24' }}>N</span> Sold by Neutags</div>
          <p className="kicker">{product.category} / {soldOut ? 'Out of stock' : o?.stock === 'low_stock' ? 'Only a few left' : 'In stock'}</p>
          <h1>{product.name}</h1>
          <p className="purchase-subtitle">{product.eyebrow}</p>
          <div className="purchase-rating"><span>★ {product.rating}</span> <u>{product.reviews.toLocaleString('en-IN')} verified reviews</u></div>
          {offer.status === 'loading' && <StatusBlock title="Loading price…" />}
          {offer.status === 'error' && <StatusBlock title="The price didn't load." message={offer.message} onRetry={load} />}
          {offer.status === 'ready' && !o && <StatusBlock title="Not sold here yet." message="This product is listed for comparison, but Neutags doesn't sell it yet." />}
          {o && (
            <>
              <div className="purchase-price">
                <strong>{inr(o.price)}</strong>
                <p>{o.mrp && o.mrp > o.price ? <>MRP <s>{inr(o.mrp)}</s> · {Math.round(((o.mrp - o.price) / o.mrp) * 100)}% off<br /></> : null}Inclusive of all taxes</p>
              </div>
              {(o.bankOffers.length > 0 || o.coupons.length > 0 || o.vouchers.length > 0) && (
                <div className="retailer-benefit">
                  <span style={{ color: '#d94b24' }}>%</span>
                  <div><small>Offers on Neutags</small><strong>{o.couponSaving ? `${inr(o.price - o.couponSaving)} after coupon` : 'Save more with these'}</strong><OfferPerks offer={o} /></div>
                </div>
              )}
              <div className="delivery-box"><Icon name="check" /><div><strong>{o.deliveryPrice ? `${inr(o.deliveryPrice)} delivery` : 'Free delivery'} · {o.deliveryLabel}</strong><span>{o.returnsDays}-day returns with free pickup</span></div></div>
              <button className={`add-button ${inCart ? 'added' : ''}`} disabled={adding || soldOut} onClick={inCart ? onCart : () => add(false)}>
                {soldOut ? 'Out of stock' : inCart ? <><Icon name="check" /> Added — view bag</> : adding ? 'Adding…' : <>Add to bag <span>{inr(o.price)}</span></>}
              </button>
              <button className="buy-direct" disabled={adding || soldOut} onClick={() => add(true)}>Buy now</button>
              {addError && <p className="inline-error" role="alert">{addError}</p>}
              <div className="purchase-assurance"><span>✓ {o.returnsDays}-day returns</span><span>✓ Secure checkout</span><span>✓ Brand warranty</span></div>
            </>
          )}
          <div className="product-accordions">
            <details open><summary>Product details</summary><p>{product.description}</p></details>
            <details><summary>Specifications</summary><p>Brand: {product.brand} · Type: {product.subcategory}{product.stats.map((s) => ` · ${s.label}: ${s.value}`).join('')}</p></details>
            <details><summary>Delivery & returns</summary><p>{o ? `Delivered ${o.deliveryLabel.toLowerCase()} by Neutags. Return within ${o.returnsDays} days of delivery; pickup is free.` : 'Shown once the price loads.'}</p></details>
          </div>
        </section>
      </main>
    </div>
  )
}

function CartPage({ cart, onBack, onQuantity, onRetry, onOpen }: { cart: Load<CartQuote>; onBack: () => void; onQuantity: (offerId: string, quantity: number) => Promise<void>; onRetry: () => void; onOpen: (productId: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [checkoutNote, setCheckoutNote] = useState(false)
  const q = cart.status === 'ready' ? cart.data : null
  const items = q?.items ?? []
  const change = async (offerId: string, quantity: number) => {
    setError('')
    setBusy(offerId)
    try { await onQuantity(offerId, quantity) } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  return (
    <div className="cart-page">
      <header className="commerce-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Continue shopping</button>
        <span className="wordmark">NEUTAGS<span>.</span></span>
        <span className="secure-label">Secure checkout</span>
      </header>
      <main className="cart-main">
        <div className="cart-items">
          <p className="kicker">Your selection</p>
          <h1>Shopping bag <sup>{items.reduce((sum, item) => sum + item.quantity, 0)}</sup></h1>
          {cart.status === 'loading' && <StatusBlock title="Loading your bag…" />}
          {cart.status === 'error' && <StatusBlock title="Your bag didn't load." message={cart.message} onRetry={onRetry} />}
          {error && <p className="inline-error" role="alert">{error}</p>}
          {q && !items.length && <div className="empty-cart"><Icon name="cart" /><h2>Your bag is empty.</h2><button onClick={onBack}>Explore products</button></div>}
          {items.map((item) => (
            <article className="cart-item" key={item.offerId}>
              <button className="cart-item-image" onClick={() => onOpen(item.productId)} aria-label={`Open ${item.productName}`}><ProductImage src={item.imageUrl ?? ''} alt={item.productName} /></button>
              <div className="cart-item-info">
                <small>Sold by Neutags{!item.available && ' · Now out of stock'}</small>
                <h2>{item.productName}</h2>
                <p>{inr(item.unitPrice)} each</p>
                <button disabled={busy === item.offerId} onClick={() => change(item.offerId, 0)}>Remove</button>
              </div>
              <div className="quantity-control" aria-label={`Quantity for ${item.productName}`}>
                <button disabled={busy === item.offerId} onClick={() => change(item.offerId, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                <span>{item.quantity}</span>
                <button disabled={busy === item.offerId || item.quantity >= 10} onClick={() => change(item.offerId, item.quantity + 1)} aria-label="Increase quantity">+</button>
              </div>
              <strong className="cart-line-price">{inr(item.lineTotal)}</strong>
            </article>
          ))}
        </div>
        <aside className="order-summary">
          <p className="kicker">Order summary</p>
          <div><span>Subtotal</span><strong>{inr(q?.subtotal ?? 0)}</strong></div>
          <div><span>Delivery</span><strong>{q?.delivery ? inr(q.delivery) : 'Free'}</strong></div>
          <div><span>GST</span><strong>Included</strong></div>
          <div className="summary-total"><span>Total</span><strong>{inr(q?.total ?? 0)}</strong></div>
          <button disabled={!items.length} onClick={() => setCheckoutNote(true)}>Buy now <Icon name="arrow" /></button>
          {checkoutNote && <p role="status">Payment isn't connected in this preview yet, so nothing was charged.</p>}
          <p>Prices re-checked just now · Bank offers apply at payment</p>
        </aside>
      </main>
    </div>
  )
}

const DEFAULT_FILTERS: Filters = { query: '', category: 'All' }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [products, setProducts] = useState<Load<Product[]>>({ status: 'loading' })
  const [cart, setCart] = useState<Load<CartQuote>>({ status: 'loading' })
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('neutags-saved') || '[]') as string[] } catch { return [] }
  })

  const loadProducts = useCallback(() => {
    setProducts({ status: 'loading' })
    fetchProducts().then((data) => setProducts({ status: 'ready', data }), (e: Error) => setProducts({ status: 'error', message: e.message }))
  }, [])
  const loadCart = useCallback(() => fetchCart().then((data) => setCart({ status: 'ready', data }), (e: Error) => setCart({ status: 'error', message: e.message })), [])
  useEffect(() => { loadProducts(); loadCart() }, [loadProducts, loadCart])
  useEffect(() => { try { localStorage.setItem('neutags-saved', JSON.stringify(saved)) } catch { /* storage can be unavailable */ } }, [saved])

  const byId = useMemo(() => new Map(products.status === 'ready' ? products.data.map((p) => [p.id, p]) : []), [products])
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0 }) }
  const toggleSaved = (id: string) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])

  const setQuantity = async (offerId: string, quantity: number) => {
    await setCartItem(offerId, quantity)
    await loadCart()
  }
  const addToCart = async (productId: string, qty = 1) => {
    const offerId = ownOfferId(productId)
    const current = cart.status === 'ready' ? cart.data.items.find((i) => i.offerId === offerId)?.quantity ?? 0 : 0
    await setQuantity(offerId, Math.min(10, current + qty))
  }
  const cartItems = cart.status === 'ready' ? cart.data.items : []
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const selected = view.name === 'product' || view.name === 'store' ? byId.get(view.id) : undefined
  // Path the assistant uses to understand "this product".
  const path = selected ? `/product/${selected.id}` : view.name === 'cart' ? '/cart' : '/'

  let page
  if (view.name === 'cart') {
    page = <CartPage cart={cart} onBack={() => go({ name: 'home' })} onQuantity={setQuantity} onRetry={loadCart} onOpen={(id) => go({ name: 'product', id })} />
  } else if (view.name === 'store' && selected) {
    const inCart = cartItems.some((item) => item.offerId === ownOfferId(selected.id))
    page = <StoreProductPage product={selected} cartCount={cartCount} inCart={inCart} onBack={() => go({ name: 'product', id: selected.id })} onAdd={() => addToCart(selected.id)} onCart={() => go({ name: 'cart' })} />
  } else if (view.name === 'product' && selected) {
    page = <ProductPage key={selected.id} product={selected} focusCompare={view.compare} onBack={() => go({ name: 'home' })} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onBuy={() => go({ name: 'store', id: selected.id })} />
  } else {
    page = <Home products={products} onSelect={(p) => go({ name: 'product', id: p.id })} saved={saved} onSave={toggleSaved} filters={filters} setFilters={setFilters} cartCount={cartCount} onCart={() => go({ name: 'cart' })} onRetry={loadProducts} />
  }

  return (
    <>
      {page}
      <ShoppingAssistant
        path={path}
        onOpenProduct={(id, compare) => go({ name: 'product', id, compare })}
        onNavigate={(where) => go({ name: where })}
        onSearch={(f) => {
          const category = f.category ? f.category.charAt(0).toUpperCase() + f.category.slice(1) : 'All'
          setFilters({ query: f.query ?? '', category, minPrice: f.min_price, maxPrice: f.max_price })
          setView({ name: 'home' })
          window.setTimeout(() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }), 50)
        }}
        onAddToCart={addToCart}
      />
    </>
  )
}
