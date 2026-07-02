import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState('teacher@primeluckdemo.com')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message || JSON.stringify(authError))
        return
      }
      if (!data.user) {
        setError('Sign in succeeded but no user returned. Please try again.')
        return
      }
      onSignIn()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error — check console')
      console.error('Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }

  function prefill(role: 'teacher' | 'student') {
    setEmail(role === 'teacher' ? 'teacher@primeluckdemo.com' : 'student@primeluckdemo.com')
    setPassword('demo1234')
    setError(null)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
    padding: '12px 14px', color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'Inter,sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg,#1E0B4E,#0D1B3E)', position: 'relative', overflow: 'hidden' }}>
      {[...Array(24)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.15, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
      ))}

      <div style={{ position: 'relative', maxWidth: 420, width: '100%' }}>

        {/* PrimeLuck logo */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src="/primeluck-logo.jpg" alt="PrimeLuck Arts" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,107,53,0.6)', boxShadow: '0 0 28px rgba(255,107,53,0.35)' }} />
        </div>
        <h1 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 36, lineHeight: 1.1, background: 'linear-gradient(90deg,#FF6B35,#FFE135)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, textAlign: 'center' }}>
          PrimeLuck<br />Creative OS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 28, textAlign: 'center', lineHeight: 1.6 }}>
          Where every lesson becomes a mission.<br />Every mission becomes a story.
        </p>

        {/* Quick-fill buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {(['teacher', 'student'] as const).map(role => (
            <button key={role} onClick={() => prefill(role)} style={{ flex: 1, background: email.includes(role) ? (role === 'teacher' ? 'rgba(255,159,28,0.2)' : 'rgba(30,203,225,0.2)') : 'rgba(255,255,255,0.05)', border: `1px solid ${email.includes(role) ? (role === 'teacher' ? 'rgba(255,159,28,0.5)' : 'rgba(30,203,225,0.5)') : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', color: role === 'teacher' ? '#FF9F1C' : '#1ECBE1', fontFamily: "'Fredoka One',sans-serif", fontSize: 15, transition: 'all 0.2s' }}>
              {role === 'teacher' ? '✏️ Teacher' : '🎯 Student'}
            </button>
          ))}
        </div>

        {/* Sign-in form */}
        <form onSubmit={signIn} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 22, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>Password</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} style={inp} required />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.35)', borderRadius: 10, padding: '11px 14px', color: '#ff8080', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? 'rgba(255,107,53,0.4)' : 'linear-gradient(135deg,#FF6B35,#FF9F1C)', border: 'none', borderRadius: 13, padding: '14px', color: '#fff', fontFamily: "'Fredoka One',sans-serif", fontSize: 17, cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 4px 18px rgba(255,107,53,0.4)', transition: 'all 0.2s' }}>
            {loading ? '⏳ Signing in...' : '→ Sign In'}
          </button>
        </form>

        {/* Visible credentials */}
        <div style={{ background: 'rgba(255,225,53,0.06)', border: '1px solid rgba(255,225,53,0.2)', borderRadius: 13, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ color: '#FFE135', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🔑 Demo Credentials</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { role: '✏️ Teacher', email: 'teacher@primeluckdemo.com' },
              { role: '🎯 Student', email: 'student@primeluckdemo.com' },
            ].map(({ role, email: e }) => (
              <div key={e} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{role}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 2 }}>{e}</div>
                <div style={{ color: '#FFE135', fontSize: 11, fontWeight: 700 }}>demo1234</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dice Arts badge */}
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/dice-arts-logo.png" alt="Dice Arts" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 13, color: '#fff' }}>Dice Arts Academy</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>A PrimeLuck Network School · Inspiring Creativity</div>
          </div>
          <div style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 20, padding: '3px 9px', fontSize: 10, color: '#FF6B35', fontWeight: 700 }}>PARTNER</div>
        </div>

      </div>
    </div>
  )
}
