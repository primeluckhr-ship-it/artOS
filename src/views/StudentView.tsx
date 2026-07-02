import { useState, useEffect } from 'react'
import { supabase, callFunction } from '../lib/supabase'
import { Profile } from '../App'

interface Mission {
  id: string
  theme: string
  story_premise: string
  constraints: string[]
  materials: string[]
  time_minutes: number
  difficulty: number
}

interface XPResult {
  xp_awarded: number
  total_xp: number
  current_rank: string
  current_rank_icon: string
  rank_up: boolean
  next_rank: string | null
  xp_to_next_rank: number | null
  previous_rank: string | null
}

type Stage = 'mission' | 'completing' | 'celebration' | 'done'

const RANK_ICONS: Record<string, string> = {
  Explorer: '🧭',
  Creator: '🎨',
  Inventor: '💡',
  Designer: '📐',
  'Master Artist': '🎭',
  'Creative Visionary': '⭐',
}

export default function StudentView({ profile }: { profile: Profile }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [loadingMission, setLoadingMission] = useState(true)
  const [stage, setStage] = useState<Stage>('mission')
  const [reflection, setReflection] = useState('')
  const [emoji, setEmoji] = useState<string | null>(null)
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [xpResult, setXpResult] = useState<XPResult | null>(null)
  const [xpError, setXpError] = useState<string | null>(null)
  const [totalXP, setTotalXP] = useState(0)
  const [currentRank, setCurrentRank] = useState('Explorer')

  useEffect(() => {
    fetchMissionAndXP()
  }, [profile.id])

  async function fetchMissionAndXP() {
    setLoadingMission(true)
    // Fetch latest mission for this school
    const { data: missions } = await supabase
      .from('missions')
      .select('id, theme, story_premise, constraints, materials, time_minutes, difficulty')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
      .limit(1)
    setMission(missions?.[0] ?? null)

    // Fetch current XP
    const { data: ledger } = await supabase.from('xp_ledger').select('xp_amount').eq('student_id', profile.id)
    const total = (ledger ?? []).reduce((s: number, r: { xp_amount: number }) => s + r.xp_amount, 0)
    setTotalXP(total)

    // Fetch current rank
    const { data: ranks } = await supabase.from('ranks').select('name, min_xp').order('min_xp', { ascending: false })
    const rank = (ranks ?? []).find((r: { min_xp: number }) => total >= r.min_xp)
    if (rank) setCurrentRank(rank.name)

    setLoadingMission(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArtworkFile(file)
    const reader = new FileReader()
    reader.onload = ev => setArtworkPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function submitCompletion() {
    if (!mission || !reflection.trim() || reflection.length < 10) return
    setSubmitting(true)
    setXpError(null)

    try {
      let artworkId = crypto.randomUUID()
      let mediaUrl: string | null = null

      // Upload artwork if provided
      if (artworkFile) {
        const path = `${profile.id}/${artworkId}`
        const { error: uploadError } = await supabase.storage
          .from('artwork-media')
          .upload(path, artworkFile)
        if (!uploadError) {
          mediaUrl = path
          const { data: aw } = await supabase.from('artworks').insert({
            student_id: profile.id,
            mission_id: mission.id,
            media_url: mediaUrl,
            media_type: 'image',
            student_caption: reflection,
          }).select('id').single()
          if (aw) artworkId = aw.id
        }
      } else {
        // Insert artwork row without media
        const { data: aw } = await supabase.from('artworks').insert({
          student_id: profile.id,
          mission_id: mission.id,
          media_url: 'placeholder',
          media_type: 'image',
          student_caption: reflection,
        }).select('id').single()
        if (aw) artworkId = aw.id
      }

      // Insert portfolio entry
      await supabase.from('portfolio_entries').insert({
        student_id: profile.id,
        artwork_id: artworkId,
        reflection_text: reflection,
        skills_tagged: [],
      })

      // Award XP for completion
      const xp1 = await callFunction('award-xp', 'POST', {
        student_id: profile.id,
        source_type: 'mission_completed',
        source_id: mission.id,
      })

      // Award XP for reflection
      const xp2 = await callFunction('award-xp', 'POST', {
        student_id: profile.id,
        source_type: 'reflection_submitted',
        source_id: artworkId,
      })

      // Award XP for artwork if uploaded
      let xpFinal = xp2
      if (artworkFile) {
        xpFinal = await callFunction('award-xp', 'POST', {
          student_id: profile.id,
          source_type: 'artwork_uploaded',
          source_id: artworkId + '_upload',
        })
      }

      setXpResult({
        ...xpFinal,
        xp_awarded: (xp1.xp_awarded || 0) + (xp2.xp_awarded || 0) + (artworkFile ? (xpFinal.xp_awarded || 0) : 0),
        rank_up: xp1.rank_up || xp2.rank_up || xpFinal.rank_up,
      })
      setTotalXP(xpFinal.total_xp)
      setCurrentRank(xpFinal.current_rank)
      setStage('celebration')
    } catch (e: unknown) {
      setXpError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingMission) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🎯</div>
        <p style={{ color: '#aaa', fontFamily: 'Fredoka One' }}>Finding your mission...</p>
      </div>
    )
  }

  if (!mission) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontFamily: 'Fredoka One', fontSize: 24, color: '#1ECBE1', marginBottom: 12 }}>No mission yet</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Your teacher hasn't generated a mission yet. Check back soon!</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      {/* XP header */}
      <XPHeader totalXP={totalXP} currentRank={currentRank} />

      {stage === 'mission' && (
        <StudentMissionCard mission={mission} onAccept={() => setStage('completing')} />
      )}

      {stage === 'completing' && (
        <CompletionForm
          mission={mission}
          reflection={reflection}
          setReflection={setReflection}
          emoji={emoji}
          setEmoji={setEmoji}
          artworkPreview={artworkPreview}
          onFileChange={handleFileChange}
          onSubmit={submitCompletion}
          submitting={submitting}
          error={xpError}
        />
      )}

      {stage === 'celebration' && xpResult && (
        <Celebration
          xpResult={xpResult}
          onDone={() => { setStage('done'); fetchMissionAndXP() }}
        />
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: '#1ECBE1', marginBottom: 12 }}>Mission Complete!</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Your work has been saved to your portfolio.</p>
        </div>
      )}
    </div>
  )
}

