import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(email: string, password: string, label: string) {
    setLoading(label)
    setError(null)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) {
      setError(e.message)
      setLoading(null)
    } else {
      onSignIn()
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg, #1E0B4E 0%, #0D1B3E 100%)' }}>
      {/* Stars */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            borderRadius: '50%',
            background: '#fff',
            opacity: Math.random() * 0.6 + 0.1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 64 }}>🎨</span>
        </div>
        <h1 style={{ fontFamily: 'Fredoka One', fontSize: 42, background: 'linear-gradient(90deg, #FF6B35, #FFE135)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, lineHeight: 1.1 }}>
          PrimeLuck<br />Creative OS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
          Where every lesson becomes a mission.<br />Every mission becomes a story.
        </p>

        {/* Demo login cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <DemoCard
            emoji="✏️"
            role="Teacher"
            description="Generate missions, run sessions, see your class grow"
            color="#FF9F1C"
            loading={loading === 'teacher'}
            onClick={() => signIn('teacher@primeluckdemo.com', 'demo1234', 'teacher')}
          />
          <DemoCard
            emoji="🎯"
            role="Student"
            description="Accept missions, create art, earn XP and rank up"
            color="#1ECBE1"
            loading={loading === 'student'}
            onClick={() => signIn('student@primeluckdemo.com', 'demo1234', 'student')}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 12, padding: '12px 16px', color: '#ff8080', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Demo accounts · No sign-up needed
        </p>
      </div>
    </div>
  )
}

function DemoCard({ emoji, role, description, color, loading, onClick }: {
  emoji: string; role: string; description: string; color: string; loading: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `2px solid ${loading ? color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 20,
        padding: '20px 24px',
        cursor: loading ? 'wait' : 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.2s',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.border = `2px solid ${color}`; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.border = '2px solid rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' } }}
    >
      <span style={{ fontSize: 36, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Fredoka One', fontSize: 20, color, marginBottom: 4 }}>
          Sign in as {role}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <div style={{ color: color, fontSize: 20 }}>
        {loading ? '⏳' : '→'}
      </div>
    </button>
  )
}
