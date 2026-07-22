import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

// ── Category config ──────────────────────────────────────────────
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

interface Article {
  id: string
  slug: string
  title: string
  category: string
  subcategory: string | null
  tags: string[]
  difficulty: string
  era: string | null
  image_query: string | null
  content: any | null
  generated_at: string | null
  view_count: number
}

export default function KnowledgeLibrary({ profile }: { profile: Profile }) {
  const [cat, setCat]           = useState('all')
  const [query, setQuery]       = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [filtered, setFiltered] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [generating, setGen]    = useState(false)
  const [chatInput, setChatIn]  = useState('')
  const [chatLog, setChatLog]   = useState<{role:'user'|'ai'; text:string}[]>([])
  const [chatLoading, setChatL] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadArticles() }, [])
  useEffect(() => { filterArticles() }, [cat, query, articles])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [chatLog])

  async function loadArticles() {
    const { data } = await supabase
      .from('knowledge_articles')
      .select('id,slug,title,category,subcategory,tags,difficulty,era,image_query,content,generated_at,view_count')
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
    setSelected(a)
    setChatLog([])
    // Increment view count
    supabase.from('knowledge_articles').update({ view_count: a.view_count + 1 }).eq('id', a.id)
    // Generate content if not cached
    if (!a.content) generateContent(a)
  }

  async function generateContent(a: Article) {
    setGen(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const prompt = buildPrompt(a)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ANON_KEY}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const content = JSON.parse(clean)

      await supabase.from('knowledge_articles').update({
        content, generated_at: new Date().toISOString()
      }).eq('id', a.id)

      setSelected(prev => prev && prev.id === a.id ? { ...prev, content } : prev)
      setArticles(prev => prev.map(x => x.id === a.id ? { ...x, content } : x))
    } catch (e) {
      console.error('Content gen failed:', e)
    }
    setGen(false)
  }

  function buildPrompt(a: Article) {
    const catLabel = CATS.find(c => c.key === a.category)?.label || a.category
    return `You are an expert visual arts educator. Generate a comprehensive, engaging knowledge article about "${a.title}" for art students.

Category: ${catLabel}${a.subcategory ? ` > ${a.subcategory}` : ''}
${a.era ? `Era/Period: ${a.era}` : ''}
Tags: ${(a.tags || []).join(', ')}

Respond ONLY with a JSON object (no markdown, no preamble) with this exact structure:
{
  "summary": "2-3 sentence beginner-friendly overview",
  "overview": "3-4 paragraph in-depth explanation covering the key concepts, historical context where relevant, and why this matters to art students",
  "key_concepts": [
    { "concept": "name", "explanation": "1-2 sentence explanation" }
  ],
  "techniques": [
    { "name": "technique name", "steps": "how to apply it in 2-3 sentences" }
  ],
  "famous_examples": [
    { "work": "artwork or artist or example name", "note": "why it's significant" }
  ],
  "exercises": [
    { "title": "exercise name", "description": "practical 3-5 step exercise for students", "time": "estimated time" }
  ],
  "beginner_tip": "single most important piece of advice for a beginner approaching this topic",
  "fun_fact": "one surprising, memorable fact about this topic",
  "related_topics": ["list", "of", "3-5", "related", "topics"]
}

Keep the tone engaging and educational. Use concrete examples. Make exercises genuinely practical with real art materials.`
  }

  async function sendChat() {
    if (!chatInput.trim() || !selected || chatLoading) return
    const userMsg = chatInput.trim()
    setChatIn('')
    setChatLog(prev => [...prev, { role:'user', text:userMsg }])
    setChatL(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const messages = [
        { role: 'user', content: `You are an expert art tutor specialising in "${selected.title}". Answer questions clearly and helpfully for visual arts students. Keep responses concise (2-4 sentences) unless a detailed explanation is needed.\n\nContext: ${selected.content?.summary || ''}\n\nStudent question: ${userMsg}` }
      ]
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, messages }),
      })
      const data = await res.json()
      const reply = data?.content?.[0]?.text || 'Sorry, I could not answer that right now.'
      setChatLog(prev => [...prev, { role:'ai', text:reply }])
    } catch {
      setChatLog(prev => [...prev, { role:'ai', text:'Connection error — try again.' }])
    }
    setChatL(false)
  }

  const catColor = (c: string) => CATS.find(x => x.key === c)?.color || '#fff'

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'calc(100vh - 54px)', fontFamily:"'Inter',sans-serif", position:'relative', zIndex:1 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
      `}</style>

      {/* ── LEFT: Browse panel ─────────────────────────────────── */}
      <div style={{ width: selected ? 320 : '100%', flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', transition:'width 0.3s ease', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 18px 0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 22 Q6 18 10 12 L18 4 Q20 2 22 4 Q24 6 22 8 L14 16 Q10 20 8 24Z" fill="#FF9F1C" opacity="0.9"/>
              <circle cx="5" cy="23" r="3" fill="#FF9F1C" opacity="0.6"/>
            </svg>
            <div>
              <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:'#fff', margin:0, lineHeight:1 }}>Knowledge Library</h2>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{articles.length} articles · AI-powered</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any topic, artist, technique…"
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 14px 9px 34px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:0.35 }} width="16" height="16" viewBox="0 0 16 16" fill="white">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M10 10 L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Category pills */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', paddingBottom:12 }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)} style={{
                background: cat===c.key ? `${c.color}22` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${cat===c.key ? c.color+'60' : 'rgba(255,255,255,0.07)'}`,
                color: cat===c.key ? c.color : 'rgba(255,255,255,0.4)',
                borderRadius:20, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, transition:'all 0.12s',
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>

        {/* Article list */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 8px 20px' }}>
          {/* Group by subcategory when browsing a single category */}
          {(() => {
            if (query.trim() || cat === 'all') {
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {filtered.map(a => <ArticleRow key={a.id} a={a} selected={selected?.id===a.id} onSelect={openArticle} color={catColor(a.category)}/>)}
                  {filtered.length === 0 && <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.2)', fontSize:13 }}>No articles match "{query}"</div>}
                </div>
              )
            }
            const groups: Record<string, Article[]> = {}
            for (const a of filtered) {
              const g = a.subcategory || a.category
              if (!groups[g]) groups[g] = []
              groups[g].push(a)
            }
            return Object.entries(groups).map(([group, arts]) => (
              <div key={group} style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.25)', padding:'8px 10px 4px' }}>{group}</div>
                {arts.map(a => <ArticleRow key={a.id} a={a} selected={selected?.id===a.id} onSelect={openArticle} color={catColor(a.category)}/>)}
              </div>
            ))
          })()}
        </div>
      </div>

      {/* ── RIGHT: Article view ────────────────────────────────── */}
      {selected && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          {/* Article header */}
          <div style={{ background:`linear-gradient(135deg,${catColor(selected.category)}18,rgba(255,255,255,0.02))`, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'20px 28px', position:'sticky', top:0, zIndex:5, backdropFilter:'blur(12px)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:catColor(selected.category), opacity:0.8 }}>
                    {CATS.find(c=>c.key===selected.category)?.label} {selected.subcategory ? `› ${selected.subcategory}` : ''}
                  </span>
                  {selected.era && <span style={{ fontSize:10, background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'2px 8px', color:'rgba(255,255,255,0.4)' }}>{selected.era}</span>}
                  {selected.content && <span style={{ fontSize:10, color:'#4ade80', opacity:0.7 }}>✓ generated</span>}
                </div>
                <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:26, color:'#fff', margin:0, lineHeight:1 }}>{selected.title}</h1>
              </div>
              <button onClick={() => { setSelected(null); setChatLog([]) }} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
              {(selected.tags||[]).map(t => (
                <span key={t} style={{ fontSize:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'2px 8px', color:'rgba(255,255,255,0.4)' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ flex:1, padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 }}>

            {/* Generating state */}
            {generating && (
              <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,159,28,0.08)', border:'1px solid rgba(255,159,28,0.2)', borderRadius:14, padding:'16px 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation:'spin 1.2s ease-in-out infinite', flexShrink:0 }}>
                  <path d="M5 19 Q7 17 10 14 L18 6 Q20 4 21 5.5 Q22 7 20 9 L12 17 Q9 20 7 22Z" fill="#FF9F1C" opacity="0.9"/>
                  <circle cx="5.5" cy="19.5" r="2" fill="#FF9F1C" opacity="0.5"/>
                </svg>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#FF9F1C' }}>Writing article…</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>AI is generating a full knowledge article for "{selected.title}"</div>
                </div>
              </div>
            )}

            {/* Content */}
            {selected.content && !generating && (
              <div style={{ animation:'fadeUp 0.4s ease' }}>
                {/* Summary */}
                <div style={{ background:`${catColor(selected.category)}10`, border:`1px solid ${catColor(selected.category)}25`, borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:catColor(selected.category), opacity:0.8, marginBottom:6 }}>Summary</div>
                  <p style={{ color:'rgba(255,255,255,0.85)', fontSize:15, lineHeight:1.75, margin:0 }}>{selected.content.summary}</p>
                </div>

                {/* Overview */}
                <Section title="Overview" color={catColor(selected.category)}>
                  <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, lineHeight:1.85, margin:0, whiteSpace:'pre-line' }}>{selected.content.overview}</p>
                </Section>

                {/* Key concepts */}
                {selected.content.key_concepts?.length > 0 && (
                  <Section title="Key Concepts" color={catColor(selected.category)}>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {selected.content.key_concepts.map((k:any,i:number) => (
                        <div key={i} style={{ display:'flex', gap:12, background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px 14px' }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', background:`${catColor(selected.category)}20`, border:`1px solid ${catColor(selected.category)}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:catColor(selected.category), flexShrink:0, marginTop:1 }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:3 }}>{k.concept}</div>
                            <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>{k.explanation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Techniques */}
                {selected.content.techniques?.length > 0 && (
                  <Section title="Techniques" color="#4ade80">
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {selected.content.techniques.map((t:any,i:number) => (
                        <div key={i} style={{ background:'rgba(74,222,128,0.05)', border:'1px solid rgba(74,222,128,0.15)', borderRadius:10, padding:'12px 14px' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#4ade80', marginBottom:4 }}>{t.name}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>{t.steps}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Famous examples */}
                {selected.content.famous_examples?.length > 0 && (
                  <Section title="Famous Examples" color="#FF9F1C">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {selected.content.famous_examples.map((e:any,i:number) => (
                        <div key={i} style={{ background:'rgba(255,159,28,0.05)', border:'1px solid rgba(255,159,28,0.15)', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#FF9F1C', marginBottom:3 }}>{e.work}</div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>{e.note}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Exercises */}
                {selected.content.exercises?.length > 0 && (
                  <Section title="Practical Exercises" color="#a78bfa">
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {selected.content.exercises.map((ex:any,i:number) => (
                        <div key={i} style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.18)', borderRadius:12, padding:'14px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'#a78bfa' }}>Exercise {i+1}: {ex.title}</div>
                            {ex.time && <span style={{ fontSize:10, background:'rgba(167,139,250,0.15)', borderRadius:20, padding:'2px 8px', color:'#a78bfa' }}>⏱ {ex.time}</span>}
                          </div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.7 }}>{ex.description}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Fun fact + beginner tip */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {selected.content.fun_fact && (
                    <div style={{ background:'rgba(255,225,53,0.06)', border:'1px solid rgba(255,225,53,0.18)', borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#FFE135', marginBottom:6 }}>✨ Fun Fact</div>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.65, margin:0 }}>{selected.content.fun_fact}</p>
                    </div>
                  )}
                  {selected.content.beginner_tip && (
                    <div style={{ background:'rgba(30,203,225,0.06)', border:'1px solid rgba(30,203,225,0.18)', borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#1ECBE1', marginBottom:6 }}>💡 Beginner Tip</div>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.65, margin:0 }}>{selected.content.beginner_tip}</p>
                    </div>
                  )}
                </div>

                {/* Related topics */}
                {selected.content.related_topics?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', alignSelf:'center' }}>Related:</span>
                    {selected.content.related_topics.map((r:string,i:number) => (
                      <button key={i} onClick={() => setQuery(r)} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:20, padding:'3px 10px', cursor:'pointer', fontSize:11, transition:'all 0.12s' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Not yet generated */}
            {!selected.content && !generating && (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.25)' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom:12, opacity:0.3 }}>
                  <path d="M8 38 Q12 34 18 28 L36 10 Q39 7 41 9 Q43 11 40 14 L22 32 Q16 38 12 42Z" fill="#FF9F1C"/>
                  <circle cx="9" cy="39" r="4" fill="#FF9F1C" opacity="0.5"/>
                </svg>
                <div style={{ fontSize:15, fontFamily:"'Fredoka One',sans-serif" }}>Article not yet generated</div>
                <button onClick={() => generateContent(selected)} style={{ marginTop:16, padding:'10px 24px', background:'rgba(255,159,28,0.15)', border:'1px solid rgba(255,159,28,0.3)', color:'#FF9F1C', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  ✦ Generate Article
                </button>
              </div>
            )}

            {/* ── AI Tutor Chat ──────────────────────────────────── */}
            {selected.content && (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:20, marginTop:4 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>
                  🎓 AI Tutor — ask anything about {selected.title}
                </div>

                {/* Chat log */}
                <div ref={chatRef} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:12, marginBottom:10, maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                  {chatLog.length === 0 && (
                    <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12, textAlign:'center', padding:16 }}>
                      Ask a question to start a conversation with your AI art tutor
                    </div>
                  )}
                  {chatLog.map((m, i) => (
                    <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                      {m.role==='ai' && (
                        <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:11, color:'#fff', flexShrink:0 }}>P</div>
                      )}
                      <div style={{
                        background: m.role==='user' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${m.role==='user' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: m.role==='user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding:'8px 12px', maxWidth:'80%',
                        fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:1.6,
                      }}>{m.text}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display:'flex', gap:8 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:11, color:'#fff' }}>P</div>
                      <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px 12px 12px 2px', padding:'10px 14px', color:'rgba(255,255,255,0.4)', fontSize:12 }}>Thinking…</div>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatIn(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder={`Ask about ${selected.title}…`}
                    style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#fff', fontSize:13, outline:'none' }}
                  />
                  <button onClick={sendChat} disabled={chatLoading} style={{ padding:'10px 16px', background:'rgba(139,92,246,0.2)', border:'1px solid rgba(139,92,246,0.35)', color:'#a78bfa', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>
                    Ask →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state (no article selected) ─────────────────── */}
      {!selected && filtered.length > 0 && query === '' && cat === 'all' && (
        <div style={{ display:'none' }}/>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function ArticleRow({ a, selected, onSelect, color }: { a:Article; selected:boolean; onSelect:(a:Article)=>void; color:string }) {
  return (
    <button onClick={() => onSelect(a)} style={{
      width:'100%', background: selected ? `${color}12` : 'transparent',
      border: `1px solid ${selected ? color+'40' : 'transparent'}`,
      borderRadius:10, padding:'8px 10px', cursor:'pointer', textAlign:'left',
      display:'flex', alignItems:'center', gap:8, transition:'all 0.1s',
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background='transparent' }}>
      <div style={{ width:3, height:32, borderRadius:2, background: selected ? color : 'rgba(255,255,255,0.1)', flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color: selected ? '#fff' : 'rgba(255,255,255,0.75)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title}</div>
        {a.content && <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.content.summary?.slice(0,60)}…</div>}
      </div>
      {a.content && <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', flexShrink:0, opacity:0.6 }}/>}
    </button>
  )
}

function Section({ title, color, children }: { title:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color, opacity:0.7, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  )
}
