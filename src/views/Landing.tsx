import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Tab = 'signin' | 'teacher_signup' | 'student_signup'

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [tab, setTab]         = useState<Tab>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Sign-in fields
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')

  // Teacher signup
  const [tName, setTName]     = useState('')
  const [tEmail, setTEmail]   = useState('')
  const [tPass, setTPass]     = useState('')
  const [schoolName, setSchool] = useState('')

  // Student signup
  const [sName, setSName]     = useState('')
  const [sEmail, setSEmail]   = useState('')
  const [sPass, setSPass]     = useState('')
  const [joinCode, setJoin]   = useState('')

  async function signIn() {
    if (!email || !password) { setError('Enter email and password'); return }
    setLoading(true); setError(null)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false); return }
    onSignIn()
  }

  async function teacherSignup() {
    if (!tName || !tEmail || !tPass || !schoolName) { setError('Fill in all fields'); return }
    if (tPass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: tEmail, password: tPass })
    if (authErr || !authData.user) { setError(authErr?.message || 'Signup failed'); setLoading(false); return }

    const uid = authData.user.id

    // 2. Create school
    const joinCode = schoolName.toUpperCase().replace(/\s+/g, '').slice(0, 6) + Math.floor(1000 + Math.random() * 9000)
    const { data: school, error: schoolErr } = await supabase.from('schools').insert({
      name: schoolName,
      join_code: joinCode,
    }).select().single()
    if (schoolErr || !school) { setError('Could not create school: ' + schoolErr?.message); setLoading(false); return }

    // 3. Create profile
    await supabase.from('profiles').insert({
      auth_user_id: uid,
      school_id: school.id,
      name: tName,
      role: 'teacher',
    })

    setSuccess(`School created! Your student join code is: ${joinCode}`)
    setLoading(false)
    setTimeout(() => { onSignIn() }, 1800)
  }

  async function studentSignup() {
    if (!sName || !sEmail || !sPass || !joinCode) { setError('Fill in all fields including join code'); return }
    if (sPass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)

    // 1. Find school by join code
    const { data: school } = await supabase.from('schools').select('id, name').eq('join_code', joinCode.toUpperCase()).single()
    if (!school) { setError('Invalid join code — check with your teacher'); setLoading(false); return }

    // 2. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: sEmail, password: sPass })
    if (authErr || !authData.user) { setError(authErr?.message || 'Signup failed'); setLoading(false); return }

    const uid = authData.user.id

    // 3. Create profile
    await supabase.from('profiles').insert({
      auth_user_id: uid,
      school_id: school.id,
      name: sName,
      role: 'student',
      hint_credits: 5,
    })

    // 4. Enrol in first available class
    const { data: cls } = await supabase.from('classes').select('id').eq('school_id', school.id).limit(1).single()
    if (cls) {
      await supabase.from('class_enrollments').insert({ student_id: authData.user.id, class_id: cls.id }).catch(() => {})
    }

    setSuccess(`Welcome to ${school.name}! You have 5 hint credits to start.`)
    setLoading(false)
    setTimeout(() => { onSignIn() }, 1800)
  }

  const demo = (role: 'teacher' | 'student') => {
    setTab('signin')
    setEmail(role === 'teacher' ? 'teacher@primeluckart.com' : 'student@primeluckart.com')
    setPass('PrimeluckArtOs')
    setError(null)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', fontFamily:'Inter,sans-serif', position:'relative', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        body { margin:0; }
        input::placeholder { color:rgba(255,255,255,0.3); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes drift { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(20px,-15px) rotate(6deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Background paint blobs */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <svg style={{ position:'absolute', top:-80, left:-60, animation:'drift 18s ease-in-out infinite', opacity:0.09 }} width="500" height="500" viewBox="0 0 500 500">
          <path d="M200 80 Q320 20 420 100 Q520 180 480 300 Q440 420 320 460 Q200 500 120 420 Q40 340 60 220 Q80 100 200 80Z" fill="#FF6B35"/>
        </svg>
        <svg style={{ position:'absolute', bottom:-60, right:-80, animation:'drift 22s 3s ease-in-out infinite', opacity:0.07 }} width="500" height="500" viewBox="0 0 500 500">
          <path d="M250 50 Q380 30 440 150 Q500 270 450 380 Q400 490 270 500 Q140 510 70 400 Q0 290 50 170 Q100 50 250 50Z" fill="#1ECBE1"/>
        </svg>
        <svg style={{ position:'absolute', top:'30%', right:'-5%', animation:'drift 15s 6s ease-in-out infinite', opacity:0.06 }} width="300" height="400" viewBox="0 0 300 400">
          <path d="M150 30 Q240 20 270 120 Q300 220 260 310 Q220 400 140 390 Q60 380 30 290 Q0 200 40 110 Q80 20 150 30Z" fill="#8B5CF6"/>
        </svg>
      </div>

      {/* Hero section */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px', position:'relative', zIndex:1 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:48, animation:'fadeUp 0.5s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:20 }}>
            <img src="/primeluck-logo.jpg" alt="PrimeLuck" style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:'3px solid rgba(255,107,53,0.6)', boxShadow:'0 0 30px rgba(255,107,53,0.3)' }} onError={e=>(e.currentTarget.style.display='none')}/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:26, color:'#FF6B35', lineHeight:1 }}>PrimeLuck Creative OS</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4 }}>Visual Arts Education Platform</div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ position:'relative', display:'inline-block' }}>
            <svg style={{ position:'absolute', bottom:-6, left:0, width:'100%' }} height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
              <path d="M0 7 Q75 2 150 6 Q225 10 300 5" stroke="#FF6B35" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
            <p style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:18, color:'rgba(255,255,255,0.7)', margin:0, position:'relative' }}>
              Missions. Mastery. Creative identity.
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{ width:'100%', maxWidth:440, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:24, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,0.4)', animation:'fadeUp 0.6s ease' }}>

          {/* Tabs */}
          <div style={{ display:'flex', background:'rgba(0,0,0,0.2)', padding:6, gap:4 }}>
            {([
              ['signin',         'Sign In'],
              ['teacher_signup', 'I\'m a Teacher'],
              ['student_signup', 'I\'m a Student'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); setError(null); setSuccess(null) }} style={{
                flex:1, padding:'9px 4px', background: tab===key ? 'rgba(255,255,255,0.1)' : 'none',
                border:`1px solid ${tab===key ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                color: tab===key ? '#fff' : 'rgba(255,255,255,0.4)',
                borderRadius:12, cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding:'28px 28px 32px' }}>

            {/* Success banner */}
            {success && (
              <div style={{ background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#4ade80', lineHeight:1.5 }}>
                {success}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#fca5a5' }}>
                {error}
              </div>
            )}

            {/* SIGN IN */}
            {tab === 'signin' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={inp} onKeyDown={e=>e.key==='Enter'&&signIn()}/>
                <input value={password} onChange={e=>setPass(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==='Enter'&&signIn()}/>
                <Btn onClick={signIn} loading={loading} color="#FF6B35">Sign In</Btn>
                <div style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.07)', margin:'4px 0' }}/>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:'0 0 6px', textAlign:'center' }}>Try the demo</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>demo('teacher')} style={demoBtn('#FF9F1C')}>Teacher demo</button>
                  <button onClick={()=>demo('student')} style={demoBtn('#1ECBE1')}>Student demo</button>
                </div>
              </div>
            )}

            {/* TEACHER SIGNUP */}
            {tab === 'teacher_signup' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:'0 0 4px', lineHeight:1.6 }}>
                  Create a school account. You'll get a join code to share with your students.
                </p>
                <input value={tName} onChange={e=>setTName(e.target.value)} placeholder="Your full name" style={inp}/>
                <input value={schoolName} onChange={e=>setSchool(e.target.value)} placeholder="School name" style={inp}/>
                <input value={tEmail} onChange={e=>setTEmail(e.target.value)} placeholder="Email address" type="email" style={inp}/>
                <input value={tPass} onChange={e=>setTPass(e.target.value)} placeholder="Password (min 8 characters)" type="password" style={inp}/>
                <Btn onClick={teacherSignup} loading={loading} color="#FF6B35">Create School Account</Btn>
              </div>
            )}

            {/* STUDENT SIGNUP */}
            {tab === 'student_signup' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:'0 0 4px', lineHeight:1.6 }}>
                  Join your school. Ask your teacher for the join code.
                </p>
                <input value={sName} onChange={e=>setSName(e.target.value)} placeholder="Your full name" style={inp}/>
                <input value={sEmail} onChange={e=>setSEmail(e.target.value)} placeholder="Email address" type="email" style={inp}/>
                <input value={sPass} onChange={e=>setSPass(e.target.value)} placeholder="Password (min 8 characters)" type="password" style={inp}/>
                <input value={joinCode} onChange={e=>setJoin(e.target.value.toUpperCase())} placeholder="School join code e.g. DICE2026" style={{ ...inp, fontFamily:'monospace', letterSpacing:2, fontSize:16, textAlign:'center' }}/>
                <Btn onClick={studentSignup} loading={loading} color="#1ECBE1">Join Studio</Btn>
              </div>
            )}
          </div>
        </div>

        {/* Feature badges */}
        <div style={{ display:'flex', gap:12, marginTop:36, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp 0.8s ease' }}>
          {[
            { label:'50+ lessons', color:'#FF6B35' },
            { label:'AI missions', color:'#1ECBE1' },
            { label:'Art Clans', color:'#f472b6' },
            { label:'Portfolio sharing', color:'#a78bfa' },
          ].map(({ label, color }) => (
            <div key={label} style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:20, padding:'5px 14px', fontSize:12, color, fontWeight:700 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Partner badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:24, opacity:0.5, animation:'fadeUp 0.9s ease' }}>
          <img src="/dice-arts-logo.png" alt="Dice Arts" style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} onError={e=>(e.currentTarget.style.display='none')}/>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Dice Arts Academy — Network School</span>
        </div>
      </div>
    </div>
  )
}

function Btn({ onClick, loading, color, children }: { onClick:()=>void; loading:boolean; color:string; children:React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:'100%', padding:'13px 0', background: loading?'rgba(255,255,255,0.06)':`linear-gradient(135deg,${color},${color}cc)`,
      border:'none', borderRadius:12, color:'#fff', fontSize:15, fontFamily:"'Fredoka One',sans-serif",
      cursor:loading?'not-allowed':'pointer', transition:'all 0.2s',
      boxShadow: loading?'none':`0 8px 24px ${color}40`,
    }}>
      {loading ? 'Please wait...' : children}
    </button>
  )
}

const inp: React.CSSProperties = {
  width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
  color:'#fff', borderRadius:10, padding:'12px 14px', fontSize:14, outline:'none',
}

const demoBtn = (color: string): React.CSSProperties => ({
  flex:1, background:`${color}15`, border:`1px solid ${color}35`,
  color, borderRadius:10, padding:'9px 0', cursor:'pointer', fontSize:12, fontWeight:700,
})
