/**
 * CurrentSessionCard — embedded in StudentView
 * Shows: current course segment, current session, progress bar, deep-link to session plan
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Session { id: string; session_number: number; title: string; outcome: string; mini_outcome: string }
interface Path { id: string; title: string; subtitle: string; level: string; total_sessions: number }

export default function CurrentSessionCard({ profile, onNavigateCourses }: { profile: Profile; onNavigateCourses: () => void }) {
  const [path, setPath]       = useState<Path | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [completed, setCompleted] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCourse() }, [profile])

  async function loadCourse() {
    setLoading(true)
    try {
      // Find class this student belongs to
      const { data: enrollment } = await supabase
        .from('class_enrollments').select('class_id').eq('student_id', profile.id).maybeSingle()

      if (!enrollment) { setLoading(false); return }

      // Find path assigned to that class
      const { data: assignment } = await supabase
        .from('class_path_assignments').select('path_id').eq('class_id', enrollment.class_id).maybeSingle()

      if (!assignment) { setLoading(false); return }

      // Fetch path info and student's progress in parallel
      const [{ data: pathData }, { data: progressData }, { data: sessionsData }] = await Promise.all([
        supabase.from('learning_paths').select('id,title,subtitle,level,total_sessions').eq('id', assignment.path_id).single(),
        supabase.from('student_path_progress').select('session_id,completed').eq('student_id', profile.id).eq('path_id', assignment.path_id).eq('completed', true),
        supabase.from('path_sessions').select('id,session_number,title,outcome,mini_outcome').eq('path_id', assignment.path_id).order('session_number'),
      ])

      if (!pathData || !sessionsData) { setLoading(false); return }

      const completedIds = new Set((progressData || []).map((p: any) => p.session_id))
      const completedCount = completedIds.size
      const nextSession = sessionsData.find((s: any) => !completedIds.has(s.id))

      setPath(pathData as Path)
      setSession(nextSession || sessionsData[sessionsData.length - 1] || null)
      setCompleted(completedCount)
    } catch (e) { /* silent */ }
    setLoading(false)
  }

  if (loading) return null
  if (!path || !session) return null

  const pct = Math.round((completed / path.total_sessions) * 100)
  const allDone = completed >= path.total_sessions

  const LEVEL_COLOR: Record<string,string> = { foundation:'#1ECBE1', intermediate:'#FF9F1C', advanced:'#a78bfa' }
  const lc = LEVEL_COLOR[path.level] || '#FF9F1C'

  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${lc}25`, borderRadius:16, overflow:'hidden', marginBottom:20 }}>
      {/* Top bar */}
      <div style={{ background:`${lc}10`, borderBottom:`1px solid ${lc}18`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:lc }}/>
          <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:lc }}>
            {path.level} · {path.subtitle}
          </span>
        </div>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:700 }}>{completed}/{path.total_sessions} done</span>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {allDone ? (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>🎉</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#4ade80', marginBottom:4 }}>Segment complete!</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Speak to your teacher about the next segment.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:5 }}>
              Your current session
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4, lineHeight:1.3 }}>
              <span style={{ color:lc, fontFamily:"'Fredoka One',sans-serif", marginRight:6 }}>S{session.session_number}</span>
              {session.title}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom:12 }}>
              {session.outcome.length > 100 ? session.outcome.slice(0,100)+'…' : session.outcome}
            </div>
          </>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ height:4, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:allDone?'#4ade80':`linear-gradient(90deg,${lc},#FFE135)`, borderRadius:2, transition:'width 0.6s ease' }}/>
          </div>
        </div>

        <button onClick={onNavigateCourses}
          style={{ width:'100%', padding:'10px 0', background:`${lc}18`, border:`1px solid ${lc}35`, borderRadius:10, color:lc, fontSize:13, fontFamily:"'Fredoka One',sans-serif", cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background=`${lc}28`; e.currentTarget.style.borderColor=`${lc}55` }}
          onMouseLeave={e => { e.currentTarget.style.background=`${lc}18`; e.currentTarget.style.borderColor=`${lc}35` }}>
          {allDone ? 'View Completed Course →' : `Open Session ${session.session_number} Plan →`}
        </button>
      </div>
    </div>
  )
}
