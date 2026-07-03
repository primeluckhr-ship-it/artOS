import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Lesson {
  id: string; title: string; domain: string; level: string; level_number: number
  age_band_min: number; age_band_max: number; concept: string
  objectives: string[]; activity_description: string; materials_needed: string[]; time_minutes: number
}

const LEVEL_META: Record<string, { color: string; bg: string; label: string; order: number }> = {
  foundation:   { color: '#67e8f9', bg: 'rgba(103,232,249,0.12)', label: 'Foundation',   order: 0 },
  beginner:     { color: '#86efac', bg: 'rgba(134,239,172,0.12)', label: 'Beginner',     order: 1 },
  intermediate: { color: '#fde68a', bg: 'rgba(253,230,138,0.12)', label: 'Intermediate', order: 2 },
  advanced:     { color: '#ff9f1c', bg: 'rgba(255,159,28,0.12)',  label: 'Advanced',     order: 3 },
  expert:       { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', label: 'Expert',       order: 4 },
}

const DOMAIN_META: Record<string, { label: string; color: string }> = {
  elements_of_art:      { label: 'Elements of Art',      color: '#1ECBE1' },
  principles_of_design: { label: 'Principles of Design', color: '#4ade80' },
  drawing:              { label: 'Drawing',               color: '#f9a8d4' },
  painting:             { label: 'Painting',              color: '#FF6B35' },
  colour_theory:        { label: 'Colour Theory',         color: '#FFE135' },
  mixed_media:          { label: 'Mixed Media',           color: '#a78bfa' },
  art_history:          { label: 'Art History',           color: '#fb923c' },
}

const DOMAIN_IMAGES: Record<string, string> = {
  elements_of_art:      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=75',
  principles_of_design: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=75',
  drawing:              'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=600&q=75',
  painting:             'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=75',
  colour_theory:        'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=600&q=75',
  mixed_media:          'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=600&q=75',
  art_history:          'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?w=600&q=75',
}

const PROXY_URL = 'https://hpyznfxnltreviijyhct.supabase.co/functions/v1/ai-proxy'

export default function LessonLibrary({ profile }: { profile: Profile }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Lesson | null>(null)
  const [improving, setImproving] = useState(false)
  const [improved, setImproved] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('lesson_library').select('*').eq('is_published', true).order('level_number')
      .then(({ data }) => { setLessons(data || []); setLoading(false) })
  }, [])

  const filtered = lessons.filter(l => {
    if (filterLevel !== 'all' && l.level !== filterLevel) return false
    if (filterDomain !== 'all' && l.domain !== filterDomain) return false
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) &&
        !l.concept.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function improveLesson(lesson: Lesson) {
    setImproving(true); setImproved(null)
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are an expert art educator. Improve this lesson activity description to be more vivid, inspiring, and specific. Keep the same structure and length. Return only the improved description, no preamble.\n\nLESSON: ${lesson.title} (Level ${lesson.level_number} — ${lesson.level})\nCONCEPT: ${lesson.concept}\nCURRENT DESCRIPTION: ${lesson.activity_description}`
          }]
        })
      })
      const data = await res.json()
      setImproved(data.content?.[0]?.text || 'Could not improve lesson.')
    } catch (e) { setImproved(`Error: ${String(e)}`) }
    setImproving(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Fredoka One',sans-serif" }}>Loading curriculum...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 28, color: '#fff', margin: 0 }}>Lesson Library</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 14 }}>
          {lessons.length} lessons · Foundation through Expert
        </p>
      </div>

      {/* Level tier filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All Levels', color: 'rgba(255,255,255,0.6)' },
          ...Object.entries(LEVEL_META).sort((a,b) => a[1].order - b[1].order)
            .map(([k,v]) => ({ key: k, label: v.label, color: v.color }))
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilterLevel(key)} style={{
            background: filterLevel === key ? color : 'rgba(255,255,255,0.06)',
            border: `1px solid ${filterLevel === key ? color : 'rgba(255,255,255,0.1)'}`,
            color: filterLevel === key ? '#000' : 'rgba(255,255,255,0.5)',
            borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Search + domain filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lessons..."
          style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, outline: 'none' }} />
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
          style={{ background: '#1a1040', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          <option value="all">All Domains</option>
          {Object.entries(DOMAIN_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          {filtered.length} lesson{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lesson grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(lesson => {
          const lm = LEVEL_META[lesson.level] || LEVEL_META.beginner
          const dm = DOMAIN_META[lesson.domain] || { label: lesson.domain, color: '#fff' }
          const img = DOMAIN_IMAGES[lesson.domain]
          return (
            <div key={lesson.id} onClick={() => { setSelected(lesson); setImproved(null) }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, cursor: 'pointer', transition: 'all 0.15s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => (e.currentTarget.style.border = `1px solid ${lm.color}55`)}
              onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)')}
            >
              {/* Domain cover image */}
              {img && (
                <div style={{ height: 80, overflow: 'hidden', position: 'relative' }}>
                  <img src={img} alt={dm.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 20%, #0d0820)` }} />
                  {/* Level number overlaid on image */}
                  <div style={{ position: 'absolute', bottom: 8, left: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 28, color: lm.color, lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {String(lesson.level_number).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: lm.color, background: lm.bg, borderRadius: 20, padding: '2px 8px', backdropFilter: 'blur(4px)' }}>
                      {lm.label}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!img && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 30, color: lm.color }}>
                      {String(lesson.level_number).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: lm.color, background: lm.bg, borderRadius: 20, padding: '2px 8px' }}>
                      {lm.label}
                    </span>
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>{lesson.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{lesson.concept}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 11, color: dm.color, fontWeight: 600 }}>{dm.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{lesson.time_minutes} min · Age {lesson.age_band_min}–{lesson.age_band_max}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 60, fontFamily: "'Fredoka One',sans-serif", fontSize: 18 }}>
          No lessons match your filters
        </div>
      )}

      {/* Lesson detail modal */}
      {selected && (() => {
        const lm = LEVEL_META[selected.level] || LEVEL_META.beginner
        const dm = DOMAIN_META[selected.domain] || { label: selected.domain, color: '#fff' }
        const img = DOMAIN_IMAGES[selected.domain]
        return (
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a1040,#0d1020)', border: `1px solid ${lm.color}44`, borderRadius: 20, maxWidth: 680, width: '100%', overflow: 'hidden' }}>
              {/* Hero image */}
              {img && (
                <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                  <img src={img} alt={dm.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, #1a1040)' }} />
                  <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, backdropFilter: 'blur(4px)' }}>×</button>
                  <div style={{ position: 'absolute', bottom: 16, left: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 52, color: lm.color, lineHeight: 1, textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}>
                      {String(selected.level_number).padStart(2, '0')}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: lm.color, marginBottom: 2 }}>Level {selected.level_number} · {lm.label}</div>
                      <div style={{ fontSize: 12, color: dm.color, fontWeight: 600 }}>{dm.label}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: 28 }}>
                {!img && (
                  <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
                )}

                <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 22, color: '#fff', margin: '0 0 8px' }}>{selected.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>{selected.concept}</p>

                {/* Meta pills */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                  {[{ l: 'Duration', v: `${selected.time_minutes} min` }, { l: 'Age', v: `${selected.age_band_min}–${selected.age_band_max} yrs` }, { l: 'Level', v: lm.label }].map(({ l, v }) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 14px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <Section title="Learning Objectives" color={lm.color}>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.objectives.map((o, i) => <li key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5 }}>{o}</li>)}
                  </ul>
                </Section>

                <Section title="Activity" color={lm.color}>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    {improved || selected.activity_description}
                  </p>
                  {improved && <div style={{ marginTop: 8, fontSize: 11, color: '#4ade80', fontWeight: 600 }}>✓ AI improved version</div>}
                </Section>

                <Section title="Materials" color={lm.color}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.materials_needed.map((m, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m}</span>
                    ))}
                  </div>
                </Section>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={() => improveLesson(selected)} disabled={improving} style={{ background: improving ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c084fc', borderRadius: 10, padding: '10px 20px', cursor: improving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {improving ? 'Improving...' : '✦ AI Improve Activity'}
                  </button>
                  {improved && (
                    <button onClick={() => setImproved(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>Reset</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
