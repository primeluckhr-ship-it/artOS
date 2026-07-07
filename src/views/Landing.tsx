import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Tab = 'signin' | 'teacher_signup' | 'student_signup'

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [tab, setTab]         = useState<Tab>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Sign-in
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')

  // Teacher signup
  const [tName, setTName]     = useState('')
  const [tEmail, setTEmail]   = useState('')
  const [tPass, setTPass]     = useState('')
  const [schoolName, setSchool] = useState('')

  // Student signup
  const [sName, setSName]   = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sPass, setSPass]   = useState('')
  const [joinCode, setJoin] = useState('')

  // ── Sign In ────────────────────────────────────────────────────
  async function signIn() {
    if (!email || !password) { setError('Enter email and password'); return }
    setLoading(true); setError(null)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) {
      setError(
        e.message.includes('Invalid login') ? 'Incorrect email or password' :
        e.message.includes('Email not confirmed') ? 'Please confirm your email first — check your inbox' :
        e.message
      )
      setLoading(false); return
    }
    onSignIn()
  }

  // ── Teacher Signup ─────────────────────────────────────────────
  async function teacherSignup() {
    if (!tName || !tEmail || !tPass || !schoolName) { setError('Fill in all fields'); return }
    if (tPass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)

    // 1. Create school first so we have the ID for metadata
    const code = schoolName.toUpperCase().replace(/\s+/g, '').slice(0, 6) + Math.floor(1000 + Math.random() * 9000)
    const { data: school, error: schoolErr } = await supabase.from('schools').insert({
      name: schoolName, join_code: code,
    }).select().single()
    if (schoolErr || !school) {
      setError('Could not create school: ' + (schoolErr?.message || 'unknown error'))
      setLoading(false); return
    }

    // 2. Create auth user — pass all profile data as metadata so the
    //    DB trigger can create the profile even if email confirmation
    //    is enabled and we don't yet have an active session.
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: tEmail, password: tPass,
      options: { data: { name: tName, role: 'teacher', school_id: school.id } },
    })
    if (authErr || !authData.user) {
      setError(authErr?.message || 'Account creation failed')
      setLoading(false); return
    }

    // 3. If we got a session (email confirmation disabled), also insert
    //    profile directly — belt and braces alongside the trigger.
    if (authData.session) {
      const { error: profErr } = await supabase.from('profiles').insert({
        auth_user_id: authData.user.id,
        school_id: school.id,
        name: tName,
        role: 'teacher',
      })
      if (profErr && !profErr.message.includes('duplicate')) {
        console.warn('Profile insert warning:', profErr.message)
      }
      onSignIn()
      return
    }

    // 4. No session means email confirmation is required
    setSuccess(`Account created! Your join code is ${code}. Check your email to confirm your account, then sign in.`)
    setLoading(false)
  }

  // ── Student Signup ─────────────────────────────────────────────
  async function studentSignup() {
    if (!sName || !sEmail || !sPass || !joinCode) { setError('Fill in all fields including the join code'); return }
    if (sPass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)

    // 1. Validate join code
    const { data: school, error: schoolErr } = await supabase
      .from('schools').select('id, name')
      .eq('join_code', joinCode.trim().toUpperCase()).single()
    if (schoolErr || !school) {
      setError('Join code not recognised — check with your teacher (must be exactly ' + joinCode.trim().toUpperCase() + ')')
      setLoading(false); return
    }

    // 2. Create auth user with full metadata for the trigger
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: sEmail, password: sPass,
      options: { data: { name: sName, role: 'student', school_id: school.id, hint_credits: 5 } },
    })
    if (authErr) {
      setError(
        authErr.message.includes('already registered') ? 'That email already has an account — try signing in instead' :
        authErr.message
      )
      setLoading(false); return
    }
    if (!authData.user) { setError('Account creation failed — try again'); setLoading(false); return }

    // 3. Session available → insert profile directly + sign in
    if (authData.session) {
      const { error: profErr } = await supabase.from('profiles').insert({
        auth_user_id: authData.user.id,
        school_id: school.id,
        name: sName,
        role: 'student',
        hint_credits: 5,
      })
      if (profErr && !profErr.message.includes('duplicate')) {
        console.warn('Profile insert warning:', profErr.message)
      }

      // Enrol in first available class (non-fatal if it fails)
      const { data: cls } = await supabase.from('classes').select('id').eq('school_id', school.id).limit(1).single()
      if (cls) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', authData.user.id).single()
        if (profile) {
          await supabase.from('class_enrollments').insert({ student_id: profile.id, class_id: cls.id }).catch(() => {})
        }
      }

      onSignIn()
      return
    }

    // 4. No session → email confirmation required
    setSuccess(`Welcome to ${school.name}! Check your email to confirm your account, then come back and sign in.`)
    setLoading(false)
  }

  function demo(role: 'teacher' | 'student') {
    setTab('signin')
    setEmail(role === 'teacher' ? 'teacher@primeluckart.com' : 'student@primeluckart.com')
    setPass('PrimeluckArtOs')
    setError(null)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden', fontFamily:"'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Inter:wght@400;600;700;800&display=swap');
        @keyframes pop { 0%{opacity:0;transform:scale(0.95)} 100%{opacity:1;transform:scale(1)} }
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,10px) scale(0.97)} }
        input { background:rgba(255,255,255,0.06)!important; border:1.5px solid rgba(255,255,255,0.1)!important; border-radius:10px!important; color:#fff!important; padding:11px 14px!important; font-size:14px!important; width:100%!important; outline:none!important; transition:border-color 0.15s!important; }
        input:focus { border-color:rgba(255,255,255,0.3)!important; }
        input::placeholder { color:rgba(255,255,255,0.25)!important; }
        label { display:block; font-size:11px; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px; }
      `}</style>

      {/* Blobs */}
      {[['#FF6B35','15%','10%'],['#8B5CF6','80%','15%'],['#1ECBE1','10%','75%'],['#FF9F1C','85%','80%']].map(([c,x,y],i) => (
        <div key={i} style={{ position:'absolute', left:x, top:y, width:280, height:280, borderRadius:'50%', background:c, opacity:0.07, filter:'blur(60px)', animation:`blob ${6+i*1.3}s ease-in-out infinite`, animationDelay:`${i*0.8}s` }}/>
      ))}

      <div style={{ width:'100%', maxWidth:420, animation:'pop 0.35s ease', position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:26, color:'#fff', margin:'0 auto 12px', boxShadow:'0 8px 28px rgba(255,107,53,0.4)' }}>P</div>
          <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:22, color:'#fff', marginBottom:3 }}>PrimeLuck Creative OS</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Dice Arts Academy</div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:14, padding:4, marginBottom:20, border:'1px solid rgba(255,255,255,0.07)' }}>
          {(['signin','teacher_signup','student_signup'] as Tab[]).map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null) }} style={{ flex:1, padding:'9px 0', background:tab===t?'rgba(255,255,255,0.1)':'none', border:`1px solid ${tab===t?'rgba(255,255,255,0.15)':'transparent'}`, color:tab===t?'#fff':'rgba(255,255,255,0.35)', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s' }}>
              {['Sign In', 'Teacher', 'Student'][i]}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'24px 22px' }}>

          {/* ── SIGN IN ── */}
          {tab === 'signin' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label>Email</label><input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&signIn()}/></div>
              <div><label>Password</label><input type="password" placeholder="••••••••" value={password} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&signIn()}/></div>
              <Btn onClick={signIn} loading={loading} color="#FF9F1C">Sign In</Btn>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>demo('teacher')} style={demoStyle('#FF9F1C')}>Demo Teacher</button>
                <button onClick={()=>demo('student')} style={demoStyle('#1ECBE1')}>Demo Student</button>
              </div>
            </div>
          )}

          {/* ── TEACHER SIGNUP ── */}
          {tab === 'teacher_signup' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6, marginBottom:4 }}>
                Create a new school account. You'll get a join code to share with students.
              </div>
              <div><label>Your Name</label><input type="text" placeholder="Ms Rodriguez" value={tName} onChange={e=>setTName(e.target.value)}/></div>
              <div><label>School Name</label><input type="text" placeholder="Dice Arts Academy" value={schoolName} onChange={e=>setSchool(e.target.value)}/></div>
              <div><label>Email</label><input type="email" placeholder="teacher@school.com" value={tEmail} onChange={e=>setTEmail(e.target.value)}/></div>
              <div><label>Password (min 8 characters)</label><input type="password" placeholder="••••••••" value={tPass} onChange={e=>setTPass(e.target.value)}/></div>
              <Btn onClick={teacherSignup} loading={loading} color="#FF9F1C">Create School Account</Btn>
            </div>
          )}

          {/* ── STUDENT SIGNUP ── */}
          {tab === 'student_signup' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'rgba(255,225,53,0.08)', border:'1px solid rgba(255,225,53,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'rgba(255,225,53,0.85)', lineHeight:1.6 }}>
                Ask your teacher for the <strong>join code</strong> — it's usually displayed at the front of the room.
              </div>
              <div><label>Your Name</label><input type="text" placeholder="First and last name" value={sName} onChange={e=>setSName(e.target.value)}/></div>
              <div><label>Join Code (from your teacher)</label><input type="text" placeholder="e.g. DICE2026" value={joinCode} onChange={e=>setJoin(e.target.value.toUpperCase())} style={{ textTransform:'uppercase', letterSpacing:2, fontWeight:700 } as any}/></div>
              <div><label>Email</label><input type="email" placeholder="your@email.com" value={sEmail} onChange={e=>setSEmail(e.target.value)}/></div>
              <div><label>Password (min 8 characters)</label><input type="password" placeholder="••••••••" value={sPass} onChange={e=>setSPass(e.target.value)}/></div>
              <Btn onClick={studentSignup} loading={loading} color="#1ECBE1">Join Class</Btn>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div style={{ marginTop:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fca5a5', lineHeight:1.5 }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop:14, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#86efac', lineHeight:1.5 }}>
              ✓ {success}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Btn({ onClick, loading, color, children }: { onClick:()=>void; loading:boolean; color:string; children:React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ padding:'13px 0', background:loading?'rgba(255,255,255,0.06)':`linear-gradient(135deg,${color},${color}bb)`, border:'none', borderRadius:12, color: color==='#1ECBE1'?'#0d1020':'#fff', fontSize:15, fontFamily:"'Fredoka One',sans-serif", cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':`0 8px 24px ${color}35`, transition:'all 0.2s', width:'100%' }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

const demoStyle = (color: string): React.CSSProperties => ({
  flex:1, padding:'9px 0', background:`${color}14`, border:`1px solid ${color}30`,
  color, borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700,
})
