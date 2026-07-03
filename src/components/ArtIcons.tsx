/**
 * ArtIcons — custom hand-drawn SVG marks for PCOS.
 * Designed to look like ink sketches, not icon libraries.
 * Every shape is slightly imperfect — that's intentional.
 */

interface IconProps { size?: number; color?: string; opacity?: number }

// ── Navigation marks ──────────────────────────────────────────────────────────

export function ClassIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Three figures — quick sketch style */}
      <circle cx="12" cy="6" r="2.2" fill={color} />
      <path d="M8 18 Q8.5 13 12 13 Q15.5 13 16 18" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="5.5" cy="8" r="1.7" fill={color} opacity="0.65" />
      <path d="M3 18 Q3.2 14.5 5.5 14.5" stroke={color} strokeWidth="1.8" fill="none" opacity="0.65" />
      <circle cx="18.5" cy="8" r="1.7" fill={color} opacity="0.65" />
      <path d="M21 18 Q20.8 14.5 18.5 14.5" stroke={color} strokeWidth="1.8" fill="none" opacity="0.65" />
    </svg>
  )
}

export function LessonsIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Open sketchbook — two pages, spine */}
      <path d="M12 5 Q9 4.5 4 6 L4 19 Q9 17.5 12 18Z" fill={color} opacity="0.55" />
      <path d="M12 5 Q15 4.5 20 6 L20 19 Q15 17.5 12 18Z" fill={color} opacity="0.8" />
      <line x1="12" y1="5" x2="12" y2="18" stroke={color} strokeWidth="2" />
      {/* Sketch lines on right page */}
      <path d="M14 9 Q17 8.8 18.5 9.2" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <path d="M14 11.5 Q17 11.3 18 11.6" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <path d="M14 14 Q16 13.8 17.5 14.1" stroke={color} strokeWidth="1.2" opacity="0.5" />
    </svg>
  )
}

export function CreateIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Paintbrush — handle, ferrule, bristles */}
      <path d="M5 19 Q7.5 17 10 14 L18 6 Q19.5 4.5 20.5 5.5 Q21.5 6.5 20 8 L12 16 Q9 19 7 20Z" fill={color} opacity="0.85" />
      {/* Ferrule band */}
      <path d="M14 10.5 L10.5 14" stroke="rgba(0,0,0,0.3)" strokeWidth="2.5" />
      {/* Bristle tip paint blob */}
      <circle cx="5.5" cy="19.5" r="2.2" fill={color} opacity="0.6" />
    </svg>
  )
}

export function MissionIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Imperfect bullseye — slightly offset circles */}
      <circle cx="12" cy="11.5" r="8.5" stroke={color} strokeWidth="1.8" opacity="0.5" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.8" opacity="0.75" />
      <circle cx="12" cy="12" r="2" fill={color} />
      {/* Arrow coming in from corner */}
      <path d="M19 4 L13.5 10.5" stroke={color} strokeWidth="1.8" opacity="0.7" />
      <path d="M19 4 L15.5 4.5 M19 4 L18.5 7.5" stroke={color} strokeWidth="1.8" opacity="0.7" />
    </svg>
  )
}

export function PortfolioIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Canvas/frame with abstract art inside */}
      <rect x="3" y="3.5" width="18" height="17" rx="1.5" stroke={color} strokeWidth="2" opacity="0.8" />
      {/* Abstract painting inside — paint strokes */}
      <path d="M7 14 Q9 10 12 12 Q14.5 14 17 11" stroke={color} strokeWidth="2.2" opacity="0.9" fill="none" />
      <circle cx="8" cy="16" r="1" fill={color} opacity="0.6" />
      <circle cx="14" cy="8" r="1.2" fill={color} opacity="0.4" />
      {/* Hanging wire */}
      <path d="M10 3.5 Q12 2 14 3.5" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />
    </svg>
  )
}

