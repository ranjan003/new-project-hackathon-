// Newtags AI shopping assistant: Gemini runs in the Supabase Edge Function "assistant".
// Customers type or speak (browser Web Speech API). The assistant can only do safe customer
// actions: open a product, open the comparison, search, open the bag, add to bag. No checkout or payment.

import { useEffect, useRef, useState } from 'react'
import { askAssistant, inr, type AssistantAction, type AssistantProduct } from '../lib/api'
import RobotLauncher from './RobotLauncher'

const ROBOT_SRC = '/assistant/robot.png'

type Msg = {
  role: 'user' | 'assistant'
  text: string
  products?: AssistantProduct[]
  summary?: string
  quickReplies?: string[]
  note?: string
}

type SearchArgs = Extract<AssistantAction, { name: 'search' }>

type Props = {
  path: string
  onOpenProduct: (id: string, compare?: boolean) => void
  onNavigate: (where: 'home' | 'cart') => void
  onSearch: (f: SearchArgs) => void
  onAddToCart: (productId: string, qty: number) => Promise<void>
}

const GREETING: Msg = {
  role: 'assistant',
  text: 'Hi! Tell me what you need, even if you don\'t know the product name (like "something to straighten my hair"). You can also say "show my bag" or "shoes under 3000", or tap 🎤 to speak.',
  quickReplies: ['A gift under ₹2,000', 'Cheapest earbuds', 'Return policy'],
}

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
function getSpeechRec(): (new () => SpeechRec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const LANGS = [{ code: 'en-IN', label: 'EN' }, { code: 'hi-IN', label: 'हि' }] as const

export default function ShoppingAssistant({ path, onOpenProduct, onNavigate, onSearch, onAddToCart }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [lang, setLang] = useState<(typeof LANGS)[number]['code']>('en-IN')
  const endRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => setVoiceSupported(!!getSpeechRec()), [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, open])
  useEffect(() => () => { recRef.current?.stop(); window.speechSynthesis?.cancel() }, [])

  function speak(text: string) {
    if (!speakReplies || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    window.speechSynthesis.speak(u)
  }

  async function addToCart(id: string, name: string, qty: number): Promise<string> {
    try {
      await onAddToCart(id, qty)
      return `Added ${qty > 1 ? `${qty} × ` : ''}${name} to your bag`
    } catch (e) {
      return (e as Error).message
    }
  }

  // Runs an action the server already validated. Adding to the bag is the furthest it goes.
  async function runAction(a: AssistantAction, product: { id: string; name: string } | null): Promise<string | undefined> {
    switch (a.name) {
      case 'navigate':
        onNavigate(a.page)
        return a.page === 'cart' ? 'Opening your bag' : 'Going to the home page'
      case 'open_product':
        onOpenProduct(a.product_id)
        return `Opening ${product?.name ?? 'the product'}`
      case 'compare':
        onOpenProduct(a.product_id, true)
        return `Opening the price comparison for ${product?.name ?? 'the product'}`
      case 'search':
        onSearch(a)
        return `Showing results${a.query ? ` for "${a.query}"` : ''}${a.category ? ` in ${a.category}` : ''}${a.max_price != null ? ` under ${inr(a.max_price)}` : ''}`
      case 'add_to_cart':
        return addToCart(a.product_id, product?.name ?? 'item', a.qty)
    }
  }

  async function send(text: string) {
    const clean = text.trim()
    if (!clean || loading) return
    window.speechSynthesis?.cancel()
    const next = [...messagesRef.current, { role: 'user' as const, text: clean }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const data = await askAssistant(next.slice(1).map(({ role, text }) => ({ role, text })), path)
      const note = data.action ? await runAction(data.action, data.action_product) : undefined
      setMessages((m) => [...m, { role: 'assistant', text: data.message, summary: data.summary, products: data.products, quickReplies: data.quick_replies, note }])
      speak(data.message)
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    const Rec = getSpeechRec()
    if (!Rec) return
    const rec = new Rec()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1]
      const transcript = r[0].transcript
      setInput(transcript)
      if (r.isFinal) send(transcript)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setMessages((m) => [...m, { role: 'assistant', text: 'Please allow microphone access to talk to me.' }])
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const last = messages[messages.length - 1]

  return (
    <>
      {open && (
        <section className="assistant-panel assistant-panel-ai" role="dialog" aria-label="Newtags shopping assistant">
          <header>
            <div>
              <img src={ROBOT_SRC} alt="" className="assistant-avatar" />
              <p><strong>Newtags guide</strong><small>Type or talk: products, bag, returns</small></p>
            </div>
            <div className="assistant-tools">
              {voiceSupported && (
                <button onClick={() => setLang((l) => (l === 'en-IN' ? 'hi-IN' : 'en-IN'))} title="Voice language" aria-label="Switch voice language">
                  {LANGS.find((l) => l.code === lang)?.label}
                </button>
              )}
              <button onClick={() => { setSpeakReplies((v) => !v); window.speechSynthesis?.cancel() }} aria-pressed={speakReplies} aria-label={speakReplies ? 'Stop reading replies aloud' : 'Read replies aloud'}>
                {speakReplies ? '🔊' : '🔈'}
              </button>
              <button onClick={() => setMessages([GREETING])} aria-label="Start a new chat">New</button>
            </div>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className="assistant-turn">
                <div className={`assistant-message ${m.role}`}><p>{m.text}</p></div>
                {m.note && <p className="assistant-note-line">✓ {m.note}</p>}
                {m.summary && <p className="assistant-summary">{m.summary}</p>}
                {m.products?.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={() => onOpenProduct(p.id)} onCompare={() => onOpenProduct(p.id, true)} onAdd={() => addToCart(p.id, p.name, 1).then((note) => setMessages((ms) => [...ms, { role: 'assistant', text: note }]))} />
                ))}
              </div>
            ))}
            {loading && <div className="assistant-message assistant"><p>…</p></div>}
            {!loading && last.role === 'assistant' && !!last.quickReplies?.length && (
              <div className="assistant-prompts wrap">
                {last.quickReplies.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input) }}>
            {voiceSupported && (
              <button type="button" onClick={toggleMic} aria-label={listening ? 'Stop listening' : 'Speak'} className={listening ? 'mic listening' : 'mic'}>🎤</button>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder={listening ? 'Listening…' : 'Describe what you need…'} aria-label="Ask the shopping assistant" />
            <button disabled={loading || !input.trim()} aria-label="Send">→</button>
          </form>
          <small className="assistant-note">Answers only about Newtags products and policies. Never share card numbers, OTP or UPI PIN.</small>
        </section>
      )}

      <RobotLauncher open={open} onToggle={() => setOpen((o) => !o)} src={ROBOT_SRC} />
    </>
  )
}

