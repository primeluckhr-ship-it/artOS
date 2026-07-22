import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

const CATS = [
  { key:'all',          label:'All',           color:'#fff',    icon:'◎' },
  { key:'fundamentals', label:'Fundamentals',  color:'#1ECBE1', icon:'⬡' },
  { key:'drawing',      label:'Drawing',       color:'#f9a8d4', icon:'✎' },
  { key:'painting',     label:'Painting',      color:'#FF6B35', icon:'⬤' },
  { key:'materials',    label:'Materials',     color:'#4ade80', icon:'◈' },
  { key:'movements',    label:'Movements',     color:'#FF9F1C', icon:'⟳' },
  { key:'artists',      label:'Artists',       color:'#a78bfa', icon:'✦' },
  { key:'styles',       label:'Styles',        color:'#FFE135', icon:'◇' },
  { key:'museums',      label:'Museums',       color:'#fb923c', icon:'⌂' },
]

// Category fallback images
const CAT_IMAGES: Record<string, string> = {
  fundamentals: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85&fit=crop',
  drawing:      'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=1400&q=85&fit=crop',
  painting:     'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1400&q=85&fit=crop',
  materials:    'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=1400&q=85&fit=crop',
  movements:    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1400&q=85&fit=crop',
  artists:      'https://images.unsplash.com/photo-1577083165633-14ebcdb0f658?w=1400&q=85&fit=crop',
  styles:       'https://images.unsplash.com/photo-1547826039-a0c20c946bd0?w=1400&q=85&fit=crop',
  museums:      'https://images.unsplash.com/photo-1565099824688-45e04a8b3827?w=1400&q=85&fit=crop',
}

interface Article {
  id: string; slug: string; title: string; category: string
  subcategory: string | null; tags: string[]; difficulty: string
  era: string | null; image_url: string | null; image_query: string | null
  content: any | null; generated_at: string | null; view_count: number
}

