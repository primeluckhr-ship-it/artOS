import { useState, useEffect } from 'react'
import { callFunction } from '../lib/supabase'
import { Profile } from '../App'

interface PortfolioEntry {
  id: string
  created_at: string
  reflection_text: string | null
  skills_tagged: string[]
  artwork: {
    id: string
    media_url: string
    student_caption: string | null
    signed_url: string | null
    mission: {
      theme: string
      story_premise: string
      difficulty: number
    } | null
    critiques: Array<{
      source: string
      content: { what_working?: string; try_next?: string; overall?: string }
    }>
  } | null
}

interface PortfolioData {
  student: { name: string }
  rank: { current: string; icon: string; total_xp: number; next_rank: string | null; xp_to_next_rank: number | null }
  badges: Array<{ awarded_at: string; badge: { name: string; description: string; rarity: string } }>
  entries: PortfolioEntry[]
  pagination: { total: number }
}

const RANK_ICONS: Record<string, string> = {
  Explorer: '🧭', Creator: '🎨', Inventor: '💡',
  Designer: '📐', 'Master Artist': '🎭', 'Creative Visionary': '⭐',
}

const RANK_ORDER = ['Explorer', 'Creator', 'Inventor', 'Designer', 'Master Artist', 'Creative Visionary']
const RANK_XP: Record<string, number> = { Explorer: 0, Creator: 500, Inventor: 1500, Designer: 3500, 'Master Artist': 7000, 'Creative Visionary': 12000 }

export default function PortfolioView({ profile }: { profile: Profile }) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPortfolio()
  }, [profile.id])

  async function loadPortfolio() {
    setLoading(true)
    setError(null)
    try {
      const result = await callFunction('get-portfolio', 'GET', undefined, { student_id: profile.id })
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ fontSize: 48 }}>🖼️</div>
        <p style={{ color: '#aaa', fontFamily: 'Fredoka One' }}>Loading your portfolio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: '#ff8080' }}>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { rank, badges, entries, pagination } = data
  const currentIdx = RANK_ORDER.indexOf(rank.current)
  const nextRankXP = rank.next_rank ? RANK_XP[rank.next_rank] : null
  const currentMin = RANK_XP[rank.current] ?? 0
  const progress = nextRankXP ? Math.min(100, ((rank.total_xp - currentMin) / (nextRankXP - currentMin)) * 100) : 100

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      {/* Hero rank card */}
      <div style={{ background: 'linear-gradient(135deg, #FF6B35, #8B5CF6)', padding: 2, borderRadius: 24, marginBottom: 24, boxShadow: '0 8px 40px rgba(139,92,246,0.3)' }}>
        <div style={{ background: 'linear-gradient(160deg, #0D0A2E, #1A0F45)', borderRadius: 22, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 56, animation: 'float 3s ease-in-out infinite' }}>
              {RANK_ICONS[rank.current] ?? '🎨'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Current Rank</div>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 30, color: '#fff', marginBottom: 2 }}>{rank.current}</div>
              <div style={{ color: '#FFE135', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{rank.total_xp.toLocaleString()} XP</div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg, #FF6B35, #FFE135)', width: `${progress}%`, height: '100%', borderRadius: 6 }} />
              </div>
              {rank.next_rank && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>
                  {rank.xp_to_next_rank?.toLocaleString()} XP to {rank.next_rank}
                </div>
              )}
            </div>
          </div>

          {/* Rank ladder */}
          <div style={{ display: 'flex', gap: 4, marginTop: 20, justifyContent: 'center' }}>
            {RANK_ORDER.map((r, i) => (
              <div key={r} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: i <= currentIdx ? 18 : 14, opacity: i <= currentIdx ? 1 : 0.25, marginBottom: 2 }}>
                  {RANK_ICONS[r]}
                </div>
                <div style={{ height: 3, background: i <= currentIdx ? '#FFE135' : 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Fredoka One', fontSize: 18, color: '#FFE135', marginBottom: 12 }}>🏅 Badges Earned</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {badges.map((b, i) => (
              <div key={i} style={{
                background: b.badge.rarity === 'rare' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${b.badge.rarity === 'rare' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 12,
                padding: '8px 14px',
                fontSize: 13,
                color: b.badge.rarity === 'rare' ? '#C084FC' : 'rgba(255,255,255,0.7)',
              }}>
                {b.badge.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio entries */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fredoka One', fontSize: 22, color: '#1ECBE1' }}>
          🖼️ Creative Works ({pagination.total})
        </h3>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
          <h4 style={{ fontFamily: 'Fredoka One', fontSize: 20, color: '#1ECBE1', marginBottom: 8 }}>Your creative journey starts here</h4>
          <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Complete your first mission to add your first artwork to the portfolio.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expanded === entry.id}
              onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }`}</style>
    </div>
  )
}

function EntryCard({ entry, isExpanded, onToggle }: { entry: PortfolioEntry; isExpanded: boolean; onToggle: () => void }) {
  const date = new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
      onClick={onToggle}
    >
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {entry.artwork?.mission && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ background: 'rgba(30,203,225,0.15)', border: '1px solid rgba(30,203,225,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#1ECBE1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {entry.artwork.mission.theme}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{date}</span>
              </div>
            )}
            {entry.artwork?.mission && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5, marginBottom: entry.reflection_text ? 10 : 0 }}>
                {entry.artwork.mission.story_premise.slice(0, 120)}{entry.artwork.mission.story_premise.length > 120 ? '...' : ''}
              </p>
            )}
            {entry.reflection_text && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>
                "{entry.reflection_text.slice(0, 100)}{entry.reflection_text.length > 100 ? '...' : ''}"
              </p>
            )}
          </div>
          <div style={{ marginLeft: 16, flexShrink: 0 }}>
            {entry.artwork?.signed_url && entry.artwork.media_url !== 'placeholder' ? (
              <img src={entry.artwork.signed_url} alt="Artwork" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 12, background: 'linear-gradient(135deg, rgba(30,203,225,0.2), rgba(139,92,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                🎨
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', background: 'rgba(0,0,0,0.2)' }}>
          {entry.reflection_text && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Reflection</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>"{entry.reflection_text}"</p>
            </div>
          )}

          {entry.artwork?.signed_url && entry.artwork.media_url !== 'placeholder' && (
            <img src={entry.artwork.signed_url} alt="Full artwork" style={{ width: '100%', borderRadius: 12, marginBottom: 16 }} />
          )}

          {entry.artwork?.critiques?.filter(c => c.source === 'ai').length > 0 && (
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ color: '#C084FC', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🤖 AI Critique</div>
              {entry.artwork.critiques.filter(c => c.source === 'ai').slice(0, 1).map((c, i) => (
                <div key={i}>
                  {c.content.what_working && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}><strong>What's working:</strong> {c.content.what_working}</p>}
                  {c.content.try_next && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6 }}><strong>Try next:</strong> {c.content.try_next}</p>}
                </div>
              ))}
            </div>
          )}

          {entry.skills_tagged?.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.skills_tagged.map((s, i) => (
                <span key={i} style={{ background: 'rgba(255,159,28,0.15)', border: '1px solid rgba(255,159,28,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#FF9F1C' }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
