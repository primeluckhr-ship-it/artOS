import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../App'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  school_id: string
  created_at?: string
}

interface Material {
  id: string
  name: string
  category: string
  is_available: boolean
}

const ROLES = ['student', 'teacher', 'curriculum_lead', 'school_admin', 'platform_admin']
const ROLE_COLORS: Record<string, string> = {
  student: '#1ECBE1', teacher: '#FF9F1C',
  curriculum_lead: '#4ade80', school_admin: '#FF6B35', platform_admin: '#8B5CF6',
}

export default function AdminPanel({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<'users' | 'materials'>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  // New user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('student')
  const [newPassword, setNewPassword] = useState('PrimeluckArtOs')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // New material form
  const [newMaterial, setNewMaterial] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [addingMaterial, setAddingMaterial] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: u }, { data: m }] = await Promise.all([
      supabase.from('profiles').select('id, email, name, role, school_id').eq('school_id', profile.school_id).order('role'),
      supabase.from('school_materials').select('id, name, category, is_available').eq('school_id', profile.school_id).order('category'),
    ])
    setUsers(u || [])
    setMaterials(m || [])
    setLoading(false)
  }

  async function createUser() {
    if (!newEmail || !newName) return
    setCreating(true)
    setCreateMsg(null)
    try {
      // Call seed-style edge function to create user via admin API
      const session = (await supabase.auth.getSession()).data.session
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole, password: newPassword, school_id: profile.school_id }),
      })
      const data = await res.json()
      if (data.error) { setCreateMsg({ type: 'err', text: data.error }); return }
      setCreateMsg({ type: 'ok', text: `✅ ${newName} (${newRole}) created — they can sign in with ${newEmail}` })
      setNewEmail(''); setNewName('')
      loadAll()
    } catch (e: unknown) {
      setCreateMsg({ type: 'err', text: e instanceof Error ? e.message : 'Create failed' })
    } finally {
      setCreating(false)
    }
  }

  async function toggleMaterial(id: string, current: boolean) {
    await supabase.from('school_materials').update({ is_available: !current }).eq('id', id)
    setMaterials(m => m.map(mat => mat.id === id ? { ...mat, is_available: !current } : mat))
  }

  async function addMaterial() {
    if (!newMaterial.trim()) return
    setAddingMaterial(true)
    const { data } = await supabase.from('school_materials').insert({
      school_id: profile.school_id,
      name: newMaterial.trim(),
      category: newCategory,
      added_by: profile.id,
    }).select().single()
    if (data) setMaterials(m => [...m, data])
    setNewMaterial('')
    setAddingMaterial(false)
  }

  const inp: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 10, padding: '10px 13px', color: '#fff', fontSize: 14, outline: 'none', width: '100%',
  }

  const grouped = materials.reduce((acc: Record<string, Material[]>, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>⚙️</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Fredoka One',sans-serif" }}>Loading admin panel...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 18px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 26, color: '#8B5CF6', marginBottom: 4 }}>
          ⚙️ Admin Panel
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          Manage users, materials, and school settings for Dice Arts Academy.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {([['users', '👥 Users', '#8B5CF6'], ['materials', '🎨 Materials', '#FF9F1C']] as const).map(([key, label, color]) => (
          <button key={key} onClick={() => setTab(key as 'users' | 'materials')}
            style={{ background: tab === key ? color : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '9px 20px', color: tab === key ? (key === 'users' ? '#fff' : '#1E0B4E') : 'rgba(255,255,255,0.5)', fontFamily: "'Fredoka One',sans-serif", fontSize: 15, cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          {/* Add user form */}
          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 18, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'Fredoka One',sans-serif", color: '#a78bfa', fontSize: 18, marginBottom: 16 }}>Add Person to System</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 7 }}>Full Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Amara Osei" style={inp} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 7 }}>Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="amara@school.com" style={inp} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 7 }}>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={inp}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 7 }}>Starting Password</label>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp} />
              </div>
            </div>
            {createMsg && (
              <div style={{ background: createMsg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(255,80,80,0.1)', border: `1px solid ${createMsg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(255,80,80,0.3)'}`, borderRadius: 10, padding: '10px 14px', color: createMsg.type === 'ok' ? '#4ade80' : '#ff8080', fontSize: 13, marginBottom: 14 }}>
                {createMsg.text}
              </div>
            )}
            <button onClick={createUser} disabled={creating || !newEmail || !newName}
              style={{ background: creating || !newEmail || !newName ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg,#8B5CF6,#a78bfa)', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#fff', fontFamily: "'Fredoka One',sans-serif", fontSize: 16, cursor: creating ? 'wait' : 'pointer' }}>
              {creating ? '⏳ Creating account...' : '+ Add to System'}
            </button>
          </div>

          {/* Users list */}
          <div>
            <h3 style={{ fontFamily: "'Fredoka One',sans-serif", color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 14 }}>
              All Users ({users.length})
            </h3>
            {users.map(u => (
              <div key={u.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${ROLE_COLORS[u.role] || '#aaa'}22`, border: `1px solid ${ROLE_COLORS[u.role] || '#aaa'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {u.role === 'student' ? '🎯' : u.role === 'teacher' ? '✏️' : u.role === 'platform_admin' ? '⚙️' : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 15, color: '#fff' }}>{u.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{u.email}</div>
                </div>
                <span style={{ background: `${ROLE_COLORS[u.role] || '#aaa'}22`, border: `1px solid ${ROLE_COLORS[u.role] || '#aaa'}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: ROLE_COLORS[u.role] || '#aaa', fontWeight: 700 }}>
                  {u.role.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MATERIALS TAB ── */}
      {tab === 'materials' && (
        <>
          {/* Add material */}
          <div style={{ background: 'rgba(255,159,28,0.08)', border: '1px solid rgba(255,159,28,0.25)', borderRadius: 18, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'Fredoka One',sans-serif", color: '#FF9F1C', fontSize: 18, marginBottom: 14 }}>Add Material</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input value={newMaterial} onChange={e => setNewMaterial(e.target.value)}
                placeholder="e.g. Lino cutting tools" style={{ ...inp, flex: 2, minWidth: 180 }} />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inp, flex: 1, minWidth: 120 }}>
                {['general', 'drawing', 'painting', 'sculpture', 'printmaking', 'mixed_media', 'digital'].map(c =>
                  <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase())}</option>
                )}
              </select>
              <button onClick={addMaterial} disabled={addingMaterial || !newMaterial.trim()}
                style={{ background: '#FF9F1C', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#1E0B4E', fontFamily: "'Fredoka One',sans-serif", fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>
                {addingMaterial ? '⏳' : '+ Add'}
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 10 }}>
              Materials you add here become available in mission generation. Toggle availability to include/exclude from active sessions.
            </p>
          </div>

          {/* Materials by category */}
          {Object.entries(grouped).sort().map(([cat, mats]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <h4 style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                {cat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} ({mats.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {mats.map(m => (
                  <button key={m.id} onClick={() => toggleMaterial(m.id, m.is_available)}
                    title={m.is_available ? 'Click to mark unavailable' : 'Click to mark available'}
                    style={{ background: m.is_available ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${m.is_available ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '6px 14px', color: m.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}>
                    {m.is_available ? '✓' : '✗'} {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
