import { useState } from 'react'
import { generateMission } from '../lib/api'
import type { MissionCard, GenerateMissionInput } from '../lib/api'
import MissionCardUI from '../components/MissionCard'

interface Profile { id: string; school_id: string; role: string; name: string }
interface Props { profile: Profile; onSignOut: () => void }

const MATERIALS = ['pencil', 'watercolour', 'acrylic paint', 'collage', 'charcoal', 'oil pastel', 'ink', 'clay', 'digital', 'recycled materials']
const AGE_BANDS = ['5-7', '8-10', '11-13', '14-16', '16+']
const THEMES = ['', 'abandoned world', 'underwater city', 'dream landscape', 'creature encounter', 'invisible things', 'weather artist', 'ancient future', 'parallel world']

export default function TeacherApp({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<'generate' | 'lesson'>('generate')
  const [form, setForm] = useState<GenerateMissionInput>({
    age_band: '8-10',
    skill_level: 'beginner',
    time_minutes: 45,
    theme: '',
    available_materials: ['pencil', 'watercolour'],
  })
  const [mission, setMission] = useState<MissionCard | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  function toggleMaterial(m: string) {
    setForm(f => ({
      ...f,
      available_materials: f.available_materials.includes(m)
        ? f.available_materials.filter(x => x !== m)
        : [...f.available_materials, m]
    }))
  }

  async function handleGenerate() {
    if (form.available_materials.length === 0) {
      setError('Please select at least one material.')
      return
    }
    setGenerating(true)
    setError('')
    setMission(null)
    try {
      const res = await generateMission({ ...form, theme: form.theme || undefined })
      setMission(res.mission)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate mission')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="screen">
        {/* Header */}
        <div className="screen-header">
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Teacher</div>
            <h1 style={{ fontSize: 22 }}>Hello, {profile.name.split(' ')[0]} 👋</h1>
          </div>
          <button className="btn btn-ghost" onClick={onSignOut} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E8E4DF' }}>Sign out</button>
        </div>

        {/* Tab switcher */}
        <div className="pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', background: '#F0EDE8', borderRadius: 12, padding: 4 }}>
            {(['generate', 'lesson'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                  borderRadius: 10, fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'generate' ? '✦ Mission' : '📋 Lesson Plan'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'generate' && (
          <>
            {!mission ? (
              <div className="form-section">
                <div style={{ background: 'linear-gradient(135deg, #1E1B18 0%, #2D2926 100%)', borderRadius: 'var(--radius)', padding: '20px 20px 16px', marginBottom: 4 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 18, color: 'white', marginBottom: 4 }}>Generate a Mission</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>Fill in your class details and get a unique creative challenge</div>
                </div>

                <div className="field-group">
                  <label className="field-label">Age Band</label>
                  <select className="field-select" value={form.age_band} onChange={e => setForm(f => ({ ...f, age_band: e.target.value }))}>
                    {AGE_BANDS.map(b => <option key={b} value={b}>Ages {b}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Skill Level</label>
                  <select className="field-select" value={form.skill_level} onChange={e => setForm(f => ({ ...f, skill_level: e.target.value as 'beginner' | 'intermediate' | 'advanced' }))}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Session Time (minutes)</label>
                  <input className="field-input" type="number" min={15} max={120} value={form.time_minutes}
                    onChange={e => setForm(f => ({ ...f, time_minutes: parseInt(e.target.value) || 45 }))} />
                </div>

                <div className="field-group">
                  <label className="field-label">Theme (optional)</label>
                  <select className="field-select" value={form.theme ?? ''} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}>
                    <option value="">Surprise me ✦</option>
                    {THEMES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Available Materials</label>
                  <div className="materials-chips">
                    {MATERIALS.map(m => (
                      <button
                        key={m}
                        className={`material-chip ${form.available_materials.includes(m) ? 'selected' : ''}`}
                        onClick={() => toggleMaterial(m)}
                      >{m}</button>
                    ))}
                  </div>
                </div>

                {error && <p style={{ color: 'var(--coral)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14 }}>{error}</p>}

                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Generating your mission…</>
                  ) : '✦ Generate Mission'}
                </button>
              </div>
            ) : (
              <div style={{ padding: '0 16px' }}>
                <div style={{ marginBottom: 16 }}>
                  <MissionCardUI mission={mission} showTeacherTip={true} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
                  <button className="btn btn-primary" onClick={() => { setMission(null); handleGenerate() }} disabled={generating}>
                    {generating ? 'Regenerating…' : '↻ Generate Another'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setMission(null)}>← Back to Form</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'lesson' && (
          <div className="pad">
            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>📋</div>
              <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: 18 }}>Lesson Generator</h3>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
                Generate a full lesson bundle — warm-up, demonstration guide, rubric, reflection questions, and parent summary — in Phase 1.
              </p>
              <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--amber-light)', borderRadius: 10, fontSize: 13, color: '#92400E', fontFamily: 'Nunito, sans-serif', fontWeight: 700, textAlign: 'center' }}>
                🚧 Coming in Phase 1 — generate-lesson Edge Function is ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {[
          { id: 'generate', icon: '✦', label: 'Missions' },
          { id: 'lesson', icon: '📋', label: 'Lessons' },
        ].map(t => (
          <button key={t.id} className={`nav-tab nunito ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as 'generate' | 'lesson')}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
