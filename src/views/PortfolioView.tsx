import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Entry {
  id: string; student_id: string; title: string; description: string
  domain: string; mission_title: string; image_url: string
  share_slug: string; is_public: boolean; created_at: string; likes: number
}

const DOMAIN_COLORS: Record<string, string> = {
  elements_of_art: '#1ECBE1', principles_of_design: '#4ade80',
  drawing: '#f9a8d4', painting: '#FF6B35',
  colour_theory: '#FFE135', mixed_media: '#a78bfa', art_history: '#fb923c',
}
const DOMAIN_LABELS: Record<string, string> = {
  elements_of_art: 'Elements', principles_of_design: 'Design Principles',
  drawing: 'Drawing', painting: 'Painting',
  colour_theory: 'Colour Theory', mixed_media: 'Mixed Media', art_history: 'Art History',
}

export default function PortfolioView({ profile }: { profile: Profile }) {
  const [entries, setEntries]       = useState<Entry[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [copied, setCopied]         = useState<string | null>(null)
  const [selected, setSelected]     = useState<Entry | null>(null)
  const [form, setForm]             = useState({
    title: '', description: '', domain: 'drawing',
    mission_title: '', image_url: '', is_public: true,
  })

  const SHARE_BASE = 'https://art-os-nu.vercel.app/p/'

  useEffect(() => { load() }, [profile])

  async function load() {
    const { data } = await supabase
      .from('portfolio_entries')
      .select('*')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  async function addEntry() {
    if (!form.title.trim()) return
    const { error } = await supabase.from('portfolio_entries').insert({
      student_id: profile.id,
      ...form,
    })
    if (!error) { setShowAdd(false); setForm({ title:'', description:'', domain:'drawing', mission_title:'', image_url:'', is_public:true }); load() }
  }

  async function togglePublic(entry: Entry) {
    await supabase.from('portfolio_entries').update({ is_public: !entry.is_public }).eq('id', entry.id)
    load()
  }

  async function deleteEntry(id: string) {
    await supabase.from('portfolio_entries').delete().eq('id', id)
    setSelected(null); load()
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(SHARE_BASE + slug)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2500)
  }

  const publicCount = entries.filter(e => e.is_public).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <svg style={{ position:'absolute', bottom:-4, left:0, width:'100%' }} height="8" viewBox="0 0 160 8" preserveAspectRatio="none">
              <path d="M0 6 Q40 2 80 5 Q120 8 160 4" stroke="#a78bfa" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
            <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:34, color:'#fff', margin:0, position:'relative' }}>
              My Portfolio
            </h1>
          </div>
          <p style={{ color:'rgba(255,255,255,0.4)', margin:'12px 0 0', fontSize:14 }}>
            {entries.length} work{entries.length!==1?'s':''} · {publicCount} public
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          background:'linear-gradient(135deg,#a78bfa,#8B5CF6)', border:'none', borderRadius:14,
          color:'#fff', fontSize:15, fontFamily:"'Fredoka One',sans-serif", padding:'12px 24px',
          cursor:'pointer', boxShadow:'0 8px 24px rgba(139,92,246,0.35)',
        }}>
          + Add Work
        </button>
      </div>

      {/* Portfolio grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)', fontFamily:"'Fredoka One',sans-serif", fontSize:18 }}>Loading portfolio...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px' }}>
          {/* Empty state illustration */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ marginBottom:20, opacity:0.3 }}>
            <rect x="15" y="20" width="90" height="80" rx="8" stroke="#a78bfa" strokeWidth="2" fill="none"/>
            <rect x="25" y="30" width="70" height="50" rx="4" stroke="#a78bfa" strokeWidth="1.5" fill="none" opacity="0.5"/>
            <path d="M35 65 Q50 50 60 58 Q70 66 85 52" stroke="#a78bfa" strokeWidth="2" fill="none"/>
            <circle cx="45" cy="45" r="5" fill="#a78bfa" opacity="0.5"/>
          </svg>
          <p style={{ color:'rgba(255,255,255,0.3)', fontFamily:"'Fredoka One',sans-serif", fontSize:20, margin:'0 0 8px' }}>
            Your portfolio is empty
          </p>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:14, margin:'0 0 24px' }}>
            Complete missions and add your work here to build your creative record.
          </p>
          <button onClick={() => setShowAdd(true)} style={{ background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.4)', color:'#a78bfa', borderRadius:12, padding:'10px 24px', cursor:'pointer', fontSize:14, fontWeight:700 }}>
            Add your first work
          </button>
        </div>
      ) : (
        <div style={{ columns:'3 280px', gap:16 }}>
          {entries.map(entry => {
            const dc = DOMAIN_COLORS[entry.domain] || '#fff'
            return (
              <div key={entry.id} onClick={() => setSelected(entry)} style={{
                breakInside:'avoid', marginBottom:16, background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, overflow:'hidden',
                cursor:'pointer', transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.border=`1px solid ${dc}50`; e.currentTarget.style.transform='translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.border='1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.transform='' }}
              >
                {/* Artwork image */}
                {entry.image_url ? (
                  <div style={{ position:'relative', overflow:'hidden' }}>
                    <img src={entry.image_url} alt={entry.title}
                      style={{ width:'100%', display:'block', objectFit:'cover', maxHeight:280, minHeight:140 }}
                      onError={e => (e.currentTarget.style.display='none')}/>
                    {/* Domain colour bar */}
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:dc }} />
                    {/* Public badge */}
                    <div style={{ position:'absolute', top:10, right:10, background: entry.is_public?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.08)', border:`1px solid ${entry.is_public?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700, color: entry.is_public?'#4ade80':'rgba(255,255,255,0.3)', backdropFilter:'blur(4px)' }}>
                      {entry.is_public ? '⬤ Public' : '⬤ Private'}
                    </div>
                  </div>
                ) : (
                  <div style={{ height:100, background:`linear-gradient(135deg,${dc}18,rgba(255,255,255,0.02))`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    <div style={{ left:0, top:0, bottom:0, width:4, background:dc, position:'absolute' }} />
                    <svg width="48" height="48" viewBox="0 0 48 48" opacity="0.3">
                      <rect x="6" y="6" width="36" height="36" rx="4" stroke={dc} strokeWidth="2" fill="none"/>
                      <path d="M12 32 Q18 24 24 28 Q30 32 36 22" stroke={dc} strokeWidth="2" fill="none"/>
                      <circle cx="18" cy="18" r="4" fill={dc} opacity="0.5"/>
                    </svg>
                    {entry.is_public && (
                      <div style={{ position:'absolute', top:8, right:8, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700, color:'#4ade80' }}>⬤ Public</div>
                    )}
                  </div>
                )}

                <div style={{ padding:'12px 14px 14px' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:4, lineHeight:1.3 }}>{entry.title}</div>
                  {entry.mission_title && (
                    <div style={{ fontSize:11, color:dc, fontWeight:600, marginBottom:6 }}>{entry.mission_title}</div>
                  )}
                  {entry.description && (
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, lineHeight:1.5, margin:'0 0 10px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {entry.description}
                    </p>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
                      {new Date(entry.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    </span>
                    {entry.is_public && (
                      <button onClick={e => { e.stopPropagation(); copyLink(entry.share_slug) }} style={{
                        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                        color: copied===entry.share_slug ? '#4ade80' : 'rgba(255,255,255,0.4)',
                        borderRadius:8, padding:'3px 10px', cursor:'pointer', fontSize:11, fontWeight:700,
                      }}>
                        {copied===entry.share_slug ? '✓ Copied!' : '⬡ Share'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add entry modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add to Portfolio">
          <Field label="Title">
            <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
              placeholder="e.g. Light Study — Wet on Wet" style={inp}/>
          </Field>
          <Field label="Domain">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.entries(DOMAIN_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => setForm(p=>({...p,domain:k}))} style={{
                  background: form.domain===k ? DOMAIN_COLORS[k]+'25' : 'rgba(255,255,255,0.04)',
                  border:`1px solid ${form.domain===k ? DOMAIN_COLORS[k] : 'rgba(255,255,255,0.08)'}`,
                  color: form.domain===k ? DOMAIN_COLORS[k] : 'rgba(255,255,255,0.4)',
                  borderRadius:20, padding:'4px 12px', cursor:'pointer', fontSize:11, fontWeight:700,
                }}>{v}</button>
              ))}
            </div>
          </Field>
          <Field label="Mission / Project (optional)">
            <input value={form.mission_title} onChange={e=>setForm(p=>({...p,mission_title:e.target.value}))}
              placeholder="Which mission was this for?" style={inp}/>
          </Field>
          <Field label="Image URL (paste link to your photo)">
            <input value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))}
              placeholder="https://..." style={inp}/>
            {form.image_url && (
              <img src={form.image_url} alt="preview" style={{ width:'100%', borderRadius:10, objectFit:'cover', maxHeight:160, marginTop:8 }}
                onError={e=>(e.currentTarget.style.display='none')}/>
            )}
          </Field>
          <Field label="Reflection (optional)">
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
              placeholder="What did you make? What did you learn? What surprised you?" rows={3} style={{...inp,resize:'vertical'}}/>
          </Field>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <button onClick={() => setForm(p=>({...p,is_public:!p.is_public}))} style={{
              background: form.is_public ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
              border:`1px solid ${form.is_public?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`,
              color: form.is_public ? '#4ade80' : 'rgba(255,255,255,0.4)',
              borderRadius:20, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700,
            }}>
              {form.is_public ? '⬤ Public' : '⬤ Private'}
            </button>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>
              {form.is_public ? 'Anyone with the link can view this work' : 'Only you can see this'}
            </span>
          </div>
          <button onClick={addEntry} style={{ width:'100%', padding:'13px 0', background:'linear-gradient(135deg,#a78bfa,#8B5CF6)', border:'none', borderRadius:12, color:'#fff', fontSize:15, fontFamily:"'Fredoka One',sans-serif", cursor:'pointer' }}>
            Add to Portfolio
          </button>
        </Modal>
      )}

      {/* Entry detail modal */}
      {selected && (() => {
        const dc = DOMAIN_COLORS[selected.domain] || '#fff'
        return (
          <Modal onClose={() => setSelected(null)} title="">
            {selected.image_url && (
              <img src={selected.image_url} alt={selected.title}
                style={{ width:'100%', borderRadius:12, objectFit:'cover', maxHeight:260, marginBottom:18, display:'block' }}
                onError={e=>(e.currentTarget.style.display='none')}/>
            )}
            <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:22, color:'#fff', margin:'0 0 6px' }}>{selected.title}</h2>
            {selected.mission_title && <div style={{ fontSize:13, color:dc, fontWeight:700, marginBottom:12 }}>{selected.mission_title}</div>}
            {selected.description && <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, lineHeight:1.7, margin:'0 0 20px' }}>{selected.description}</p>}

            {/* Share section */}
            {selected.is_public ? (
              <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#4ade80', marginBottom:8 }}>Public link</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <code style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {SHARE_BASE}{selected.share_slug}
                  </code>
                  <button onClick={() => copyLink(selected.share_slug)} style={{ background: copied===selected.share_slug?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.08)', border:`1px solid ${copied===selected.share_slug?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`, color: copied===selected.share_slug?'#4ade80':'rgba(255,255,255,0.6)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
                    {copied===selected.share_slug ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>This work is private. Make it public to get a shareable link.</span>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => togglePublic(selected)} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:10, padding:'10px 0', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                {selected.is_public ? 'Make Private' : 'Make Public'}
              </button>
              <button onClick={() => deleteEntry(selected.id)} style={{ background:'rgba(255,59,59,0.1)', border:'1px solid rgba(255,59,59,0.25)', color:'rgba(255,100,100,0.8)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                Delete
              </button>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

function Modal({ onClose, title, children }: { onClose:()=>void; title:string; children:React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(145deg,#1a1040,#0d1020)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16 }}>×</button>
        {title && <h3 style={{ fontFamily:"'Fredoka One',sans-serif", color:'#fff', margin:'0 0 20px', fontSize:20 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.35)', marginBottom:6 }}>{label}</div>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:10, padding:'9px 14px', fontSize:14, outline:'none', boxSizing:'border-box' }
