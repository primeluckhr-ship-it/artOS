/**
 * KnowledgeLibrary — ArtOS museum experience
 * Visual-first, immersive, premium art discovery platform
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

// ── Types ────────────────────────────────────────────────────────
interface Masterpiece {
  id: string; slug: string; title: string; artist: string
  artist_slug: string | null; year: string | null; medium: string | null
  dimensions: string | null; museum: string | null; museum_city: string | null
  movement_slug: string | null; image_url: string | null; description: string | null
  historical_context: string | null; tags: string[]; is_featured: boolean; view_count: number
}
interface Article {
  id: string; slug: string; title: string; category: string
  subcategory: string | null; tags: string[]; era: string | null
  image_url: string | null; content: any | null; view_count: number
}

// ── Movement hero images (curated category backgrounds) ──────────
const CAT_IMAGES: Record<string, string> = {
  movements:    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  artists:      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
  fundamentals: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1400&q=85',
  drawing:      'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=1400&q=85',
  painting:     'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1400&q=85',
  materials:    'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=1400&q=85',
  styles:       'https://images.unsplash.com/photo-1547826039-a0c20c946bd0?w=1400&q=85',
  museums:      'https://images.unsplash.com/photo-1565099824688-45e04a8b3827?w=1400&q=85',
}

const ERA_ORDER = ['Ancient','Medieval','Renaissance','Baroque & Rococo','Neoclassicism','Romanticism','19th Century','Early Modern','Modern','Contemporary']

type LibView = 'home' | 'gallery' | 'movement' | 'artwork' | 'timeline' | 'search' | 'category'

export default function KnowledgeLibrary({ profile }: { profile: Profile }) {
  const [view, setView]           = useState<LibView>('home')
  const [articles, setArticles]   = useState<Article[]>([])
  const [pieces, setPieces]       = useState<Masterpiece[]>([])
  const [selArticle, setSelArt]   = useState<Article | null>(null)
  const [selPiece, setSelPiece]   = useState<Masterpiece | null>(null)
  const [artContent, setArtCont]  = useState<any>(null)
  const [generating, setGen]      = useState(false)
  const [aiGuide, setAiGuide]     = useState<{q:string;a:string}[]>([])
  const [guideInput, setGuideIn]  = useState('')
  const [guideLoading, setGuideL] = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [searchRes, setSearchRes] = useState<{pieces:Masterpiece[];articles:Article[]} | null>(null)
  const [searching, setSearching] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [zoomed, setZoomed]       = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [aiGuide])

  async function loadAll() {
    const [{ data: arts }, { data: ps }] = await Promise.all([
      supabase.from('knowledge_articles').select('id,slug,title,category,subcategory,tags,era,image_url,content,view_count').order('category').order('title'),
      supabase.from('masterpieces').select('*').order('is_featured', { ascending: false }).order('view_count', { ascending: false }),
    ])
    setArticles(arts || [])
    setPieces(ps || [])
  }

  // ── Open movement article ────────────────────────────────────
  async function openMovement(a: Article) {
    setSelArt(a); setArtCont(a.content); setView('movement')
    supabase.from('knowledge_articles').update({ view_count: (a.view_count||0)+1 }).eq('id', a.id)
    if (!a.content) await generateArticle(a)
  }

  async function generateArticle(a: Article) {
    setGen(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 4000,
          messages: [{ role: 'user', content: buildArticlePrompt(a) }],
        }),
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text || ''
      const content = JSON.parse(text.replace(/```json|```/g, '').trim())
      await supabase.from('knowledge_articles').update({ content, generated_at: new Date().toISOString() }).eq('id', a.id)
      setArtCont(content)
      setArticles(prev => prev.map(x => x.id === a.id ? { ...x, content } : x))
    } catch(e) { console.error(e) }
    setGen(false)
  }

  // ── Open artwork detail ──────────────────────────────────────
  async function openPiece(p: Masterpiece) {
    setSelPiece(p); setAiGuide([]); setView('artwork')
    supabase.from('masterpieces').update({ view_count: p.view_count+1 }).eq('id', p.id)
  }

  // ── AI Art Guide ─────────────────────────────────────────────
  async function askArtGuide(preset?: string) {
    const q = preset || guideInput.trim()
    if (!q || !selPiece || guideLoading) return
    setGuideIn('')
    setAiGuide(prev => [...prev, { q, a: '' }])
    setGuideL(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 600,
          messages: [{ role: 'user', content: `You are an expert museum art guide with deep knowledge of art history. You are currently looking at: "${selPiece.title}" by ${selPiece.artist} (${selPiece.year || 'date unknown'}), ${selPiece.medium || ''}, housed at ${selPiece.museum || 'unknown museum'}.\n\nDescription: ${selPiece.description || ''}\n\nUser question: ${q}\n\nAnswer clearly, precisely, and with genuine depth. For "explain like I'm 10" be engaging and concrete. For technical questions be accurate and specific.` }],
        }),
      })
      const data = await res.json()
      const answer = data?.content?.[0]?.text || 'No response.'
      setAiGuide(prev => prev.map((e,i) => i === prev.length-1 ? { ...e, a: answer } : e))
    } catch { setAiGuide(prev => prev.map((e,i) => i === prev.length-1 ? { ...e, a: 'Connection error.' } : e)) }
    setGuideL(false)
  }

  // ── AI Search ─────────────────────────────────────────────────
  async function runSearch() {
    if (!searchQ.trim()) return
    setSearching(true); setView('search')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 400,
          messages: [{ role: 'user', content: `Extract 3-8 relevant search keywords from this art library query. Return ONLY a JSON array of strings, nothing else. Query: "${searchQ}"` }],
        }),
      })
      const data = await res.json()
      const keywords: string[] = JSON.parse(data?.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '[]')
      const q = keywords.join(' ').toLowerCase()
      const matchedPieces = pieces.filter(p => keywords.some(k => p.title.toLowerCase().includes(k) || p.artist.toLowerCase().includes(k) || (p.movement_slug||'').includes(k) || (p.tags||[]).some(t => t.includes(k))))
      const matchedArts   = articles.filter(a => keywords.some(k => a.title.toLowerCase().includes(k) || (a.tags||[]).some(t => t.includes(k)) || (a.subcategory||'').toLowerCase().includes(k)))
      setSearchRes({ pieces: matchedPieces, articles: matchedArts })
    } catch { setSearchRes({ pieces: [], articles: [] }) }
    setSearching(false)
  }

  // ── Helpers ──────────────────────────────────────────────────
  const movementPieces = (slug: string) => pieces.filter(p => p.movement_slug === slug)
  const catColor = (cat: string): string => ({
    fundamentals:'#1ECBE1', drawing:'#f9a8d4', painting:'#FF6B35', materials:'#4ade80',
    movements:'#FF9F1C', artists:'#a78bfa', styles:'#FFE135', museums:'#fb923c',
  }[cat] || '#fff')
  const movements = articles.filter(a => a.category === 'movements')
  const eraGroups: Record<string, Article[]> = {}
  for (const m of movements) {
    const e = m.subcategory || 'Other'
    if (!eraGroups[e]) eraGroups[e] = []
    eraGroups[e].push(m)
  }
  const featuredPieces = pieces.filter(p => p.is_featured)

  return (
    <div style={{ minHeight:'calc(100vh - 54px)', background:'#080610', color:'#fff', fontFamily:"'Inter',sans-serif", position:'relative', zIndex:1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,600&display=swap');
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .art-card:hover .art-card-img{transform:scale(1.06)}
        .art-card:hover .art-card-overlay{opacity:1}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
      `}</style>

      {/* ── TOP NAV ──────────────────────────────────────────────── */}
      <nav style={{ background:'rgba(8,6,16,0.95)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 24px', display:'flex', alignItems:'center', gap:0, height:46, position:'sticky', top:0, zIndex:50, backdropFilter:'blur(16px)' }}>
        {/* Back breadcrumb */}
        {view !== 'home' && (
          <button onClick={() => { setView('home'); setSelArt(null); setSelPiece(null); setSearchRes(null) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, padding:'0 16px 0 0', display:'flex', alignItems:'center', gap:5 }}>
            ← Library
          </button>
        )}
        {/* Nav items */}
        <div style={{ display:'flex', gap:4 }}>
          {[['home','🏛 Gallery'],['timeline','⟳ Timeline'],['search','⌕ Search']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v as LibView)} style={{ background: view===v?'rgba(255,255,255,0.08)':'none', border:'none', color: view===v?'#fff':'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, fontWeight:600, padding:'0 14px', height:46, borderBottom: view===v?'2px solid #FF9F1C':'2px solid transparent', transition:'all 0.15s' }}>{l}</button>
          ))}
        </div>
        {/* Search bar */}
        <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key==='Enter' && runSearch()} placeholder="Search artworks, artists, movements…" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 12px', color:'#fff', fontSize:12, width:260, outline:'none' }}/>
          <button onClick={runSearch} style={{ background:'rgba(255,159,28,0.2)', border:'1px solid rgba(255,159,28,0.3)', color:'#FF9F1C', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Search</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          HOME — Museum entrance gallery
          ══════════════════════════════════════════════════════════════ */}
      {view === 'home' && (
        <div style={{ animation:'fadeIn 0.4s ease' }}>

          {/* Hero — featured masterpiece */}
          {featuredPieces[0] && (
            <div style={{ position:'relative', height:'60vh', minHeight:400, cursor:'pointer', overflow:'hidden' }} onClick={() => openPiece(featuredPieces[0])}>
              <img src={featuredPieces[0].image_url||''} alt={featuredPieces[0].title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%', display:'block', transition:'transform 8s ease' }}/>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #080610 0%, rgba(8,6,16,0.5) 50%, rgba(8,6,16,0.15) 100%)' }}/>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 48px 48px' }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:2, color:'rgba(255,159,28,0.8)', marginBottom:10 }}>Featured Masterpiece</div>
                <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:48, fontWeight:900, color:'#fff', margin:0, lineHeight:1.05, textShadow:'0 4px 30px rgba(0,0,0,0.6)' }}>{featuredPieces[0].title}</h1>
                <div style={{ fontSize:16, color:'rgba(255,255,255,0.6)', marginTop:10, fontStyle:'italic' }}>{featuredPieces[0].artist} · {featuredPieces[0].year}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:4 }}>{featuredPieces[0].museum}, {featuredPieces[0].museum_city}</div>
                <div style={{ marginTop:16, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,0.6)' }}>
                  View artwork →
                </div>
              </div>
            </div>
          )}

          {/* Featured artwork strip */}
          <div style={{ padding:'32px 32px 0' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:18 }}>
              <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, color:'#fff', margin:0 }}>Masterpieces</h2>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>{pieces.length} works</span>
            </div>
            {/* Horizontal scroll of artwork cards */}
            <div style={{ display:'flex', gap:16, overflowX:'auto', paddingBottom:16, scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch' }}>
              {featuredPieces.slice(1, 12).map(p => (
                <ArtworkCard key={p.id} p={p} onClick={() => openPiece(p)} size="medium" />
              ))}
            </div>
          </div>

          {/* Movements by era */}
          <div style={{ padding:'32px' }}>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, color:'#fff', margin:'0 0 24px' }}>Art Movements</h2>
            {ERA_ORDER.filter(e => eraGroups[e]).map(era => (
              <div key={era} style={{ marginBottom:32 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,159,28,0.6)', marginBottom:12 }}>{era}</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {(eraGroups[era]||[]).map(a => {
                    const mPieces = movementPieces(a.slug)
                    const heroImg = mPieces[0]?.image_url || a.image_url || CAT_IMAGES.movements
                    return (
                      <button key={a.slug} onClick={() => openMovement(a)} style={{ position:'relative', width:200, height:130, borderRadius:12, overflow:'hidden', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)', flexShrink:0, background:'#1a1030', padding:0, textAlign:'left' }}>
                        <img src={heroImg} alt={a.title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block', transition:'transform 0.5s ease' }} onMouseOver={e => (e.currentTarget.style.transform='scale(1.08)')} onMouseOut={e => (e.currentTarget.style.transform='scale(1)')}/>
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(8,6,16,0.9) 0%, rgba(8,6,16,0.3) 60%, transparent 100%)' }}/>
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 12px 12px' }}>
                          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:14, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{a.title}</div>
                          {a.era && <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{a.era}</div>}
                          {mPieces.length > 0 && <div style={{ fontSize:9, color:'rgba(255,159,28,0.7)', marginTop:3 }}>{mPieces.length} artwork{mPieces.length!==1?'s':''}</div>}
                        </div>
                        {a.content && <div style={{ position:'absolute', top:8, right:8, width:6, height:6, borderRadius:'50%', background:'#4ade80' }}/>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* All masterpieces grid */}
          <div style={{ padding:'0 32px 48px' }}>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, color:'#fff', margin:'0 0 24px' }}>All Artworks</h2>
            <div style={{ columns:'4 240px', gap:12 }}>
              {pieces.map(p => (
                <div key={p.id} style={{ breakInside:'avoid', marginBottom:12, cursor:'pointer', borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)', position:'relative' }} onClick={() => openPiece(p)}
                  onMouseEnter={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if(img) img.style.transform='scale(1.04)' }}
                  onMouseLeave={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if(img) img.style.transform='scale(1)' }}>
                  <img src={p.image_url||''} alt={p.title} style={{ width:'100%', display:'block', transition:'transform 0.4s ease' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                  <div style={{ padding:'10px 12px', background:'rgba(15,10,30,0.95)' }}>
                    <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:2 }}>{p.title}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>{p.artist}</div>
                    {p.year && <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{p.year}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOVEMENT detail page
          ══════════════════════════════════════════════════════════════ */}
      {view === 'movement' && selArticle && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          {/* Hero */}
          <div style={{ position:'relative', height:'55vh', minHeight:360, overflow:'hidden' }}>
            <img src={movementPieces(selArticle.slug)[0]?.image_url || selArticle.image_url || CAT_IMAGES.movements} alt={selArticle.title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 30%', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #080610 0%, rgba(8,6,16,0.6) 50%, rgba(8,6,16,0.2) 100%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 48px 40px' }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:2, color:'#FF9F1C', marginBottom:8 }}>Art Movement</div>
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:52, fontWeight:900, color:'#fff', margin:0, lineHeight:1 }}>{selArticle.title}</h1>
              {selArticle.era && <div style={{ fontSize:16, color:'rgba(255,255,255,0.5)', marginTop:10, fontStyle:'italic' }}>{selArticle.era}</div>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
                {(selArticle.tags||[]).slice(0,6).map(t => <span key={t} style={{ fontSize:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'3px 10px', color:'rgba(255,255,255,0.5)' }}>{t}</span>)}
              </div>
            </div>
          </div>

          <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 40px 60px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:48, alignItems:'start' }}>

              {/* Left: article content */}
              <div>
                {generating && (
                  <div style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,159,28,0.7)', marginBottom:24 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation:'spin 1.2s ease-in-out infinite' }}>
                      <path d="M3 15 Q5 13 8 10 L15 3 Q16.5 1.5 17.5 2.5 Q18.5 3.5 17 5 L10 12 Q7 15 5 17Z" fill="#FF9F1C" opacity="0.9"/>
                      <circle cx="3.5" cy="15.5" r="1.5" fill="#FF9F1C" opacity="0.5"/>
                    </svg>
                    <span style={{ fontSize:13 }}>Generating in-depth article…</span>
                  </div>
                )}

                {!artContent && !generating && (
                  <button onClick={() => generateArticle(selArticle)} style={{ padding:'12px 24px', background:'linear-gradient(135deg,#FF9F1C,#FF6B35)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontFamily:"'Fredoka One',sans-serif", cursor:'pointer', marginBottom:32 }}>
                    ✦ Generate Article
                  </button>
                )}

                {artContent && (
                  <div style={{ animation:'slideUp 0.5s ease' }}>
                    {/* Pull quote */}
                    {artContent.pull_quote && (
                      <div style={{ margin:'0 0 36px', padding:'28px 0', borderTop:'1px solid rgba(255,159,28,0.2)', borderBottom:'1px solid rgba(255,159,28,0.2)', textAlign:'center' }}>
                        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, fontStyle:'italic', fontWeight:600, color:'rgba(255,255,255,0.9)', lineHeight:1.5, margin:0 }}>"{artContent.pull_quote}"</p>
                      </div>
                    )}
                    {/* Overview */}
                    {artContent.overview && <div style={{ fontSize:15, color:'rgba(255,255,255,0.75)', lineHeight:2, marginBottom:36, whiteSpace:'pre-line' }}>{artContent.overview}</div>}
                    {/* Key concepts */}
                    {artContent.key_concepts?.length > 0 && (
                      <div style={{ marginBottom:36 }}>
                        <H2>Key Concepts</H2>
                        {artContent.key_concepts.map((k:any, i:number) => (
                          <div key={i} style={{ borderLeft:'2px solid rgba(255,159,28,0.4)', paddingLeft:20, paddingBottom:18, marginBottom:0 }}>
                            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, color:'#fff', marginBottom:6 }}>{k.concept}</div>
                            <div style={{ fontSize:13, color:'rgba(255,255,255,0.58)', lineHeight:1.8 }}>{k.explanation}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Techniques */}
                    {artContent.techniques?.length > 0 && (
                      <div style={{ marginBottom:36 }}>
                        <H2>Techniques & Methods</H2>
                        <div style={{ display:'grid', gap:10 }}>
                          {artContent.techniques.map((t:any, i:number) => (
                            <div key={i} style={{ background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.12)', borderRadius:12, padding:'16px 18px' }}>
                              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:'#4ade80', marginBottom:6 }}>{t.name}</div>
                              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.8 }}>{t.steps}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Critical perspectives */}
                    {artContent.critical_perspectives && (
                      <div style={{ marginBottom:36, borderLeft:'2px solid rgba(255,255,255,0.08)', paddingLeft:20 }}>
                        <H2>Critical Perspectives</H2>
                        <div style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.9, fontStyle:'italic', whiteSpace:'pre-line' }}>{artContent.critical_perspectives}</div>
                      </div>
                    )}
                    {/* Exercises */}
                    {artContent.exercises?.length > 0 && (
                      <div style={{ marginBottom:36 }}>
                        <H2>Studio Exercises</H2>
                        {artContent.exercises.map((ex:any, i:number) => (
                          <div key={i} style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.14)', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
                            <div style={{ background:'rgba(167,139,250,0.1)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:'#a78bfa' }}>Exercise {i+1}: {ex.title}</div>
                              <div style={{ display:'flex', gap:6 }}>
                                {ex.level && <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:0.8, background:'rgba(167,139,250,0.2)', borderRadius:20, padding:'2px 8px', color:'#a78bfa' }}>{ex.level}</span>}
                                {ex.time && <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.06)', borderRadius:20, padding:'2px 8px' }}>⏱ {ex.time}</span>}
                              </div>
                            </div>
                            <div style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.8 }}>{ex.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Explore next:</span>
                      {artContent.related_topics?.map((r:string, i:number) => (
                        <button key={i} onClick={() => { const a = articles.find(x => x.title.toLowerCase()===r.toLowerCase()); if(a) openMovement(a) }} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:20, padding:'3px 12px', cursor:'pointer', fontSize:11 }}>{r} →</button>
                      ))}
                    </div>
                    {artContent.fun_fact && (
                      <div style={{ background:'rgba(255,225,53,0.05)', border:'1px solid rgba(255,225,53,0.12)', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
                        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,225,53,0.6)', marginBottom:6 }}>Did You Know</div>
                        <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:14, fontStyle:'italic', color:'rgba(255,255,255,0.65)', lineHeight:1.75 }}>{artContent.fun_fact}</div>
                      </div>
                    )}
                    {artContent.beginner_tip && (
                      <div style={{ background:'rgba(30,203,225,0.05)', border:'1px solid rgba(30,203,225,0.12)', borderRadius:12, padding:'14px 18px' }}>
                        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(30,203,225,0.6)', marginBottom:6 }}>Key Insight</div>
                        <div style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.75 }}>{artContent.beginner_tip}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right sidebar: timeline + artworks */}
              <div>
                {/* Timeline */}
                {artContent?.timeline?.length > 0 && (
                  <div style={{ marginBottom:40 }}>
                    <H2>Timeline</H2>
                    <div style={{ position:'relative', paddingLeft:20 }}>
                      <div style={{ position:'absolute', left:6, top:6, bottom:6, width:2, background:'linear-gradient(to bottom, #FF9F1C, rgba(255,159,28,0.1))', borderRadius:2 }}/>
                      {artContent.timeline.map((t:any, i:number) => (
                        <div key={i} style={{ paddingBottom:18, position:'relative' }}>
                          <div style={{ width:12, height:12, borderRadius:'50%', background:'#FF9F1C', border:'2px solid #080610', position:'absolute', left:-17, top:3, boxShadow:'0 0 6px rgba(255,159,28,0.5)' }}/>
                          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,159,28,0.8)', marginBottom:3 }}>{t.year}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>{t.event}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Movement artworks */}
                {movementPieces(selArticle.slug).length > 0 && (
                  <div>
                    <H2>Works from this Movement</H2>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {movementPieces(selArticle.slug).map(p => (
                        <div key={p.id} onClick={() => openPiece(p)} style={{ display:'flex', gap:10, cursor:'pointer', borderRadius:10, padding:8, border:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', transition:'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}>
                          <div style={{ width:60, height:60, borderRadius:8, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.05)' }}>
                            <img src={p.image_url||''} alt={p.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:13, color:'#fff', fontWeight:700, lineHeight:1.3 }}>{p.title}</div>
                            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2, fontStyle:'italic' }}>{p.artist}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1 }}>{p.year} · {p.museum}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ARTWORK detail — museum lightbox
          ══════════════════════════════════════════════════════════════ */}
      {view === 'artwork' && selPiece && (
        <div style={{ animation:'fadeIn 0.3s ease', display:'flex', height:'calc(100vh - 100px)', minHeight:600 }}>
          {/* Left: image */}
          <div style={{ flex:'1 1 60%', position:'relative', background:'#050408', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:zoomed?'zoom-out':'zoom-in' }} onClick={() => setZoomed(z => !z)}>
            <img src={selPiece.image_url||''} alt={selPiece.title} style={{ maxWidth: zoomed?'none':'90%', maxHeight: zoomed?'none':'90%', width:zoomed?'auto':'auto', height:zoomed?'140%':'auto', objectFit:'contain', transition:'all 0.4s ease', display:'block' }} onError={e => { (e.target as HTMLImageElement).src=''; e.currentTarget.parentElement!.style.background='rgba(255,159,28,0.06)' }}/>
            <div style={{ position:'absolute', bottom:12, right:12, fontSize:10, color:'rgba(255,255,255,0.25)', background:'rgba(0,0,0,0.4)', borderRadius:6, padding:'4px 8px' }}>{zoomed?'Click to zoom out':'Click to zoom'}</div>
          </div>

          {/* Right: info + AI guide */}
          <div style={{ width:380, flexShrink:0, overflowY:'auto', borderLeft:'1px solid rgba(255,255,255,0.07)', background:'rgba(10,6,20,0.98)', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'28px 24px 0', flex:1 }}>
              <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, fontWeight:900, color:'#fff', margin:'0 0 6px', lineHeight:1.1 }}>{selPiece.title}</h2>
              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, color:'rgba(255,255,255,0.55)', fontStyle:'italic', marginBottom:20 }}>{selPiece.artist}</div>

              {/* Metadata grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 0', marginBottom:20, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:16 }}>
                {[['Year', selPiece.year], ['Medium', selPiece.medium], ['Dimensions', selPiece.dimensions], ['Museum', selPiece.museum], ['Location', selPiece.museum_city], ['Movement', selPiece.movement_slug?.replace(/-/g,' ')]].filter(([,v]) => v).map(([k,v]) => (
                  <div key={k as string}>
                    <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.25)', marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selPiece.description && (
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.85, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:16, marginBottom:20 }}>{selPiece.description}</p>
              )}

              {/* AI Art Guide */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:16 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>🎨 AI Art Guide</div>
                {/* Preset questions */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                  {['Explain this painting','Analyse the composition','How was this made?','What can I learn from this?','Historical context'].map(q => (
                    <button key={q} onClick={() => askArtGuide(q)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:20, padding:'4px 10px', cursor:'pointer', fontSize:10, fontWeight:600, transition:'all 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>{q}</button>
                  ))}
                </div>
                {/* Chat */}
                <div ref={chatRef} style={{ background:'rgba(255,255,255,0.02)', borderRadius:10, padding:10, marginBottom:10, maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
                  {aiGuide.length === 0 && <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', padding:12 }}>Ask the AI guide anything about this artwork</div>}
                  {aiGuide.map((e, i) => (
                    <div key={i}>
                      <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:4 }}>You: {e.q}</div>
                      {e.a ? <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.7, background:'rgba(255,159,28,0.06)', borderLeft:'2px solid rgba(255,159,28,0.3)', paddingLeft:10, borderRadius:'0 6px 6px 0', padding:'8px 10px' }}>{e.a}</div>
                           : <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>Thinking…</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={guideInput} onChange={e => setGuideIn(e.target.value)} onKeyDown={e => e.key==='Enter' && askArtGuide()} placeholder="Ask anything…" style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, outline:'none' }}/>
                  <button onClick={() => askArtGuide()} disabled={guideLoading} style={{ background:'rgba(255,159,28,0.2)', border:'1px solid rgba(255,159,28,0.3)', color:'#FF9F1C', borderRadius:8, padding:'8px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Ask</button>
                </div>
              </div>
            </div>

            {/* Similar works */}
            {(() => {
              const similar = pieces.filter(p => p.id !== selPiece.id && (p.movement_slug === selPiece.movement_slug || p.artist === selPiece.artist)).slice(0, 4)
              return similar.length > 0 ? (
                <div style={{ padding:'20px 24px 24px', borderTop:'1px solid rgba(255,255,255,0.07)', marginTop:16 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.25)', marginBottom:10 }}>Similar Works</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {similar.map(p => (
                      <div key={p.id} onClick={() => openPiece(p)} style={{ cursor:'pointer', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <img src={p.image_url||''} alt={p.title} style={{ width:'100%', height:70, objectFit:'cover', display:'block' }}/>
                        <div style={{ padding:'5px 7px', background:'rgba(15,10,25,0.95)' }}>
                          <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.7)', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title}</div>
                          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>{p.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TIMELINE — horizontal scroll through art history
          ══════════════════════════════════════════════════════════════ */}
      {view === 'timeline' && (
        <div style={{ padding:'32px', animation:'fadeIn 0.3s ease' }}>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:28, color:'#fff', margin:'0 0 8px' }}>Art History Timeline</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, margin:'0 0 32px' }}>From prehistoric cave paintings to contemporary AI art — 30,000 years of human creativity</p>
          {ERA_ORDER.filter(e => eraGroups[e]).map((era, ei) => (
            <div key={era} style={{ marginBottom:48 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#FF9F1C', boxShadow:'0 0 12px rgba(255,159,28,0.5)' }}/>
                <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'#fff' }}>{era}</div>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
              </div>
              <div style={{ display:'flex', gap:16, overflowX:'auto', paddingBottom:12 }}>
                {(eraGroups[era]||[]).map(a => {
                  const hero = movementPieces(a.slug)[0]?.image_url || a.image_url || CAT_IMAGES.movements
                  return (
                    <button key={a.slug} onClick={() => openMovement(a)} style={{ minWidth:200, height:140, borderRadius:12, overflow:'hidden', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)', flexShrink:0, background:'#1a1030', padding:0, position:'relative' }}>
                      <img src={hero} alt={a.title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(8,6,16,0.9) 0%, transparent 60%)' }}/>
                      <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
                        <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:14, fontWeight:700, color:'#fff' }}>{a.title}</div>
                        {a.era && <div style={{ fontSize:10, color:'rgba(255,159,28,0.6)', marginTop:2 }}>{a.era}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SEARCH results
          ══════════════════════════════════════════════════════════════ */}
      {view === 'search' && (
        <div style={{ padding:'32px', animation:'fadeIn 0.3s ease' }}>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, color:'#fff', margin:'0 0 6px' }}>Search results for "{searchQ}"</h2>
          {searching && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, margin:'20px 0' }}>Searching…</div>}
          {searchRes && !searching && (
            <>
              {searchRes.pieces.length > 0 && (
                <div style={{ marginBottom:40 }}>
                  <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.3)', margin:'20px 0 14px' }}>Artworks ({searchRes.pieces.length})</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
                    {searchRes.pieces.map(p => <ArtworkCard key={p.id} p={p} onClick={() => openPiece(p)} size="large"/>)}
                  </div>
                </div>
              )}
              {searchRes.articles.length > 0 && (
                <div>
                  <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.3)', marginBottom:14 }}>Articles ({searchRes.articles.length})</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                    {searchRes.articles.map(a => {
                      const hero = movementPieces(a.slug)[0]?.image_url || a.image_url || CAT_IMAGES[a.category]
                      return (
                        <button key={a.slug} onClick={() => a.category==='movements' ? openMovement(a) : undefined} style={{ position:'relative', height:130, borderRadius:12, overflow:'hidden', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)', background:'#1a1030', padding:0, textAlign:'left' }}>
                          <img src={hero} alt={a.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(8,6,16,0.9) 0%, transparent 60%)' }}/>
                          <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
                            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:13, fontWeight:700, color:'#fff' }}>{a.title}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{a.category} {a.era?`· ${a.era}`:''}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {searchRes.pieces.length === 0 && searchRes.articles.length === 0 && (
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:14, padding:'40px 0', textAlign:'center' }}>No results found for "{searchQ}" — try different keywords</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function ArtworkCard({ p, onClick, size }: { p: Masterpiece; onClick: () => void; size: 'medium' | 'large' }) {
  const w = size === 'large' ? '100%' : 200
  const h = size === 'large' ? 260 : 150
  return (
    <div onClick={onClick} className="art-card" style={{ width:w, flexShrink:0, borderRadius:12, overflow:'hidden', cursor:'pointer', border:'1px solid rgba(255,255,255,0.07)', background:'#0f0a1e', position:'relative', scrollSnapAlign:'start' }}>
      <div style={{ height:h, overflow:'hidden' }}>
        <img src={p.image_url||''} alt={p.title} className="art-card-img" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block', transition:'transform 0.5s ease' }} onError={e => { (e.target as HTMLImageElement).style.background='rgba(255,159,28,0.08)' }}/>
      </div>
      <div style={{ padding:'10px 12px 12px' }}>
        <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:2 }}>{p.title}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>{p.artist}</div>
        {p.year && <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)', marginTop:2 }}>{p.year} · {p.museum_city}</div>}
      </div>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, marginTop:4 }}>
      <div style={{ width:3, height:18, background:'#FF9F1C', borderRadius:2, flexShrink:0 }}/>
      <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.4, color:'rgba(255,159,28,0.7)' }}>{children}</div>
    </div>
  )
}

function buildArticlePrompt(a: Article): string {
  return `You are a specialist art historian. Write a deeply researched article about the art movement: ${a.title}${a.era ? ` (${a.era})` : ''}.

Audience: adult learners, art students, educators, and serious enthusiasts. Be intellectually rigorous. Use precise terminology. Reference specific named artworks with dates and museum locations. Avoid generalisations.

Respond ONLY with valid JSON — no markdown:
{
  "pull_quote": "A single vivid, quotable sentence capturing the essence or spirit of this movement — striking when typeset large",
  "overview": "5-6 substantial paragraphs: (1) historical/political/cultural forces that produced it; (2) core philosophical and aesthetic principles — what was radical; (3) internal evolution, phases, factions; (4) relationship to preceding movements; (5) decline, transformation, influence on what followed. Reference specific named works and artists with dates.",
  "key_concepts": [{"concept": "specific formal characteristic", "explanation": "2-3 sentences: precise definition, how it appears in actual artworks"}],
  "techniques": [{"name": "technique used by artists of this movement", "steps": "Technical description a practising artist can learn from. Specific materials and process."}],
  "famous_examples": [{"work": "Title (Year) by Artist — Museum, City", "note": "2-3 sentence formal analysis"}],
  "timeline": [{"year": "year or period", "event": "specific named work, exhibition, or turning point"}],
  "exercises": [
    {"title": "title", "description": "Serious multi-step studio project engaging with this movement's aesthetic principles. Specific materials and process. For adult learners.", "time": "2-4 hours", "level": "Intermediate"},
    {"title": "title", "description": "Advanced sustained project or contextual research exercise.", "time": "Multiple sessions", "level": "Advanced"}
  ],
  "critical_perspectives": "2-3 paragraphs: how critics and historians have evaluated this movement, revisionist readings, contested legacy, cultural politics",
  "beginner_tip": "The single insight that most unlocks genuine understanding",
  "fun_fact": "One specific, surprising, illuminating detail",
  "related_topics": ["5-7 related movements, artists, or concepts"]
}`
}
