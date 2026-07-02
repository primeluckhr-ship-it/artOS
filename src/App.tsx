import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './views/Landing'
import TeacherView from './views/TeacherView'
import StudentView from './views/StudentView'
import PortfolioView from './views/PortfolioView'

export interface Profile {
  id: string
  school_id: string
  role: string
  name: string
  age_band: string | null
}

type View = 'teacher' | 'student' | 'portfolio'

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('teacher')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile()
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) loadProfile()
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, school_id, role, name, age_band')
      .eq('auth_user_id', user.id)
      .single()
    setProfile(data)
    if (data?.role === 'student') setView('student')
    else setView('teacher')
    setLoading(false)
  }

  if (loading) return <Spinner />
  if (!profile) return <Landing onSignIn={loadProfile} />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar profile={profile} view={view} setView={setView} />
      <main style={{ flex: 1, paddingBottom: 80 }}>
        {view === 'teacher' && profile.role !== 'student' && <TeacherView profile={profile} />}
        {view === 'student' && <StudentView profile={profile} />}
        {view === 'portfolio' && <PortfolioView profile={profile} />}
      </main>
    </div>
  )
}

function NavBar({ profile, view, setView }: { profile: Profile; view: View; setView: (v: View) => void }) {
  const isTeacher = profile.role !== 'student'

  return (
    <nav style={{ background: '#150836', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>

      {/* Left: PrimeLuck logo + Dice Arts school */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/primeluck-logo.jpg"
          alt="PrimeLuck Arts"
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,53,0.55)', boxShadow: '0 0 10px rgba(255,107,53,0.25)' }}
        />
        <div>
          <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 14, color: '#FF6B35', lineHeight: 1.1 }}>
            PrimeLuck Creative OS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <img src="/dice-arts-logo.png" alt="Dice Arts" style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Dice Arts Academy</span>
          </div>
        </div>
      </div>

      {/* Centre: nav buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {isTeacher && (
          <NavBtn active={view === 'teacher'} onClick={() => setView('teacher')} color="#FF9F1C">
            ✏️ Create
          </NavBtn>
        )}
        <NavBtn active={view === 'student'} onClick={() => setView('student')} color="#1ECBE1">
          🎯 Mission
        </NavBtn>
        <NavBtn active={view === 'portfolio'} onClick={() => setView('portfolio')} color="#FF6B35">
          🖼️ Portfolio
        </NavBtn>
      </div>

      {/* Right: user + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{profile.name}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#aaa', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

function NavBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : 'rgba(255,255,255,0.06)',
        border: 'none',
        color: active ? '#fff' : '#aaa',
        borderRadius: 20,
        padding: '6px 14px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid rgba(255,107,53,0.3)', borderTop: '4px solid #FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#aaa', fontFamily: "'Fredoka One', sans-serif" }}>Loading...</p>
    </div>
  )
}
