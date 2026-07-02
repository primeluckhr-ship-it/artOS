import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(email: string, label: string) {
    setLoading(label)
    setError(null)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password: 'demo1234' })
    if (e) { setError(e.message); setLoading(null) }
    else onSignIn()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg,#1E0B4E,#0D1B3E)', position: 'relative', overflow: 'hidden' }}>
      {/* Background stars */}
      {[...Array(28)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: 2 + Math.random() * 2, height: 2 + Math.random() * 2, borderRadius: '50%', background: '#fff', opacity: 0.1 + Math.random() * 0.25, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
      ))}

      <div style={{ position: 'relative', maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* PrimeLuck — main brand, large and proud */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <img
            src="/primeluck-logo.jpg"
            alt="PrimeLuck Arts"
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,107,53,0.6)', boxShadow: '0 0 32px rgba(255,107,53,0.4)' }}
          />
        </div>

        <h1 style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 38, lineHeight: 1.1, background: 'linear-gradient(90deg,#FF6B35,#FFE135)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, textAlign: 'center' }}>
          PrimeLuck<br />Creative OS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 32, textAlign: 'center', lineHeight: 1.6 }}>
          Where every lesson becomes a mission.<br />Every mission becomes a story.
        </p>

        {/* Demo login cards */}
        {[
          { emoji: '✏️', label: 'teacher', email: 'teacher@primeluckdemo.com', role: 'Teacher', desc: 'Generate missions · Run sessions · See your class grow', color: '#FF9F1C' },
          { emoji: '🎯', label: 'student', email: 'student@primeluckdemo.com', role: 'Student', desc: 'Accept missions · Create art · Earn XP and rank up', color: '#1ECBE1' },
        ].map(({ emoji, label, email, role, desc, color }) => (
          <button
            key={label}
            onClick={() => signIn(email, label)}
            disabled={!!loading}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `2px solid ${loading === label ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: 18, padding: '18px 20px', cursor: loading ? 'wait' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: 32 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, color, marginBottom: 3 }}>
                {loading === label ? 'Signing in...' : `Sign in as ${role}`}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{desc}</div>
            </div>
            <span style={{ color, fontSize: 18 }}>{loading === label ? '⏳' : '→'}</span>
          </button>
        ))}

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 12, padding: '11px 16px', color: '#ff8080', fontSize: 13, marginBottom: 16, width: '100%' }}>
            {error}
          </div>
        )}

        {/* Dice Arts — partner school badge */}
        <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
          <img
            src="/dice-arts-logo.png"
            alt="Dice Arts"
            style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
          />
          <div>
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 15, color: '#fff', marginBottom: 2 }}>Dice Arts Academy</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>A PrimeLuck Network School · Inspiring Creativity</div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#FF6B35', fontWeight: 700 }}>
            PARTNER
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
          Demo accounts · No sign-up needed
        </p>
      </div>
    </div>
  )
}
