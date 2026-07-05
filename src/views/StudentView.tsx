import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const XP_PER_LEVEL = 200

function xpToLevel(xp: number) { return Math.min(50, Math.floor(xp / XP_PER_LEVEL) + 1) }
function levelColor(lvl: number) {
  if (lvl <= 7)  return '#67e8f9'
  if (lvl <= 14) return '#86efac'
  if (lvl <= 21) return '#fde68a'
  if (lvl <= 35) return '#ff9f1c'
  return '#c084fc'
}
function levelTier(lvl: number) {
  if (lvl <= 7)  return 'Foundation'
  if (lvl <= 14) return 'Beginner'
  if (lvl <= 21) return 'Intermediate'
  if (lvl <= 35) return 'Advanced'
  return 'Expert'
}

interface MissionHint { hint_text: string; hint_type: string; image_url?: string }

const DOMAINS = [
  { key: 'elements_of_art',      label: 'Elements',  color: '#1ECBE1', img: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&q=70' },
  { key: 'drawing',              label: 'Drawing',   color: '#f9a8d4', img: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=300&q=70' },
  { key: 'painting',             label: 'Painting',  color: '#FF6B35', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&q=70' },
  { key: 'colour_theory',        label: 'Colour',    color: '#FFE135', img: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=300&q=70' },
  { key: 'mixed_media',          label: 'Mixed',     color: '#a78bfa', img: 'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=300&q=70' },
  { key: 'principles_of_design', label: 'Design',    color: '#4ade80', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=70' },
]

const DIFFICULTIES = [
  { key: 'foundation',   label: 'Foundation',   color: '#67e8f9', xp: 50  },
  { key: 'beginner',     label: 'Beginner',     color: '#86efac', xp: 75  },
  { key: 'intermediate', label: 'Intermediate', color: '#fde68a', xp: 100 },
  { key: 'advanced',     label: 'Advanced',     color: '#ff9f1c', xp: 150 },
  { key: 'expert',       label: 'Expert',       color: '#c084fc', xp: 200 },
]

export default function StudentView({ profile }: { profile: Profile }) {
  const [domain, setDomain]       = useState('drawing')
  const [difficulty, setDiff]     = useState('beginner')
  const [mission, setMission]     = useState<any>(null)
  const [loading, setLoading]     = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [xpGained, setXpGained]   = useState(0)
  const [suggestedLesson, setSuggestedLesson] = useState<any>(null)
  const [totalXp, setTotalXp]     = useState(0)
  const [credits, setCredits]     = useState(5)
  const [hints, setHints]         = useState<MissionHint[]>([])
  const [revealed, setRevealed]   = useState<number[]>([])

  useEffect(() => { loadStudent() }, [])

  async function loadStudent() {
    const [{ data: prog }, { data: prof }] = await Promise.all([
      supabase.from('xp_ledger').select('xp_amount').eq('student_id', profile.id),
      supabase.from('profiles').select('hint_credits').eq('id', profile.id).single(),
    ])
    setTotalXp((prog || []).reduce((s: number, r: any) => s + r.xp_amount, 0))
    setCredits(prof?.hint_credits ?? 5)
  }

  async function generate() {
    setLoading(true); setCompleted(false); setRevealed([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domain, difficulty, student_age: 14, school_id: profile.school_id }),
      })
      const data = await r.json()
      setMission({ ...data, domain, difficulty })
      // Curriculum link: find nearest lesson in this domain + difficulty
      const { data: lessons } = await (await import('../lib/supabase')).supabase
        .from('lesson_library')
        .select('id, title, domain, level, level_number, concept, image_url')
        .eq('domain', domain)
        .eq('level', difficulty)
        .limit(1)
      if (lessons && lessons.length > 0) setSuggestedLesson(lessons[0])
      else setSuggestedLesson(null)
      const { data: hData } = await supabase.from('mission_hints').select('*').eq('domain', domain).limit(3)
      setHints(hData || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function complete() {
    if (!mission) return
    setCompleting(true)
    const xp = DIFFICULTIES.find(d=>d.key===difficulty)?.xp || 75
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${SUPABASE_URL}/functions/v1/award-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ student_id: profile.id, school_id: profile.school_id, xp_amount: xp, mission_title: mission.mission_title }),
      })
      setXpGained(xp); setTotalXp(t => t + xp); setCompleted(true)
    } catch(e) { console.error(e) }
    setCompleting(false)
  }

  async function revealHint(i: number) {
    if (credits <= 0 || revealed.includes(i) || i >= hints.length) return
    const next = credits - 1
    setCredits(next); setRevealed(p => [...p, i])
    await supabase.from('profiles').update({ hint_credits: next }).eq('id', profile.id)
  }

  const level = xpToLevel(totalXp)
  const lc = levelColor(level)
  const lt = levelTier(level)
  const pct = ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100
  const diff = DIFFICULTIES.find(d => d.key === difficulty)!
  const dom = DOMAINS.find(d => d.key === domain)!

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 16px', position: 'relative', zIndex: 1 }}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px ${lc}40} 50%{box-shadow:0 0 40px ${lc}80} }
        @keyframes pop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* Level card */}
      <div style={{ background: `linear-gradient(135deg, ${lc}15, rgba(255,255,255,0.03))`, border: `1px solid ${lc}30`, borderRadius: 20, padding: '20px 22px', marginBottom: 24, animation: 'glow 4s ease-in-out infinite' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* Level circle */}
            <div style={{ position:'relative', width:64, height:64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" style={{ position:'absolute', inset:0 }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                <circle cx="32" cy="32" r="28" fill="none" stroke={lc} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*28}`} strokeDashoffset={`${2*Math.PI*28 * (1 - pct/100)}`}
                  style={{ transition:'stroke-dashoffset 0.8s ease', transform:'rotate(-90deg)', transformOrigin:'center' }}/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                <span style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:lc, lineHeight:1 }}>{level}</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:18, color:'#fff' }}>{profile.name}</div>
              <div style={{ fontSize:12, color:lc, fontWeight:700, marginTop:2 }}>{lt}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{totalXp} XP total</div>
            </div>
          </div>
          {/* Credits */}
          <div style={{ textAlign:'center', background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.25)', borderRadius:16, padding:'10px 16px' }}>
            <div style={{ fontSize:22 }}>💡</div>
            <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:22, color:'#FFE135', lineHeight:1 }}>{credits}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>hints</div>
          </div>
        </div>
        {/* XP bar */}
        <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${lc}88,${lc})`, borderRadius:3, transition:'width 0.8s ease', clipPath:'polygon(0 30%, 100% 0, 100% 100%, 0 70%)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>Level {level}</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{level < 50 ? `${XP_PER_LEVEL - (totalXp % XP_PER_LEVEL)} XP to Level ${level+1}` : 'Max level!'}</span>
        </div>
      </div>

      {/* Mission builder */}
      {!mission && !completed && (
        <div style={{ animation:'slideIn 0.4s ease' }}>
          <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:22, color:'#fff', margin:'0 0 20px' }}>Pick your mission</h2>

          {/* Domain cards with images */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>Domain</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {DOMAINS.map(d => (
                <button key={d.key} onClick={() => setDomain(d.key)} style={{
                  position:'relative', height:64, borderRadius:12, overflow:'hidden', cursor:'pointer',
                  border:`2px solid ${domain===d.key ? d.color : 'transparent'}`,
                  boxShadow: domain===d.key ? `0 0 20px ${d.color}40` : 'none',
                  transition:'all 0.15s', padding:0, background:'#0d0820',
                }}>
                  <img src={d.img} alt={d.label} style={{ width:'100%', height:'100%', objectFit:'cover', opacity: domain===d.key ? 0.8 : 0.35, transition:'opacity 0.15s' }} />
                  <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg,transparent 20%,rgba(0,0,0,0.7))` }} />
                  <div style={{ position:'absolute', bottom:5, left:0, right:0, textAlign:'center', fontSize:11, fontWeight:800, color: domain===d.key ? d.color : 'rgba(255,255,255,0.6)' }}>{d.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>Difficulty</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {DIFFICULTIES.map(d => (
                <button key={d.key} onClick={() => setDiff(d.key)} style={{
                  background: difficulty===d.key ? d.color+'25' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${difficulty===d.key ? d.color : 'rgba(255,255,255,0.08)'}`,
                  color: difficulty===d.key ? d.color : 'rgba(255,255,255,0.4)',
                  borderRadius:20, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700,
                  display:'flex', alignItems:'center', gap:5,
                  boxShadow: difficulty===d.key ? `0 0 12px ${d.color}30` : 'none',
                  transition:'all 0.15s',
                }}>
                  {d.label} <span style={{ opacity:0.6, fontSize:10 }}>+{d.xp}xp</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading} style={{
            width:'100%', padding:'16px 0', borderRadius:16, border:'none', cursor: loading?'not-allowed':'pointer',
            background: loading ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${dom.color}, ${dom.color}aa)`,
            color:'#fff', fontSize:18, fontFamily:"'Fredoka One',sans-serif", letterSpacing:0.5,
            boxShadow: loading ? 'none' : `0 8px 32px ${dom.color}40`,
            transition:'all 0.2s',
          }}>
            {loading ? 'Generating...' : `✦ Generate ${dom.label} Mission`}
          </button>
        </div>
      )}

      {/* Mission card */}
      {mission && !completed && (
        <div style={{ animation:'slideIn 0.4s ease' }}>
          {/* Domain image banner */}
          <div style={{ position:'relative', height:140, borderRadius:'20px 20px 0 0', overflow:'hidden', marginBottom:0 }}>
            <img src={dom.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.7 }} />
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, transparent 30%, #1a1040)` }} />
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background:dom.color }} />
            <div style={{ position:'absolute', bottom:14, left:20 }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:dom.color, marginBottom:4 }}>
                {diff.label} · {dom.label}
              </div>
              <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:'#fff', lineHeight:1.2, maxWidth:'80%' }}>
                {mission.mission_title}
              </div>
            </div>
            <button onClick={() => { setMission(null); setHints([]); setRevealed([]); setSuggestedLesson(null) }} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.6)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:15, backdropFilter:'blur(4px)' }}>×</button>
          </div>

          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'0 0 20px 20px', padding:'22px 22px 22px', borderTop:'none' }}>
            <p style={{ color:'rgba(255,255,255,0.82)', fontSize:15, lineHeight:1.8, margin:'0 0 20px' }}>
              {mission.challenge_description}
            </p>

            <InfoRow title="You are practising" color={dom.color}>{mission.learning_focus}</InfoRow>
            <InfoRow title="Success looks like" color="#4ade80">{mission.success_criteria}</InfoRow>

            {mission.materials?.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Materials</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {mission.materials.map((m:string, i:number) => (
                    <span key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'3px 10px', fontSize:12, color:'rgba(255,255,255,0.6)' }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:24 }}>⏱ {mission.time_estimate}</div>

            {/* Hint panel */}
            <div style={{ background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:16, padding:16, marginBottom:22 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>💡</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#FFE135' }}>Hints</span>
                </div>
                <div style={{ fontSize:11, color:'rgba(255,215,0,0.5)', fontWeight:700 }}>
                  {credits} credit{credits!==1?'s':''} remaining
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[0,1,2].map(i => {
                  const isRevealed = revealed.includes(i)
                  const hint = hints[i]
                  const canReveal = credits > 0 && !isRevealed && hint
                  return (
                    <div key={i}>
                      {!isRevealed ? (
                        <button onClick={() => revealHint(i)} disabled={!canReveal} style={{
                          width:'100%', background: canReveal ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1.5px dashed ${canReveal ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius:12, padding:'12px 16px', cursor: canReveal?'pointer':'not-allowed',
                          display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.15s',
                        }}
                          onMouseEnter={e => canReveal && (e.currentTarget.style.background='rgba(255,215,0,0.14)')}
                          onMouseLeave={e => canReveal && (e.currentTarget.style.background='rgba(255,215,0,0.08)')}
                        >
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:20 }}>{canReveal ? '🔒' : '🚫'}</span>
                            <span style={{ fontSize:13, color: canReveal?'#FFE135':'rgba(255,255,255,0.2)', fontWeight:600 }}>
                              {!hint ? 'No more hints' : `Reveal hint ${i+1}`}
                            </span>
                          </div>
                          {canReveal && (
                            <span style={{ fontSize:11, color:'rgba(255,215,0,0.5)', fontWeight:700 }}>−1 💡</span>
                          )}
                        </button>
                      ) : (
                        <div style={{ animation:'pop 0.35s ease', background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:12, overflow:'hidden' }}>
                          {hint.image_url && (
                            <div style={{ position:'relative', height:120, overflow:'hidden' }}>
                              <img src={hint.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent 40%,rgba(13,8,32,0.8))' }} />
                              <div style={{ position:'absolute', bottom:8, left:12, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#FFE135' }}>
                                {hint.hint_type} clue
                              </div>
                            </div>
                          )}
                          <div style={{ padding:'12px 14px' }}>
                            <p style={{ color:'rgba(255,255,255,0.85)', fontSize:13, lineHeight:1.7, margin:0 }}>{hint.hint_text}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={complete} disabled={completing} style={{
                flex:1, padding:'14px 0', background: completing?'rgba(255,255,255,0.05)':`linear-gradient(135deg,#4ade80,#16a34a)`,
                border:'none', borderRadius:14, color:'#fff', fontSize:16, fontFamily:"'Fredoka One',sans-serif",
                cursor: completing?'not-allowed':'pointer', boxShadow: completing?'none':'0 8px 24px rgba(74,222,128,0.3)',
              }}>
                {completing ? 'Recording...' : '✓ Mission Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum link — suggested lesson for this domain + difficulty */}
      {suggestedLesson && mission && !completed && (
        <div style={{ marginTop:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden', animation:'fadeUp 0.5s 0.3s ease both', display:'flex', gap:0 }}>
          {suggestedLesson.image_url && (
            <div style={{ width:80, flexShrink:0, backgroundImage:`url(${suggestedLesson.image_url})`, backgroundSize:'cover', backgroundPosition:'center', position:'relative' }}>
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }}/>
            </div>
          )}
          <div style={{ padding:'14px 16px', flex:1 }}>
            <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.3)', marginBottom:5 }}>
              📚 Related lesson
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:3 }}>{suggestedLesson.title}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{suggestedLesson.concept}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', padding:'0 14px', color:'rgba(255,255,255,0.2)', fontSize:18 }}>›</div>
        </div>
      )}

      {/* Completion */}
      {completed && (
        <div style={{ textAlign:'center', padding:'48px 20px', animation:'pop 0.4s ease' }}>
          {/* Animated paint splash */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ marginBottom:16, animation:'pop 0.5s ease' }}>
            <path d="M60 10 Q90 15 105 40 Q120 65 105 88 Q90 110 60 112 Q30 114 15 90 Q0 65 15 40 Q30 15 60 10Z" fill={dom.color} opacity="0.3"/>
            <path d="M60 25 Q82 28 94 48 Q106 68 94 86 Q82 104 60 106 Q38 108 26 88 Q14 68 26 50 Q38 30 60 25Z" fill={dom.color} opacity="0.5"/>
            <text x="60" y="72" textAnchor="middle" fontFamily="'Fredoka One',sans-serif" fontSize="36" fill={dom.color}>✓</text>
          </svg>
          <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:30, color:'#fff', margin:'0 0 8px' }}>Done!</h2>
          <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:26, color:'#FFE135', marginBottom:8 }}>+{xpGained} XP</div>
          {xpToLevel(totalXp) > xpToLevel(totalXp - xpGained) && (
            <div style={{ color:lc, fontFamily:"'Fredoka One',sans-serif", fontSize:18, marginBottom:12, animation:'glow 2s ease infinite' }}>
              🎉 Level Up! You are now Level {level}
            </div>
          )}
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:28 }}>Share it with your clan — then take on the next one.</p>
          <button onClick={() => { setCompleted(false); setMission(null); setHints([]); setRevealed([]); setSuggestedLesson(null) }} style={{
            background:`linear-gradient(135deg,${dom.color},${dom.color}aa)`, border:'none', borderRadius:14,
            color:'#fff', fontSize:17, fontFamily:"'Fredoka One',sans-serif", padding:'14px 36px', cursor:'pointer',
            boxShadow:`0 8px 32px ${dom.color}40`,
          }}>
            Next Mission
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color, marginBottom:5 }}>{title}</div>
      <div style={{ color:'rgba(255,255,255,0.72)', fontSize:14, lineHeight:1.65 }}>{children}</div>
    </div>
  )
}
