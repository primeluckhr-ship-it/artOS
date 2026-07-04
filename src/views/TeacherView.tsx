import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'

const DOMAINS = [
  { key:'elements_of_art',      label:'Elements',  color:'#1ECBE1' },
  { key:'drawing',              label:'Drawing',   color:'#f9a8d4' },
  { key:'painting',             label:'Painting',  color:'#FF6B35' },
  { key:'colour_theory',        label:'Colour',    color:'#FFE135' },
  { key:'mixed_media',          label:'Mixed',     color:'#a78bfa' },
  { key:'principles_of_design', label:'Design',    color:'#4ade80' },
  { key:'art_history',          label:'History',   color:'#fb923c' },
]
const LEVELS = [
  { key:'foundation',   label:'Foundation',   color:'#67e8f9', xp:50  },
  { key:'beginner',     label:'Beginner',     color:'#86efac', xp:75  },
  { key:'intermediate', label:'Intermediate', color:'#fde68a', xp:100 },
  { key:'advanced',     label:'Advanced',     color:'#ff9f1c', xp:150 },
  { key:'expert',       label:'Expert',       color:'#c084fc', xp:200 },
]

interface Stats { students:number; missions:number; total_xp:number; top_student:string; top_xp:number }
interface RecentActivity { name:string; xp_amount:number; created_at:string; source_type:string }
interface SchoolMaterial { name:string; category:string; is_available:boolean }

