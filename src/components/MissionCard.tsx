import type { MissionCard as Mission } from '../lib/api'

interface Props {
  mission: Mission
  showTeacherTip?: boolean
}

const DIFFICULTY_LABELS = ['', 'Starter', 'Starter', 'Easy', 'Easy', 'Medium', 'Medium', 'Challenging', 'Challenging', 'Advanced', 'Expert']
const DIFFICULTY_COLORS = ['', '#10B981', '#10B981', '#10B981', '#10B981', '#F59E0B', '#F59E0B', '#F59E0B', '#FF5733', '#FF5733', '#6366F1']

export default function MissionCardUI({ mission, showTeacherTip = false }: Props) {
  const diffLabel = DIFFICULTY_LABELS[mission.difficulty] ?? 'Medium'
  const diffColor = DIFFICULTY_COLORS[mission.difficulty] ?? '#F59E0B'

  return (
    <div className="mission-card typewriter-reveal">
      {/* Dark header — the briefing */}
      <div className="mission-card-header">
        <div className="mission-theme">✦ {mission.theme}</div>
        <div className="mission-premise">{mission.story_premise}</div>
      </div>

      {/* Body */}
      <div className="mission-card-body">
        {/* Meta row */}
        <div className="mission-meta-row">
          <span className="pill pill-coral">⏱ {mission.time_minutes} min</span>
          <span className="pill" style={{ background: `${diffColor}18`, color: diffColor }}>
            ⚡ {diffLabel}
          </span>
          {mission.age_band && (
            <span className="pill pill-indigo">👤 Ages {mission.age_band}</span>
          )}
        </div>

        {/* Constraint — the creative rule */}
        {mission.constraints.map((c, i) => (
          <div key={i} className="constraint-badge">
            <span className="constraint-icon">🎯</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: 3, fontFamily: 'Nunito, sans-serif' }}>Your Rule</div>
              <div className="constraint-text">{c}</div>
            </div>
          </div>
        ))}

        {/* Materials */}
        <div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>You'll need</div>
          <div className="materials-row">
            {mission.materials.map((m, i) => (
              <span key={i} className="pill pill-amber" style={{ fontSize: 13 }}>🖌 {m}</span>
            ))}
          </div>
        </div>

        {/* Learning outcomes */}
        {mission.learning_outcomes.length > 0 && (
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>You'll develop</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mission.learning_outcomes.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--ink-light)', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
                  <span style={{ color: 'var(--emerald)', fontSize: 16, flexShrink: 0 }}>✓</span>
                  {o}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher tip */}
        {showTeacherTip && mission.teacher_tip && (
          <div className="teacher-tip">
            💡 <strong>Teacher tip:</strong> {mission.teacher_tip}
          </div>
        )}

        {/* Extension */}
        {showTeacherTip && mission.extension_activity && (
          <div style={{ background: 'var(--emerald-light)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#065F46', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
            🚀 <strong>Extension:</strong> {mission.extension_activity}
          </div>
        )}
      </div>
    </div>
  )
}
