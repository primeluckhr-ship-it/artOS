import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Lesson {
  id: string; title: string; domain: string; level: string; level_number: number
  age_band_min: number; age_band_max: number; concept: string; image_url?: string
  objectives: string[]; activity_description: string; materials_needed: string[]
  time_minutes: number; reflection_prompts?: string[]; teacher_notes?: string
}

const LVL: Record<string, { color: string; bg: string; label: string; order: number }> = {
  foundation:   { color: '#67e8f9', bg: '#67e8f918', label: 'Foundation',   order: 0 },
  beginner:     { color: '#86efac', bg: '#86efac18', label: 'Beginner',     order: 1 },
  intermediate: { color: '#fde68a', bg: '#fde68a18', label: 'Intermediate', order: 2 },
  advanced:     { color: '#ff9f1c', bg: '#ff9f1c18', label: 'Advanced',     order: 3 },
  expert:       { color: '#c084fc', bg: '#c084fc18', label: 'Expert',       order: 4 },
}

const DOM: Record<string, { label: string; color: string; fallback: string }> = {
  elements_of_art:      { label: 'Elements of Art',      color: '#1ECBE1', fallback: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=700&q=80' },
  principles_of_design: { label: 'Principles of Design', color: '#4ade80', fallback: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80' },
  drawing:              { label: 'Drawing',               color: '#f9a8d4', fallback: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=700&q=80' },
  painting:             { label: 'Painting',              color: '#FF6B35', fallback: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=700&q=80' },
  colour_theory:        { label: 'Colour Theory',         color: '#FFE135', fallback: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=700&q=80' },
  mixed_media:          { label: 'Mixed Media',           color: '#a78bfa', fallback: 'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=700&q=80' },
  art_history:          { label: 'Art History',           color: '#fb923c', fallback: 'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?w=700&q=80' },
}

const PROXY = 'https://hpyznfxnltreviijyhct.supabase.co/functions/v1/ai-proxy'

export default function LessonLibrary({ profile }: { profile: Profile }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterDomain, setFilterDomain] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Lesson | null>(null)
  const [improving, setImproving] = useState(false)
  const [improved, setImproved] = useState<string | null>(null)
  const [tab, setTab] = useState<'activity'|'objectives'|'reflect'>('activity')

  useEffect(() => {
    supabase.from('lesson_library').select('*').eq('is_published', true).order('level_number')
      .then(({ data }) => { setLessons(data || []); setLoading(false) })
  }, [])

  const filtered = lessons.filter(l => {
    if (filterLevel !== 'all' && l.level !== filterLevel) return false
    if (filterDomain !== 'all' && l.domain !== filterDomain) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.title.toLowerCase().includes(q) && !l.concept.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function improveLesson(lesson: Lesson) {
    setImproving(true); setImproved(null)
    try {
      const r = await fetch(PROXY, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 800,
          messages: [{ role: 'user', content: `Rewrite this art lesson activity to be more vivid, specific, and inspiring. Same length. Only return the improved text.\n\nTitle: ${lesson.title}\nLevel: ${lesson.level}\nConcept: ${lesson.concept}\n\nCurrent activity:\n${lesson.activity_description}` }]
        })
      })
      const d = await r.json()
      setImproved(d.content?.[0]?.text || null)
    } catch { setImproved(null) }
    setImproving(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Fredoka One',sans-serif", fontSize: 18 }}>Loading curriculum...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 1 }}>

      {/* Bold header with paint accent */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
          <svg style={{ position:'absolute', bottom:-4, left:0, width:'100%' }} height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
            <path d="M0 6 Q50 2 100 5 Q150 8 200 4" stroke="#FF6B35" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>
          <h1 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 36, color: '#fff', margin: 0, position: 'relative' }}>
            Lesson Library
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', margin: '12px 0 0', fontSize: 15 }}>
          {lessons.length} lessons · 7 domains · Foundation → Expert
        </p>
      </div>

      {/* Level tier filter — coloured pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All', color: '#fff' },
          ...Object.entries(LVL).sort((a,b)=>a[1].order-b[1].order).map(([k,v])=>({ key:k, label:v.label, color:v.color }))
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilterLevel(key)} style={{
            background: filterLevel === key ? color : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${filterLevel === key ? color : 'rgba(255,255,255,0.1)'}`,
            color: filterLevel === key ? (key==='all'?'#000':'#000') : 'rgba(255,255,255,0.5)',
            borderRadius: 24, padding: '6px 16px', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, transition: 'all 0.15s', letterSpacing: 0.4,
          }}>{label}</button>
        ))}
      </div>

      {/* Domain + search row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, opacity:0.4 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or concept..."
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:12, padding:'10px 14px 10px 38px', fontSize:14, outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(DOM).map(([k,v]) => (
            <button key={k} onClick={() => setFilterDomain(filterDomain===k?'all':k)} style={{
              background: filterDomain===k ? v.color+'25' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filterDomain===k ? v.color : 'rgba(255,255,255,0.08)'}`,
              color: filterDomain===k ? v.color : 'rgba(255,255,255,0.35)',
              borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}>{v.label}</button>
          ))}
        </div>
        <span style={{ color:'rgba(255,255,255,0.25)', fontSize:13, whiteSpace:'nowrap' }}>
          {filtered.length} lessons
        </span>
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(lesson => {
          const lm = LVL[lesson.level] || LVL.beginner
          const dm = DOM[lesson.domain] || { label: lesson.domain, color: '#fff', fallback: '' }
          const img = lesson.image_url || dm.fallback
          return (
            <div key={lesson.id} onClick={() => { setSelected(lesson); setImproved(null); setTab('activity') }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.border = `1px solid ${lm.color}60`; e.currentTarget.style.boxShadow = `0 12px 40px ${lm.color}20` }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = '' }}
            >
              {/* Image area */}
              <div style={{ height: 140, position: 'relative', overflow: 'hidden', background: '#0d0820' }}>
                <img src={img} alt="" loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, transition: 'opacity 0.3s' }}
                  onError={e => (e.currentTarget.style.opacity = '0')} />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,8,32,0.85) 100%)` }} />
                {/* Domain colour bar — left edge */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: dm.color, opacity: 0.8 }} />
                {/* Level number on image */}
                <div style={{ position: 'absolute', bottom: 10, left: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily:"'Fredoka One',sans-serif", fontSize: 34, color: lm.color, lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                    {String(lesson.level_number).padStart(2,'0')}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: lm.color, background: lm.bg, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(8px)', border: `1px solid ${lm.color}40` }}>
                    {lm.label}
                  </span>
                </div>
                {/* Time badge top right */}
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '3px 9px', fontSize: 10, color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
                  {lesson.time_minutes} min
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.35 }}>{lesson.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, flex: 1 }}>{lesson.concept}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: dm.color, fontWeight: 700 }}>{dm.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Age {lesson.age_band_min}–{lesson.age_band_max}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Fredoka One',sans-serif", fontSize: 20 }}>No lessons match</p>
        </div>
      )}

      {/* Detail modal */}
      {selected && (() => {
        const lm = LVL[selected.level] || LVL.beginner
        const dm = DOM[selected.domain] || { label: selected.domain, color: '#fff', fallback: '' }
        const img = selected.image_url || dm.fallback
        return (
          <div onClick={() => setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', overflowY:'auto', backdropFilter:'blur(6px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(160deg,#1a1040,#0d1020)', border: `1px solid ${lm.color}30`, borderRadius: 24, maxWidth: 720, width: '100%', overflow: 'hidden', boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px ${lm.color}20` }}>

              {/* Hero */}
              <div style={{ height: 260, position: 'relative', overflow: 'hidden' }}>
                <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.75 }} />
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, rgba(0,0,0,0.2) 0%, #1a1040 100%)` }} />
                {/* Domain colour strip */}
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:6, background:`linear-gradient(180deg, ${dm.color}, ${dm.color}44)` }} />
                {/* Close button */}
                <button onClick={() => setSelected(null)} style={{ position:'absolute', top:16, right:16, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', borderRadius:10, width:36, height:36, cursor:'pointer', fontSize:18, backdropFilter:'blur(8px)' }}>×</button>
                {/* Level overlay */}
                <div style={{ position:'absolute', bottom:20, left:24 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:6 }}>
                    <span style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:56, color:lm.color, lineHeight:1, textShadow:'0 4px 20px rgba(0,0,0,0.8)' }}>
                      {String(selected.level_number).padStart(2,'0')}
                    </span>
                    <span style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:lm.color, background:lm.bg, padding:'4px 12px', borderRadius:24, border:`1px solid ${lm.color}50`, backdropFilter:'blur(8px)' }}>
                      {lm.label}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:dm.color, fontWeight:700 }}>{dm.label}</div>
                </div>
              </div>

              <div style={{ padding: '28px 32px 32px' }}>
                <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:24, color:'#fff', margin:'0 0 8px' }}>{selected.title}</h2>
                <p style={{ color:'rgba(255,255,255,0.55)', fontSize:14, lineHeight:1.7, margin:'0 0 24px' }}>{selected.concept}</p>

                {/* Meta pills */}
                <div style={{ display:'flex', gap:10, marginBottom:28, flexWrap:'wrap' }}>
                  {[['Duration', `${selected.time_minutes} min`], ['Age Group', `${selected.age_band_min}–${selected.age_band_max} yrs`], ['Level', lm.label], ['Domain', dm.label]].map(([l,v]) => (
                    <div key={l} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 16px' }}>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:800, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:14, color:'#fff', fontWeight:600 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Tabbed content */}
                <div style={{ display:'flex', gap:4, marginBottom:20, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4 }}>
                  {([['activity','Activity'], ['objectives','Objectives'], ['reflect','Reflect']] as [typeof tab, string][]).map(([key,label]) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                      flex:1, background: tab===key ? lm.color+'20' : 'none',
                      border: `1px solid ${tab===key ? lm.color+'50' : 'transparent'}`,
                      color: tab===key ? lm.color : 'rgba(255,255,255,0.4)',
                      borderRadius:9, padding:'8px 0', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>

                {tab === 'activity' && (
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, lineHeight:1.85, margin:'0 0 16px' }}>
                      {improved || selected.activity_description}
                    </p>
                    {improved && <div style={{ fontSize:11, color:'#4ade80', fontWeight:700, marginBottom:12 }}>✓ AI improved version</div>}
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Materials</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {selected.materials_needed.map((m,i) => (
                          <span key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 12px', fontSize:12, color:'rgba(255,255,255,0.6)' }}>{m}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => improveLesson(selected)} disabled={improving} style={{ background: improving?'rgba(255,255,255,0.05)':'rgba(139,92,246,0.2)', border:'1px solid rgba(139,92,246,0.4)', color:'#c084fc', borderRadius:10, padding:'10px 20px', cursor: improving?'not-allowed':'pointer', fontSize:13, fontWeight:700 }}>
                        {improving ? 'Improving...' : '✦ AI Improve'}
                      </button>
                      {improved && <button onClick={() => setImproved(null)} style={{ background:'none', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontSize:13 }}>Reset</button>}
                    </div>
                  </div>
                )}

                {tab === 'objectives' && (
                  <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:10 }}>
                    {selected.objectives.map((o,i) => (
                      <li key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <span style={{ flexShrink:0, width:24, height:24, borderRadius:'50%', background:lm.bg, border:`1.5px solid ${lm.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:lm.color, fontWeight:800, marginTop:1 }}>{i+1}</span>
                        <span style={{ color:'rgba(255,255,255,0.75)', fontSize:14, lineHeight:1.6 }}>{o}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {tab === 'reflect' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {(selected.reflection_prompts || ['What did you discover?', 'What challenged you?', 'What would you do differently?']).map((q,i) => (
                      <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${lm.color}20`, borderRadius:12, padding:'14px 16px' }}>
                        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:lm.color, marginBottom:6 }}>Question {i+1}</div>
                        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, lineHeight:1.6, margin:0 }}>{q}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
