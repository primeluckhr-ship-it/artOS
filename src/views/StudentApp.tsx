import { useState, useEffect, useRef } from 'react'
import { getLatestMission, getPortfolio, submitCompletion } from '../lib/api'
import type { MissionCard, Portfolio, XPResult } from '../lib/api'
import MissionCardUI from '../components/MissionCard'
import XPBar from '../components/XPBar'

interface Profile { id: string; school_id: string; name: string; age_band: string | null }
interface Props { profile: Profile; onSignOut: () => void }

type Tab = 'mission' | 'portfolio'

export default function StudentApp({ profile, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('mission')
  const [mission, setMission] = useState<MissionCard | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loadingMission, setLoadingMission] = useState(true)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [reflection, setReflection] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [xpResult, setXpResult] = useState<XPResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMission()
  }, [])

  useEffect(() => {
    if (tab === 'portfolio' && !portfolio) loadPortfolio()
  }, [tab])

  async function loadMission() {
    setLoadingMission(true)
    try {
      const m = await getLatestMission(profile.school_id)
      setMission(m)
    } catch { /* no mission yet */ }
    setLoadingMission(false)
  }

  async function loadPortfolio() {
    setLoadingPortfolio(true)
    try {
      const p = await getPortfolio(profile.id)
      setPortfolio(p)
    } catch { /* empty portfolio */ }
    setLoadingPortfolio(false)
  }

  async function handleSubmit() {
    if (reflection.trim().length < 20) {
      setError('Please write at least a sentence about your experience!')
      return
    }
    if (!mission) return
    setSubmitting(true)
    setError('')
    try {
      const result = await submitCompletion({
        student_id: profile.id,
        mission_id: mission.id,
        reflection: reflection.trim(),
        photo: photo ?? undefined,
      })
      setXpResult(result)
      setShowCompletion(false)
      // Reset portfolio cache
      setPortfolio(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setSubmitting(false)
  }

  function handleDismissCelebration() {
    setXpResult(null)
    setReflection('')
    setPhoto(null)
    setTab('portfolio')
    loadPortfolio()
  }

  // ── Celebration overlay ─────────────────────────────────────────────────────
  if (xpResult) {
    return (
      <div className="celebration">
        <div className="celebration-emoji">🎉</div>
        <h1 className="nunito">Mission Complete!</h1>
        <p>Your artwork is saved to your portfolio.</p>
        <div className="xp-pop mono">+{xpResult.xp_awarded} XP</div>
        {xpResult.rank_up && (
          <div className="rank-up-banner">
            🚀 You levelled up!<br />
            <span style={{ fontSize: 22 }}>{xpResult.previous_rank} → {xpResult.current_rank}</span>
          </div>
        )}
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, opacity: 0.8, marginBottom: 32 }}>
          Total: {xpResult.total_xp.toLocaleString()} XP · {xpResult.current_rank}
          {xpResult.xp_to_next_rank && ` · ${xpResult.xp_to_next_rank} to ${xpResult.next_rank}`}
        </div>
        <button
          className="btn nunito"
          style={{ background: 'white', color: 'var(--indigo)', fontSize: 17, padding: '14px 40px', borderRadius: 14, fontWeight: 800 }}
          onClick={handleDismissCelebration}
        >
          See My Portfolio →
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="screen">
        {/* Header */}
        <div className="screen-header">
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Student</div>
            <h1 style={{ fontSize: 22 }}>Hi, {profile.name.split(' ')[0]} 🎨</h1>
          </div>
          <button className="btn btn-ghost" onClick={onSignOut} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E8E4DF' }}>Sign out</button>
        </div>

        {tab === 'mission' && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadingMission ? (
              <div className="loading-state">
                <div className="spinner" />
                <span className="generating-text">Loading your mission…</span>
              </div>
            ) : mission ? (
              <>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', paddingLeft: 4 }}>
                  Today's Creative Mission
                </div>
                <MissionCardUI mission={mission} />
                <button className="btn btn-primary" onClick={() => setShowCompletion(true)} style={{ marginTop: 4 }}>
                  ✓ Mark Complete
                </button>
              </>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
                <h3>No mission yet</h3>
                <p>Ask your teacher to generate a mission — it'll appear here.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'portfolio' && (
          <>
            {/* XP section */}
            <div className="pad" style={{ marginBottom: 16 }}>
              {portfolio ? (
                <XPBar
                  rank={portfolio.rank.current}
                  total_xp={portfolio.rank.total_xp}
                  next_rank={portfolio.rank.next_rank}
                  xp_to_next_rank={portfolio.rank.xp_to_next_rank}
                  is_max_rank={portfolio.rank.is_max_rank}
                />
              ) : (
                <div style={{ background: 'var(--indigo)', borderRadius: 'var(--radius)', padding: 20, color: 'white' }}>
                  <div className="rank-name nunito">Explorer 🧭</div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'Nunito, sans-serif', marginTop: 4 }}>Complete missions to earn XP</div>
                </div>
              )}
            </div>

            {loadingPortfolio ? (
              <div className="loading-state">
                <div className="spinner" />
                <span className="generating-text">Loading portfolio…</span>
              </div>
            ) : portfolio && portfolio.entries.length > 0 ? (
              <>
                <div className="section-title">My Creative Journey</div>
                <div className="portfolio-grid">
                  {portfolio.entries.map(entry => (
                    <div key={entry.id} className="portfolio-card">
                      <div className="portfolio-thumb">
                        {entry.artwork?.signed_url ? (
                          <img src={entry.artwork.signed_url} alt="artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>🖼</span>
                        )}
                      </div>
                      <div className="portfolio-card-meta">
                        <div className="portfolio-card-theme">{entry.artwork?.mission?.theme ?? 'Creative work'}</div>
                        <div className="portfolio-card-date">{new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                <h3>Your creative journey starts here</h3>
                <p>Complete your first mission and your artwork will appear here.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {([
          { id: 'mission', icon: '✦', label: 'Mission' },
          { id: 'portfolio', icon: '🖼', label: 'Portfolio' },
        ] as const).map(t => (
          <button key={t.id} className={`nav-tab nunito ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Completion sheet */}
      {showCompletion && (
        <div className="completion-panel" onClick={() => !submitting && setShowCompletion(false)}>
          <div className="completion-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#E8E4DF', borderRadius: 99, margin: '0 auto 8px' }} />
            <h2 className="nunito">Mark as Complete 🎨</h2>

            <div className="field-group">
              <label className="field-label">What did you discover?</label>
              <textarea
                className="reflection-input"
                placeholder="Write about your experience — what worked, what surprised you, what you'd do differently…"
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                rows={4}
              />
              <div style={{ fontSize: 12, color: reflection.length < 20 ? 'var(--muted)' : 'var(--emerald)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, textAlign: 'right' }}>
                {reflection.length < 20 ? `${20 - reflection.length} more characters to go` : '✓ Great reflection!'}
              </div>
            </div>

            <div>
              <label className="field-label">Upload your artwork (optional)</label>
              <div
                className={`photo-upload ${photo ? 'has-photo' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {photo ? `📸 ${photo.name}` : '📷 Tap to add a photo of your work'}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && <p style={{ color: 'var(--coral)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14 }}>{error}</p>}

            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || reflection.trim().length < 20}>
              {submitting ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Saving…</> : '🎉 Submit & Earn XP'}
            </button>

            <button className="btn btn-ghost" onClick={() => setShowCompletion(false)} disabled={submitting}>
              Not finished yet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