export default function TeacherView({ profile }: { profile: Profile }) {
  const [domain, setDomain]     = useState('drawing')
  const [level, setLevel]       = useState('beginner')
  const [mission, setMission]   = useState<any>(null)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)
  const [stats, setStats]       = useState<Stats>({ students:0, missions:0, total_xp:0, top_student:'—', top_xp:0 })
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [materials, setMaterials] = useState<SchoolMaterial[]>([])
  const [tab, setTab]           = useState<'generate'|'materials'|'activity'>('generate')

  useEffect(() => { loadDashboard() }, [profile])

  async function loadDashboard() {
    const [{ data: studentRows }, { data: xpRows }, { data: mats }] = await Promise.all([
      supabase.from('profiles').select('id, name').eq('school_id', profile.school_id).eq('role', 'student'),
      supabase.from('xp_ledger').select('student_id, xp_amount, created_at, source_type').order('created_at', { ascending: false }).limit(20),
      supabase.from('school_materials').select('name, category, is_available').eq('school_id', profile.school_id).order('category'),
    ])

    const students = studentRows || []
    const xp = xpRows || []

    // Aggregate XP per student
    const xpByStudent: Record<string, number> = {}
    for (const row of xp) {
      xpByStudent[row.student_id] = (xpByStudent[row.student_id] || 0) + row.xp_amount
    }

    let topId = '', topXp = 0
    for (const [id, x] of Object.entries(xpByStudent)) {
      if (x > topXp) { topId = id; topXp = x }
    }
    const topStudent = students.find((s:any) => s.id === topId)?.name || '—'

    setStats({
      students: students.length,
      missions: xp.length,
      total_xp: Object.values(xpByStudent).reduce((a,b) => a+b, 0),
      top_student: topStudent.split(' ')[0],
      top_xp: topXp,
    })

    // Recent activity with student names
    const nameMap: Record<string, string> = {}
    for (const s of students) nameMap[(s as any).id] = (s as any).name
    setActivity(xp.slice(0, 8).map((r:any) => ({
      name: nameMap[r.student_id] || 'Student',
      xp_amount: r.xp_amount,
      created_at: r.created_at,
      source_type: r.source_type || 'mission',
    })))

    setMaterials(mats || [])
  }

  async function generateMission() {
    setLoading(true); setMission(null); setCopied(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domain, difficulty: level, student_age: 13, school_id: profile.school_id }),
      })
      const data = await r.json()
      setMission(data)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function toggleMaterial(name: string, current: boolean) {
    await supabase.from('school_materials').update({ is_available: !current }).eq('name', name).eq('school_id', profile.school_id)
    loadDashboard()
  }

  function copyMission() {
    if (!mission) return
    const text = `MISSION: ${mission.mission_title}\n\n${mission.challenge_description}\n\nYou are practising: ${mission.learning_focus}\n\nSuccess looks like: ${mission.success_criteria}\n\nMaterials: ${(mission.materials||[]).join(', ')}\nTime: ${mission.time_estimate}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const dom = DOMAINS.find(d => d.key === domain)!
  const lvl = LEVELS.find(l => l.key === level)!
  const availableMats = materials.filter(m => m.is_available)

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ position:'relative', display:'inline-block' }}>
          <svg style={{ position:'absolute', bottom:-4, left:0, width:'100%' }} height="8" viewBox="0 0 140 8" preserveAspectRatio="none">
            <path d="M0 6 Q35 2 70 5 Q105 8 140 4" stroke="#FF9F1C" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>
          <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:32, color:'#fff', margin:0, position:'relative' }}>
            Teacher Studio
          </h1>
        </div>
        <p style={{ color:'rgba(255,255,255,0.4)', margin:'12px 0 0', fontSize:14 }}>
          Generate missions · Manage materials · Track your class
        </p>
      </div>

      {/* Stat row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {[
          { label:'Students', value:stats.students, color:'#1ECBE1', icon:'👥' },
          { label:'Missions Done', value:stats.missions, color:'#4ade80', icon:'✓' },
          { label:'Total XP Earned', value:stats.total_xp.toLocaleString(), color:'#FFE135', icon:'⚡' },
          { label:'Top Student', value:stats.top_student, sub: stats.top_xp > 0 ? `${stats.top_xp} XP` : '', color:'#FF9F1C', icon:'🏆' },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${color}20`, borderRadius:16, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <svg style={{ position:'absolute', right:-10, top:-10, opacity:0.06 }} width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill={color}/>
            </svg>
            <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
            <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:24, color, lineHeight:1, marginBottom:4 }}>{value}</div>
            {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:2 }}>{sub}</div>}
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'rgba(255,255,255,0.04)', borderRadius:14, padding:4 }}>
        {([['generate','✦ Mission Generator'],['materials','🎨 Class Materials'],['activity','⚡ Recent Activity']] as [typeof tab, string][]).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:'10px 0', background: tab===key ? 'rgba(255,255,255,0.1)' : 'none',
            border:`1px solid ${tab===key?'rgba(255,255,255,0.15)':'transparent'}`,
            color: tab===key ? '#fff' : 'rgba(255,255,255,0.4)',
            borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── MISSION GENERATOR ───────────────────────────────────────── */}
      {tab === 'generate' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, animation:'fadeUp 0.4s ease' }}>

          {/* Left: controls */}
          <div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:22 }}>
              <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginBottom:14 }}>Domain</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:22 }}>
                {DOMAINS.map(d => (
                  <button key={d.key} onClick={() => setDomain(d.key)} style={{
                    background: domain===d.key ? d.color+'22' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${domain===d.key ? d.color : 'rgba(255,255,255,0.07)'}`,
                    color: domain===d.key ? d.color : 'rgba(255,255,255,0.4)',
                    borderRadius:10, padding:'9px 12px', cursor:'pointer', fontSize:12, fontWeight:700,
                    textAlign:'left', transition:'all 0.12s',
                    boxShadow: domain===d.key ? `0 0 16px ${d.color}25` : 'none',
                  }}>{d.label}</button>
                ))}
              </div>

              <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginBottom:14 }}>Level</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:24 }}>
                {LEVELS.map(l => (
                  <button key={l.key} onClick={() => setLevel(l.key)} style={{
                    background: level===l.key ? l.color+'18' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${level===l.key ? l.color : 'rgba(255,255,255,0.07)'}`,
                    color: level===l.key ? l.color : 'rgba(255,255,255,0.4)',
                    borderRadius:10, padding:'9px 14px', cursor:'pointer', fontSize:12, fontWeight:700,
                    display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.12s',
                  }}>
                    <span>{l.label}</span>
                    <span style={{ opacity:0.6, fontSize:11 }}>+{l.xp} XP</span>
                  </button>
                ))}
              </div>

              {/* Available materials preview */}
              {availableMats.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:8 }}>
                    Materials in use ({availableMats.length})
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {availableMats.slice(0,8).map(m => (
                      <span key={m.name} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'2px 8px', fontSize:10, color:'rgba(255,255,255,0.45)' }}>{m.name}</span>
                    ))}
                    {availableMats.length > 8 && <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>+{availableMats.length-8} more</span>}
                  </div>
                </div>
              )}

              <button onClick={generateMission} disabled={loading} style={{
                width:'100%', padding:'14px 0', background: loading?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${dom.color},${dom.color}bb)`,
                border:'none', borderRadius:12, color:'#fff', fontSize:16, fontFamily:"'Fredoka One',sans-serif",
                cursor: loading?'not-allowed':'pointer',
                boxShadow: loading?'none':`0 8px 28px ${dom.color}35`,
                transition:'all 0.2s',
              }}>
                {loading ? 'Generating...' : `✦ Generate ${dom.label} Mission`}
              </button>
            </div>
          </div>

          {/* Right: mission preview */}
          <div>
            {!mission && !loading && (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:18, padding:40, textAlign:'center', gap:12 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.2">
                  <path d="M12 52 Q16 48 22 42 L42 22 Q45 19 47 21 Q49 23 46 26 L26 46 Q20 52 16 56Z" fill="#FF9F1C"/>
                  <circle cx="13" cy="53" r="4" fill="#FF9F1C" opacity="0.6"/>
                </svg>
                <p style={{ color:'rgba(255,255,255,0.25)', fontFamily:"'Fredoka One',sans-serif", fontSize:16, margin:0 }}>
                  Select a domain and level, then generate a mission
                </p>
                <p style={{ color:'rgba(255,255,255,0.15)', fontSize:13, margin:0 }}>
                  Missions are built from your class's available materials
                </p>
              </div>
            )}

            {loading && (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18 }}>
                <div style={{ textAlign:'center' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation:'spin 1.2s ease-in-out infinite', marginBottom:12 }}>
                    <path d="M10 38 Q14 34 20 28 L36 12 Q39 9 41 11 Q43 13 40 16 L24 32 Q18 38 14 42Z" fill={dom.color} opacity="0.9"/>
                    <circle cx="11" cy="39" r="4" fill={dom.color} opacity="0.5"/>
                  </svg>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'Fredoka One',sans-serif", margin:0 }}>
                    Writing mission...
                  </p>
                </div>
              </div>
            )}

            {mission && !loading && (
              <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${dom.color}30`, borderRadius:18, overflow:'hidden', animation:'fadeUp 0.4s ease' }}>
                {/* Header stripe */}
                <div style={{ background:`linear-gradient(135deg,${dom.color}20,rgba(255,255,255,0.03))`, padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:dom.color }}/>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:dom.color, marginBottom:5 }}>
                    {lvl.label} · {dom.label}
                  </div>
                  <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:'#fff', margin:0, lineHeight:1.2 }}>
                    {mission.mission_title}
                  </h2>
                </div>
                <div style={{ padding:'18px 22px' }}>
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, lineHeight:1.8, margin:'0 0 16px' }}>
                    {mission.challenge_description}
                  </p>

                  <MRow label="Students are practising" color={dom.color}>{mission.learning_focus}</MRow>
                  <MRow label="Success looks like" color="#4ade80">{mission.success_criteria}</MRow>

                  {mission.materials?.length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)', marginBottom:6 }}>Materials</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {mission.materials.map((m:string, i:number) => (
                          <span key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'3px 10px', fontSize:11, color:'rgba(255,255,255,0.6)' }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:18 }}>⏱ {mission.time_estimate}</div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={generateMission} style={{ flex:1, padding:'11px 0', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                      Regenerate
                    </button>
                    <button onClick={copyMission} style={{
                      flex:1, padding:'11px 0',
                      background: copied ? 'rgba(74,222,128,0.2)' : `rgba(${dom.color==='#FF6B35'?'255,107,53':'30,203,225'},0.15)`,
                      border: `1px solid ${copied?'rgba(74,222,128,0.4)':dom.color+'55'}`,
                      color: copied ? '#4ade80' : dom.color,
                      borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700,
                    }}>
                      {copied ? '✓ Copied!' : '⬡ Copy Mission'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MATERIALS MANAGER ───────────────────────────────────────── */}
      {tab === 'materials' && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, margin:'0 0 20px', lineHeight:1.6 }}>
            Toggle materials on/off to match what is available in your classroom today.
            Missions will only suggest materials marked as available.
          </p>
          {['drawing','painting','general','mixed_media','sculpture'].map(cat => {
            const catMats = materials.filter(m => m.category === cat)
            if (!catMats.length) return null
            return (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginBottom:10 }}>
                  {cat.replace('_',' ')}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:8 }}>
                  {catMats.map(m => (
                    <button key={m.name} onClick={() => toggleMaterial(m.name, m.is_available)} style={{
                      background: m.is_available ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${m.is_available?'rgba(74,222,128,0.35)':'rgba(255,255,255,0.08)'}`,
                      color: m.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      borderRadius:10, padding:'10px 14px', cursor:'pointer', fontSize:13,
                      display:'flex', alignItems:'center', gap:8, textAlign:'left', fontWeight:600,
                      transition:'all 0.15s',
                    }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background: m.is_available?'#4ade80':'rgba(255,255,255,0.2)', flexShrink:0 }}/>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ACTIVITY FEED ───────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div style={{ animation:'fadeUp 0.4s ease' }}>
          {activity.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.25)', fontFamily:"'Fredoka One',sans-serif", fontSize:18 }}>
              No student activity yet — missions will appear here as students complete them.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {activity.map((a, i) => {
                const ago = Math.round((Date.now() - new Date(a.created_at).getTime()) / 60000)
                const agoText = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago/60)}h ago` : `${Math.floor(ago/1440)}d ago`
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:14, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px 16px' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,159,28,0.15)', border:'1.5px solid rgba(255,159,28,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:15, color:'#FF9F1C', flexShrink:0 }}>
                      {a.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, color:'#fff', fontWeight:600 }}>{a.name}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>completed a mission · {agoText}</div>
                    </div>
                    <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:18, color:'#FFE135' }}>+{a.xp_amount}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MRow({ label, color, children }: { label:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color, marginBottom:4 }}>{label}</div>
      <div style={{ color:'rgba(255,255,255,0.7)', fontSize:13, lineHeight:1.6 }}>{children}</div>
    </div>
  )
}
