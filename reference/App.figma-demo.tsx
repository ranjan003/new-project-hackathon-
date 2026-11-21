import { useEffect, useMemo, useState } from 'react'
import headphones from './assets/aurelia-headphones.png'

type Product = {
  id: string
  name: string
  category: string
  price: number
  eyebrow: string
  image: string
  color: string
  tall?: boolean
}

const productGalleries: Record<string, string[]> = {
  aurelia: [
    headphones,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1600&q=88',
  ],
  atelier: [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1600&q=88',
  ],
  orbit: [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1600&q=88',
  ],
  form: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1600&q=88',
  ],
  mono: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1600&q=88',
    'https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&w=1600&q=88',
  ],
}

const products: Product[] = [
  {
    id: 'aurelia',
    name: 'Aurelia One',
    category: 'Audio',
    price: 279,
    eyebrow: 'Spatial over-ear headphones',
    image: headphones,
    color: '#d9a15e',
    tall: true,
  },
  {
    id: 'orbit',
    name: 'Orbit Lamp',
    category: 'Home',
    price: 145,
    eyebrow: 'Mouth-blown glass',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85',
    color: '#b8c2ac',
  },
  {
    id: 'atelier',
    name: 'Atelier Carry',
    category: 'Style',
    price: 188,
    eyebrow: 'Soft-grain leather',
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85',
    color: '#d8c4b3',
  },
  {
    id: 'form',
    name: 'Form 02',
    category: 'Style',
    price: 119,
    eyebrow: 'Everyday trainer',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85',
    color: '#e75c3a',
    tall: true,
  },
  {
    id: 'mono',
    name: 'Mono Field',
    category: 'Tech',
    price: 249,
    eyebrow: 'Automatic timepiece',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
    color: '#c9c7bd',
  },
]

const productDetails: Record<string, {
  headline: string
  description: string
  stats: [string, string][]
  features: [string, string][]
  accent: [string, string]
  materials: [string, string][]
}> = {
  aurelia: {
    headline: 'Quiet, shaped beautifully.',
    description: 'Engineered for all-day listening with adaptive noise control, natural spatial audio and a soft-touch finish.',
    stats: [['38H', 'Battery'], ['254G', 'Weight']],
    features: [['Silence, on demand.', 'Adaptive noise control reads your surroundings and adjusts in real time.'], ['Spatial by nature.', 'A dimensional listening field moves naturally with you.']],
    accent: ['38', 'hours'],
    materials: [['Finish', 'Warm ivory'], ['Touch', 'Soft matte'], ['Weight', '254 grams']],
  },
  atelier: {
    headline: 'Carry, with quiet confidence.',
    description: 'A softly structured everyday bag with considered organization, durable hardware and leather that grows richer with use.',
    stats: [['18L', 'Capacity'], ['1.1KG', 'Weight']],
    features: [['A place for everything.', 'A padded laptop sleeve and three interior pockets keep daily essentials composed.'], ['Made to age well.', 'Full-grain leather develops a unique patina rather than wearing out.']],
    accent: ['18', 'litres'],
    materials: [['Leather', 'Full grain'], ['Lining', 'Organic cotton'], ['Hardware', 'Brushed brass']],
  },
  orbit: {
    headline: 'Light, drawn in space.',
    description: 'A mouth-blown glass lamp with a warm, dimmable glow that brings softness and atmosphere to any room.',
    stats: [['2700K', 'Warm light'], ['12W', 'Power']],
    features: [['Glow without glare.', 'A frosted inner diffuser creates even, comfortable light.'], ['Set the mood.', 'Continuous dimming moves smoothly from a soft accent to focused light.']],
    accent: ['25K', 'hours'],
    materials: [['Shade', 'Blown glass'], ['Base', 'Brushed steel'], ['Cable', 'Woven textile']],
  },
  form: {
    headline: 'Movement, made effortless.',
    description: 'A lightweight everyday trainer with responsive cushioning, breathable construction and confident street-ready grip.',
    stats: [['286G', 'Weight'], ['8MM', 'Drop']],
    features: [['Soft where it matters.', 'Dual-density foam balances a cushioned landing with a stable toe-off.'], ['Breathe easy.', 'Engineered mesh keeps air moving through long days on your feet.']],
    accent: ['42', 'sizes'],
    materials: [['Upper', 'Recycled mesh'], ['Midsole', 'Dual foam'], ['Outsole', 'Natural rubber']],
  },
  mono: {
    headline: 'Time, reduced to essentials.',
    description: 'An automatic field watch with a crisp dial, dependable movement and proportions designed for everyday wear.',
    stats: [['40H', 'Reserve'], ['50M', 'Water resistant']],
    features: [['Powered by motion.', 'A self-winding mechanical movement keeps time without a battery.'], ['Clear at a glance.', 'High-contrast markers and lume stay legible from day into night.']],
    accent: ['24', 'jewels'],
    materials: [['Case', '316L steel'], ['Crystal', 'Sapphire'], ['Strap', 'Italian leather']],
  },
}

