import { useState } from 'react'
import { callFunction } from '../lib/supabase'
import { Profile } from '../App'

interface Mission {
  id: string
  theme: string
  story_premise: string
  constraints: string[]
  materials: string[]
  time_minutes: number
  difficulty: number
  learning_outcomes: string[]
  curriculum_tags: string[]
  age_band: string
  teacher_tip: string
  extension_activity: string
}

const AGE_BANDS = ['5-7', '8-10', '11-13', '14-16', '16+']
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced']
const THEMES = ['', 'abandoned world', 'underwater city', 'dream landscape', 'creature encounter', 'miniature world', 'invisible things', 'weather artist', 'parallel world', 'living machine', 'ancient future']
const COMMON_MATERIALS = ['pencil', 'paper', 'watercolour', 'acrylic paint', 'collage', 'charcoal', 'marker', 'oil pastel', 'clay', 'recycled materials']

export default function TeacherView({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    age_band: '8-10',
    skill_level: 'beginner',
    time_minutes: 45,
    theme: '',
    available_materials: ['pencil', 'paper', 'watercolour'],
  })
  const [mission, setMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleMaterial(m: string) {
    setForm(f => ({
      ...f,
      available_materials: f.available_materials.includes(m)
        ? f.available_materials.filter(x => x !== m)
        : [...f.available_materials, m]
    }))
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const result = await callFunction('generate-mission', 'POST', form)
      setMission(result.mission)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: '#FF9F1C', marginBottom: 6 }}>
          Create a Mission ✨
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Set the parameters and generate a unique creative challenge for your class.
        </p>
      </div>

      {/* Form */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <FormGroup label="Age Band">
            <Select value={form.age_band} onChange={v => setForm(f => ({ ...f, age_band: v }))} options={AGE_BANDS} />
          </FormGroup>
          <FormGroup label="Skill Level">
            <Select value={form.skill_level} onChange={v => setForm(f => ({ ...f, skill_level: v }))} options={SKILL_LEVELS} capitalize />
          </FormGroup>
          <FormGroup label="Session Time (mins)">
            <input
              type="number"
              value={form.time_minutes}
              onChange={e => setForm(f => ({ ...f, time_minutes: Number(e.target.value) }))}
              min={15} max={90} step={5}
              style={inputStyle}
            />
          </FormGroup>
          <FormGroup label="Theme (optional)">
            <Select value={form.theme} onChange={v => setForm(f => ({ ...f, theme: v }))}
              options={THEMES} labels={['Random ✨', ...THEMES.slice(1).map(t => t.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))]} />
          </FormGroup>
        </div>

        <FormGroup label="Available Materials">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {COMMON_MATERIALS.map(m => (
              <button
                key={m}
                onClick={() => toggleMaterial(m)}
                style={{
                  background: form.available_materials.includes(m) ? '#FF9F1C' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: 20,
                  padding: '6px 14px',
                  color: form.available_materials.includes(m) ? '#fff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </FormGroup>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ff8080', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || form.available_materials.length === 0}
        style={{
          width: '100%',
          background: loading ? 'rgba(255,159,28,0.4)' : 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
          border: 'none',
          borderRadius: 16,
          padding: '16px 24px',
          color: '#fff',
          fontFamily: 'Fredoka One',
          fontSize: 18,
          cursor: loading ? 'wait' : 'pointer',
          marginBottom: 32,
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.4)',
        }}
      >
        {loading ? '✨ Generating your mission...' : '✨ Generate Mission'}
      </button>

      {/* Mission Card */}
      {mission && <MissionCard mission={mission} onRegenerate={generate} loading={loading} />}
    </div>
  )
}

function MissionCard({ mission, onRegenerate, loading }: { mission: Mission; onRegenerate: () => void; loading: boolean }) {
  const difficultyStars = Array.from({ length: 10 }, (_, i) => i < mission.difficulty ? '★' : '☆').join('')

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FF6B35, #FF9F1C, #FFE135)',
      borderRadius: 24,
      padding: 2,
      boxShadow: '0 8px 40px rgba(255,107,53,0.3)',
      marginBottom: 24,
    }}>
      <div style={{ background: 'linear-gradient(160deg, #0D0A2E 0%, #1A0F45 100%)', borderRadius: 22, padding: 24 }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ background: 'rgba(255,159,28,0.2)', border: '1px solid rgba(255,159,28,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#FF9F1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              {mission.theme}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#FFE135', fontSize: 13, letterSpacing: 2 }}>{difficultyStars}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Difficulty {mission.difficulty}/10</div>
          </div>
        </div>

        {/* Story premise — the heart of it */}
        <p style={{
          fontFamily: 'Fredoka One',
          fontSize: 20,
          lineHeight: 1.4,
          color: '#fff',
          marginBottom: 20,
          padding: '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {mission.story_premise}
        </p>

        {/* Constraint */}
        <div style={{ marginBottom: 16 }}>
          <Label>Creative Constraint</Label>
          {mission.constraints.map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 12, padding: '10px 14px', color: '#FF6B35', fontSize: 14, fontWeight: 600 }}>
              ⚡ {c}
            </div>
          ))}
        </div>

        {/* Materials */}
        <div style={{ marginBottom: 16 }}>
          <Label>Materials</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mission.materials.map((m, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <MetaPill icon="⏱️" label={`${mission.time_minutes} min`} />
          <MetaPill icon="📚" label={mission.age_band} />
          {mission.curriculum_tags.slice(0, 2).map((t, i) => (
            <MetaPill key={i} icon="🏷️" label={t.replace('_', ' ')} />
          ))}
        </div>

        {/* Learning outcomes */}
        <div style={{ marginBottom: 20 }}>
          <Label>Learning Outcomes</Label>
          {mission.learning_outcomes.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: '#1ECBE1', marginTop: 2, flexShrink: 0 }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.5 }}>{o}</span>
            </div>
          ))}
        </div>

        {/* Teacher tip */}
        <div style={{ background: 'rgba(30,203,225,0.08)', border: '1px solid rgba(30,203,225,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ color: '#1ECBE1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>💡 Teacher Tip</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{mission.teacher_tip}</p>
        </div>

        {/* Extension */}
        <div style={{ background: 'rgba(255,225,53,0.06)', border: '1px solid rgba(255,225,53,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ color: '#FFE135', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🚀 Extension Activity</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{mission.extension_activity}</p>
        </div>

        <button
          onClick={onRegenerate}
          disabled={loading}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          {loading ? '⏳ Generating...' : '🔄 Generate another mission'}
        </button>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>{children}</div>
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  )
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options, labels, capitalize }: {
  value: string; onChange: (v: string) => void; options: string[]; labels?: string[]; capitalize?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
    >
      {options.map((o, i) => (
        <option key={o} value={o}>
          {labels ? labels[i] : (capitalize ? o.charAt(0).toUpperCase() + o.slice(1) : o)}
        </option>
      ))}
    </select>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}
