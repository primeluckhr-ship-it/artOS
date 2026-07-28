/**
 * LearningPaths — structured course experience
 * v3: mobile-first, session artwork upload, teacher roster progress view
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/session-artworks`

interface Path { id:string; slug:string; title:string; subtitle:string; description:string; level:string; total_sessions:number; price_kes:number; class_size_min:number; class_size_max:number; duration_weeks:number; materials:string[] }
interface TechniqueGuide { label:string; caption:string; image_url:string }
interface Session { id:string; session_number:number; title:string; outcome:string; activities:string[]; mini_outcome:string; domain:string; difficulty:string; duration_mins:number; materials:string[]; instructor_notes:string; demo_duration_mins:number; image_url:string; technique_guides:TechniqueGuide[] }
interface Progress { session_id:string; completed:boolean; completed_at:string|null; artwork_url:string|null }
interface StudentRoster { id:string; name:string; progress: Progress[] }

const DOMAIN_COLORS: Record<string,string> = { painting:'#FF6B35', colour_theory:'#FFE135', drawing:'#f9a8d4', fundamentals:'#1ECBE1', mixed_media:'#a78bfa' }

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 680)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 680)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

export default function LearningPaths({ profile }: { profile: Profile }) {
  const [paths, setPaths]       = useState<Path[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [roster, setRoster]     = useState<StudentRoster[]>([])
  const [selPath, setSelPath]   = useState<Path|null>(null)
  const [selSess, setSelSess]   = useState<Session|null>(null)
  const [missionLoading, setML] = useState(false)
  const [mission, setMission]   = useState<any>(null)
  const [markLoading, setMarkL] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [view, setView]         = useState<'paths'|'course'|'session'>('paths')
  const [courseTab, setCourseTab] = useState<'sessions'|'roster'>('sessions')
  const [uploadPreview, setUploadPreview] = useState<string|null>(null)
  const [uploadFile, setUploadFile] = useState<File|null>(null)
  const mobile = useMobile()
  const isTeacher = profile.role !== 'student'

  useEffect(() => { loadData() }, [profile])

  async function loadData() {
    const [{ data: ps }, { data: prog }] = await Promise.all([
      supabase.from('learning_paths').select('*').eq('is_active', true).order('created_at'),
      supabase.from('student_path_progress').select('session_id,completed,completed_at,artwork_url').eq('student_id', profile.id),
    ])
    setPaths(ps || [])
    setProgress(prog || [])
  }

  async function loadSessions(path: Path) {
    const { data } = await supabase.from('path_sessions').select('*').eq('path_id', path.id).order('session_number')
    setSessions(data || [])
    setSelPath(path)
    setCourseTab('sessions')
    setView('course')
    if (isTeacher) loadRoster(path, data || [])
  }

  async function loadRoster(path: Path, sess: Session[]) {
    // Get all profiles at this school (students)
    const { data: students } = await supabase.from('profiles').select('id,name').eq('school_id', profile.school_id).eq('role','student').order('name')
    if (!students?.length) { setRoster([]); return }
    const sessIds = sess.map(s => s.id)
    const { data: allProgress } = await supabase.from('student_path_progress').select('student_id,session_id,completed,completed_at,artwork_url').in('student_id', students.map(s => s.id)).in('session_id', sessIds)
    setRoster(students.map(s => ({ ...s, progress: sessIds.map(sid => (allProgress || []).find(p => p.student_id === s.id && p.session_id === sid) || { session_id: sid, completed: false, completed_at: null, artwork_url: null }) })))
  }

  async function generateMission(sess: Session) {
    setML(true); setMission(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-mission`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token || ANON_KEY}` },
        body: JSON.stringify({ domain: sess.domain, difficulty: sess.difficulty, student_age: 30, school_id: profile.school_id, context:`Session ${sess.session_number}: "${sess.title}". Outcome: ${sess.outcome}` }),
      })
      setMission(await res.json())
    } catch(e) { console.error(e) }
    setML(false)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = ev => setUploadPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function markComplete(sess: Session, withArtwork = false) {
    setMarkL(true)
    let artwork_url: string | null = null

    if (withArtwork && uploadFile) {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const authId = user?.id || profile.id
      const ext = uploadFile.name.split('.').pop() || 'jpg'
      const path = `${authId}/${sess.id}.${ext}`
      const { error } = await supabase.storage.from('session-artworks').upload(path, uploadFile, { upsert: true, contentType: uploadFile.type })
      if (!error) artwork_url = `${STORAGE_URL}/${path}`
      setUploading(false)
    }

    await supabase.from('student_path_progress').upsert({
      student_id: profile.id, path_id: selPath!.id, session_id: sess.id,
      completed: true, completed_at: new Date().toISOString(),
      ...(artwork_url ? { artwork_url } : {}),
    }, { onConflict:'student_id,session_id' })

    setProgress(prev => {
      const exists = prev.find(p => p.session_id === sess.id)
      const updated = { session_id: sess.id, completed: true, completed_at: new Date().toISOString(), artwork_url: artwork_url || (exists?.artwork_url || null) }
      return exists ? prev.map(p => p.session_id === sess.id ? updated : p) : [...prev, updated]
    })
    setUploadFile(null); setUploadPreview(null); setMarkL(false)
  }

  const completedCount   = sessions.filter(s => progress.find(p => p.session_id === s.id && p.completed)).length
  const isCompleted      = (id: string) => !!progress.find(p => p.session_id === id && p.completed)
  const getArtwork       = (id: string) => progress.find(p => p.session_id === id)?.artwork_url || null
  const domColor         = (d: string) => DOMAIN_COLORS[d] || '#fff'
  const currentIdx       = isTeacher ? -1 : sessions.findIndex(s => !isCompleted(s.id))

  const S = mobile ? MobileStyles : DesktopStyles

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding: mobile ? '16px 14px 80px' : '28px 20px 60px', fontFamily:"'Inter',sans-serif", position:'relative', zIndex:1 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── BREADCRUMB ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13, color:'rgba(255,255,255,0.35)', flexWrap:'wrap' }}>
        <button onClick={() => { setView('paths'); setSelPath(null); setSelSess(null); setMission(null) }} style={{ background:'none',border:'none',color:view==='paths'?'#fff':'rgba(255,255,255,0.35)',cursor:'pointer',padding:0,fontSize:13,fontWeight:view==='paths'?700:400 }}>Courses</button>
        {selPath && <><span>›</span><button onClick={() => { setView('course'); setSelSess(null); setMission(null) }} style={{ background:'none',border:'none',color:view==='course'?'#fff':'rgba(255,255,255,0.35)',cursor:'pointer',padding:0,fontSize:13,fontWeight:view==='course'?700:400 }}>{mobile ? selPath.subtitle : selPath.title}</button></>}
        {selSess && <><span>›</span><span style={{ color:'#fff',fontWeight:700 }}>Session {selSess.session_number}</span></>}
      </div>

      {/* ══════════ PATHS LIST ══════════ */}
      {view === 'paths' && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:mobile?22:28, color:'#fff', margin:'0 0 5px' }}>Learning Paths</h1>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, margin:0 }}>Guided studio programmes — adults learn by making every session</p>
            <div style={{ display:'flex', gap:20, marginTop:12, flexWrap:'wrap' }}>
              {[['🎨 Acrylic', paths.filter(p=>p.slug.startsWith('adult-painting')).length],
                ['🛢️ Oil', paths.filter(p=>p.slug.startsWith('oil-painting')).length],
                ['✏️ Drawing', paths.filter(p=>p.slug.startsWith('drawing')||p.slug==='life-drawing').length],
                ['💧 Watercolour', paths.filter(p=>p.slug.startsWith('watercolour')).length],
                ['🪨 Charcoal', paths.filter(p=>p.slug==='charcoal-tonal-drawing').length],
                ['🌈 Pastel', paths.filter(p=>p.slug==='pastel-drawing').length],
                ['🖼️ Portrait', paths.filter(p=>p.slug==='portrait-intensive').length],
                ['🖨️ Print & Mix', paths.filter(p=>p.slug==='printmaking-mixed-media').length]
              ].filter(([,c])=>(c as number)>0).map(([label, count]) => (
                <span key={label as string} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.05)', borderRadius:20, padding:'3px 10px' }}>
                  {label} · {count} segment{(count as number)>1?'s':''}
                </span>
              ))}
            </div>
          </div>

          {[
            ['🎨 Acrylic Painting', paths.filter(p=>p.slug.startsWith('adult-painting'))],
            ['🛢️ Oil Painting', paths.filter(p=>p.slug.startsWith('oil-painting'))],
            ['✏️ Drawing', paths.filter(p=>p.slug.startsWith('drawing')||p.slug==='life-drawing')],
            ['💧 Watercolour', paths.filter(p=>p.slug.startsWith('watercolour'))],
            ['🪨 Charcoal', paths.filter(p=>p.slug==='charcoal-tonal-drawing')],
            ['🌈 Pastel', paths.filter(p=>p.slug==='pastel-drawing')],
            ['🖼️ Portrait', paths.filter(p=>p.slug==='portrait-intensive')],
            ['🖨️ Printmaking & Mixed Media', paths.filter(p=>p.slug==='printmaking-mixed-media')]
          ].filter(([,tp])=>(tp as typeof paths).length>0).map(([trackLabel, trackPaths]) => (
            <div key={trackLabel as string}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,255,255,0.2)', marginBottom:10, marginTop:4 }}>{trackLabel as string}</div>
              {(trackPaths as typeof paths).map(p => {
            const pathProgress = progress.filter(pr => sessions.some(s => s.id === pr.session_id)).filter(pr => pr.completed).length
            return (
            <div key={p.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, overflow:'hidden', marginBottom:14, cursor:'pointer', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,159,28,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}
              onClick={() => loadSessions(p)}>
              <div style={{ padding: mobile ? '18px 16px' : '22px 24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,background:'rgba(255,159,28,0.15)',border:'1px solid rgba(255,159,28,0.3)',color:'#FF9F1C',borderRadius:20,padding:'2px 10px' }}>{p.level}</span>
                      <span style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>{p.total_sessions} sessions · {p.duration_weeks} weeks</span>
                      {p.level === 'intermediate' && <span style={{ fontSize:9,color:'rgba(74,222,128,0.6)',fontWeight:700 }}>Prereq: Foundation</span>}
                    </div>
                    <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:mobile?18:21, color:'#fff', margin:'0 0 5px', lineHeight:1.2 }}>{p.title}</h2>
                    <div style={{ fontSize:12,color:'rgba(255,159,28,0.7)',marginBottom:mobile?0:10 }}>{p.subtitle}</div>
                    {!mobile && <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.7,margin:'8px 0 0',maxWidth:540 }}>{p.description}</p>}
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0 }}>
                    <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:mobile?20:26, color:'#FFE135', lineHeight:1 }}>KES {(p.price_kes||0).toLocaleString()}</div>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2 }}>{p.total_sessions} sessions</div>
                    <div style={{ marginTop:10,background:'linear-gradient(135deg,#FF9F1C,#FF6B35)',borderRadius:8,padding:'8px 14px',fontSize:12,fontFamily:"'Fredoka One',sans-serif",color:'#fff' }}>
                      {isTeacher ? 'View →' : 'Progress →'}
                    </div>
                  </div>
                </div>
              </div>
              {/* Materials strip */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 16px', display:'flex', gap:5, flexWrap:'wrap', overflowX:'auto' }}>
                {(p.materials||[]).slice(0,mobile?4:7).map(m => <span key={m} style={{ fontSize:10,background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'2px 8px',color:'rgba(255,255,255,0.35)',whiteSpace:'nowrap' }}>{m}</span>)}
                {(p.materials||[]).length > (mobile?4:7) && <span style={{ fontSize:10,color:'rgba(255,255,255,0.2)' }}>+{(p.materials||[]).length-(mobile?4:7)} more</span>}
              </div>
            </div>
          )})}
            </div>
          ))}
        </div>
      )}

      {/* ══════════ COURSE OVERVIEW ══════════ */}
      {view === 'course' && selPath && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>

          {/* Student progress bar */}
          {!isTeacher && (
            <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'14px 16px',marginBottom:18 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:7 }}>
                <div style={{ fontFamily:"'Fredoka One',sans-serif",fontSize:14,color:'#fff' }}>Your Progress</div>
                <div style={{ fontSize:13,color:'#FF9F1C',fontWeight:700 }}>{completedCount}/{selPath.total_sessions}</div>
              </div>
              <div style={{ height:6,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${(completedCount/selPath.total_sessions)*100}%`,background:'linear-gradient(90deg,#FF9F1C,#FFE135)',borderRadius:3,transition:'width 0.6s ease' }}/>
              </div>
              {completedCount === selPath.total_sessions && (
                <div style={{ marginTop:8,fontSize:12,color:'#4ade80',fontWeight:700 }}>
                  {selPath.slug?.includes('watercolour') && selPath.level==='foundation' ? "🎉 Watercolour Foundation complete! You're ready for Watercolour Intermediate." :
                   selPath.slug?.includes('watercolour') && selPath.level==='intermediate' ? "🎉 Watercolour Intermediate complete! You have a full watercolour practice." :
                   selPath.slug?.includes('oil-painting') && selPath.level==='foundation' ? "🎉 Oil Painting Foundation complete! Ready for Oil Intermediate." :
                   selPath.slug?.includes('oil-painting') && selPath.level==='intermediate' ? "🎉 Oil Painting Intermediate complete! You are a traditional oil painter." :
                   selPath.slug==='life-drawing' ? "🎉 Life Drawing complete! The figure is in your hands." :
                   selPath.slug==='pastel-drawing' ? "🎉 Pastel course complete! Pure pigment, fully mastered." :
                   selPath.slug==='portrait-intensive' ? "🎉 Portrait Intensive complete! You have painted the face in five media." :
                   selPath.slug==='printmaking-mixed-media' ? "🎉 Printmaking & Mixed Media complete! You are a maker of many processes." :
                   selPath.slug?.includes('charcoal') ? "🎉 Charcoal complete! A new medium, fully understood." :
                   selPath.slug?.includes('drawing') && selPath.level==='foundation' ? "🎉 Drawing Foundation complete! You're ready for Drawing Intermediate." :
                   selPath.slug?.includes('drawing') && selPath.level==='intermediate' ? "🎉 Drawing Intermediate complete! You're ready for Drawing Advanced." :
                   selPath.slug?.includes('drawing') && selPath.level==='advanced' ? "🎉 Drawing Advanced complete! Three segments, a full drawing practice." :
                   selPath.level==='foundation' ? "🎉 Painting Foundation complete! You're ready for Intermediate." :
                   selPath.level==='intermediate' ? "🎉 Intermediate complete! You're ready for Advanced Painting." :
                   selPath.level==='advanced' ? "🎉 Advanced complete. You are a working painter." :
                   "🎉 Segment complete!"}
                </div>
              )}
            </div>
          )}

          {/* Teacher tabs */}
          {isTeacher && (
            <div style={{ display:'flex',gap:8,marginBottom:18 }}>
              {([['sessions','Session Plans'],['roster','Student Roster']] as const).map(([t,label]) => (
                <button key={t} onClick={() => setCourseTab(t)} style={{ padding:'8px 16px',borderRadius:20,border:`1px solid ${courseTab===t?'rgba(255,159,28,0.4)':'rgba(255,255,255,0.1)'}`,background:courseTab===t?'rgba(255,159,28,0.1)':'transparent',color:courseTab===t?'#FF9F1C':'rgba(255,255,255,0.4)',fontSize:13,cursor:'pointer',fontWeight:courseTab===t?700:400 }}>{label}</button>
              ))}
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {courseTab === 'sessions' && (
            <>
              {isTeacher && (
                <div style={{ background:'rgba(30,203,225,0.06)',border:'1px solid rgba(30,203,225,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:18,display:'flex',gap:12,alignItems:'center' }}>
                  <div style={{ fontSize:20 }}>📋</div>
                  <div style={{ fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6 }}>Demo max 10–15 min · 80% session = students painting · Move table-to-table · Class size 2–5</div>
                </div>
              )}
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {sessions.map((s,idx) => {
                  const done = isCompleted(s.id)
                  const isCurrent = !isTeacher && idx === currentIdx
                  const locked = !isTeacher && idx > currentIdx && !done
                  const art = getArtwork(s.id)
                  return (
                    <div key={s.id} onClick={() => { if(!locked){ setSelSess(s); setView('session'); setMission(null) } }}
                      style={{ background:isCurrent?'rgba(255,159,28,0.08)':done?'rgba(74,222,128,0.04)':'rgba(255,255,255,0.03)',border:`1px solid ${isCurrent?'rgba(255,159,28,0.3)':done?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:12,overflow:'hidden',cursor:locked?'default':'pointer',opacity:locked?0.45:1,transition:'all 0.15s',display:'flex',alignItems:'stretch',gap:0 }}
                      onMouseEnter={e => { if(!locked) e.currentTarget.style.borderColor=isCurrent?'rgba(255,159,28,0.5)':done?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.18)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=isCurrent?'rgba(255,159,28,0.3)':done?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.07)' }}>

                      {/* Reference artwork image — left strip */}
                      {s.image_url && (
                        <div style={{ width:mobile?58:70, flexShrink:0, position:'relative', overflow:'hidden' }}>
                          <img src={s.image_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',display:'block' }}/>
                          <div style={{ position:'absolute',inset:0,background:done?'rgba(74,222,128,0.18)':isCurrent?'rgba(255,159,28,0.15)':'rgba(8,6,16,0.3)' }}/>
                          <div style={{ position:'absolute',top:6,left:6,width:20,height:20,borderRadius:'50%',background:done?'rgba(74,222,128,0.9)':isCurrent?'rgba(255,159,28,0.9)':'rgba(0,0,0,0.6)',border:`1px solid ${done?'#4ade80':isCurrent?'#FF9F1C':'rgba(255,255,255,0.2)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:done?10:9,fontWeight:800,color:done?'#000':isCurrent?'#000':'rgba(255,255,255,0.7)' }}>
                            {done ? '✓' : s.session_number}
                          </div>
                          {art && <div style={{ position:'absolute',bottom:4,left:4,right:4,height:2,borderRadius:1,background:'rgba(74,222,128,0.7)' }}/>}
                        </div>
                      )}

                      {/* Main content */}
                      <div style={{ flex:1,minWidth:0,padding:'12px 14px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap' }}>
                          <div style={{ fontWeight:700,color:'#fff',fontSize:mobile?13:14 }}>{s.title}</div>
                          {isCurrent && <span style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:1,background:'rgba(255,159,28,0.2)',border:'1px solid rgba(255,159,28,0.4)',color:'#FF9F1C',borderRadius:20,padding:'2px 8px' }}>Current</span>}
                          {done && <span style={{ fontSize:9,color:'rgba(74,222,128,0.6)' }}>✓ done</span>}
                        </div>
                        {!mobile && <div style={{ fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.5,marginBottom:6 }}>{s.outcome}</div>}
                        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
                          <span style={{ fontSize:10,background:`${domColor(s.domain)}18`,border:`1px solid ${domColor(s.domain)}30`,color:domColor(s.domain),borderRadius:20,padding:'2px 8px',fontWeight:700 }}>{s.domain.replace(/_/g,' ')}</span>
                          <span style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>⏱ {Math.floor(s.duration_mins/60)}h{s.duration_mins%60?`${s.duration_mins%60}m`:''}</span>
                          {art && <span style={{ fontSize:10,color:'rgba(74,222,128,0.5)' }}>🖼 artwork saved</span>}
                        </div>
                      </div>
                      {!locked && <div style={{ color:'rgba(255,255,255,0.2)',fontSize:18,flexShrink:0,alignSelf:'center',paddingRight:12 }}>›</div>}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── ROSTER TAB (teacher only) ── */}
          {courseTab === 'roster' && isTeacher && (
            <div>
              {roster.length === 0 ? (
                <div style={{ textAlign:'center',padding:48,color:'rgba(255,255,255,0.3)',fontSize:14 }}>No students enrolled yet at this school.</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:mobile?11:12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left',padding:'8px 12px',color:'rgba(255,255,255,0.35)',fontWeight:600,whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.08)' }}>Student</th>
                        {sessions.map(s => (
                          <th key={s.id} style={{ padding:'8px 8px',color:'rgba(255,255,255,0.3)',fontWeight:500,whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.08)',minWidth:44 }}>
                            <div style={{ fontSize:10,color:DOMAIN_COLORS[s.domain]||'#fff' }}>{s.session_number}</div>
                          </th>
                        ))}
                        <th style={{ padding:'8px 8px',color:'rgba(255,255,255,0.3)',fontWeight:600,borderBottom:'1px solid rgba(255,255,255,0.08)' }}>Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((stu,i) => {
                        const done = stu.progress.filter(p => p.completed).length
                        return (
                          <tr key={stu.id} style={{ background:i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                            <td style={{ padding:'10px 12px',color:'#fff',fontWeight:600,whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{stu.name}</td>
                            {stu.progress.map((p,j) => (
                              <td key={j} style={{ padding:'10px 8px',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                {p.artwork_url
                                  ? <img src={p.artwork_url} alt="" style={{ width:28,height:28,borderRadius:4,objectFit:'cover',border:'1px solid rgba(74,222,128,0.3)' }}/>
                                  : p.completed
                                  ? <span style={{ color:'#4ade80',fontSize:16 }}>✓</span>
                                  : <span style={{ color:'rgba(255,255,255,0.1)',fontSize:16 }}>·</span>}
                              </td>
                            ))}
                            <td style={{ padding:'10px 8px',textAlign:'center',color:'#FF9F1C',fontWeight:700,borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{done}/{selPath.total_sessions}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop:12,display:'flex',gap:16,flexWrap:'wrap' }}>
                    {[['✓ completed','#4ade80'],['🖼 has artwork','rgba(74,222,128,0.5)'],['· not yet','rgba(255,255,255,0.1)']].map(([l,c]) => (
                      <div key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'rgba(255,255,255,0.35)' }}><span style={{ color:c as string }}>{l}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ SESSION DETAIL ══════════ */}
      {view === 'session' && selSess && selPath && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>

          {/* Hero */}
          <div style={{ position:'relative', height:mobile?150:200, borderRadius:16, overflow:'hidden', marginBottom:mobile?18:26 }}>
            <img src={selSess.image_url} alt={selSess.title} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center' }}/>
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,6,16,0.95) 0%,rgba(8,6,16,0.4) 60%,transparent 100%)' }}/>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:mobile?'0 16px 16px':'0 24px 20px' }}>
              <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,159,28,0.7)',marginBottom:4 }}>Session {selSess.session_number} of 8 · {selPath.subtitle}</div>
              <h1 style={{ fontFamily:"'Fredoka One',sans-serif",fontSize:mobile?20:26,color:'#fff',margin:0,lineHeight:1 }}>{selSess.title}</h1>
            </div>
          </div>

          {/* Student: Mark Complete + artwork upload */}
          {!isTeacher && (
            <div style={{ background:'rgba(255,255,255,0.04)',border:`1px solid ${isCompleted(selSess.id)?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.08)'}`,borderRadius:14,padding:'16px',marginBottom:20 }}>
              {isCompleted(selSess.id) ? (
                <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                  <span style={{ color:'#4ade80',fontWeight:700,fontSize:14 }}>✓ Session Complete</span>
                  {getArtwork(selSess.id)
                    ? <img src={getArtwork(selSess.id)!} alt="your artwork" style={{ width:56,height:56,borderRadius:8,objectFit:'cover',border:'2px solid rgba(74,222,128,0.3)' }}/>
                    : <span style={{ fontSize:12,color:'rgba(255,255,255,0.3)' }}>No artwork photo saved yet</span>}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.6)',marginBottom:12 }}>Mark this session complete</div>
                  {/* Artwork upload area */}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ cursor:'pointer',display:'block' }}>
                      <div style={{ border:'1px dashed rgba(255,255,255,0.2)',borderRadius:10,padding:'14px',textAlign:'center',background:'rgba(255,255,255,0.02)',transition:'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(255,159,28,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.2)')}>
                        {uploadPreview
                          ? <img src={uploadPreview} alt="preview" style={{ maxHeight:140,maxWidth:'100%',borderRadius:8,margin:'0 auto',display:'block' }}/>
                          : <div><div style={{ fontSize:22,marginBottom:6 }}>📷</div><div style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>Tap to add a photo of your artwork <span style={{ color:'rgba(255,255,255,0.25)' }}>(optional)</span></div></div>}
                      </div>
                      <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={onFileChange}/>
                    </label>
                  </div>
                  <button onClick={() => markComplete(selSess, !!uploadFile)} disabled={markLoading||uploading} style={{ width:'100%',padding:'12px',background:markLoading?'rgba(255,255,255,0.05)':'linear-gradient(135deg,#4ade80,#22c55e)',border:'none',borderRadius:10,color:markLoading?'rgba(255,255,255,0.3)':'#000',fontSize:14,fontFamily:"'Fredoka One',sans-serif",cursor:markLoading?'not-allowed':'pointer',fontWeight:700 }}>
                    {uploading ? '📤 Uploading artwork…' : markLoading ? 'Saving…' : uploadFile ? '✓ Complete + Save Artwork' : '✓ Mark Complete'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main layout — stacks on mobile */}
          <div style={{ display:'grid', gridTemplateColumns:mobile?'1fr':'1fr 300px', gap:mobile?16:24, alignItems:'start' }}>

            {/* LEFT: session content */}
            <div>
              {/* Outcome box */}
              <div style={{ background:'rgba(255,159,28,0.07)',border:'1px solid rgba(255,159,28,0.18)',borderRadius:12,padding:'14px 16px',marginBottom:18 }}>
                <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.2,color:'rgba(255,159,28,0.7)',marginBottom:5 }}>Session Outcome</div>
                <div style={{ fontSize:14,color:'rgba(255,255,255,0.85)',lineHeight:1.7,fontWeight:500 }}>{selSess.outcome}</div>
              </div>

              {/* Reference Artwork */}
              {selSess.image_url && (
                <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,overflow:'hidden',marginBottom:18 }}>
                  <div style={{ height:mobile?160:220, position:'relative', overflow:'hidden' }}>
                    <img src={selSess.image_url} alt="reference artwork" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top' }}/>
                    <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,6,16,0.92) 0%,rgba(8,6,16,0.1) 50%,transparent 100%)' }}/>
                    <div style={{ position:'absolute',bottom:12,left:14,right:14 }}>
                      <div style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,159,28,0.7)',marginBottom:3 }}>Reference Artwork</div>
                      <div style={{ fontSize:mobile?11:12,color:'rgba(255,255,255,0.7)',lineHeight:1.5 }}>Study this artwork alongside the session. Look for how it demonstrates the session&apos;s core concept.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Technique Guide Strip ── */}
              {(selSess.technique_guides||[]).length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,159,28,0.7)',marginBottom:10 }}>Technique Guide</div>
                  <div style={{ display:'flex',gap:12,overflowX:'auto',paddingBottom:8,scrollbarWidth:'none' }}>
                    {(selSess.technique_guides||[]).map((guide,i) => (
                      <div key={i} style={{ minWidth:mobile?230:280,flexShrink:0,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,overflow:'hidden' }}>
                        <div style={{ height:mobile?110:140,position:'relative',overflow:'hidden' }}>
                          <img src={guide.image_url} alt={guide.label} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',display:'block' }}/>
                          <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,6,16,0.88) 0%,transparent 60%)' }}/>
                          <div style={{ position:'absolute',bottom:10,left:12,right:12 }}>
                            <div style={{ fontSize:mobile?12:13,fontWeight:800,color:'#FF9F1C',fontFamily:"'Fredoka One',sans-serif",lineHeight:1.2 }}>{guide.label}</div>
                          </div>
                        </div>
                        <div style={{ padding:'10px 12px' }}>
                          <div style={{ fontSize:mobile?11:12,color:'rgba(255,255,255,0.65)',lineHeight:1.65 }}>{guide.caption}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity plan */}
              <Sec title="Session Plan" color="#1ECBE1">
                {(selSess.activities||[]).map((act,i) => (
                  <div key={i} style={{ display:'flex',gap:12,padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',alignItems:'flex-start' }}>
                    <div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(30,203,225,0.15)',border:'1px solid rgba(30,203,225,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#1ECBE1',flexShrink:0,marginTop:1 }}>{i+1}</div>
                    <div style={{ fontSize:mobile?12:13,color:'rgba(255,255,255,0.75)',lineHeight:1.7 }}>{act}</div>
                  </div>
                ))}
              </Sec>

              {/* Mini outcome */}
              <div style={{ background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:18 }}>
                <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'rgba(74,222,128,0.7)',marginBottom:4 }}>Mini Outcome</div>
                <div style={{ fontSize:13,color:'rgba(255,255,255,0.7)' }}>{selSess.mini_outcome}</div>
              </div>

              {/* Instructor notes — teacher only */}
              {isTeacher && selSess.instructor_notes && (
                <Sec title={`Instructor Notes${selSess.demo_duration_mins > 0 ? ` · Demo ${selSess.demo_duration_mins} min max` : ' · No demo today'}`} color="#a78bfa">
                  <div style={{ fontSize:mobile?12:13,color:'rgba(255,255,255,0.65)',lineHeight:1.85,fontStyle:'italic',borderLeft:'2px solid rgba(167,139,250,0.3)',paddingLeft:16 }}>
                    {selSess.instructor_notes}
                  </div>
                </Sec>
              )}
            </div>

            {/* RIGHT: sidebar (stacks below on mobile) */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

              {/* Timing */}
              <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'14px 16px' }}>
                <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'rgba(255,255,255,0.3)',marginBottom:10 }}>Session Timing</div>
                {([
                  ['Demo', `${selSess.demo_duration_mins} min`, '#FF9F1C'],
                  ['Studio Practice', `${selSess.duration_mins - selSess.demo_duration_mins - 15} min`, '#1ECBE1'],
                  ['Critique / Review', '15 min', '#4ade80'],
                  ['Total', `${selSess.duration_mins} min`, '#FFE135'],
                ] as const).map(([label,time,color]) => (
                  <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>{label}</span>
                    <span style={{ fontSize:12,fontWeight:700,color }}>{time}</span>
                  </div>
                ))}
              </div>

              {/* Materials */}
              <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'14px 16px' }}>
                <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'rgba(255,255,255,0.3)',marginBottom:10 }}>Session Materials</div>
                <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                  {(selSess.materials||[]).map(m => (
                    <div key={m} style={{ display:'flex',alignItems:'center',gap:7,fontSize:12,color:'rgba(255,255,255,0.6)' }}>
                      <div style={{ width:6,height:6,borderRadius:'50%',background:'#FF9F1C',flexShrink:0 }}/>{m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mission generator */}
              <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'14px 16px' }}>
                <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'rgba(255,255,255,0.3)',marginBottom:8 }}>✦ Session Mission</div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.35)',lineHeight:1.6,marginBottom:10 }}>Generate an AI challenge aligned to this session's outcomes.</div>
                <button onClick={() => generateMission(selSess)} disabled={missionLoading} style={{ width:'100%',padding:'10px',background:missionLoading?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${DOMAIN_COLORS[selSess.domain]||'#FF9F1C'},rgba(255,107,53,0.8))`,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontFamily:"'Fredoka One',sans-serif",cursor:missionLoading?'not-allowed':'pointer',marginBottom:mission?10:0 }}>
                  {missionLoading ? 'Generating…' : '✦ Generate Mission'}
                </button>
                {mission && (
                  <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'12px',animation:'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:DOMAIN_COLORS[selSess.domain]||'#FF9F1C',marginBottom:5 }}>{mission.mission_title}</div>
                    <div style={{ fontSize:12,color:'rgba(255,255,255,0.65)',lineHeight:1.7,marginBottom:6 }}>{mission.challenge_description}</div>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>⏱ {mission.time_estimate}</div>
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

function Sec({ title, color, children }: { title:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
        <div style={{ width:3,height:14,background:color,borderRadius:2,flexShrink:0 }}/>
        <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:1.2,color }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

const MobileStyles = {}
const DesktopStyles = {}
