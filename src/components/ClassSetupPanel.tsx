/**
 * ClassSetupPanel — embedded in TeacherView
 * Create a class, add students to it, remove students
 * Feeds data to CourseProgressPanel (class_enrollments)
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface ClassRow { id: string; name: string; age_band: string; room: string; teacher_id: string | null }
interface Student { id: string; name: string; role: string; class_id: string | null; class_name: string | null; last_active: string | null; xp: number }

export default function ClassSetupPanel({ profile }: { profile: Profile }) {
  const [classes, setClasses]     = useState<ClassRow[]>([])
  const [students, setStudents]   = useState<Student[]>([])
  const [selClass, setSelClass]   = useState<string | null>(null)
  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [working, setWorking]     = useState<string | null>(null)   // student id being moved

  useEffect(() => { load() }, [profile])

  async function load() {
    setLoading(true)
    // Fetch classes at this school
    const { data: cls } = await supabase
      .from('classes').select('id,name,age_band,room,teacher_id')
      .eq('school_id', profile.school_id).order('name')

    setClasses(cls || [])

    // Auto-select first class
    if (cls && cls.length > 0 && !selClass) {
      setSelClass(cls[0].id)
    }

    // Fetch all students at this school with their class membership
    const { data: profiles } = await supabase
      .from('profiles').select('id,name,role')
      .eq('school_id', profile.school_id)
      .eq('role', 'student')

    if (!profiles) { setLoading(false); return }

    // Get class enrollments for all these students
    const ids = profiles.map((p: any) => p.id)
    const { data: enrollments } = await supabase
      .from('class_enrollments').select('student_id,class_id,classes(name)')
      .in('student_id', ids)

    // Get XP for each student
    const { data: xpRows } = await supabase
      .from('xp_ledger').select('profile_id, xp_amount')
      .in('profile_id', ids)

    const xpByStudent: Record<string, number> = {}
    ;(xpRows || []).forEach((x: any) => {
      xpByStudent[x.profile_id] = (xpByStudent[x.profile_id] || 0) + x.xp_amount
    })

    const enrollMap: Record<string, { class_id: string; class_name: string }> = {}
    ;(enrollments || []).forEach((e: any) => {
      enrollMap[e.student_id] = { class_id: e.class_id, class_name: e.classes?.name || '' }
    })

    const rows: Student[] = profiles.map((p: any) => ({
      id: p.id,
      name: p.name || 'Unnamed',
      role: p.role,
      class_id: enrollMap[p.id]?.class_id || null,
      class_name: enrollMap[p.id]?.class_name || null,
      last_active: null,
      xp: xpByStudent[p.id] || 0,
    }))

    setStudents(rows.sort((a, b) => (a.class_id ? 0 : 1) - (b.class_id ? 0 : 1) || a.name.localeCompare(b.name)))
    setLoading(false)
  }

  async function createClass() {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase.from('classes').insert({
      school_id: profile.school_id,
      teacher_id: profile.id,
      name: newName.trim(),
      age_band: 'adult',
    }).select().single()
    if (data) {
      setClasses(prev => [...prev, data])
      setSelClass(data.id)
      setShowCreate(false)
      setNewName('')
    }
    setCreating(false)
  }

  async function addToClass(student: Student) {
    if (!selClass) return
    setWorking(student.id)
    // Remove from current class first
    if (student.class_id) {
      await supabase.from('class_enrollments')
        .delete().eq('student_id', student.id)
    }
    // Add to selected class
    await supabase.from('class_enrollments').insert({
      student_id: student.id,
      class_id: selClass,
      joined_at: new Date().toISOString(),
      status: 'active',
    })
    const className = classes.find(c => c.id === selClass)?.name || ''
    setStudents(prev => prev.map(s => s.id === student.id
      ? { ...s, class_id: selClass, class_name: className }
      : s))
    setWorking(null)
  }

  async function removeFromClass(student: Student) {
    setWorking(student.id)
    await supabase.from('class_enrollments')
      .delete().eq('student_id', student.id)
    setStudents(prev => prev.map(s => s.id === student.id
      ? { ...s, class_id: null, class_name: null }
      : s))
    setWorking(null)
  }

  const currentClass = classes.find(c => c.id === selClass)
  const enrolled = students.filter(s => s.class_id === selClass)
  const unassigned = students.filter(s => !s.class_id)
  const inOtherClass = students.filter(s => s.class_id && s.class_id !== selClass)

  if (loading) return <div style={{ color:'rgba(255,255,255,0.3)', padding:40, textAlign:'center', fontSize:13 }}>Loading…</div>

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20 }}>

      {/* ── LEFT: class selector ── */}
      <div>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>Your Classes</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
          {classes.length === 0 && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', padding:'16px', textAlign:'center', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
              No classes yet. Create one below.
            </div>
          )}
          {classes.map(c => (
            <button key={c.id} onClick={() => setSelClass(c.id)}
              style={{ background: selClass===c.id?'rgba(255,159,28,0.12)':'rgba(255,255,255,0.04)', border:`1px solid ${selClass===c.id?'rgba(255,159,28,0.35)':'rgba(255,255,255,0.07)'}`, borderRadius:10, padding:'11px 14px', cursor:'pointer', textAlign:'left', transition:'all 0.1s' }}>
              <div style={{ fontSize:13, fontWeight:700, color: selClass===c.id?'#FF9F1C':'rgba(255,255,255,0.7)' }}>{c.name}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>
                {students.filter(s => s.class_id === c.id).length} students enrolled
              </div>
            </button>
          ))}
        </div>

        {/* Create class */}
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)}
            style={{ width:'100%', padding:'10px 0', background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.15)', borderRadius:10, color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer' }}>
            + Create new class
          </button>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Class name</div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createClass()}
              placeholder='e.g. Foundation Painting – Morning'
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 }}
            />
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={createClass} disabled={!newName.trim() || creating}
                style={{ flex:1, padding:'8px 0', background:'linear-gradient(135deg,#FF9F1C,#FF6B35)', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => { setShowCreate(false); setNewName('') }}
                style={{ padding:'8px 12px', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: student management ── */}
      <div>
        {!selClass ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(255,255,255,0.25)', fontSize:13 }}>
            Select a class to manage students
          </div>
        ) : (
          <>
            {/* Enrolled students */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#4ade80' }}>
                  Enrolled in {currentClass?.name}
                </div>
                <div style={{ fontSize:11, color:'rgba(74,222,128,0.5)' }}>({enrolled.length})</div>
              </div>
              {enrolled.length === 0 ? (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:12, padding:'20px', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:12 }}>
                  No students enrolled yet — add from the lists below
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {enrolled.map((s, i) => (
                    <StudentRow key={s.id} student={s} idx={i}
                      action={{ label:'Remove', color:'rgba(239,68,68,0.7)', fn: () => removeFromClass(s) }}
                      working={working === s.id} enrolled />
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned students */}
            {unassigned.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.35)' }}>
                    Not in any class
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>({unassigned.length})</div>
                  <button onClick={() => unassigned.forEach(s => addToClass(s))}
                    style={{ marginLeft:'auto', fontSize:10, fontWeight:700, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:6, padding:'4px 10px', color:'#4ade80', cursor:'pointer' }}>
                    Add all →
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {unassigned.map((s, i) => (
                    <StudentRow key={s.id} student={s} idx={i}
                      action={{ label:'Add to class', color:'#4ade80', fn: () => addToClass(s) }}
                      working={working === s.id} enrolled={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Students in other classes */}
            {inOtherClass.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.2)', marginBottom:8 }}>
                  In other classes ({inOtherClass.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {inOtherClass.map((s, i) => (
                    <StudentRow key={s.id} student={s} idx={i}
                      action={{ label:`Move here`, color:'rgba(255,159,28,0.7)', fn: () => addToClass(s) }}
                      working={working === s.id} enrolled={false} dim />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StudentRow({ student, idx, action, working, enrolled, dim }: {
  student: Student; idx: number;
  action: { label: string; color: string; fn: () => void };
  working: boolean; enrolled: boolean; dim?: boolean
}) {
  const level = Math.floor(student.xp / 200) + 1
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background: enrolled?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.03)', border:`1px solid ${enrolled?'rgba(74,222,128,0.12)':'rgba(255,255,255,0.06)'}`, borderRadius:10, padding:'10px 14px', opacity: dim ? 0.6 : 1 }}>
      <div style={{ width:30, height:30, borderRadius:'50%', background:`hsl(${idx*67},55%,32%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', flexShrink:0 }}>
        {student.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{student.name}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>
          Level {level} · {student.xp} XP
          {student.class_name && !enrolled && ` · in ${student.class_name}`}
        </div>
      </div>
      <button onClick={action.fn} disabled={working}
        style={{ fontSize:11, fontWeight:700, color: action.color, background:'none', border:`1px solid ${action.color}55`, borderRadius:7, padding:'5px 12px', cursor:working?'not-allowed':'pointer', opacity:working?0.5:1, flexShrink:0, transition:'all 0.1s', whiteSpace:'nowrap' }}>
        {working ? '…' : action.label}
      </button>
    </div>
  )
}