export function AdminIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Paintbrush crossed with pencil — master of tools */}
      <path d="M4 20 Q6 18 9 15 L17 7 Q18.5 5.5 19.5 6.5 Q20.5 7.5 19 9 L11 17 Q8 20 6 21Z" fill={color} opacity="0.7" />
      <circle cx="5" cy="20" r="1.8" fill={color} opacity="0.5" />
      {/* Pencil crossing */}
      <path d="M20 4 L16 8" stroke={color} strokeWidth="2.5" opacity="0.4" />
      <path d="M20 4 L20 7 M20 4 L17 4" stroke={color} strokeWidth="1.5" opacity="0.4" />
      {/* Star/sparkle */}
      <path d="M4 6 L4.5 4 L5 6 L7 6.5 L5 7 L4.5 9 L4 7 L2 6.5Z" fill={color} opacity="0.6" />
    </svg>
  )
}

// ── Rank medallions ───────────────────────────────────────────────────────────

export function ExplorerMark({ size = 36, color = '#1ECBE1' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Compass rose — rough, bold */}
      <circle cx="18" cy="18" r="15" stroke={color} strokeWidth="2" opacity="0.3" />
      <path d="M18 6 L20 16 L18 14 L16 16Z" fill={color} />
      <path d="M18 30 L20 20 L18 22 L16 20Z" fill={color} opacity="0.6" />
      <path d="M6 18 L16 16 L14 18 L16 20Z" fill={color} opacity="0.6" />
      <path d="M30 18 L20 16 L22 18 L20 20Z" fill={color} opacity="0.4" />
      <circle cx="18" cy="18" r="2.5" fill={color} />
    </svg>
  )
}

export function CreatorMark({ size = 36, color = '#FF9F1C' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Paint palette — hand-drawn oval */}
      <path d="M18 6 Q29 6 30 16 Q31 26 22 30 Q13 34 8 26 Q3 18 9 11 Q13 6 18 6Z" stroke={color} strokeWidth="2" fill="none" opacity="0.5" />
      {/* Thumb hole */}
      <circle cx="22" cy="24" r="3.5" fill={color} opacity="0.3" />
      {/* Paint dots */}
      <circle cx="12" cy="12" r="2.2" fill={color} />
      <circle cx="19" cy="10" r="2" fill="#FF6B35" opacity="0.9" />
      <circle cx="25" cy="15" r="2" fill="#1ECBE1" opacity="0.9" />
      <circle cx="10" cy="20" r="1.8" fill="#FFE135" opacity="0.9" />
    </svg>
  )
}

export function InventorMark({ size = 36, color = '#FFE135' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" strokeLinecap="round">
      {/* Light bulb — sketch style */}
      <path d="M18 8 Q24 8 26 15 Q28 21 24 25 L22 28 L14 28 L12 25 Q8 21 10 15 Q12 8 18 8Z" stroke={color} strokeWidth="2" fill="none" />
      <path d="M14 28 L22 28 M15 31 L21 31" stroke={color} strokeWidth="2" opacity="0.7" />
      {/* Radiating lines */}
      <path d="M18 4 L18 6" stroke={color} strokeWidth="2" />
      <path d="M28 8 L26.5 9.5" stroke={color} strokeWidth="2" opacity="0.6" />
      <path d="M8 8 L9.5 9.5" stroke={color} strokeWidth="2" opacity="0.6" />
      <path d="M31 18 L29 18" stroke={color} strokeWidth="2" opacity="0.5" />
      <path d="M7 18 L5 18" stroke={color} strokeWidth="2" opacity="0.5" />
      <circle cx="18" cy="18" r="3" fill={color} opacity="0.5" />
    </svg>
  )
}

export function DesignerMark({ size = 36, color = '#4ade80' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" strokeLinecap="round">
      {/* Ruler and set square — drafting tools */}
      <rect x="6" y="14" width="24" height="7" rx="1.5" stroke={color} strokeWidth="2" opacity="0.6" />
      <path d="M10 14 L10 21 M14 14 L14 19 M18 14 L18 21 M22 14 L22 19 M26 14 L26 21" stroke={color} strokeWidth="1.2" opacity="0.5" />
      {/* Set square */}
      <path d="M22 7 L22 21 L8 21 Z" stroke={color} strokeWidth="2" fill="none" opacity="0.8" />
    </svg>
  )
}

