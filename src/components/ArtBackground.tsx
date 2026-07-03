/**
 * ArtBackground — animated paint splash SVGs behind the app.
 * Decorative only. Aria-hidden. No interaction.
 */
export function ArtBackground() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes drift1 { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(30px,-20px) rotate(8deg)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-20px,30px) rotate(-5deg)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(15px,25px) rotate(12deg)} }
        @keyframes pulse { 0%,100%{opacity:0.06} 50%{opacity:0.12} }
      `}</style>

      {/* Top-left coral splash */}
      <svg style={{ position:'absolute', top:-80, left:-60, animation:'drift1 18s ease-in-out infinite', opacity:0.08 }} width="500" height="500" viewBox="0 0 500 500">
        <path d="M200 80 Q320 20 420 100 Q520 180 480 300 Q440 420 320 460 Q200 500 120 420 Q40 340 60 220 Q80 100 200 80Z" fill="#FF6B35"/>
        <path d="M180 140 Q260 100 340 160 Q420 220 400 320 Q380 420 300 440 Q220 460 160 400 Q100 340 120 260 Q140 180 180 140Z" fill="#FF9F1C" opacity="0.6"/>
      </svg>

      {/* Bottom-right cyan blob */}
      <svg style={{ position:'absolute', bottom:-100, right:-80, animation:'drift2 22s ease-in-out infinite', opacity:0.07 }} width="600" height="600" viewBox="0 0 600 600">
        <path d="M300 60 Q440 40 520 160 Q600 280 560 420 Q520 540 380 580 Q240 620 140 520 Q40 420 60 280 Q80 140 300 60Z" fill="#1ECBE1"/>
        <path d="M300 120 Q400 100 460 200 Q520 300 480 400 Q440 500 340 520 Q240 540 180 460 Q120 380 140 280 Q160 180 300 120Z" fill="#00B4CC" opacity="0.5"/>
      </svg>

      {/* Middle-left purple streak */}
      <svg style={{ position:'absolute', top:'35%', left:-40, animation:'drift3 15s ease-in-out infinite', opacity:0.06 }} width="200" height="400" viewBox="0 0 200 400">
        <path d="M60 20 Q140 0 180 80 Q220 160 200 240 Q180 320 120 380 Q60 440 20 360 Q-20 280 10 180 Q40 80 60 20Z" fill="#8B5CF6"/>
      </svg>

      {/* Top-right amber drop */}
      <svg style={{ position:'absolute', top:120, right:-30, animation:'drift1 20s 3s ease-in-out infinite', opacity:0.07 }} width="250" height="350" viewBox="0 0 250 350">
        <path d="M125 20 Q200 20 230 100 Q260 180 230 260 Q200 340 125 350 Q50 360 20 280 Q-10 200 20 120 Q50 40 125 20Z" fill="#FFE135"/>
      </svg>

      {/* Centre pulse — very subtle */}
      <svg style={{ position:'absolute', top:'40%', left:'40%', animation:'pulse 8s ease-in-out infinite', opacity:0.05 }} width="400" height="400" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="180" fill="#a78bfa" fillOpacity="0.3"/>
        <circle cx="200" cy="200" r="120" fill="#8B5CF6" fillOpacity="0.2"/>
      </svg>

      {/* Bottom-left pink splat */}
      <svg style={{ position:'absolute', bottom:60, left:120, animation:'drift2 25s 5s ease-in-out infinite', opacity:0.06 }} width="180" height="200" viewBox="0 0 180 200">
        <path d="M90 10 Q150 10 170 60 Q190 110 160 160 Q130 210 80 200 Q30 190 10 140 Q-10 90 20 50 Q50 10 90 10Z" fill="#f472b6"/>
      </svg>
    </div>
  )
}

/** Inline paint splash for section headers */
export function PaintSplash({ color, width = 120, height = 40, style = {} }: {
  color: string; width?: number; height?: number; style?: React.CSSProperties
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 40" style={style} aria-hidden>
      <path d="M5 20 Q10 5 30 8 Q50 2 70 10 Q90 5 110 12 Q125 18 115 28 Q105 38 80 35 Q55 38 35 33 Q15 38 5 30 Z"
        fill={color} opacity="0.9"/>
    </svg>
  )
}

/** Brush stroke divider */
export function BrushDivider({ color = 'rgba(255,255,255,0.08)' }: { color?: string }) {
  return (
    <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" aria-hidden>
      <path d="M0 4 Q100 1 200 4 Q300 7 400 4" stroke={color} strokeWidth="2" fill="none"/>
    </svg>
  )
}

/** Ink drop badge — replaces boring pill */
export function InkBadge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
        <path d="M6 4 Q50 0 94 4 Q102 10 100 22 Q98 32 50 32 Q2 32 0 22 Q-2 10 6 4Z" fill={color} opacity="0.2"/>
        <path d="M6 4 Q50 0 94 4 Q102 10 100 22 Q98 32 50 32 Q2 32 0 22 Q-2 10 6 4Z" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5"/>
      </svg>
      <span style={{ position:'relative', padding:'4px 14px', fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:0.8 }}>
        {children}
      </span>
    </span>
  )
}
