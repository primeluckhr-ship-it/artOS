import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './views/Landing'
import TeacherView from './views/TeacherView'
import StudentView from './views/StudentView'
import PortfolioView from './views/PortfolioView'
import ClassDashboard from './views/ClassDashboard'

export interface Profile {
  id: string
  school_id: string
  role: string
  name: string
  age_band: string | null
}

type View = 'class' | 'teacher' | 'student' | 'portfolio'

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
    setView(data?.role === 'student' ? 'student' : 'class')
    setLoading(false)
  }

  if (loading) return <Spinner />
  if (!profile) return <Landing onSignIn={loadProfile} />

  const isTeacher = profile.role !== 'student'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar profile={profile} view={view} setView={setView} isTeacher={isTeacher} />
      <main style={{ flex: 1, paddingBottom: 80 }}>
        {view === 'class'     && isTeacher  && <ClassDashboard profile={profile} />}
        {view === 'teacher'   && isTeacher  && <TeacherView profile={profile} />}
        {view === 'student'                 && <StudentView profile={profile} />}
        {view === 'portfolio'               && <PortfolioView profile={profile} />}
      </main>
    </div>
  )
}

function NavBar({ profile, view, setView, isTeacher }: {
  profile: Profile; view: View; setView: (v: View) => void; isTeacher: boolean
}) {
  const teacherNav = [
    { key: 'class',     emoji: '🏫', label: 'Class',     color: '#4ade80' },
    { key: 'teacher',   emoji: '✏️',  label: 'Create',    color: '#FF9F1C' },
    { key: 'portfolio', emoji: '🖼️',  label: 'Portfolio', color: '#FF6B35' },
  ]
  const studentNav = [
    { key: 'student',   emoji: '🎯', label: 'Mission',   color: '#1ECBE1' },
    { key: 'portfolio', emoji: '🖼️', label: 'Portfolio', color: '#FF6B35' },
  ]
  const navItems = isTeacher ? teacherNav : studentNav

  return (
    <nav style={{ background: '#150836', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/primeluck-logo.jpg" alt="PrimeLuck" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,53,0.5)' }} />
        <div>
          <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 13, color: '#FF6B35', lineHeight: 1.1 }}>PrimeLuck Creative OS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <img src="/dice-arts-logo.png" alt="Dice Arts" style={{ width: 13, height: 13, borderRadius: 3, objectFit: 'cover' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Dice Arts Academy</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {navItems.map(({ key, emoji, label, color }) => (
          <button key={key} onClick={() => setView(key as View)}
            style={{ background: view === key ? color : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 20, padding: '6px 13px', color: view === key ? (key === 'class' ? '#0f172a' : '#fff') : '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
            {emoji} {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, display: 'none' }}>{profile.name}</span>
        <button onClick={() => supabase.auth.signOut()}
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#aaa', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', fontSize: 12 }}>
          Sign out
        </button>
      </div>
    </nav>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid rgba(255,107,53,0.3)', borderTop: '4px solid #FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#aaa', fontFamily: "'Fredoka One',sans-serif" }}>Loading...</p>
    </div>
  )
}