const shops = [
  { name: 'Amazon', mark: 'a', price: 259, rating: 4.7, reviews: '2.8k', delivery: 'Tomorrow', tone: '#ff9900', perk: 'Fastest delivery', policy: 'Free next-day delivery with live order tracking.' },
  { name: 'Best Buy', mark: 'BB', price: 269, rating: 4.6, reviews: '914', delivery: '2 days', tone: '#1452cc', perk: 'Expert support', policy: 'In-store setup advice and dedicated technical support.' },
  { name: 'Walmart', mark: '✦', price: 274, rating: 4.5, reviews: '1.2k', delivery: '3 days', tone: '#0879bf', perk: 'Easy pickup', policy: 'Collect locally or return at thousands of nearby stores.' },
  { name: 'Target', mark: '◎', price: 279, rating: 4.8, reviews: '687', delivery: '2 days', tone: '#cc0000', perk: 'Longest returns', policy: 'Extended 90-day return window for extra flexibility.' },
  { name: 'Newegg', mark: 'N', price: 289, rating: 4.4, reviews: '426', delivery: '4 days', tone: '#e96b19', perk: 'Warranty options', policy: 'Flexible protection plans and specialist product support.' },
]

type Shop = (typeof shops)[number]
type CartItem = { product: Product; shop: Shop; quantity: number }

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

function ProductImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
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

function Header({
  onHome,
  onSearch,
  searchOpen,
  saved,
}: {
  onHome: () => void
  onSearch: () => void
  searchOpen: boolean
  saved: number
}) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onHome} aria-label="Mercato home">MERCATO<span>.</span></button>
      <nav aria-label="Primary navigation">
        <button onClick={onHome}>Discover</button>
        <button onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>Collections</button>
        <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
      </nav>
      <div className="header-actions">
        <button className="icon-button" onClick={onSearch} aria-label="Search products" aria-pressed={searchOpen}><Icon name="search" /></button>
        <button className="saved-button" aria-label={`${saved} saved products`}><Icon name="heart" /><span>{saved}</span></button>
      </div>
    </header>
  )
}