function XPHeader({ totalXP, currentRank }: { totalXP: number; currentRank: string }) {
  const RANK_XP: Record<string, number> = { Explorer: 0, Creator: 500, Inventor: 1500, Designer: 3500, 'Master Artist': 7000, 'Creative Visionary': 12000 }
  const RANK_ORDER = ['Explorer', 'Creator', 'Inventor', 'Designer', 'Master Artist', 'Creative Visionary']
  const currentIdx = RANK_ORDER.indexOf(currentRank)
  const nextRank = RANK_ORDER[currentIdx + 1]
  const currentMin = RANK_XP[currentRank] ?? 0
  const nextMin = nextRank ? RANK_XP[nextRank] : null
  const progress = nextMin ? Math.min(100, ((totalXP - currentMin) / (nextMin - currentMin)) * 100) : 100

  return (
    <div style={{ background: 'rgba(30,203,225,0.08)', border: '1px solid rgba(30,203,225,0.2)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 36 }}>{RANK_ICONS[currentRank] ?? '🎨'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'Fredoka One', color: '#1ECBE1', fontSize: 16 }}>{currentRank}</span>
          <span style={{ color: '#FFE135', fontWeight: 700, fontSize: 15 }}>{totalXP.toLocaleString()} XP</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg, #1ECBE1, #FFE135)', width: `${progress}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
        {nextRank && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>{nextRank} at {(RANK_XP[nextRank] ?? 0).toLocaleString()} XP</div>}
      </div>
    </div>
  )
}

function StudentMissionCard({ mission, onAccept }: { mission: Mission; onAccept: () => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: '#1ECBE1', marginBottom: 6 }}>Your Mission 🎯</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Read carefully. This is your creative challenge.</p>

      <div style={{ background: 'linear-gradient(135deg, #1ECBE1, #3B82F6, #8B5CF6)', padding: 2, borderRadius: 24, boxShadow: '0 8px 40px rgba(30,203,225,0.3)', marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(160deg, #0D0A2E 0%, #0D1B3E 100%)', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ background: 'rgba(30,203,225,0.15)', border: '1px solid rgba(30,203,225,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#1ECBE1', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
              {mission.theme}
            </span>
            <span style={{ color: '#FFE135', fontSize: 13 }}>{'★'.repeat(mission.difficulty)}{'☆'.repeat(10 - mission.difficulty)}</span>
          </div>

          <p style={{ fontFamily: 'Fredoka One', fontSize: 20, lineHeight: 1.5, color: '#fff', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
            {mission.story_premise}
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Your Constraint</div>
            {mission.constraints.map((c, i) => (
              <div key={i} style={{ background: 'rgba(30,203,225,0.12)', border: '1px solid rgba(30,203,225,0.25)', borderRadius: 10, padding: '10px 14px', color: '#1ECBE1', fontSize: 14, fontWeight: 600 }}>
                ⚡ {c}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {mission.materials.map((m, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m}</span>
            ))}
            <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>⏱ {mission.time_minutes} min</span>
          </div>
        </div>
      </div>

      <button
        onClick={onAccept}
        style={{ width: '100%', background: 'linear-gradient(135deg, #1ECBE1, #3B82F6)', border: 'none', borderRadius: 16, padding: '16px', color: '#fff', fontFamily: 'Fredoka One', fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(30,203,225,0.4)' }}
      >
        ✅ Accept Mission
      </button>
    </div>
  )
}

function CompletionForm({ mission, reflection, setReflection, emoji, setEmoji, artworkPreview, onFileChange, onSubmit, submitting, error }: {
  mission: Mission; reflection: string; setReflection: (s: string) => void;
  emoji: string | null; setEmoji: (s: string) => void;
  artworkPreview: string | null; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void; submitting: boolean; error: string | null
}) {
  const EMOJIS = ['😕', '😐', '🙂', '😄', '🤩']
  const canSubmit = reflection.trim().length >= 10 && emoji !== null && !submitting

  return (
    <div>
      <h2 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: '#1ECBE1', marginBottom: 6 }}>Mission Complete! 🎉</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Tell us how it went before we add it to your portfolio.</p>

      {/* Emoji mood */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          How was today's challenge?
        </label>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              style={{ fontSize: 36, background: emoji === e ? 'rgba(255,255,255,0.15)' : 'transparent', border: emoji === e ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent', borderRadius: 12, padding: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Reflection */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          What did you create? What was interesting or hard? *
        </label>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="Describe your artwork and your experience..."
          rows={4}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'Inter', lineHeight: 1.6 }}
        />
        <div style={{ color: reflection.length < 10 ? 'rgba(255,100,100,0.6)' : 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6, textAlign: 'right' }}>
          {reflection.length} chars {reflection.length < 10 ? '(minimum 10)' : '✓'}
        </div>
      </div>

      {/* Photo upload */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          📸 Photo of your artwork (optional, +50 XP)
        </label>
        {artworkPreview ? (
          <div style={{ position: 'relative' }}>
            <img src={artworkPreview} alt="Your artwork" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover' }} />
          </div>
        ) : (
          <label style={{ display: 'block', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14 }}>Tap to add a photo</div>
            <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ff8080', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ width: '100%', background: canSubmit ? 'linear-gradient(135deg, #FF6B35, #FFE135)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 16, padding: '16px', color: canSubmit ? '#1E0B4E' : 'rgba(255,255,255,0.3)', fontFamily: 'Fredoka One', fontSize: 18, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canSubmit ? '0 4px 20px rgba(255,225,53,0.4)' : 'none' }}
      >
        {submitting ? '⏳ Saving your work...' : '🚀 Complete Mission & Earn XP'}
      </button>
    </div>
  )
}

function Celebration({ xpResult, onDone }: { xpResult: XPResult; onDone: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes pop { 0% { transform: scale(0.5); opacity:0 } 70% { transform: scale(1.1) } 100% { transform: scale(1); opacity:1 } }
        @keyframes confetti { 0% { transform: translateY(-10px) rotate(0deg); opacity:1 } 100% { transform: translateY(80px) rotate(360deg); opacity:0 } }
      `}</style>

      {/* Confetti */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 30}%`,
            width: 10, height: 10,
            background: ['#FF6B35', '#FFE135', '#1ECBE1', '#FF9F1C', '#8B5CF6'][i % 5],
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            animation: `confetti ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
          }} />
        ))}
      </div>

      <div style={{ animation: 'float 2s ease-in-out infinite', fontSize: 80, marginBottom: 16 }}>
        {RANK_ICONS[xpResult.current_rank] ?? '🎨'}
      </div>

      {xpResult.rank_up && (
        <div style={{ animation: 'pop 0.4s ease-out forwards', background: 'linear-gradient(135deg, #FFE135, #FF9F1C)', borderRadius: 20, padding: '8px 20px', display: 'inline-block', marginBottom: 16 }}>
          <span style={{ fontFamily: 'Fredoka One', color: '#1E0B4E', fontSize: 18 }}>
            🎉 Rank Up! {xpResult.previous_rank} → {xpResult.current_rank}
          </span>
        </div>
      )}

      <h2 style={{ fontFamily: 'Fredoka One', fontSize: 36, color: '#FFE135', marginBottom: 8 }}>
        +{xpResult.xp_awarded} XP!
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, marginBottom: 8 }}>
        You're now a <strong style={{ color: '#1ECBE1' }}>{xpResult.current_rank}</strong>
      </p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 32 }}>
        {xpResult.total_xp.toLocaleString()} total XP
        {xpResult.xp_to_next_rank && ` · ${xpResult.xp_to_next_rank} XP to ${xpResult.next_rank}`}
      </p>

      <button
        onClick={onDone}
        style={{ background: 'linear-gradient(135deg, #1ECBE1, #3B82F6)', border: 'none', borderRadius: 16, padding: '14px 32px', color: '#fff', fontFamily: 'Fredoka One', fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(30,203,225,0.4)' }}
      >
        View My Portfolio →
      </button>
    </div>
  )
}
