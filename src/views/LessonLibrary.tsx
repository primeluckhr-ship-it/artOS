import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../App'

interface Lesson {
  id: string
  title: string
  domain: string
  level: string
  level_number: number
  age_band_min: number
  age_band_max: number
  concept: string
  objectives: string[]
  activity_description: string
  materials_needed: string[]
  time_minutes: number
  teacher_notes: string | null
  is_published: boolean
}

const DOMAIN_LABELS: Record<string, string> = {
  elements_of_art: 'Elements of Art',
  principles_of_design: 'Principles of Design',
  drawing: 'Drawing', painting: 'Painting',
  sculpture: 'Sculpture', printmaking: 'Printmaking',
  digital_art: 'Digital Art', mixed_media: 'Mixed Media',
  art_history: 'Art History', colour_theory: 'Colour Theory',
}

const DOMAIN_COLORS: Record<string, string> = {
  elements_of_art: '#FF6B35', principles_of_design: '#8B5CF6',
  drawing: '#1ECBE1', painting: '#FF9F1C', sculpture: '#4ade80',
  printmaking: '#f472b6', colour_theory: '#FFE135',
  digital_art: '#60a5fa', mixed_media: '#a78bfa', art_history: '#fb923c',
}

const LEVEL_COLORS: Record<string, string> = {
  foundation: '#4ade80', beginner: '#1ECBE1',
  intermediate: '#FF9F1C', advanced: '#FF6B35', expert: '#8B5CF6',
}

export default function LessonLibrary({ profile }: { profile: Profile }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterAge, setFilterAge] = useState<number>(10)
  const [improving, setImproving] = useState<string | null>(null)
  const [improvedText, setImprovedText] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('lesson_library')
      .select('*')
      .eq('is_published', true)
      .order('level_number', { ascending: true })
    setLessons(data || [])
    setLoading(false)
  }

  async function improveWithAI(lesson: Lesson) {
    setImproving(lesson.id)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are an expert visual arts educator. Improve this lesson activity description to make it more vivid, creative, and engaging for students aged ${lesson.age_band_min}–${lesson.age_band_max}. Keep the same core concept but make the language more inspiring and the activity more imaginative. Return ONLY the improved activity description, nothing else.\n\nOriginal:\n${lesson.activity_description}`,
          }]
        })
      })
      const data = await res.json()
      const improved = data.content?.[0]?.text || lesson.activity_description
      setImprovedText(prev => ({ ...prev, [lesson.id]: improved }))
    } catch (e) {
      console.error('AI improvement failed:', e)
    } finally {
      setImproving(null)
    }
  }

  const filtered = lessons.filter(l => {
    if (filterDomain !== 'all' && l.domain !== filterDomain) return false
    if (filterLevel !== 'all' && l.level !== filterLevel) return false
    if (filterAge < l.age_band_min || filterAge > l.age_band_max) return false
    return true
  })

  const domains = [...new Set(lessons.map(l => l.domain))]
  const levels = ['foundation', 'beginner', 'intermediate', 'advanced', 'expert']

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>📚</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Fredoka One',sans-serif" }}>Loading lesson library...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 26, color: '#FF6B35', marginBottom: 4 }}>
          📚 Lesson Library
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          Structured art curriculum from foundations to advanced — each lesson AI-enhanced and age-calibrated.
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Domain</label>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="all">All domains</option>
            {domains.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d] || d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Level</label>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="all">All levels</option>
            {levels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
            Student Age: <span style={{ color: '#FFE135', fontWeight: 700 }}>{filterAge}</span>
          </label>
          <input type="range" min={5} max={18} value={filterAge} onChange={e => setFilterAge(+e.target.value)}
            style={{ width: '100%', accentColor: '#FF6B35' }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 18 }}>
          {filtered.length} lesson{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lesson cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>No lessons match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(lesson => {
            const isOpen = expanded === lesson.id
            const domainColor = DOMAIN_COLORS[lesson.domain] || '#FF6B35'
            const levelColor = LEVEL_COLORS[lesson.level] || '#FF9F1C'
            const improved = improvedText[lesson.id]

            return (
              <div key={lesson.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
                {/* Header row */}
                <div onClick={() => setExpanded(isOpen ? null : lesson.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Level badge */}
                  <div style={{ background: domainColor + '22', border: `1px solid ${domainColor}44`, borderRadius: 12, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Fredoka One',sans-serif", color: domainColor, fontSize: 20, lineHeight: 1 }}>{lesson.level_number}</div>
                    <div style={{ color: domainColor, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>LVL</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ background: domainColor + '22', border: `1px solid ${domainColor}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, color: domainColor, fontWeight: 700 }}>
                        {DOMAIN_LABELS[lesson.domain]}
                      </span>
                      <span style={{ background: levelColor + '22', border: `1px solid ${levelColor}44`, borderRadius: 20, padding: '2px 10px', fontSize: 11, color: levelColor, fontWeight: 700 }}>
                        {lesson.level.charAt(0).toUpperCase() + lesson.level.slice(1)}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        Ages {lesson.age_band_min}–{lesson.age_band_max} · {lesson.time_minutes}min
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 17, color: '#fff', margin: 0, marginBottom: 4 }}>{lesson.title}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>{lesson.concept}</p>
                  </div>

                  <div style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px', background: 'rgba(0,0,0,0.15)' }}>
                    {/* Objectives */}
                    <div style={{ marginBottom: 18 }}>
                      <Label>Learning Objectives</Label>
                      {lesson.objectives.map((o, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                          <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5 }}>{o}</span>
                        </div>
                      ))}
                    </div>

                    {/* Activity */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Label>The Activity</Label>
                        {profile.role !== 'student' && (
                          <button onClick={() => improveWithAI(lesson)} disabled={improving === lesson.id}
                            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 8, padding: '4px 12px', color: '#a78bfa', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            {improving === lesson.id ? '⏳ Improving...' : '✨ AI Improve'}
                          </button>
                        )}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        {improved || lesson.activity_description}
                      </p>
                      {improved && (
                        <div style={{ marginTop: 8, color: '#a78bfa', fontSize: 11, fontStyle: 'italic' }}>✨ AI-enhanced version — original preserved in database</div>
                      )}
                    </div>

                    {/* Materials */}
                    <div>
                      <Label>Materials Needed</Label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {lesson.materials_needed.map((m, i) => (
                          <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m}</span>
                        ))}
                      </div>
                    </div>

                    {lesson.teacher_notes && profile.role !== 'student' && (
                      <div style={{ marginTop: 16, background: 'rgba(255,159,28,0.08)', border: '1px solid rgba(255,159,28,0.2)', borderRadius: 11, padding: '12px 14px' }}>
                        <Label>📝 Teacher Notes</Label>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{lesson.teacher_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{children}</div>
}