function ProductShowcase({
  product,
  position,
  saved,
  onSave,
  onSelect,
}: {
  product: Product
  position: number
  saved: boolean
  onSave: () => void
  onSelect: () => void
}) {
  const gallery = productGalleries[product.id] || [product.image]
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (gallery.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setFrame((index) => (index + 1) % gallery.length), 3900 + position * 180)
    return () => window.clearInterval(timer)
  }, [gallery.length, position])

  const move = (direction: number) => setFrame((index) => (index + direction + gallery.length) % gallery.length)

  return (
    <article className={`showcase ${position % 2 ? 'showcase-reverse' : ''}`} style={{ '--showcase-color': product.color } as React.CSSProperties}>
      <div className="showcase-visual">
        <div className="showcase-frame" key={`${product.id}-${frame}`}>
          <ProductImage src={gallery[frame]} alt={`${product.name}, view ${frame + 1}`} />
        </div>
        <span className="showcase-count">{String(frame + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
        <button className={`carousel-heart ${saved ? 'active' : ''}`} onClick={onSave} aria-label={`${saved ? 'Remove' : 'Save'} ${product.name}`} aria-pressed={saved}><Icon name="heart" /></button>
        <div className="showcase-arrows">
          <button onClick={() => move(-1)} aria-label={`Previous ${product.name} image`}><Icon name="back" /></button>
          <button onClick={() => move(1)} aria-label={`Next ${product.name} image`}><Icon name="arrow" /></button>
        </div>
        <div className="showcase-dots" aria-label={`${product.name} image selection`}>
          {gallery.map((image, index) => (
            <button key={image} className={frame === index ? 'active' : ''} onClick={() => setFrame(index)} aria-label={`Show image ${index + 1}`} aria-current={frame === index ? 'true' : undefined} />
          ))}
        </div>
      </div>
      <div className="showcase-copy">
        <p className="kicker">{String(position + 1).padStart(2, '0')} / {product.category}</p>
        <div>
          <span>{product.eyebrow}</span>
          <h3>{product.name}</h3>
          <p>Four considered views. One clear comparison across the stores you already trust.</p>
        </div>
        <div className="showcase-action">
          <strong>from ${product.price}</strong>
          <button onClick={onSelect}>View comparison <Icon name="arrow" /></button>
        </div>
      </div>
    </article>
  )
}

function Home({
  onSelect,
  saved,
  onSave,
}: {
  onSelect: (product: Product) => void
  saved: string[]
  onSave: (id: string) => void
}) {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const categories = ['All', 'Audio', 'Home', 'Style', 'Tech']
  const productOrder = ['aurelia', 'atelier', 'orbit', 'form', 'mono']
  const shown = useMemo(
    () => products
      .filter((p) => (category === 'All' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => productOrder.indexOf(a.id) - productOrder.indexOf(b.id)),
    [category, query],
  )

  return (
    <div>
      <Header onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onSearch={() => setSearchOpen(!searchOpen)} searchOpen={searchOpen} saved={saved.length} />
      {searchOpen && (
        <div className="search-row">
          <label htmlFor="product-search">Search the collection</label>
          <input id="product-search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Aurelia”" />
        </div>
      )}
      <main>
        <section className="hero">
          <p className="kicker">One search. Every good choice.</p>
          <h1>Objects worth<br /><em>considering.</em></h1>
          <p className="hero-copy">We compare the places you shop, so you can spend less time searching—and more time choosing well.</p>
          <button className="round-link" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Explore collection"><Icon name="arrow" /></button>
          <span className="edition">EDIT / 001<br />SPRING 2026</span>
        </section>

        <section className="collection" id="collection">
          <div className="section-top">
            <div>
              <p className="kicker">The considered edit</p>
              <h2>Shop less.<br />Choose better.</h2>
            </div>
            <div className="filters" role="tablist" aria-label="Product categories">
              {categories.map((item) => (
                <button key={item} role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
          </div>
          <div className="showcase-stack">
            {shown.map((product, index) => (
              <ProductShowcase
                key={product.id}
                product={product}
                position={index}
                saved={saved.includes(product.id)}
                onSave={() => onSave(product.id)}
                onSelect={() => onSelect(product)}
              />
            ))}
          </div>
          {!shown.length && <p className="empty-state">No objects found. Try another search.</p>}
        </section>

        <section className="manifesto" id="about">
          <p>Price is only part of the story.</p>
          <h2>We read the reviews, check the delivery, and compare the total—so “best” actually means best <em>for you.</em></h2>
          <span>Independent comparison. Clear choices.</span>
        </section>
      </main>
      <footer><span>MERCATO.</span><p>Good things, found well.</p><small>© 2026</small></footer>
    </div>
  )
}

function ProductPage({
  product,
  onBack,
  saved,
  onSave,
  onStoreSelect,
}: {
  product: Product
  onBack: () => void
  saved: boolean
  onSave: () => void
  onStoreSelect: (shop: Shop) => void
}) {
  const [sort, setSort] = useState<'recommended' | 'price' | 'rating'>('recommended')
  const [heroFrame, setHeroFrame] = useState(0)
  const gallery = productGalleries[product.id] || [product.image]
  useEffect(() => {
    if (gallery.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setHeroFrame((frame) => (frame + 1) % gallery.length), 4600)
    return () => window.clearInterval(timer)
  }, [gallery.length])
  const details = productDetails[product.id]
  const pricedShops = shops.map((shop) => ({ ...shop, price: product.price + shop.price - 279 }))
  const sorted = [...pricedShops].sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'rating' ? b.rating - a.rating : (b.rating / b.price) - (a.rating / a.price))

  return (
    <div className="product-page">
      <header className="detail-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Back to edit</button>
        <button className="wordmark" onClick={onBack}>MERCATO<span>.</span></button>
        <button className={`icon-button ${saved ? 'active' : ''}`} onClick={onSave} aria-label={`${saved ? 'Remove' : 'Save'} ${product.name}`} aria-pressed={saved}><Icon name="heart" /></button>
      </header>

      <main>
        <section className="product-visual" style={{ '--product-color': product.color } as React.CSSProperties}>
          <div className="detail-title">
            <p>{product.category} / 001</p>
            <h1>{product.name}</h1>
            <span>{product.eyebrow}</span>
          </div>
          <div className="detail-image" key={`${product.id}-${heroFrame}`}>
            <ProductImage src={gallery[heroFrame]} alt={`${product.name}, view ${heroFrame + 1}`} />
          </div>
          <div className="hero-spec hero-spec-one"><strong>{details.stats[0][0]}</strong><span>{details.stats[0][1]}</span></div>
          <div className="hero-spec hero-spec-two"><strong>{details.stats[1][0]}</strong><span>{details.stats[1][1]}</span></div>
          <div className="sound-mark" aria-hidden="true">{[18, 34, 48, 28, 56, 38, 22, 44, 31].map((height, index) => <i key={index} style={{ height }} />)}</div>
          <p className="scroll-note">Scroll to compare <span>↓</span></p>
        </section>

        <section className="product-story">
          <div className="story-intro">
            <p className="kicker">The object / In detail</p>
            <h2>{details.headline}</h2>
            <p>{details.description}</p>
          </div>
          <div className="feature-grid">
            <div className="feature-image feature-reveal">
              <ProductImage src={gallery[(heroFrame + 1) % gallery.length]} alt={`${product.name} detail`} />
              <span>Designed around you</span>
            </div>
            <div className="feature-card feature-dark feature-reveal">
              <span className="feature-index">01</span>
              <div className="mini-wave" aria-hidden="true">{[12, 26, 43, 22, 52, 31, 15, 37, 20].map((height, index) => <i key={index} style={{ height }} />)}</div>
              <h3>{details.features[0][0]}</h3>
              <p>{details.features[0][1]}</p>
            </div>
            <div className="feature-card feature-light feature-reveal">
              <span className="feature-index">02</span>
              <div className="orbit-graphic" aria-hidden="true"><i /><i /><span /></div>
              <h3>{details.features[1][0]}</h3>
              <p>{details.features[1][1]}</p>
            </div>
            <div className="feature-card feature-accent feature-reveal">
              <span className="feature-index">03</span>
              <strong>{details.accent[0]}</strong><small>{details.accent[1]}</small>
              <h3>Made for every day.</h3>
              <p>Thoughtful performance that keeps pace with the way you live.</p>
            </div>
            <div className="material-card feature-reveal">
              <p className="kicker">Material study</p>
              <div className="swatches"><i /><i /><i /></div>
              {details.materials.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
        </section>

        <section className="compare-section">
          <div className="comparison-ticker" aria-hidden="true"><span>COMPARE CLEARLY • CHOOSE CONFIDENTLY • </span><span>COMPARE CLEARLY • CHOOSE CONFIDENTLY • </span></div>
          <div className="compare-heading">
            <div><p className="kicker">Live comparison</p><h2>Five places.<br />Compare your way.</h2></div>
            <label>Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="rating">Highest rating</option>
              </select>
            </label>
          </div>
          <div className="equal-offers" aria-label={`Store comparison for ${product.name}`}>
            <div className="equal-offers-head">
              <span>Retailer</span><span>What makes it different</span><span>Rating</span><span>Delivery</span><span>Total</span><span />
            </div>
            {sorted.map((shop, index) => (
              <article className="equal-offer" key={shop.name}>
                <div className="equal-store">
                  <span className="equal-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="equal-thumb"><ProductImage src={product.image} alt="" /></div>
                  <span className="equal-mark" style={{ color: shop.tone }}>{shop.mark}</span>
                  <div><h3>{shop.name}</h3><small>Authorized retailer</small></div>
                </div>
                <div className="retailer-feature"><Icon name="check" /><div><strong>{shop.perk}</strong><span>{shop.policy}</span></div></div>
                <div className="equal-rating"><strong>★ {shop.rating}</strong><span>{shop.reviews} reviews</span></div>
                <div className="equal-delivery"><strong>{shop.delivery}</strong><span>Tracked</span></div>
                <div className="equal-price"><strong>${shop.price}</strong><span>Taxes at checkout</span></div>
                <button onClick={() => onStoreSelect(shop)} aria-label={`View ${product.name} at ${shop.name}`}><Icon name="arrow" /></button>
              </article>
            ))}
          </div>
          <p className="price-note">Prices shown for comparison purposes. Last checked today. Retailer prices and availability may change.</p>
        </section>
      </main>
      <footer><span>MERCATO.</span><p>Compare clearly. Choose confidently.</p><small>© 2026</small></footer>
    </div>
  )
}

function StoreProductPage({
  product,
  shop,
  cartCount,
  inCart,
  onBack,
  onAdd,
  onCart,
}: {
  product: Product
  shop: Shop
  cartCount: number
  inCart: boolean
  onBack: () => void
  onAdd: () => void
  onCart: () => void
}) {
  const [image, setImage] = useState(0)
  const gallery = productGalleries[product.id] || [product.image]
  const details = productDetails[product.id]
  return (
    <div className="store-page">
      <header className="commerce-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Comparison</button>
        <span className="wordmark">MERCATO<span>.</span></span>
        <button className="cart-button" onClick={onCart}><Icon name="cart" /> Cart <b>{cartCount}</b></button>
      </header>
      <main className="store-product">
        <div className="store-gallery">
          <div className="store-main-image" key={image}><ProductImage src={gallery[image]} alt={`${product.name}, product view ${image + 1}`} /></div>
          <div className="store-thumbs">
            {gallery.map((src, index) => <button key={src} className={image === index ? 'active' : ''} onClick={() => setImage(index)} aria-label={`Show view ${index + 1}`}><ProductImage src={src} alt="" /></button>)}
          </div>
        </div>
        <section className="purchase-panel">
          <div className="retailer-chip"><span style={{ color: shop.tone }}>{shop.mark}</span> Sold by {shop.name}</div>
          <p className="kicker">{product.category} / In stock</p>
          <h1>{product.name}</h1>
          <p className="purchase-subtitle">{product.eyebrow}</p>
          <div className="purchase-rating"><span>★ {shop.rating}</span> <u>{shop.reviews} verified reviews</u></div>
          <div className="purchase-price"><strong>${shop.price}</strong><p>or 4 payments of ${(shop.price / 4).toFixed(2)}<br />with no interest</p></div>
          <div className="choice-row"><span>Color</span><strong>Signature neutral</strong></div>
          <div className="purchase-swatches"><button aria-label="Ivory" className="active" /><button aria-label="Black" /><button aria-label="Clay" /></div>
          <div className="delivery-box"><Icon name="check" /><div><strong>Free delivery · {shop.delivery}</strong><span>Order within 5 hours for this estimate</span></div></div>
          <div className="retailer-benefit">
            <span style={{ color: shop.tone }}>{shop.mark}</span>
            <div><small>Why choose {shop.name}</small><strong>{shop.perk}</strong><p>{shop.policy}</p></div>
          </div>
          <button className={`add-button ${inCart ? 'added' : ''}`} onClick={inCart ? onCart : onAdd}>{inCart ? <><Icon name="check" /> Added — view cart</> : <>Add to cart <span>${shop.price}</span></>}</button>
          <button className="buy-direct" onClick={() => { if (!inCart) onAdd(); onCart() }}>Buy now</button>
          <div className="purchase-assurance"><span>✓ 30-day returns</span><span>✓ Secure checkout</span><span>✓ Full warranty</span></div>
          <div className="product-accordions">
            <details open><summary>Product details</summary><p>{details.description}</p></details>
            <details><summary>Specifications</summary><p>{details.stats.map(([value, label]) => `${label}: ${value}`).join(' · ')}. {details.materials.map(([label, value]) => `${label}: ${value}`).join(' · ')}.</p></details>
            <details><summary>Delivery & returns</summary><p>Tracked delivery from {shop.name}. Return unused items in their original packaging within 30 days.</p></details>
          </div>
        </section>
      </main>
    </div>
  )
}

function CartPage({
  items,
  onBack,
  onQuantity,
  onRemove,
}: {
  items: CartItem[]
  onBack: () => void
  onQuantity: (productId: string, shopName: string, quantity: number) => void
  onRemove: (productId: string, shopName: string) => void
}) {
  const subtotal = items.reduce((total, item) => total + item.shop.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.0825 * 100) / 100
  const total = subtotal + tax
  return (
    <div className="cart-page">
      <header className="commerce-header">
        <button className="back-button" onClick={onBack}><Icon name="back" /> Continue shopping</button>
        <span className="wordmark">MERCATO<span>.</span></span>
        <span className="secure-label">Secure checkout</span>
      </header>
      <main className="cart-main">
        <div className="cart-items">
          <p className="kicker">Your selection</p>
          <h1>Shopping bag <sup>{items.reduce((sum, item) => sum + item.quantity, 0)}</sup></h1>
          {!items.length && <div className="empty-cart"><Icon name="cart" /><h2>Your bag is empty.</h2><button onClick={onBack}>Explore products</button></div>}
          {items.map((item) => (
            <article className="cart-item" key={`${item.product.id}-${item.shop.name}`}>
              <div className="cart-item-image"><ProductImage src={item.product.image} alt={item.product.name} /></div>
              <div className="cart-item-info">
                <small>{item.product.category} · Sold by {item.shop.name}</small>
                <h2>{item.product.name}</h2>
                <p>{item.product.eyebrow}</p>
                <button onClick={() => onRemove(item.product.id, item.shop.name)}>Remove</button>
              </div>
              <div className="quantity-control" aria-label={`Quantity for ${item.product.name}`}>
                <button onClick={() => onQuantity(item.product.id, item.shop.name, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                <span>{item.quantity}</span>
                <button onClick={() => onQuantity(item.product.id, item.shop.name, item.quantity + 1)} aria-label="Increase quantity">+</button>
              </div>
              <strong className="cart-line-price">${item.shop.price * item.quantity}</strong>
            </article>
          ))}
        </div>
        <aside className="order-summary">
          <p className="kicker">Order summary</p>
          <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
          <div><span>Delivery</span><strong>Free</strong></div>
          <div><span>Estimated tax</span><strong>${tax.toFixed(2)}</strong></div>
          <div className="summary-total"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
          <button disabled={!items.length} onClick={() => window.alert('Checkout is ready for payment integration. This preview has not charged you.')}>Buy now <Icon name="arrow" /></button>
          <p>Secure checkout · 30-day returns · Prices include retailer selection</p>
        </aside>
      </main>
    </div>
  )
}

function ShoppingAssistant({ onRecommend }: { onRecommend: (product: Product) => void }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ from: 'assistant' | 'user'; text: string; product?: Product }[]>([
    { from: 'assistant', text: 'Tell me what you need, your budget, or where you’ll use it. I’ll narrow down this collection.' },
  ])

  const ask = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    const lower = clean.toLowerCase()
    const budget = Number(lower.match(/\$?\s?(\d{2,4})/)?.[1] || 0)
    let matches = products.filter((product) => !budget || product.price <= budget)
    if (/head|audio|music|noise/.test(lower)) matches = matches.filter((product) => product.id === 'aurelia')
    else if (/bag|carry|laptop|travel/.test(lower)) matches = matches.filter((product) => product.id === 'atelier')
    else if (/lamp|light|home|desk/.test(lower)) matches = matches.filter((product) => product.id === 'orbit')
    else if (/shoe|trainer|walk|run/.test(lower)) matches = matches.filter((product) => product.id === 'form')
    else if (/watch|time|tech/.test(lower)) matches = matches.filter((product) => product.id === 'mono')
    const choice = matches[0]
    const answer = choice
      ? `${choice.name} is my strongest match${budget ? ` under $${budget}` : ''}. It starts at $${choice.price} and suits ${choice.eyebrow.toLowerCase()}.`
      : `I couldn’t find a match${budget ? ` under $${budget}` : ''}. Try a larger budget or tell me whether you need audio, a bag, lighting, shoes, or a watch.`
    setMessages((current) => [...current, { from: 'user', text: clean }, { from: 'assistant', text: answer, product: choice }])
    setInput('')
  }

  return (
    <>
      <button className={`assistant-launcher ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close shopping assistant' : 'Open shopping assistant'} aria-expanded={open}><Icon name={open ? 'close' : 'chat'} /></button>
      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Mercato shopping assistant">
          <header><div><span className="assistant-orb" /><p><strong>Mercato guide</strong><small>Catalog assistant · online</small></p></div><button onClick={() => setOpen(false)} aria-label="Close"><Icon name="close" /></button></header>
          <div className="assistant-messages">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.from}`} key={index}>
                <p>{message.text}</p>
                {message.product && <button onClick={() => { onRecommend(message.product!); setOpen(false) }}>View {message.product.name} <Icon name="arrow" /></button>}
              </div>
            ))}
          </div>
          <div className="assistant-prompts">
            {['Best under $200', 'A bag for work', 'Noise cancelling'].map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask(input) }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe what you need…" aria-label="Ask the shopping assistant" />
            <button aria-label="Send"><Icon name="arrow" /></button>
          </form>
          <small className="assistant-note">Uses this demo catalog, not a live external AI service.</small>
        </section>
      )}
    </>
  )
}

