import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './views/Landing'
import TeacherView from './views/TeacherView'
import StudentView from './views/StudentView'
import PortfolioView from './views/PortfolioView'
import ClassDashboard from './views/ClassDashboard'
import LessonLibrary from './views/LessonLibrary'
import AdminPanel from './views/AdminPanel'
import ClansView from './views/ClansView'
import { ArtBackground } from './components/ArtBackground'
import PublicPortfolio from './views/PublicPortfolio'
import {
  ClassIcon, LessonsIcon, CreateIcon, MissionIcon,
  PortfolioIcon, AdminIcon,
} from './components/ArtIcons'

export interface Profile {
  id: string; school_id: string; role: string; name: string; age_band: string | null
}
type View = 'class' | 'lessons' | 'teacher' | 'student' | 'portfolio' | 'admin' | 'clans'

function ClansIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Two shields interlocked — clan/alliance mark */}
      <path d="M9 3 Q5 3 4 7 L4 13 Q4 18 9 20 Q11 21 12 20" stroke={color} strokeWidth="2" fill="none" />
      <path d="M15 3 Q19 3 20 7 L20 13 Q20 18 15 20 Q13 21 12 20" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.8" />
    </svg>
  )
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('class')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(); else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) loadProfile(); else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('id, school_id, role, name, age_band').eq('auth_user_id', user.id).single()
    setProfile(data)
    setView(data?.role === 'student' ? 'student' : 'class')
    setLoading(false)
  }

  if (loading) return <Spinner />
  if (!profile) return <Landing onSignIn={loadProfile} />

  const isTeacher = profile.role !== 'student'
  const isAdmin = ['school_admin', 'platform_admin', 'teacher'].includes(profile.role)

  const navItems: { key: View; Icon: React.FC<{ size?: number; color?: string }>; label: string; color: string; show: boolean }[] = [
    { key: 'class',     Icon: ClassIcon,     label: 'Class',     color: '#4ade80', show: isTeacher },
    { key: 'lessons',   Icon: LessonsIcon,   label: 'Lessons',   color: '#FF6B35', show: true },
    { key: 'teacher',   Icon: CreateIcon,    label: 'Create',    color: '#FF9F1C', show: isTeacher },
    { key: 'student',   Icon: MissionIcon,   label: 'Mission',   color: '#1ECBE1', show: true },
    { key: 'clans',     Icon: ClansIcon,     label: 'Clans',     color: '#f472b6', show: true },
    { key: 'portfolio', Icon: PortfolioIcon, label: 'Portfolio', color: '#a78bfa', show: true },
    { key: 'admin',     Icon: AdminIcon,     label: 'Admin',     color: '#8B5CF6', show: isAdmin },
  ].filter(i => i.show)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#1E0B4E,#0D1020)' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', sans-serif; }
        select, input, textarea { color-scheme: dark; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <ArtBackground />
      <NavBar profile={profile} view={view} setView={setView} navItems={navItems} />
      <main style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        {view === 'class'     && isTeacher  && <ClassDashboard profile={profile} />}
        {view === 'lessons'                 && <LessonLibrary profile={profile} />}
        {view === 'teacher'   && isTeacher  && <TeacherView profile={profile} />}
        {view === 'student'                 && <StudentView profile={profile} />}
        {view === 'clans'                   && <ClansView profile={profile} />}
        {view === 'portfolio'               && <PortfolioView profile={profile} />}
        {view === 'admin'     && isAdmin    && <AdminPanel profile={profile} />}
      </main>
    </div>
  )
}

function NavBtn({ icon: Icon, label, active, color, onClick, mobile }: {
  icon: React.FC<{ size?: number; color?: string }>;
  label: string; active: boolean; color: string; onClick: () => void; mobile?: boolean
}) {
  if (mobile) {
    return (
      <button onClick={onClick} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 4px 8px', position: 'relative', minWidth: 0,
      }}>
        {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: 3, background: color, borderRadius: '0 0 3px 3px', clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)' }} />}
        <Icon size={22} color={active ? color : 'rgba(255,255,255,0.3)'} />
        <span style={{ fontSize: 9, fontWeight: 700, color: active ? color : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </button>
    )
  }
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '6px 10px', borderRadius: 12, transition: 'all 0.2s', position: 'relative',
    }}>
      {active && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 3, background: color, borderRadius: 2, clipPath: 'polygon(0 0, 100% 20%, 100% 100%, 0 80%)' }} />}
      <Icon size={20} color={active ? color : 'rgba(255,255,255,0.35)'} />
      <span style={{ fontSize: 10, fontWeight: 700, color: active ? color : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </span>
    </button>
  )
}

function NavBar({ profile, view, setView, navItems }: {
  profile: Profile; view: View; setView: (v: View) => void
  navItems: { key: View; Icon: React.FC<{ size?: number; color?: string }>; label: string; color: string }[]
}) {
  const isMobile = window.innerWidth < 640
  if (isMobile) {
    return (
      <>
        {/* Mobile: minimal top bar */}
        <nav style={{ background: 'rgba(13,8,32,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/primeluck-logo.jpg" alt="PrimeLuck" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,53,0.5)' }} />
            <span style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 14, color: '#FF6B35' }}>PrimeLuck OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{profile.name.split(' ')[0]}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Leave</button>
          </div>
        </nav>
        {/* Mobile: fixed bottom tab bar */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10,6,26,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 100, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom,0px)', backdropFilter: 'blur(16px)' }}>
          {navItems.slice(0, 5).map(({ key, Icon, label, color }) => (
            <NavBtn key={key} icon={Icon} label={label} active={view === key} color={color} onClick={() => setView(key)} mobile />
          ))}
        </nav>
      </>
    )
  }

  return (
    <nav style={{ background: 'rgba(13,8,32,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/primeluck-logo.jpg" alt="PrimeLuck" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,53,0.5)' }} />
        <div>
          <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 13, color: '#FF6B35', lineHeight: 1.1 }}>PrimeLuck Creative OS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <img src="/dice-arts-logo.png" alt="Dice Arts" style={{ width: 13, height: 13, borderRadius: 3, objectFit: 'cover' }} />
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>Dice Arts Academy</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {navItems.map(({ key, Icon, label, color }) => (
          <NavBtn key={key} icon={Icon} label={label} active={view === key} color={color} onClick={() => setView(key)} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>{profile.name}</span>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
          Leave
        </button>
      </div>
    </nav>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 20, background: 'linear-gradient(160deg,#1E0B4E,#0D1020)' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: 'spin 1.2s ease-in-out infinite' }}>
        <path d="M10 38 Q14 34 20 28 L36 12 Q39 9 41 11 Q43 13 40 16 L24 32 Q18 38 14 42Z" fill="#FF6B35" opacity="0.9" />
        <circle cx="11" cy="39" r="4" fill="#FF6B35" opacity="0.5" />
      </svg>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Fredoka One',sans-serif", fontSize: 15 }}>Loading your studio...</p>
    </div>
  )
}