export default function KnowledgeLibrary({ profile }: { profile: Profile }) {
  const [cat, setCat]           = useState('all')
  const [query, setQuery]       = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [filtered, setFiltered] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [generating, setGen]    = useState(false)
  const [chatInput, setChatIn]  = useState('')
  const [chatLog, setChatLog]   = useState<{role:'user'|'ai';text:string}[]>([])
  const [chatLoading, setChatL] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadArticles() }, [])
  useEffect(() => { filterArticles() }, [cat, query, articles])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [chatLog])

  async function loadArticles() {
    const { data } = await supabase
      .from('knowledge_articles')
      .select('id,slug,title,category,subcategory,tags,difficulty,era,image_url,image_query,content,generated_at,view_count')
      .order('category').order('title')
    setArticles(data || [])
  }

  function filterArticles() {
    let list = articles
    if (cat !== 'all') list = list.filter(a => a.category === cat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.subcategory || '').toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    setFiltered(list)
  }

  async function openArticle(a: Article) {
    setSelected(a); setChatLog([]); setImgLoaded(false)
    supabase.from('knowledge_articles').update({ view_count: (a.view_count||0) + 1 }).eq('id', a.id)
    if (!a.content) generateContent(a)
  }

  async function generateContent(a: Article) {
    setGen(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: buildPrompt(a) }] }),
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const content = JSON.parse(clean)
      await supabase.from('knowledge_articles').update({ content, generated_at: new Date().toISOString() }).eq('id', a.id)
      setSelected(prev => prev?.id === a.id ? { ...prev, content } : prev)
      setArticles(prev => prev.map(x => x.id === a.id ? { ...x, content } : x))
    } catch(e) { console.error('Gen failed:', e) }
    setGen(false)
  }

  async function sendChat() {
    if (!chatInput.trim() || !selected || chatLoading) return
    const userMsg = chatInput.trim(); setChatIn('')
    setChatLog(prev => [...prev, { role:'user', text:userMsg }]); setChatL(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role:'user', content:`You are an expert art tutor and historian specialising in "${selected.title}". The audience is adult learners — art students, educators, and practitioners. Be intellectually rigorous and specific. Use precise terminology.\n\nContext summary: ${selected.content?.summary || ''}\n\nQuestion: ${userMsg}` }] }),
      })
      const data = await res.json()
      setChatLog(prev => [...prev, { role:'ai', text: data?.content?.[0]?.text || 'Could not answer — try again.' }])
    } catch { setChatLog(prev => [...prev, { role:'ai', text:'Connection error.' }]) }
    setChatL(false)
  }

  const catColor  = (c: string) => CATS.find(x => x.key === c)?.color || '#fff'
  const heroImage = (a: Article) => a.image_url || CAT_IMAGES[a.category] || CAT_IMAGES.movements

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'calc(100vh - 54px)', fontFamily:"'Inter',sans-serif", position:'relative', zIndex:1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .art-card:hover{transform:translateY(-3px) scale(1.01);box-shadow:0 20px 50px rgba(0,0,0,0.5)!important}
        .cat-pill:hover{opacity:0.85}
        .article-row:hover{background:rgba(255,255,255,0.06)!important}
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          LEFT PANEL — browse
          ══════════════════════════════════════════════════════════ */}
      <div style={{ width: selected ? 300 : '100%', flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', transition:'width 0.35s cubic-bezier(.4,0,.2,1)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 16px 12px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#FF9F1C,#FF6B35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14 Q4 12 7 9 L13 3 Q14.5 1.5 15.5 2.5 Q16.5 3.5 15 5 L9 11 Q6 14 4 16Z" fill="white" opacity="0.9"/><circle cx="2.5" cy="14.5" r="1.5" fill="white" opacity="0.6"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:17, color:'#fff', lineHeight:1.1 }}>Knowledge Library</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{articles.length} articles · AI-powered</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', opacity:0.3 }} width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="white" strokeWidth="1.5"/><path d="M9 9 L13 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movements, artists, techniques…" style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 12px 9px 32px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          </div>

          {/* Category pills */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', paddingBottom:4 }}>
            {CATS.map(c => (
              <button key={c.key} className="cat-pill" onClick={() => setCat(c.key)} style={{ background: cat===c.key ? `${c.color}20` : 'rgba(255,255,255,0.04)', border:`1.5px solid ${cat===c.key?c.color+'55':'rgba(255,255,255,0.07)'}`, color: cat===c.key?c.color:'rgba(255,255,255,0.35)', borderRadius:20, padding:'4px 9px', cursor:'pointer', fontSize:10, fontWeight:700, transition:'all 0.12s', whiteSpace:'nowrap' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Article list / grid */}
        <div style={{ flex:1, overflowY:'auto', padding:'4px 8px 20px' }}>

          {/* ── Card grid (no article open, all/category view) ── */}
          {!selected && !query && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10, padding:'4px 4px 8px' }}>
              {filtered.map(a => (
                <button key={a.id} className="art-card" onClick={() => openArticle(a)} style={{
                  background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left',
                  borderRadius:14, overflow:'hidden', position:'relative',
                  boxShadow:'0 6px 24px rgba(0,0,0,0.35)', transition:'transform 0.2s, box-shadow 0.2s',
                  aspectRatio:'3/4',
                }}>
                  {/* Image */}
                  <div style={{ position:'absolute', inset:0, backgroundImage:`url(${heroImage(a)})`, backgroundSize:'cover', backgroundPosition:'center' }}/>
                  {/* Gradient overlay */}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.1) 100%)' }}/>
                  {/* Category badge */}
                  <div style={{ position:'absolute', top:10, left:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, background:`${catColor(a.category)}cc`, color:'#000', borderRadius:20, padding:'2px 7px' }}>{a.category}</span>
                  </div>
                  {/* Generated dot */}
                  {a.content && <div style={{ position:'absolute', top:10, right:10, width:7, height:7, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 6px #4ade8088' }}/>}
                  {/* Text */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 12px 12px' }}>
                    {a.era && <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>{a.era}</div>}
                    <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.25, marginBottom:4 }}>{a.title}</div>
                    {a.content?.summary && <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' } as any}>{a.content.summary}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Compact list (search results or article open) ── */}
          {(selected || query) && (() => {
            if (query.trim()) return (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                {filtered.length === 0 && <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.2)', fontSize:12 }}>No results for "{query}"</div>}
                {filtered.map(a => <ArticleRow key={a.id} a={a} active={selected?.id===a.id} onSelect={openArticle} color={catColor(a.category)} />)}
              </div>
            )
            const groups: Record<string,Article[]> = {}
            filtered.forEach(a => { const g = a.subcategory||a.category; (groups[g]=groups[g]||[]).push(a) })
            return Object.entries(groups).map(([g, arts]) => (
              <div key={g} style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.22)', padding:'6px 10px 4px' }}>{g}</div>
                {arts.map(a => <ArticleRow key={a.id} a={a} active={selected?.id===a.id} onSelect={openArticle} color={catColor(a.category)} />)}
              </div>
            ))
          })()}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          RIGHT PANEL — article
          ══════════════════════════════════════════════════════════ */}
      {selected && (
        <div style={{ flex:1, overflowY:'auto', background:'rgba(10,6,22,1)' }}>

          {/* ── Hero ─────────────────────────────────────────── */}
          <div style={{ position:'relative', height:380, overflow:'hidden' }}>
            <img src={heroImage(selected)} alt={selected.title} onLoad={() => setImgLoaded(true)} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', opacity: imgLoaded ? 1 : 0, transition:'opacity 0.6s ease', display:'block' }}/>
            {/* Multi-layer gradient for legibility */}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(10,6,22,0.15) 0%, rgba(10,6,22,0.1) 40%, rgba(10,6,22,0.75) 75%, rgba(10,6,22,1) 100%)' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(10,6,22,0.4) 0%, transparent 60%)' }}/>
            {/* Close */}
            <button onClick={() => { setSelected(null); setChatLog([]) }} style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:18, backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            {/* Hero text */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 36px 32px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, background:catColor(selected.category), color:'#000', borderRadius:20, padding:'3px 10px' }}>{CATS.find(c=>c.key===selected.category)?.label}</span>
                {selected.subcategory && <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{selected.subcategory}</span>}
                {selected.era && <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>{selected.era}</span>}
                {selected.content && <span style={{ fontSize:10, color:'#4ade80', opacity:0.8 }}>✓ generated</span>}
              </div>
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:38, fontWeight:900, color:'#fff', margin:0, lineHeight:1.1, textShadow:'0 2px 20px rgba(0,0,0,0.5)' }}>{selected.title}</h1>
              {/* Tags */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
                {(selected.tags||[]).slice(0,6).map(t => (
                  <span key={t} style={{ fontSize:9, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'2px 8px', color:'rgba(255,255,255,0.65)' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Article body ──────────────────────────────────── */}
          <div style={{ padding:'32px 36px 60px', maxWidth:820 }}>

            {/* Generating */}
            {generating && (
              <div style={{ display:'flex', alignItems:'center', gap:14, background:'rgba(255,159,28,0.08)', border:'1px solid rgba(255,159,28,0.2)', borderRadius:14, padding:'18px 22px', animation:'fadeIn 0.3s ease' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" style={{ animation:'spin 1.4s ease-in-out infinite', flexShrink:0 }}>
                  <path d="M4 22 Q6 20 10 16 L20 6 Q22 4 23.5 5.5 Q25 7 23 9 L13 19 Q9 23 7 25Z" fill="#FF9F1C" opacity="0.9"/>
                  <circle cx="4.5" cy="22.5" r="2.5" fill="#FF9F1C" opacity="0.5"/>
                </svg>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#FF9F1C', marginBottom:2 }}>Generating article…</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Writing a deep, rigorously researched article on {selected.title}</div>
                </div>
              </div>
            )}

            {/* Not yet generated */}
            {!selected.content && !generating && (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>✦</div>
                <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Article not yet written</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginBottom:24, lineHeight:1.7 }}>First visit triggers AI generation — a full, rigorously researched<br/>article cached permanently for all future readers.</div>
                <button onClick={() => generateContent(selected)} style={{ padding:'12px 28px', background:'linear-gradient(135deg,#FF9F1C,#FF6B35)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 24px rgba(255,159,28,0.3)', fontFamily:"'Fredoka One',sans-serif" }}>
                  ✦ Generate Article
                </button>
              </div>
            )}

            {/* ── ARTICLE CONTENT ──────────────────────────────── */}
            {selected.content && !generating && (
              <div style={{ animation:'fadeUp 0.5s ease' }}>

                {/* Summary / lead */}
                <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:19, fontStyle:'italic', color:'rgba(255,255,255,0.75)', lineHeight:1.8, borderLeft:`3px solid ${catColor(selected.category)}`, paddingLeft:20, marginBottom:36, marginTop:0 }}>
                  {selected.content.summary}
                </p>

                {/* Overview */}
                {selected.content.overview && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color={catColor(selected.category)}>Overview</SectionTitle>
                    <div style={{ fontSize:15, color:'rgba(255,255,255,0.72)', lineHeight:1.9, whiteSpace:'pre-line' }}>{selected.content.overview}</div>
                  </div>
                )}

                {/* Divider */}
                <Divider color={catColor(selected.category)} />

                {/* Key concepts */}
                {selected.content.key_concepts?.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color={catColor(selected.category)}>Key Concepts</SectionTitle>
                    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                      {selected.content.key_concepts.map((k:any, i:number) => (
                        <div key={i} style={{ borderLeft:`2px solid ${catColor(selected.category)}40`, paddingLeft:20, paddingTop:14, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:6 }}>{k.concept}</div>
                          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.75 }}>{k.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Techniques */}
                {selected.content.techniques?.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color="#4ade80">Techniques</SectionTitle>
                    <div style={{ display:'grid', gap:12 }}>
                      {selected.content.techniques.map((t:any, i:number) => (
                        <div key={i} style={{ background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.14)', borderRadius:14, padding:'18px 20px' }}>
                          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, color:'#4ade80', marginBottom:8 }}>{t.name}</div>
                          <div style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.8 }}>{t.steps}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Famous examples */}
                {selected.content.famous_examples?.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color="#FF9F1C">Notable Works & Examples</SectionTitle>
                    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                      {selected.content.famous_examples.map((e:any, i:number) => (
                        <div key={i} style={{ display:'flex', gap:16, padding:'16px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', alignItems:'flex-start' }}>
                          <div style={{ width:4, height:4, borderRadius:'50%', background:'#FF9F1C', marginTop:8, flexShrink:0 }}/>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,159,28,0.9)', marginBottom:4, fontStyle:'italic' }}>{e.work}</div>
                            <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.75 }}>{e.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Divider color={catColor(selected.category)} />

                {/* Critical perspectives */}
                {selected.content.critical_perspectives && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color="rgba(255,255,255,0.5)">Critical Perspectives</SectionTitle>
                    <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.9, whiteSpace:'pre-line', fontStyle:'italic', borderLeft:'2px solid rgba(255,255,255,0.1)', paddingLeft:20 }}>
                      {selected.content.critical_perspectives}
                    </div>
                  </div>
                )}

                {/* Exercises */}
                {selected.content.exercises?.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <SectionTitle color="#a78bfa">Studio Exercises</SectionTitle>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {selected.content.exercises.map((ex:any, i:number) => (
                        <div key={i} style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.16)', borderRadius:16, overflow:'hidden' }}>
                          <div style={{ background:'rgba(167,139,250,0.1)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:'#a78bfa' }}>Exercise {i+1}: {ex.title}</div>
                            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                              {ex.level && <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:0.8, background:'rgba(167,139,250,0.25)', borderRadius:20, padding:'2px 8px', color:'#a78bfa' }}>{ex.level}</span>}
                              {ex.time && <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.07)', borderRadius:20, padding:'2px 8px' }}>⏱ {ex.time}</span>}
                            </div>
                          </div>
                          <div style={{ padding:'14px 18px', fontSize:13, color:'rgba(255,255,255,0.68)', lineHeight:1.8 }}>{ex.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pull quote — fun fact */}
                {selected.content.fun_fact && (
                  <blockquote style={{ margin:'0 0 28px', padding:'20px 24px', background:`linear-gradient(135deg,${catColor(selected.category)}10,rgba(255,255,255,0.03))`, borderLeft:`3px solid ${catColor(selected.category)}`, borderRadius:'0 12px 12px 0', position:'relative' }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:catColor(selected.category), opacity:0.7, marginBottom:8 }}>✨ Did You Know</div>
                    <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontStyle:'italic', color:'rgba(255,255,255,0.75)', lineHeight:1.75, margin:0 }}>{selected.content.fun_fact}</p>
                  </blockquote>
                )}

                {/* Beginner tip */}
                {selected.content.beginner_tip && (
                  <div style={{ background:'rgba(30,203,225,0.06)', border:'1px solid rgba(30,203,225,0.16)', borderRadius:14, padding:'16px 20px', marginBottom:28 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'#1ECBE1', marginBottom:8 }}>💡 Key Insight</div>
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.72)', lineHeight:1.8, margin:0 }}>{selected.content.beginner_tip}</p>
                  </div>
                )}

                {/* Related topics */}
                {selected.content.related_topics?.length > 0 && (
                  <div style={{ marginBottom:36 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>Explore Next</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {selected.content.related_topics.map((r:string, i:number) => (
                        <button key={i} onClick={() => { setSelected(null); setQuery(r) }} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.55)', borderRadius:20, padding:'5px 13px', cursor:'pointer', fontSize:12, transition:'all 0.15s', fontWeight:500 }}>
                          {r} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate */}
                <div style={{ textAlign:'right', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:16, marginTop:8 }}>
                  <button onClick={async () => {
                    await supabase.from('knowledge_articles').update({ content:null, generated_at:null }).eq('id', selected.id)
                    const fresh = { ...selected, content:null }
                    setSelected(fresh)
                    setTimeout(() => generateContent(fresh), 100)
                  }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:11, padding:'4px 0' }}>
                    ↺ Regenerate article
                  </button>
                </div>

                {/* ── AI Tutor ─────────────────────────────────── */}
                <div style={{ marginTop:40, borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:28 }}>
                  <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:'#fff', marginBottom:4 }}>Ask the AI Tutor</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:18 }}>Ask any question about {selected.title} — get expert-level answers tailored to your question</div>

                  <div ref={chatRef} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:14, marginBottom:12, minHeight:80, maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
                    {chatLog.length === 0 && (
                      <div style={{ color:'rgba(255,255,255,0.2)', fontSize:13, textAlign:'center', padding:'20px 0', fontStyle:'italic' }}>
                        Your questions appear here. Ask anything about this topic.
                      </div>
                    )}
                    {chatLog.map((m, i) => (
                      <div key={i} style={{ display:'flex', gap:10, justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
                        {m.role==='ai' && <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:12, color:'#fff', flexShrink:0 }}>P</div>}
                        <div style={{ background: m.role==='user'?'rgba(139,92,246,0.18)':'rgba(255,255,255,0.05)', border:`1px solid ${m.role==='user'?'rgba(139,92,246,0.3)':'rgba(255,255,255,0.08)'}`, borderRadius: m.role==='user'?'14px 14px 3px 14px':'14px 14px 14px 3px', padding:'10px 14px', maxWidth:'82%', fontSize:13, color:'rgba(255,255,255,0.82)', lineHeight:1.7 }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:12, color:'#fff' }}>P</div>
                        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px 14px 14px 3px', padding:'12px 16px', color:'rgba(255,255,255,0.35)', fontSize:12 }}>Thinking…</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <input value={chatInput} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key==='Enter' && sendChat()} placeholder={`Ask about ${selected.title}…`} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'11px 14px', color:'#fff', fontSize:13, outline:'none' }}/>
                    <button onClick={sendChat} disabled={chatLoading} style={{ padding:'11px 18px', background:'rgba(139,92,246,0.18)', border:'1px solid rgba(139,92,246,0.3)', color:'#a78bfa', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>Ask →</button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────
function ArticleRow({ a, active, onSelect, color }: { a:Article; active:boolean; onSelect:(a:Article)=>void; color:string }) {
  return (
    <button onClick={() => onSelect(a)} className="article-row" style={{
      width:'100%', background: active?`${color}10`:'transparent',
      border:`1px solid ${active?color+'35':'transparent'}`, borderRadius:10, padding:'8px 10px',
      cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, transition:'background 0.1s',
    }}>
      {a.image_url && <div style={{ width:36, height:36, borderRadius:6, backgroundImage:`url(${a.image_url})`, backgroundSize:'cover', backgroundPosition:'center', flexShrink:0 }}/>}
      {!a.image_url && <div style={{ width:4, height:32, borderRadius:2, background: active?color:'rgba(255,255,255,0.1)', flexShrink:0 }}/>}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color: active?'#fff':'rgba(255,255,255,0.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title}</div>
        {a.subcategory && <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>{a.subcategory}</div>}
      </div>
      {a.content && <div style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', flexShrink:0, opacity:0.7 }}/>}
    </button>
  )
}

function SectionTitle({ color, children }: { color:string; children:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:3, height:18, borderRadius:2, background:color, flexShrink:0 }}/>
      <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.4, color }}>{children}</div>
    </div>
  )
}

function Divider({ color }: { color:string }) {
  return (
    <div style={{ height:1, background:`linear-gradient(90deg,${color}30,transparent)`, margin:'0 0 32px' }}/>
  )
}

function buildPrompt(a: Article): string {
  const isMovement  = a.category === 'movements'
  const isArtist    = a.category === 'artists'
  const isMaterial  = a.category === 'materials'
  const isTechnique = a.category === 'drawing' || a.category === 'painting'
  const isFundament = a.category === 'fundamentals'
  const isMuseum    = a.category === 'museums'

  const aud = `The audience is adult learners — art students, educators, working artists, and serious enthusiasts. Do NOT simplify or write at a children's level. Be intellectually rigorous: use precise art historical and technical terminology, engage with real critical debates, reference specific named artworks with dates and current locations, and treat the reader as capable of absorbing complex ideas. Avoid vague generalisations.`

  const base = `${a.title}${a.subcategory ? ` (${a.subcategory})` : ''}${a.era ? ` — ${a.era}` : ''}`

  if (isMovement) return `You are a specialist art historian. Write a deeply researched, critically engaged article about the art movement: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence authoritative overview: period, geographic origin, defining characteristics, lasting significance",
  "overview": "5-6 substantial paragraphs: (1) historical/political/cultural forces; (2) core philosophical and aesthetic principles — what was radical; (3) internal development, key phases, factions; (4) relationship to preceding and concurrent movements; (5) decline, transformation, and influence on what followed. Reference specific named works, artists, dates throughout.",
  "key_concepts": [{"concept": "specific formal or conceptual characteristic", "explanation": "2-3 sentences: precise definition, how it appears in actual artworks, what makes it distinctive"}],
  "techniques": [{"name": "technique or formal method used by artists of this movement", "steps": "Technical description a practising artist could learn from. Include materials, process, and self-evaluation criteria."}],
  "famous_examples": [{"work": "Title (Year) by Artist — Collection, City", "note": "2-3 sentence analysis: what to look for, what it exemplifies, why it matters"}],
  "exercises": [
    {"title": "Studio exercise", "description": "Multi-step studio project engaging seriously with this movement's aesthetic principles. Not pastiche — genuine investigation. Specific materials, process steps, evaluation criteria. For intermediate adult learners.", "time": "2-4 hours", "level": "Intermediate"},
    {"title": "Advanced project", "description": "A sustained studio or research project requiring deeper engagement. Could span several sessions.", "time": "Multiple sessions", "level": "Advanced"},
    {"title": "Contextual study", "description": "Museum visit (physical or virtual), primary source reading, or comparative analysis exercise.", "time": "2-3 hours", "level": "All levels"}
  ],
  "critical_perspectives": "2-3 paragraphs: how critics and historians have evaluated this movement over time, revisionist readings, ongoing debates, contested legacy, cultural politics where relevant",
  "beginner_tip": "The single insight that most unlocks genuine understanding — not a platitude but a specific key to engaging with this movement critically",
  "fun_fact": "One specific, surprising, and genuinely illuminating detail — a lesser-known fact that reveals something important",
  "related_topics": ["5-7 related movements, artists, or concepts"]
}`

  if (isArtist) return `You are a specialist art historian. Write a comprehensive, critically informed profile of: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence authoritative overview: nationality, dates, movements, distinctive contribution, historical significance",
  "overview": "5-6 substantial paragraphs: (1) biographical context and formative training; (2) early career and development; (3) mature period and major works with specific analysis; (4) position among contemporaries; (5) critical reception during their lifetime; (6) posthumous legacy",
  "key_concepts": [{"concept": "defining formal, thematic, or conceptual characteristic", "explanation": "2-3 sentence analysis with reference to specific works"}],
  "techniques": [{"name": "specific technique or formal method", "steps": "Detailed description a practising artist could study and attempt."}],
  "famous_examples": [{"work": "Title (Year) — Collection, City", "note": "2-3 sentence formal analysis"}],
  "exercises": [
    {"title": "Formal study", "description": "Studio exercise engaging with a specific aspect of this artist's technique. Specific materials and process.", "time": "2-3 hours", "level": "Intermediate"},
    {"title": "Sustained response", "description": "Deeper project: sustained study of their working methods or personal response to their thematic concerns.", "time": "Multiple sessions", "level": "Advanced"}
  ],
  "critical_perspectives": "2-3 paragraphs: changing critical valuations, contested interpretations, identity and cultural politics, controversies, market dynamics",
  "beginner_tip": "The single most important insight for genuinely engaging with this artist's work",
  "fun_fact": "One specific, surprising detail that reveals something about character, working method, or historical context",
  "related_topics": ["5-7 related artists, movements, or topics"]
}`

  if (isTechnique || isFundament) return `You are a practising artist and experienced art educator. Write a rigorous, technically detailed article about: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence precise definition and overview: what it is, why it matters, what it enables",
  "overview": "4-5 substantial paragraphs: (1) precise technical definition with real depth; (2) perceptual and cognitive basis; (3) how master artists have understood and used it; (4) common errors and misconceptions; (5) how mastery unlocks other aspects of practice",
  "key_concepts": [{"concept": "specific sub-concept, variation, or application", "explanation": "2-3 sentence precise technical explanation with reference to actual artworks or practice"}],
  "techniques": [{"name": "specific method for developing skill", "steps": "Step-by-step technical guidance with specific materials, process, and self-evaluation criteria."}],
  "famous_examples": [{"work": "Title (Year) by Artist", "note": "Analysis of how this element functions in this specific work"}],
  "exercises": [
    {"title": "Observational foundation", "description": "Structured perceptual exercise. Specific materials, steps, duration, and what to notice.", "time": "20-45 min", "level": "All levels"},
    {"title": "Technical study", "description": "Sustained exercise building genuine skill. Specific challenge, process, and self-evaluation criteria.", "time": "1-3 hours", "level": "Intermediate"},
    {"title": "Advanced application", "description": "Project-based exercise applying this understanding at a high level.", "time": "Multiple sessions", "level": "Advanced"}
  ],
  "critical_perspectives": "1-2 paragraphs: how understanding of this element has evolved in art education and theory, pedagogical debates",
  "beginner_tip": "The single most important insight for making real progress with this",
  "fun_fact": "One fascinating specific detail about how this works perceptually, historically, or in practice",
  "related_topics": ["5-7 related elements, techniques, concepts"]
}`

  if (isMaterial) return `You are a materials specialist and practising artist. Write a comprehensive, technically authoritative article about ${base} as an art material.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence overview: what it is, primary uses, distinctive handling characteristics",
  "overview": "4-5 paragraphs: (1) composition and how it works chemically/physically; (2) historical development with specific artists and periods; (3) handling characteristics; (4) relationship to other materials; (5) contemporary availability and professional use",
  "key_concepts": [{"concept": "specific property or consideration", "explanation": "precise technical explanation relevant to an artist working with this material"}],
  "techniques": [{"name": "specific technique using this material", "steps": "Step-by-step technical guidance — preparation, application, finishing. Actionable."}],
  "famous_examples": [{"work": "Title (Year) by Artist", "note": "What this reveals about the material's possibilities"}],
  "exercises": [
    {"title": "Material investigation", "description": "Structured exploration of this material's range and behaviour. Specific tasks and what to discover.", "time": "2-3 hours", "level": "Beginner to Intermediate"},
    {"title": "Technical mastery", "description": "Focused exercise developing a specific demanding skill.", "time": "3-5 hours", "level": "Intermediate to Advanced"}
  ],
  "critical_perspectives": "Archival quality, safety/toxicity, environmental considerations, cost, what conservators and professional artists advise",
  "beginner_tip": "The most important thing to understand before working with this material for the first time",
  "fun_fact": "One genuinely interesting historical or scientific fact",
  "related_topics": ["5-6 related materials, techniques, or topics"]
}`

  if (isMuseum) return `You are an art historian and gallery educator. Write a comprehensive, critically informed guide to: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence overview: location, founding, collection scope, what makes it distinctively significant",
  "overview": "4-5 paragraphs: (1) founding history; (2) collection scope and key holdings; (3) role in shaping art historical discourse; (4) notable acquisitions or controversies; (5) the visiting experience",
  "key_concepts": [{"concept": "key aspect of collection or philosophy", "explanation": "substantive explanation of why this matters"}],
  "techniques": [{"name": "approach to studying this collection", "steps": "How to get maximum value from a visit, physical or virtual."}],
  "famous_examples": [{"work": "Title (Year) by Artist — a defining work here", "note": "Why this work matters and what it reveals about the collection"}],
  "exercises": [
    {"title": "Structured collection study", "description": "Task-driven engagement with this collection — clear tasks and reflection questions.", "time": "Half to full day", "level": "All levels"},
    {"title": "Comparative formal analysis", "description": "Select two works from different periods. Write a 600-900 word comparative formal and contextual analysis.", "time": "3-4 hours", "level": "Intermediate to Advanced"}
  ],
  "critical_perspectives": "2 paragraphs: decolonisation, provenance and repatriation, the canon it represents, access and inclusion, how the institution has evolved",
  "beginner_tip": "The single most important piece of advice for engaging with this collection",
  "fun_fact": "One specific and surprising detail about the institution",
  "related_topics": ["5-6 related museums, collections, or topics"]
}`

  return `You are an expert visual arts educator and critic. Write a rigorous, intellectually serious article about ${base} for adult art learners.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence authoritative overview",
  "overview": "4-5 substantial paragraphs with real intellectual depth — historical context, critical significance, technical specifics, contemporary relevance",
  "key_concepts": [{"concept": "specific concept", "explanation": "2-3 sentence precise explanation"}],
  "techniques": [{"name": "technique", "steps": "detailed, actionable technical guidance"}],
  "famous_examples": [{"work": "Specific Work (Year) by Artist", "note": "analytical note, not just description"}],
  "exercises": [
    {"title": "title", "description": "detailed multi-step exercise for adult learners", "time": "estimate", "level": "level"},
    {"title": "title", "description": "more advanced or research-based exercise", "time": "estimate", "level": "level"}
  ],
  "critical_perspectives": "1-2 paragraphs on critical debates and contested aspects",
  "beginner_tip": "The single most important insight — specific and actionable",
  "fun_fact": "One specific and illuminating fact",
  "related_topics": ["5-7 related topics"]
}`
}