function ProductCard({ p, onOpen, onCompare, onAdd }: { p: AssistantProduct; onOpen: () => void; onCompare: () => void; onAdd: () => void }) {
  const others = p.comparison ?? []
  const insight = p.insight
  const effective = insight?.effective_price ?? p.price
  const saving = insight?.saving_vs_others ?? 0
  const ourOffers = [p.ourOffers?.bankOffer, p.ourOffers?.coupon, p.ourOffers?.voucher].filter(Boolean)

  return (
    <div className="assistant-card">
      {insight && <p className="assistant-rank">#{insight.rank}{insight.badge ? ` · ${insight.badge}` : ''}</p>}
      <p className="assistant-card-name">{p.name}</p>
      <p className="assistant-card-meta">★ {p.rating} ({p.reviews.toLocaleString('en-IN')})</p>
      <p className="assistant-card-price"><strong>{inr(p.price)}</strong>{p.mrp > p.price && <s>{inr(p.mrp)}</s>}</p>
      {effective < p.price && <p className="assistant-good">{inr(effective)} after coupon</p>}
      {saving > 0 && <p className="assistant-good">{inr(saving)} cheaper than {insight?.lowest_other?.platform ?? 'other stores'}</p>}
      {ourOffers.length > 0 && <p className="assistant-offers">{ourOffers.join(' · ')}</p>}
      {others.length > 0 && (
        <div className="assistant-compare">
          <p>Compared with (not sold there by us)</p>
          {others.map((o) => (
            <div key={o.platform}>
              <span>{o.platform}</span>
              <span>{inr(o.price)}{o.rating ? ` · ★ ${o.rating}` : ''}{[o.bankOffer, o.coupon, o.voucher].filter(Boolean).length > 0 && <small>{[o.bankOffer, o.coupon, o.voucher].filter(Boolean).join(' · ')}</small>}</span>
            </div>
          ))}
        </div>
      )}
      <div className="assistant-card-actions">
        <button onClick={onOpen}>View</button>
        <button onClick={onCompare}>Compare</button>
        <button className="primary" onClick={onAdd}>Add to bag</button>
      </div>
    </div>
  )
}
