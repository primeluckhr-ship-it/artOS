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
          max_tokens: 4000,
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

Respond ONLY with valid JSON — no markdown fences, no preamble. Structure:
{
  "summary": "3-4 sentence authoritative overview: period, geographic origin, defining characteristics, lasting significance",
  "overview": "5-6 substantial paragraphs: (1) historical/political/cultural forces that produced this movement; (2) core philosophical and aesthetic principles — what was radical or new; (3) internal development, key phases, factions; (4) relationship to preceding and concurrent movements; (5) decline, transformation, and influence on what followed. Reference specific named works, artists, dates throughout.",
  "key_concepts": [{"concept": "specific formal or conceptual characteristic", "explanation": "2-3 sentences: precise definition, how it appears in actual artworks, what makes it distinctive"}],
  "techniques": [{"name": "technique or formal method used by artists of this movement", "steps": "Technical description a practising artist could learn from. Include materials, process, and self-evaluation criteria."}],
  "famous_examples": [{"work": "Title (Year) by Artist — Collection, City", "note": "2-3 sentence analysis: what to look for, what it exemplifies, why it matters"}],
  "exercises": [
    {"title": "Studio exercise", "description": "Multi-step studio project engaging seriously with this movement's aesthetic principles. Not pastiche — genuine investigation. Specific materials, process steps, and evaluation criteria. For intermediate adult learners.", "time": "2-4 hours", "level": "Intermediate"},
    {"title": "Advanced project", "description": "A sustained studio or research project requiring deeper engagement. Could span several sessions.", "time": "Multiple sessions", "level": "Advanced"},
    {"title": "Contextual study", "description": "Museum visit (physical or virtual), primary source reading, or comparative analysis exercise.", "time": "2-3 hours", "level": "All levels"}
  ],
  "critical_perspectives": "2-3 paragraphs: how critics and historians have evaluated this movement over time, revisionist readings, ongoing debates, contested legacy, cultural politics where relevant",
  "beginner_tip": "The single insight that most unlocks genuine understanding — not a platitude but a specific key to engaging with this movement critically",
  "fun_fact": "One specific, surprising, and genuinely illuminating detail — a lesser-known fact that reveals something important about the movement or its context",
  "related_topics": ["5-7 related movements, artists, or concepts"]
}`

    if (isArtist) return `You are a specialist art historian. Write a comprehensive, critically informed profile of: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence authoritative overview: nationality, dates, movements, distinctive contribution, historical significance",
  "overview": "5-6 substantial paragraphs: (1) biographical context and formative training; (2) early career and development; (3) mature period and major works with specific analysis; (4) position among contemporaries and in art history; (5) critical reception during their lifetime; (6) posthumous legacy and influence on later artists",
  "key_concepts": [{"concept": "defining formal, thematic, or conceptual characteristic", "explanation": "2-3 sentence analysis with reference to specific works"}],
  "techniques": [{"name": "specific technique or formal method", "steps": "Detailed description a practising artist could study and attempt. Specific enough to be genuinely useful."}],
  "famous_examples": [{"work": "Title (Year) — Collection, City", "note": "2-3 sentence formal analysis: what to look for and why it matters"}],
  "exercises": [
    {"title": "Formal study", "description": "A studio exercise engaging with a specific aspect of this artist's technique or formal concerns — not copying but genuine investigation of their methods. Specific materials and process.", "time": "2-3 hours", "level": "Intermediate"},
    {"title": "Sustained response", "description": "A deeper project: sustained study of their working methods or a personal response to their thematic concerns in a contemporary context.", "time": "Multiple sessions", "level": "Advanced"}
  ],
  "critical_perspectives": "2-3 paragraphs: changing critical valuations, contested interpretations, identity and cultural politics where relevant, any controversies, market dynamics",
  "beginner_tip": "The single most important insight for genuinely engaging with this artist's work — what unlocks real appreciation rather than surface response",
  "fun_fact": "One specific, surprising detail that reveals something about character, working method, or historical context",
  "related_topics": ["5-7 related artists, movements, or topics"]
}`

    if (isTechnique || isFundament) return `You are a practising artist and experienced art educator. Write a rigorous, technically detailed article about: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence precise definition and overview: what it is, why it matters, what it enables in practice",
  "overview": "4-5 substantial paragraphs: (1) precise technical definition with real depth; (2) perceptual and cognitive basis — what it does to the viewer's experience and why; (3) how master artists across history have understood and used it; (4) common errors and misconceptions; (5) how mastery unlocks other aspects of practice",
  "key_concepts": [{"concept": "specific sub-concept, variation, or application", "explanation": "2-3 sentence precise technical explanation with reference to actual artworks or practice"}],
  "techniques": [{"name": "specific method for developing skill in this area", "steps": "Step-by-step technical guidance with specific materials, process, and self-evaluation criteria. Detailed enough to actually follow."}],
  "famous_examples": [{"work": "Title (Year) by Artist", "note": "Analysis of how this element functions in this specific work — what decisions the artist made and what effect they achieve"}],
  "exercises": [
    {"title": "Observational foundation", "description": "A structured perceptual exercise building fundamental awareness. Specific materials, steps, duration, and what to notice.", "time": "20-45 min", "level": "All levels"},
    {"title": "Technical study", "description": "A sustained exercise building genuine skill. Specific challenge, process, and criteria for evaluating your own results.", "time": "1-3 hours", "level": "Intermediate"},
    {"title": "Advanced application", "description": "A project-based exercise applying this understanding at a high level. Could span multiple sessions.", "time": "Multiple sessions", "level": "Advanced"}
  ],
  "critical_perspectives": "1-2 paragraphs: how understanding of this element has evolved in art education and theory, any pedagogical debates, how different traditions have approached it",
  "beginner_tip": "The single most important insight — the thing adult learners most need to understand to make real progress with this",
  "fun_fact": "One fascinating specific detail about how this works perceptually, historically, or in practice",
  "related_topics": ["5-7 related elements, techniques, concepts"]
}`

    if (isMaterial) return `You are a materials specialist and practising artist. Write a comprehensive, technically authoritative article about ${base} as an art material.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence overview: what it is, primary uses in fine art, distinctive handling characteristics",
  "overview": "4-5 paragraphs: (1) composition and how it works chemically/physically; (2) historical development and use with specific artists and periods; (3) handling characteristics — how it behaves, what it demands, what it enables; (4) relationship to other materials, advantages and limitations; (5) contemporary availability, archival considerations, and professional use",
  "key_concepts": [{"concept": "specific property, characteristic, or consideration", "explanation": "precise technical explanation relevant to an artist actually working with this material"}],
  "techniques": [{"name": "specific technique using this material", "steps": "Step-by-step technical guidance — preparation, application, finishing. Enough detail to be genuinely actionable."}],
  "famous_examples": [{"work": "Title (Year) by Artist", "note": "What this example reveals about the material's possibilities or an artist's distinctive use of it"}],
  "exercises": [
    {"title": "Material investigation", "description": "A structured exploration of this material's range, behaviour, and possibilities. Specific tasks and what to discover about its character.", "time": "2-3 hours", "level": "Beginner to Intermediate"},
    {"title": "Technical mastery study", "description": "A focused exercise developing a specific, demanding skill with this material.", "time": "3-5 hours", "level": "Intermediate to Advanced"}
  ],
  "critical_perspectives": "Archival quality rating, safety and toxicity notes, environmental considerations, cost and accessibility, what conservators and professional artists advise about long-term use",
  "beginner_tip": "The most important thing to understand before working with this material — what prevents the most common and costly beginner mistakes",
  "fun_fact": "One genuinely interesting historical or scientific fact about this material",
  "related_topics": ["5-6 related materials, techniques, or topics"]
}`

    if (isMuseum) return `You are an art historian and gallery educator. Write a comprehensive, critically informed guide to: ${base}.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence overview: location, founding, collection scope, and what makes this institution distinctively significant",
  "overview": "4-5 paragraphs: (1) founding history — who, when, why, and under what circumstances; (2) collection scope, key strengths, and distinctive holdings; (3) role in shaping art historical discourse, the canon, and public taste; (4) notable acquisitions, controversies, or landmark exhibitions; (5) visiting experience — architecture, approach to display, what to know before you go",
  "key_concepts": [{"concept": "key aspect of collection, philosophy, or significance", "explanation": "substantive explanation of why this matters for understanding the institution and engaging with it"}],
  "techniques": [{"name": "approach to studying in this collection", "steps": "How to get maximum value from a visit (physical or virtual) — what to prioritise, how to engage, what supplementary resources to use"}],
  "famous_examples": [{"work": "Title (Year) by Artist — a defining work in this collection", "note": "Why this work matters and what it reveals about the collection's particular strengths or institutional history"}],
  "exercises": [
    {"title": "Structured collection study", "description": "A specific, task-driven way to engage with this collection online or in person. Clear tasks and reflection questions for adult learners.", "time": "Half to full day", "level": "All levels"},
    {"title": "Comparative formal analysis", "description": "Select two works from different periods or movements in the collection. Write a 600-900 word comparative formal and contextual analysis.", "time": "3-4 hours including research", "level": "Intermediate to Advanced"}
  ],
  "critical_perspectives": "2 paragraphs: debates about acquisition ethics, provenance and repatriation issues, decolonisation, the canon it represents, access and inclusion, and how the institution has or hasn't evolved",
  "beginner_tip": "The single most important piece of advice for a first-time visitor or someone engaging with the collection remotely",
  "fun_fact": "One specific and surprising detail — an unusual acquisition story, architectural fact, or historical incident",
  "related_topics": ["5-6 related museums, collections, or topics"]
}`

    return `You are an expert visual arts educator and critic. Write a rigorous, intellectually serious article about ${base} for adult art learners.

