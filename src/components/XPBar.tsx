const RANK_EMOJIS: Record<string, string> = {
  'Explorer': '🧭',
  'Creator': '🖌️',
  'Inventor': '💡',
  'Designer': '📐',
  'Master Artist': '🎨',
  'Creative Visionary': '⭐',
}

interface Props {
  rank: string
  total_xp: number
  next_rank: string | null
  xp_to_next_rank: number | null
  is_max_rank: boolean
}

export default function XPBar({ rank, total_xp, next_rank, xp_to_next_rank, is_max_rank }: Props) {
  const emoji = RANK_EMOJIS[rank] ?? '🎨'

  // Calculate fill percentage
  let fillPct = 100
  if (!is_max_rank && xp_to_next_rank !== null) {
    // Estimate current rank threshold from total_xp and xp_to_next
    const RANK_XP: Record<string, number> = { 'Explorer': 0, 'Creator': 500, 'Inventor': 1500, 'Designer': 3500, 'Master Artist': 7000, 'Creative Visionary': 12000 }
    const currentMin = RANK_XP[rank] ?? 0
    const nextMin = total_xp + xp_to_next_rank
    const range = nextMin - currentMin
    const progress = total_xp - currentMin
    fillPct = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 0
  }

  return (
    <div className="xp-section">
      <div className="rank-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <div>
            <div className="rank-name">{rank}</div>
            {next_rank && <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>Next: {next_rank}</div>}
            {is_max_rank && <div style={{ fontSize: 12, opacity: 0.7, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>Max rank reached! 🌟</div>}
          </div>
        </div>
        <div className="xp-amount mono">{total_xp.toLocaleString()} XP</div>
      </div>

      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${fillPct}%` }} />
      </div>

      {!is_max_rank && xp_to_next_rank !== null && (
        <div className="xp-next-label">{xp_to_next_rank.toLocaleString()} XP to {next_rank}</div>
      )}
    </div>
  )
}
