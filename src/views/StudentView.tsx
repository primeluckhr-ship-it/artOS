import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Mission {
  mission_title: string; challenge_description: string
  learning_focus: string; materials: string[]
  success_criteria: string; time_estimate: string
  domain?: string; level_tier?: string
}
interface MissionHint {
  hint_text: string; hint_type: string; image_url?: string
}

const XP_PER_LEVEL = 200

function xpToLevel(xp: number) {
  return Math.min(50, Math.floor(xp / XP_PER_LEVEL) + 1)
}
function xpToNextLevel(xp: number) {
  const level = xpToLevel(xp)
  if (level >= 50) return 0
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL)
}
function levelColor(level: number): string {
  if (level <= 7) return '#67e8f9'
  if (level <= 14) return '#86efac'
  if (level <= 21) return '#fde68a'
  if (level <= 35) return '#ff9f1c'
  return '#c084fc'
}

export default function StudentView({ profile }: { profile: Profile }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [credits, setCredits] = useState(5)
  const [hints, setHints] = useState<MissionHint[]>([])
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [domain, setDomain] = useState('drawing')
  const [difficulty, setDifficulty] = useState('beginner')
  const [notification, setNotification] = useState('')

  const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjE3NjksImV4cCI6MjA2NjMzNzc2OX0.i3q8n8qJNs-hkT_dqwDiKF3d_VjKMqRBVsEMv1cXSJE'

  useEffect(() => { loadStudentData() }, [profile])

  async function loadStudentData() {
    const [{ data: prog }, { data: prof }] = await Promise.all([
      supabase.from('student_progress').select('xp').eq('student_id', profile.id).maybeSingle(),
      supabase.from('profiles').select('hint_credits').eq('id', profile.id).single(),
    ])
    setTotalXp(prog?.xp || 0)
    setCredits(prof?.hint_credits ?? 5)
  }

  async function loadHints(dom: string, diff: string) {
    const { data } = await supabase.from('mission_hints')
      .select('*')
      .eq('domain', dom)
      .limit(3)
    setHints(data || [])
    setRevealedHints([])
  }

  async function generateMission() {
    setLoading(true); setCompleted(false); setRevealedHints([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domain, difficulty, student_age: 14, school_id: profile.school_id }),
      })
      const data = await res.json()
      setMission({ ...data, domain, level_tier: difficulty })
      await loadHints(domain, difficulty)
    } catch { setMission(null) }
    setLoading(false)
  }

  async function completeMission() {
    if (!mission) return
    setCompleting(true)
    const xp = { foundation: 50, beginner: 75, intermediate: 100, advanced: 150, expert: 200 }[difficulty] || 75
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${SUPABASE_URL}/functions/v1/award-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ student_id: profile.id, school_id: profile.school_id, xp_amount: xp, mission_title: mission.mission_title }),
      })
      setXpGained(xp); setTotalXp(t => t + xp); setCompleted(true)
    } catch { }
    setCompleting(false)
  }

  async function spendCreditForHint(hintIndex: number) {
    if (credits <= 0 || revealedHints.includes(hintIndex)) return
    if (hintIndex >= hints.length) { setNotification('No more hints available'); setTimeout(() => setNotification(''), 3000); return }
    const newCredits = credits - 1
    setCredits(newCredits)
    setRevealedHints(p => [...p, hintIndex])
    await supabase.from('profiles').update({ hint_credits: newCredits }).eq('id', profile.id)
  }

  const currentLevel = xpToLevel(totalXp)
  const toNext = xpToNextLevel(totalXp)
  const lvlColor = levelColor(currentLevel)
  const levelPct = ((XP_PER_LEVEL - toNext) / XP_PER_LEVEL) * 100

  const DOMAINS = [
    { key: 'elements_of_art', label: 'Elements', color: '#1ECBE1' },
    { key: 'drawing', label: 'Drawing', color: '#f9a8d4' },
    { key: 'painting', label: 'Painting', color: '#FF6B35' },
    { key: 'colour_theory', label: 'Colour', color: '#FFE135' },
    { key: 'mixed_media', label: 'Mixed', color: '#a78bfa' },
    { key: 'principles_of_design', label: 'Design', color: '#4ade80' },
    { key: 'art_history', label: 'History', color: '#fb923c' },
  ]
  const DIFFICULTIES = [
    { key: 'foundation', label: 'Foundation', color: '#67e8f9', xp: 50 },
    { key: 'beginner', label: 'Beginner', color: '#86efac', xp: 75 },
    { key: 'intermediate', label: 'Intermediate', color: '#fde68a', xp: 100 },
    { key: 'advanced', label: 'Advanced', color: '#ff9f1c', xp: 150 },
    { key: 'expert', label: 'Expert', color: '#c084fc', xp: 200 },
  ]

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 16px' }}>

      {/* Notification toast */}
      {notification && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#1a1040', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 20px', color: '#fff', zIndex: 999, fontSize: 13 }}>
          {notification}
        </div>
      )}

      {/* Student Level Bar */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, border: `1px solid ${lvlColor}30` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Big level number */}
            <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 40, color: lvlColor, lineHeight: 1 }}>
              {String(currentLevel).padStart(2, '0')}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: lvlColor, marginBottom: 2 }}>
                Level {currentLevel}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {totalXp} XP total · {currentLevel < 50 ? `${toNext} to next` : 'Max level!'}
              </div>
            </div>
          </div>
          {/* Credits display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: '6px 14px' }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 18, color: '#FFE135' }}>{credits}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>hints</span>
          </div>
        </div>
        {/* XP progress bar */}
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${levelPct}%`, background: `linear-gradient(90deg, ${lvlColor}88, ${lvlColor})`,
            borderRadius: 4, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
            clipPath: 'polygon(0 20%, 100% 0%, 100% 100%, 0 80%)',
          }} />
        </div>
      </div>

      {/* Mission Builder */}
      {!mission && !completed && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 20, color: '#fff', margin: '0 0 20px' }}>
            Choose your mission
          </h2>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Domain
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DOMAINS.map(d => (
                <button key={d.key} onClick={() => setDomain(d.key)} style={{
                  background: domain === d.key ? d.color + '25' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${domain === d.key ? d.color : 'rgba(255,255,255,0.08)'}`,
                  color: domain === d.key ? d.color : 'rgba(255,255,255,0.45)',
                  borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>{d.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Level
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIFFICULTIES.map(d => (
                <button key={d.key} onClick={() => setDifficulty(d.key)} style={{
                  background: difficulty === d.key ? d.color + '20' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${difficulty === d.key ? d.color : 'rgba(255,255,255,0.08)'}`,
                  color: difficulty === d.key ? d.color : 'rgba(255,255,255,0.45)',
                  borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {d.label}
                  <span style={{ fontSize: 10, opacity: 0.7 }}>+{d.xp}xp</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={generateMission} disabled={loading} style={{
            width: '100%', padding: '14px 0', background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF6B35, #ff9f1c)',
            border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontFamily: "'Fredoka One',sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 0.5,
          }}>
            {loading ? 'Generating mission...' : '✦ Generate Mission'}
          </button>
        </div>
      )}

      {/* Mission Card */}
      {mission && !completed && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
          {/* Header stripe */}
          <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,159,28,0.1))', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#FF9F1C', marginBottom: 6 }}>
              {DIFFICULTIES.find(d => d.key === difficulty)?.label} · {DOMAINS.find(d => d.key === domain)?.label}
            </div>
            <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 22, color: '#fff', margin: 0 }}>
              {mission.mission_title}
            </h2>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
              {mission.challenge_description}
            </p>

            <MissionSection title="What you're practising" color="#1ECBE1">
              {mission.learning_focus}
            </MissionSection>

            <MissionSection title="Success looks like" color="#4ade80">
              {mission.success_criteria}
            </MissionSection>

            {mission.materials?.length > 0 && (
              <MissionSection title="Materials" color="#FF9F1C">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mission.materials.map((m, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m}</span>
                  ))}
                </div>
              </MissionSection>
            )}

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
              ⏱ {mission.time_estimate}
            </div>

            {/* Hint Credits Panel */}
            <div style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFE135' }}>
                  💡 Hints ({credits} credits remaining)
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>1 credit = 1 hint</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => {
                  const revealed = revealedHints.includes(i)
                  const hint = hints[i]
                  return (
                    <div key={i}>
                      {!revealed ? (
                        <button onClick={() => spendCreditForHint(i)} disabled={credits <= 0} style={{
                          width: '100%', background: credits > 0 ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px dashed ${credits > 0 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 10, padding: '10px 14px', cursor: credits > 0 ? 'pointer' : 'not-allowed',
                          color: credits > 0 ? '#FFE135' : 'rgba(255,255,255,0.2)',
                          fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span>🔒</span>
                          <span>Reveal hint {i + 1}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11 }}>−1 💡</span>
                        </button>
                      ) : hint ? (
                        <div style={{ animation: 'pop 0.3s ease', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                          {hint.image_url && (
                            <img src={hint.image_url} alt="hint" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FFE135', marginBottom: 4 }}>
                              {hint.hint_type} hint
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                              {hint.hint_text}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                          No more hints for this mission.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={completeMission} disabled={completing} style={{
                flex: 1, padding: '13px 0', background: completing ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#4ade80,#16a34a)',
                border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontFamily: "'Fredoka One',sans-serif",
                cursor: completing ? 'not-allowed' : 'pointer',
              }}>
                {completing ? 'Recording...' : '✓ Mark Complete'}
              </button>
              <button onClick={() => { setMission(null); setHints([]); setRevealedHints([]) }} style={{
                padding: '13px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, color: 'rgba(255,255,255,0.4)', fontSize: 15, cursor: 'pointer',
              }}>
                New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion celebration */}
      {completed && (
        <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'pop 0.4s ease' }}>
          <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 64, marginBottom: 12 }}>🎨</div>
          <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 28, color: '#4ade80', margin: '0 0 8px' }}>
            Mission complete!
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#FFE135', fontFamily: "'Fredoka One',sans-serif", fontSize: 22 }}>+{xpGained} XP</span>
          </div>
          {xpToLevel(totalXp) > xpToLevel(totalXp - xpGained) && (
            <div style={{ color: lvlColor, fontFamily: "'Fredoka One',sans-serif", fontSize: 18, marginBottom: 12 }}>
              🎉 Level Up! You are now Level {currentLevel}
            </div>
          )}
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
            Share it with your clan — and take on the next one.
          </p>
          <button onClick={() => { setCompleted(false); setMission(null); setHints([]); setRevealedHints([]) }} style={{
            background: 'linear-gradient(135deg,#FF6B35,#ff9f1c)', border: 'none', borderRadius: 14,
            color: '#fff', fontSize: 16, fontFamily: "'Fredoka One',sans-serif", padding: '12px 32px', cursor: 'pointer',
          }}>
            Next Mission
          </button>
        </div>
      )}
    </div>
  )
}

function MissionSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color, marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}