${aud}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{
  "summary": "3-4 sentence authoritative overview",
  "overview": "4-5 substantial paragraphs with real intellectual depth — historical context, critical significance, technical specifics, contemporary relevance",
  "key_concepts": [{"concept": "specific concept", "explanation": "2-3 sentence precise, technically accurate explanation"}],
  "techniques": [{"name": "technique", "steps": "detailed, actionable technical guidance specific enough to be genuinely useful"}],
  "famous_examples": [{"work": "Specific Work (Year) by Artist", "note": "analytical note with formal analysis, not just description"}],
  "exercises": [
    {"title": "title", "description": "detailed multi-step studio or research exercise appropriate for adult learners", "time": "estimate", "level": "level"},
    {"title": "title", "description": "more advanced or sustained exercise", "time": "estimate", "level": "level"}
  ],
  "critical_perspectives": "1-2 paragraphs on critical debates, contested aspects, historical reception",
  "beginner_tip": "The single most important insight — specific and actionable, not a platitude",
  "fun_fact": "One specific and illuminating fact",
  "related_topics": ["5-7 related topics"]
}`
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
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, messages }),
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
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'#a78bfa' }}>Exercise {i+1}: {ex.title}</div>
                            <div style={{ display:'flex', gap:5 }}>
                              {ex.level && <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:0.8, background:'rgba(167,139,250,0.2)', borderRadius:20, padding:'2px 8px', color:'#a78bfa' }}>{ex.level}</span>}
                              {ex.time && <span style={{ fontSize:10, background:'rgba(255,255,255,0.06)', borderRadius:20, padding:'2px 8px', color:'rgba(255,255,255,0.4)' }}>⏱ {ex.time}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.75 }}>{ex.description}</div>
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
                {/* Critical perspectives */}
                {selected.content.critical_perspectives && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px 16px', marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Critical Perspectives</div>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:13, lineHeight:1.8, margin:0, whiteSpace:'pre-line' }}>{selected.content.critical_perspectives}</p>
                  </div>
                )}

                {selected.content.related_topics?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', alignSelf:'center' }}>Explore next:</span>
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
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:8, marginBottom:16 }}>First visit generates a full in-depth article — cached permanently after that</div>
                <button onClick={() => generateContent(selected)} style={{ padding:'10px 24px', background:'rgba(255,159,28,0.15)', border:'1px solid rgba(255,159,28,0.3)', color:'#FF9F1C', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  ✦ Generate Article
                </button>
              </div>
            )}

            {/* Regenerate button for already-generated articles */}
            {selected.content && !generating && (
              <div style={{ textAlign:'right', marginTop:-12, marginBottom:8 }}>
                <button onClick={async () => {
                  await supabase.from('knowledge_articles').update({ content: null, generated_at: null }).eq('id', selected.id)
                  setSelected(prev => prev ? { ...prev, content: null } : prev)
                  setTimeout(() => generateContent({ ...selected, content: null }), 100)
                }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:11, padding:'4px 8px' }}>
                  ↺ Regenerate article
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
