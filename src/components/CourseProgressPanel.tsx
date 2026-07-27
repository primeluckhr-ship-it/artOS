/**
 * CourseProgressPanel — embedded in TeacherView
 * Shows: assign class to a course, per-student session progress, quick session plan access
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Path { id: string; slug: string; title: string; subtitle: string; level: string; total_sessions: number; price_kes: number }
interface Session { id: string; session_number: number; title: string; outcome: string; mini_outcome: string; duration_mins: number; demo_duration_mins: number; instructor_notes: string; activities: string[] }
interface ClassRow { id: string; name: string }
interface StudentProgress { student_id: string; name: string; completed: number; last_at: string | null; current_session: number }
interface Assignment { class_id: string; path_id: string; current_session_number: number }

const LEVEL_COLOR: Record<string,string> = { foundation:'#1ECBE1', intermediate:'#FF9F1C', advanced:'#a78bfa' }

export default function CourseProgressPanel({ profile }: { profile: Profile }) {
  const [paths, setPaths]           = useState<Path[]>([])
  const [classes, setClasses]       = useState<ClassRow[]>([])
  const [assignments, setAssign]    = useState<Assignment[]>([])
  const [selClass, setSelClass]     = useState<string>('')
  const [selPath, setSelPath]       = useState<string>('')
  const [saving, setSaving]         = useState(false)
  const [students, setStudents]     = useState<StudentProgress[]>([])
  const [sessions, setSessions]     = useState<Session[]>([])
  const [focusSess, setFocusSess]   = useState<Session | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => { init() }, [profile])

  async function init() {
    setLoading(true)
    const [{ data: ps }, { data: cls }, { data: asgn }] = await Promise.all([
      supabase.from('learning_paths').select('id,slug,title,subtitle,level,total_sessions,price_kes').eq('is_active',true),
      supabase.from('classes').select('id,name').eq('school_id', profile.school_id),
      supabase.from('class_path_assignments').select('class_id,path_id,current_session_number'),
    ])
    setPaths(ps || [])
    setClasses(cls || [])
    setAssign(asgn || [])
    if (cls && cls.length > 0) {
      const firstClass = cls[0].id
      setSelClass(firstClass)
      const existing = (asgn || []).find(a => a.class_id === firstClass)
      if (existing) {
        setSelPath(existing.path_id)
        loadProgress(firstClass, existing.path_id, ps || [])
        loadSessions(existing.path_id)
      }
    }
    setLoading(false)
  }

  async function loadProgress(classId: string, pathId: string, pathList: Path[]) {
    const path = pathList.find(p => p.id === pathId)
    if (!path) return

    // Get enrolled students for the class
    const { data: enrollments } = await supabase
      .from('class_enrollments').select('student_id, profiles(id,name)')
      .eq('class_id', classId)

    if (!enrollments || enrollments.length === 0) { setStudents([]); return }

    const studentIds = enrollments.map((e: any) => e.student_id)

    // Get their progress
    const { data: prog } = await supabase
      .from('student_path_progress')
      .select('student_id, session_id, completed, completed_at')
      .eq('path_id', pathId)
      .in('student_id', studentIds)

    const rows: StudentProgress[] = enrollments.map((e: any) => {
      const studentProg = (prog || []).filter((p: any) => p.student_id === e.student_id && p.completed)
      const completed = studentProg.length
      const dates = studentProg.map((p: any) => p.completed_at).filter(Boolean).sort()
      const last_at = dates.length > 0 ? dates[dates.length - 1] : null
      return {
        student_id: e.student_id,
        name: e.profiles?.name || 'Unknown',
        completed,
        last_at,
        current_session: Math.min(completed + 1, path.total_sessions),
      }
    })
    setStudents(rows.sort((a,b) => b.completed - a.completed))
  }

  async function loadSessions(pathId: string) {
    const { data } = await supabase.from('path_sessions').select('*').eq('path_id', pathId).order('session_number')
    setSessions(data || [])
  }

  async function assignCourse() {
    if (!selClass || !selPath) return
    setSaving(true)
    await supabase.from('class_path_assignments').upsert(
      { class_id: selClass, path_id: selPath, current_session_number: 1 },
      { onConflict: 'class_id,path_id' }
    )
    setAssign(prev => {
      const filtered = prev.filter(a => !(a.class_id === selClass && a.path_id === selPath))
      return [...filtered, { class_id: selClass, path_id: selPath, current_session_number: 1 }]
    })
    await loadProgress(selClass, selPath, paths)
    await loadSessions(selPath)
    setSaving(false)
  }

  function formatTimeAgo(iso: string | null) {
    if (!iso) return 'Not started'
    const diff = Date.now() - new Date(iso).getTime()
    const d = Math.floor(diff / 86400000)
    if (d === 0) return 'Today'
    if (d === 1) return 'Yesterday'
    if (d < 7) return `${d} days ago`
    if (d < 30) return `${Math.floor(d/7)} weeks ago`
    return `${Math.floor(d/30)} months ago`
  }

  const activePath = paths.find(p => p.id === selPath)
  const classAssignment = assignments.find(a => a.class_id === selClass && a.path_id === selPath)

  if (loading) return <div style={{ color:'rgba(255,255,255,0.3)', padding:40, textAlign:'center', fontSize:13 }}>Loading course data…</div>

  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

      {/* ── LEFT PANEL: assignment + student grid ── */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* Assign Course */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>Assign Class to Segment</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'center' }}>
            <select value={selClass} onChange={e => { setSelClass(e.target.value); const a = assignments.find(a => a.class_id === e.target.value); if(a){setSelPath(a.path_id);loadProgress(e.target.value,a.path_id,paths);loadSessions(a.path_id)} }}
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }}>
              <option value=''>Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selPath} onChange={e => setSelPath(e.target.value)}
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none' }}>
              <option value=''>Select segment…</option>
              {paths.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button onClick={assignCourse} disabled={!selClass||!selPath||saving}
              style={{ background:'linear-gradient(135deg,#1ECBE1,#4ade80)', border:'none', borderRadius:8, padding:'9px 18px', color:'#0D1020', fontSize:13, fontWeight:800, cursor:(!selClass||!selPath||saving)?'not-allowed':'pointer', opacity:(!selClass||!selPath)?0.5:1 }}>
              {saving ? 'Saving…' : classAssignment ? 'Update' : 'Assign'}
            </button>
          </div>
        </div>

        {/* Student Progress Table */}
        {activePath && (
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, background:`${LEVEL_COLOR[activePath.level]||'#fff'}18`, border:`1px solid ${LEVEL_COLOR[activePath.level]||'#fff'}30`, color:LEVEL_COLOR[activePath.level]||'#fff', borderRadius:20, padding:'2px 10px' }}>{activePath.level}</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{activePath.title}</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>{activePath.total_sessions} sessions · KES {(activePath.price_kes||0).toLocaleString()}</span>
            </div>

            {students.length === 0 ? (
              <div style={{ padding:'32px 20px', textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
                No students enrolled in this class yet, or no students have started this course.
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 160px 100px', gap:0, padding:'8px 20px', background:'rgba(0,0,0,0.2)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  {['Student','Progress','Current Session','Last Active'].map(h => (
                    <div key={h} style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.25)' }}>{h}</div>
                  ))}
                </div>

                {students.map((s, i) => {
                  const currentSess = sessions[s.current_session - 1]
                  const pct = (s.completed / activePath.total_sessions) * 100
                  return (
                    <div key={s.student_id} onClick={() => currentSess && setFocusSess(currentSess)}
                      style={{ display:'grid', gridTemplateColumns:'1fr auto 160px 100px', gap:0, padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:currentSess?'pointer':'default', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      {/* Name */}
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:`hsl(${i*67},60%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        {s.name}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, paddingRight:16 }}>
                        <div style={{ width:80, height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'#4ade80':'linear-gradient(90deg,#FF9F1C,#FFE135)', borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:700, minWidth:30 }}>{s.completed}/{activePath.total_sessions}</span>
                      </div>

                      {/* Current session */}
                      <div style={{ display:'flex', alignItems:'center' }}>
                        {s.completed === activePath.total_sessions ? (
                          <span style={{ fontSize:11, color:'#4ade80', fontWeight:700 }}>✓ Complete</span>
                        ) : (
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>
                            <span style={{ fontWeight:700, color:'#FF9F1C' }}>S{s.current_session}</span>
                            {' '}{currentSess ? currentSess.title.slice(0,22)+(currentSess.title.length>22?'…':'') : ''}
                          </span>
                        )}
                      </div>

                      {/* Last active */}
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center' }}>
                        {formatTimeAgo(s.last_at)}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: session quick-view ── */}
      {focusSess ? (
        <div style={{ width:300, flexShrink:0, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,159,28,0.7)' }}>Session {focusSess.session_number}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginTop:2 }}>{focusSess.title}</div>
            </div>
            <button onClick={() => setFocusSess(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:18, padding:0 }}>×</button>
          </div>

          {/* Outcome */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,159,28,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,159,28,0.6)', marginBottom:5 }}>Outcome</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.6 }}>{focusSess.outcome}</div>
          </div>

          {/* Timing */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:16 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>⏱ {focusSess.duration_mins} min total</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Demo: {focusSess.demo_duration_mins} min</div>
          </div>

          {/* Activities */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', maxHeight:220, overflowY:'auto' }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(30,203,225,0.7)', marginBottom:8 }}>Session Plan</div>
            {(focusSess.activities||[]).map((a, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:7, alignItems:'flex-start' }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(30,203,225,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#1ECBE1', flexShrink:0, marginTop:1 }}>{i+1}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', lineHeight:1.55 }}>{a}</div>
              </div>
            ))}
          </div>

          {/* Instructor notes */}
          {focusSess.instructor_notes && (
            <div style={{ padding:'12px 16px', background:'rgba(167,139,250,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(167,139,250,0.7)', marginBottom:6 }}>Instructor Note</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.65, fontStyle:'italic' }}>
                {focusSess.instructor_notes.slice(0, 400)}{focusSess.instructor_notes.length > 400 ? '…' : ''}
              </div>
            </div>
          )}
        </div>
      ) : (
        sessions.length > 0 && (
          <div style={{ width:260, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.25)', marginBottom:10 }}>Sessions — click to preview</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {sessions.map(s => (
                <button key={s.id} onClick={() => setFocusSess(s)}
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 12px', cursor:'pointer', textAlign:'left', display:'flex', gap:10, alignItems:'center', transition:'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.14)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,159,28,0.7)', minWidth:20 }}>S{s.session_number}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