export default function App() {
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('mercato-cart') || '[]') as CartItem[] } catch { return [] }
  })
  useEffect(() => {
    try { localStorage.setItem('mercato-cart', JSON.stringify(cart)) } catch { /* local storage can be unavailable */ }
  }, [cart])
  const toggleSaved = (id: string) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const selectProduct = (product: Product) => {
    setSelected(product)
    setSelectedShop(null)
    setShowCart(false)
    window.scrollTo({ top: 0 })
  }
  const back = () => {
    setSelected(null)
    setSelectedShop(null)
    window.scrollTo({ top: 0 })
  }
  const addToCart = (product: Product, shop: Shop) => setCart((items) => {
    if (items.some((item) => item.product.id === product.id && item.shop.name === shop.name)) return items
    return [...items, { product, shop, quantity: 1 }]
  })
  const quantity = (productId: string, shopName: string, next: number) => setCart((items) =>
    next < 1 ? items.filter((item) => item.product.id !== productId || item.shop.name !== shopName) : items.map((item) => item.product.id === productId && item.shop.name === shopName ? { ...item, quantity: next } : item),
  )
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  let page
  if (showCart) {
    page = <CartPage items={cart} onBack={() => setShowCart(false)} onQuantity={quantity} onRemove={(productId, shopName) => setCart((items) => items.filter((item) => item.product.id !== productId || item.shop.name !== shopName))} />
  } else if (selected && selectedShop) {
    const inCart = cart.some((item) => item.product.id === selected.id && item.shop.name === selectedShop.name)
    page = <StoreProductPage product={selected} shop={selectedShop} cartCount={cartCount} inCart={inCart} onBack={() => { setSelectedShop(null); window.scrollTo({ top: 0 }) }} onAdd={() => addToCart(selected, selectedShop)} onCart={() => setShowCart(true)} />
  } else if (selected) {
    page = <ProductPage product={selected} onBack={back} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onStoreSelect={(shop) => { setSelectedShop(shop); window.scrollTo({ top: 0 }) }} />
  } else {
    page = <Home onSelect={selectProduct} saved={saved} onSave={toggleSaved} />
  }
  return <>{page}<ShoppingAssistant onRecommend={selectProduct} /></>
}