export function MasterArtistMark({ size = 36, color = '#FF6B35' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" strokeLinecap="round">
      {/* Bold asterisk / star — confident mark */}
      <path d="M18 6 L18 30" stroke={color} strokeWidth="3.5" opacity="0.9" />
      <path d="M6 12 L30 24" stroke={color} strokeWidth="3.5" opacity="0.9" />
      <path d="M30 12 L6 24" stroke={color} strokeWidth="3.5" opacity="0.9" />
      <circle cx="18" cy="18" r="4" fill={color} />
    </svg>
  )
}

export function VisionaryMark({ size = 36, color = '#8B5CF6' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" strokeLinecap="round">
      {/* Eye with radiating vision lines */}
      <path d="M5 18 Q12 8 18 8 Q24 8 31 18 Q24 28 18 28 Q12 28 5 18Z" stroke={color} strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="18" cy="18" r="5" stroke={color} strokeWidth="2" />
      <circle cx="18" cy="18" r="2.5" fill={color} />
      {/* Radiating lines */}
      <path d="M18 4 L18 7 M28 8 L26 10 M32 18 L29 18 M28 28 L26 26 M18 32 L18 29 M8 28 L10 26 M4 18 L7 18 M8 8 L10 10" stroke={color} strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

// ── Rank resolver ─────────────────────────────────────────────────────────────

export const RANK_MARKS: Record<string, React.FC<IconProps>> = {
  Explorer: ExplorerMark,
  Creator: CreatorMark,
  Inventor: InventorMark,
  Designer: DesignerMark,
  'Master Artist': MasterArtistMark,
  'Creative Visionary': VisionaryMark,
}

export const RANK_COLORS: Record<string, string> = {
  Explorer: '#1ECBE1', Creator: '#FF9F1C', Inventor: '#FFE135',
  Designer: '#4ade80', 'Master Artist': '#FF6B35', 'Creative Visionary': '#8B5CF6',
}

export function RankMark({ rank, size = 36 }: { rank: string; size?: number }) {
  const Icon = RANK_MARKS[rank] || ExplorerMark
  const color = RANK_COLORS[rank] || '#1ECBE1'
  return <Icon size={size} color={color} />
}

// ── Paint blob shape (replaces pill badges) ───────────────────────────────────

export function PaintBlob({ color, children, style = {} }: {
  color: string; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d="M8 4 Q50 0 92 5 Q100 12 98 28 Q95 40 50 40 Q5 40 2 28 Q-2 14 8 4Z" fill={color} opacity="0.18" />
        <path d="M8 4 Q50 0 92 5 Q100 12 98 28 Q95 40 50 40 Q5 40 2 28 Q-2 14 8 4Z" fill="none" stroke={color} strokeWidth="1.5" opacity="0.45" />
      </svg>
      <span style={{ position: 'relative', zIndex: 1, padding: '4px 14px', fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </span>
    </div>
  )
}

// ── Brush stroke progress bar ─────────────────────────────────────────────────

export function BrushBar({ value, color, height = 10 }: { value: number; color: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ position: 'relative', height, background: 'rgba(255,255,255,0.08)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`,
        borderRadius: height / 2, transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
        // Slightly imperfect top edge via clip-path
        clipPath: 'polygon(0 15%, 100% 0%, 100% 100%, 0% 85%)',
      }} />
      {/* Paint drip at the end */}
      {pct > 5 && pct < 98 && (
        <div style={{ position: 'absolute', left: `calc(${pct}% - 3px)`, top: -2, width: 6, height: height + 4, background: color, borderRadius: '0 0 4px 4px', opacity: 0.7 }} />
      )}
    </div>
  )
}
