/**
 * LearningPaths — structured course experience
 * Currently hosts: Practical Painting Course (Adults) — Foundation Segment
 * KES 13,700 · 8 sessions · 2–5 students per class
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

interface Path {
  id: string; slug: string; title: string; subtitle: string; description: string
  level: string; total_sessions: number; price_kes: number
  class_size_min: number; class_size_max: number; duration_weeks: number
  materials: string[]
}
interface Session {
  id: string; session_number: number; title: string; outcome: string
  activities: string[]; mini_outcome: string; domain: string
  difficulty: string; duration_mins: number; materials: string[]
  instructor_notes: string; demo_duration_mins: number; image_url: string
}
interface Progress { session_id: string; completed: boolean; completed_at: string | null }

const DOMAIN_COLORS: Record<string, string> = {
  painting: '#FF6B35', colour_theory: '#FFE135', drawing: '#f9a8d4',
  fundamentals: '#1ECBE1', mixed_media: '#a78bfa',
}

export default function LearningPaths({ profile }: { profile: Profile }) {
  const [paths, setPaths]         = useState<Path[]>([])
  const [sessions, setSessions]   = useState<Session[]>([])
  const [progress, setProgress]   = useState<Progress[]>([])
  const [selPath, setSelPath]     = useState<Path | null>(null)
  const [selSess, setSelSess]     = useState<Session | null>(null)
  const [missionLoading, setML]   = useState(false)
  const [mission, setMission]     = useState<any>(null)
  const [markLoading, setMarkL]   = useState(false)
  const [view, setView]           = useState<'paths'|'course'|'session'>('paths')
  const isTeacher = profile.role !== 'student'

  useEffect(() => { loadData() }, [profile])

  async function loadData() {
    const [{ data: ps }, { data: prog }] = await Promise.all([
      supabase.from('learning_paths').select('*').eq('is_active', true).order('created_at'),
      supabase.from('student_path_progress').select('session_id, completed, completed_at').eq('student_id', profile.id),
    ])
    setPaths(ps || [])
    setProgress(prog || [])
  }

  async function loadSessions(path: Path) {
    const { data } = await supabase.from('path_sessions').select('*').eq('path_id', path.id).order('session_number')
    setSessions(data || [])
    setSelPath(path); setView('course')
  }

  async function generateMission(sess: Session) {
    setML(true); setMission(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({ domain: sess.domain, difficulty: sess.difficulty, student_age: 30, school_id: profile.school_id, context: `This is for Session ${sess.session_number} of the Practical Painting Course: "${sess.title}". The session outcome is: ${sess.outcome}` }),
      })
      const data = await res.json()
      setMission(data)
    } catch(e) { console.error(e) }
    setML(false)
  }

  async function markComplete(sess: Session) {
    setMarkL(true)
    await supabase.from('student_path_progress').upsert({
      student_id: profile.id, path_id: selPath!.id, session_id: sess.id,
      completed: true, completed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,session_id' })
    setProgress(prev => {
      const exists = prev.find(p => p.session_id === sess.id)
      if (exists) return prev.map(p => p.session_id === sess.id ? { ...p, completed: true, completed_at: new Date().toISOString() } : p)
      return [...prev, { session_id: sess.id, completed: true, completed_at: new Date().toISOString() }]
    })
    setMarkL(false)
  }

  const completedCount = selPath ? sessions.filter(s => progress.find(p => p.session_id === s.id && p.completed)).length : 0
  const isCompleted = (id: string) => !!progress.find(p => p.session_id === id && p.completed)
  const domColor = (d: string) => DOMAIN_COLORS[d] || '#fff'

  // ── Determine current session (first incomplete, for students) ──
  const currentSessionIdx = isTeacher ? -1 : sessions.findIndex(s => !isCompleted(s.id))

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px 60px', fontFamily:"'Inter',sans-serif", position:'relative', zIndex:1 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── BREADCRUMB ──────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24, fontSize:13, color:'rgba(255,255,255,0.35)' }}>
        <button onClick={() => { setView('paths'); setSelPath(null); setSelSess(null); setMission(null) }} style={{ background:'none', border:'none', color: view==='paths'?'#fff':'rgba(255,255,255,0.35)', cursor:'pointer', padding:0, fontSize:13, fontWeight: view==='paths'?700:400 }}>Learning Paths</button>
        {selPath && <><span>›</span><button onClick={() => { setView('course'); setSelSess(null); setMission(null) }} style={{ background:'none', border:'none', color: view==='course'?'#fff':'rgba(255,255,255,0.35)', cursor:'pointer', padding:0, fontSize:13, fontWeight: view==='course'?700:400 }}>{selPath.title}</button></>}
        {selSess && <><span>›</span><span style={{ color:'#fff', fontWeight:700 }}>Session {selSess.session_number}</span></>}
      </div>

      {/* ══════════════════════════════════════════════════════════
          PATHS LIST
          ══════════════════════════════════════════════════════════ */}
      {view === 'paths' && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:28, color:'#fff', margin:'0 0 6px' }}>Learning Paths</h1>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, margin:0 }}>Structured course programmes — guided studio experiences designed for adult learners</p>
          </div>

          {paths.length === 0 && <div style={{ color:'rgba(255,255,255,0.3)', textAlign:'center', padding:60 }}>No courses available yet.</div>}

          {paths.map(p => (
            <div key={p.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', marginBottom:16, cursor:'pointer', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,159,28,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}
              onClick={() => loadSessions(p)}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20, padding:'24px 24px' }}>
                <div>
                  {/* Level badge */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, background:'rgba(255,159,28,0.15)', border:'1px solid rgba(255,159,28,0.3)', color:'#FF9F1C', borderRadius:20, padding:'2px 10px' }}>
                      {p.level} · Segment 1
                    </span>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>
                      {p.total_sessions} sessions · {p.duration_weeks} weeks
                    </span>
                  </div>
                  <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:22, color:'#fff', margin:'0 0 6px' }}>{p.title}</h2>
                  <div style={{ fontSize:13, color:'rgba(255,159,28,0.7)', marginBottom:10 }}>{p.subtitle}</div>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.7, margin:'0 0 16px', maxWidth:580 }}>{p.description}</p>
                  {/* Course quick-stats */}
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    {[
                      ['👥', `${p.class_size_min}–${p.class_size_max} students`],
                      ['⏱', '2–3 hours per session'],
                      ['📅', '1 session/week'],
                      ['📍', 'Indoor studio + outdoor options'],
                    ].map(([icon, text]) => (
                      <div key={text as string} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
                        <span>{icon}</span><span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Price + CTA */}
                <div style={{ textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:28, color:'#FFE135', lineHeight:1 }}>KES {(p.price_kes||0).toLocaleString()}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:3 }}>per segment</div>
                  </div>
                  <div style={{ marginTop:16, background:'linear-gradient(135deg,#FF9F1C,#FF6B35)', borderRadius:10, padding:'10px 18px', fontSize:13, fontFamily:"'Fredoka One',sans-serif", color:'#fff', textAlign:'center' }}>
                    {isTeacher ? 'View Course →' : 'My Progress →'}
                  </div>
                </div>
              </div>
              {/* Materials strip */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 24px', display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', marginRight:4 }}>MATERIALS:</span>
                {(p.materials||[]).slice(0,6).map(m => (
                  <span key={m} style={{ fontSize:10, background:'rgba(255,255,255,0.05)', borderRadius:20, padding:'2px 8px', color:'rgba(255,255,255,0.35)' }}>{m}</span>
                ))}
                {(p.materials||[]).length > 6 && <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>+{(p.materials||[]).length-6} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          COURSE — 8 session overview
          ══════════════════════════════════════════════════════════ */}
      {view === 'course' && selPath && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>
          {/* Progress bar */}
          {!isTeacher && (
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 20px', marginBottom:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:16, color:'#fff' }}>Your Progress</div>
                <div style={{ fontSize:13, color:'#FF9F1C', fontWeight:700 }}>{completedCount}/{selPath.total_sessions} sessions</div>
              </div>
              <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(completedCount/selPath.total_sessions)*100}%`, background:'linear-gradient(90deg,#FF9F1C,#FFE135)', borderRadius:3, transition:'width 0.6s ease' }}/>
              </div>
              {completedCount === selPath.total_sessions && (
                <div style={{ marginTop:10, fontSize:13, color:'#4ade80', fontWeight:700 }}>
                  {selPath.level === 'foundation'
                    ? "🎉 Foundation complete! You're ready for Intermediate — speak to your teacher."
                    : selPath.level === 'intermediate'
                    ? "🎉 Intermediate complete! You've earned a full body of 16 paintings."
                    : "🎉 Segment complete!"}
                </div>
              )}
            </div>
          )}

          {/* Teacher method banner */}
          {isTeacher && (
            <div style={{ background:'rgba(30,203,225,0.06)', border:'1px solid rgba(30,203,225,0.15)', borderRadius:14, padding:'14px 20px', marginBottom:24, display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ fontSize:24, flexShrink:0 }}>📋</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#1ECBE1', marginBottom:4 }}>Teaching Method</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.7 }}>Demo first (max 10–15 min) · 80% session time = students painting · Move table-to-table correcting brush handling, colour, composition · Class size 2–5 for high-touch coaching</div>
              </div>
            </div>
          )}

          {/* Session cards */}
          <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:'#fff', margin:'0 0 16px' }}>8 Sessions · Foundation Segment</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {sessions.map((s, idx) => {
              const done = isCompleted(s.id)
              const isCurrent = !isTeacher && idx === currentSessionIdx
              const locked = !isTeacher && idx > currentSessionIdx && !done
              return (
                <div key={s.id}
                  onClick={() => { if (!locked) { setSelSess(s); setView('session'); setMission(null) } }}
                  style={{
                    background: isCurrent ? 'rgba(255,159,28,0.08)' : done ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCurrent?'rgba(255,159,28,0.3)':done?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.07)'}`,
                    borderRadius:14, padding:'16px 18px', cursor:locked?'default':'pointer',
                    opacity: locked ? 0.45 : 1, transition:'all 0.15s', display:'flex', gap:14, alignItems:'flex-start',
                  }}
                  onMouseEnter={e => { if(!locked) e.currentTarget.style.borderColor=isCurrent?'rgba(255,159,28,0.5)':done?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=isCurrent?'rgba(255,159,28,0.3)':done?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.07)' }}>

                  {/* Session number circle */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background: done?'rgba(74,222,128,0.2)':isCurrent?'rgba(255,159,28,0.2)':'rgba(255,255,255,0.07)', border:`2px solid ${done?'#4ade80':isCurrent?'#FF9F1C':'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:done?'18px':'14px', fontWeight:800, color:done?'#4ade80':isCurrent?'#FF9F1C':'rgba(255,255,255,0.4)' }}>
                    {done ? '✓' : s.session_number}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{s.title}</div>
                      {isCurrent && <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, background:'rgba(255,159,28,0.2)', border:'1px solid rgba(255,159,28,0.4)', color:'#FF9F1C', borderRadius:20, padding:'2px 8px' }}>Current</span>}
                      {done && <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#4ade80', opacity:0.7 }}>Complete</span>}
                    </div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5, marginBottom:8 }}>{s.outcome}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, background:`${domColor(s.domain)}18`, border:`1px solid ${domColor(s.domain)}30`, color:domColor(s.domain), borderRadius:20, padding:'2px 8px', fontWeight:700 }}>{s.domain.replace(/_/g,' ')}</span>
                      <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>⏱ {s.duration_mins/60}h{s.duration_mins%60?`${s.duration_mins%60}m`:''}</span>
                      <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Mini outcome: {s.mini_outcome}</span>
                    </div>
                  </div>
                  {!locked && <div style={{ color:'rgba(255,255,255,0.25)', fontSize:18, flexShrink:0 }}>›</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SESSION detail — full plan
          ══════════════════════════════════════════════════════════ */}
      {view === 'session' && selSess && selPath && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>

          {/* Hero */}
          <div style={{ position:'relative', height:200, borderRadius:18, overflow:'hidden', marginBottom:28 }}>
            <img src={selSess.image_url} alt={selSess.title} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(8,6,16,0.95) 0%, rgba(8,6,16,0.4) 60%, transparent 100%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 24px 22px' }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,159,28,0.7)', marginBottom:6 }}>
                Session {selSess.session_number} of 8 · {selPath.title}
              </div>
              <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:26, color:'#fff', margin:0, lineHeight:1 }}>{selSess.title}</h1>
            </div>
            {/* Complete button overlay for students */}
            {!isTeacher && (
              <button onClick={(e) => { e.stopPropagation(); markComplete(selSess) }} disabled={markLoading || isCompleted(selSess.id)} style={{
                position:'absolute', top:14, right:14, background: isCompleted(selSess.id)?'rgba(74,222,128,0.3)':'rgba(255,159,28,0.2)',
                border:`1px solid ${isCompleted(selSess.id)?'rgba(74,222,128,0.5)':'rgba(255,159,28,0.4)'}`,
                color: isCompleted(selSess.id)?'#4ade80':'#FF9F1C', borderRadius:10, padding:'7px 14px', cursor:isCompleted(selSess.id)?'default':'pointer', fontSize:12, fontWeight:700,
              }}>
                {isCompleted(selSess.id) ? '✓ Completed' : markLoading ? 'Saving…' : 'Mark Complete'}
              </button>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24, alignItems:'start' }}>

            {/* LEFT: session content */}
            <div>
              {/* Outcome */}
              <div style={{ background:'rgba(255,159,28,0.07)', border:'1px solid rgba(255,159,28,0.18)', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,159,28,0.7)', marginBottom:5 }}>Session Outcome</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.85)', lineHeight:1.7, fontWeight:500 }}>{selSess.outcome}</div>
              </div>

              {/* Activities */}
              <Sec title="Session Plan" color="#1ECBE1">
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {(selSess.activities||[]).map((act, i) => (
                    <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(30,203,225,0.15)', border:'1px solid rgba(30,203,225,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#1ECBE1', flexShrink:0, marginTop:1 }}>{i+1}</div>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.7 }}>{act}</div>
                    </div>
                  ))}
                </div>
              </Sec>

              {/* Mini outcome */}
              <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(74,222,128,0.7)', marginBottom:4 }}>Mini Outcome</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>{selSess.mini_outcome}</div>
              </div>

              {/* Instructor notes — teacher only */}
              {isTeacher && selSess.instructor_notes && (
                <Sec title={`Instructor Notes (Demo: ${selSess.demo_duration_mins} min max)`} color="#a78bfa">
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.85, fontStyle:'italic', borderLeft:'2px solid rgba(167,139,250,0.3)', paddingLeft:16 }}>
                    {selSess.instructor_notes}
                  </div>
                </Sec>
              )}
            </div>

            {/* RIGHT: materials + mission generator */}
            <div>
              {/* Time breakdown */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>Session Timing</div>
                {[
                  [`Demo`, `${selSess.demo_duration_mins} min`, '#FF9F1C'],
                  [`Studio Practice`, `${selSess.duration_mins - selSess.demo_duration_mins - 15} min`, '#1ECBE1'],
                  [`Critique / Review`, `15 min`, '#4ade80'],
                  [`Total`, `${selSess.duration_mins} min (${Math.floor(selSess.duration_mins/60)}h${selSess.duration_mins%60?` ${selSess.duration_mins%60}m`:''})`, '#FFE135'],
                ].map(([label, time, color]) => (
                  <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: color as string }}>{time}</span>
                  </div>
                ))}
              </div>

              {/* Materials */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>Session Materials</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {(selSess.materials||[]).map(m => (
                    <div key={m} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,0.6)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF9F1C', flexShrink:0 }}/>
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mission generator */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>✦ Generate Session Mission</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6, marginBottom:12 }}>
                  Generate an AI mission aligned to this session's domain and outcomes — use as a warm-up activity or independent challenge.
                </div>
                <button onClick={() => generateMission(selSess)} disabled={missionLoading} style={{ width:'100%', padding:'11px 0', background:missionLoading?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${DOMAIN_COLORS[selSess.domain]||'#FF9F1C'},rgba(255,107,53,0.8))`, border:'none', borderRadius:10, color:'#fff', fontSize:13, fontFamily:"'Fredoka One',sans-serif", cursor:missionLoading?'not-allowed':'pointer', marginBottom:mission?12:0 }}>
                  {missionLoading ? 'Generating…' : '✦ Generate Mission'}
                </button>
                {mission && (
                  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', animation:'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:DOMAIN_COLORS[selSess.domain]||'#FF9F1C', marginBottom:6 }}>{mission.mission_title}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.7, marginBottom:8 }}>{mission.challenge_description}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>⏱ {mission.time_estimate}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────
function Sec({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:3, height:16, background:color, borderRadius:2, flexShrink:0 }}/>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color }}>{title}</div>
      </div>
      {children}
    </div>
  )
}
