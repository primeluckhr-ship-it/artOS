/**
 * PublicPortfolio — no auth required, renders at /p/:slug
 * This is what gets shared externally. Must look polished.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Entry {
  id: string; title: string; description: string; domain: string
  mission_title: string; image_url: string; created_at: string
  student_id: string
}
interface StudentInfo { name: string; hint_credits: number }

const DOMAIN_META: Record<string, { label: string; color: string }> = {
  elements_of_art:      { label: 'Elements of Art',      color: '#1ECBE1' },
  principles_of_design: { label: 'Principles of Design', color: '#4ade80' },
  drawing:              { label: 'Drawing',               color: '#f9a8d4' },
  painting:             { label: 'Painting',              color: '#FF6B35' },
  colour_theory:        { label: 'Colour Theory',         color: '#FFE135' },
  mixed_media:          { label: 'Mixed Media',           color: '#a78bfa' },
  art_history:          { label: 'Art History',           color: '#fb923c' },
}

export default function PublicPortfolio({ slug }: { slug: string }) {
  const [entry, setEntry]   = useState<Entry | null>(null)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [xp, setXp]         = useState(0)
  const [rank, setRank]     = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [slug])

  async function load() {
    const { data: row } = await supabase
      .from('portfolio_entries')
      .select('*')
      .eq('share_slug', slug)
      .eq('is_public', true)
      .single()

    if (!row) { setNotFound(true); setLoading(false); return }
    setEntry(row)

    // Load student info
    const [{ data: prof }, { data: xpRow }] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', row.student_id).single(),
      supabase.from('xp_ledger').select('xp_amount').eq('student_id', row.student_id),
    ])
    if (prof) setStudent({ name: prof.name, hint_credits: 0 })

    const totalXp = (xpRow || []).reduce((s: number, r: any) => s + r.xp_amount, 0)
    setXp(totalXp)

    const { data: rankRow } = await supabase.from('ranks')
      .select('title').lte('xp_threshold', totalXp).order('xp_threshold', { ascending: false }).limit(1)
    if (rankRow?.[0]) setRank(rankRow[0].title)

    setLoading(false)
  }

  const dm = entry ? DOMAIN_META[entry.domain] || { label: entry.domain, color: '#FF6B35' } : null
  const firstName = student?.name?.split(' ')[0] || 'Artist'

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#1E0B4E,#0D1020)' }}>
      <div style={{ textAlign:'center' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation:'spin 1.2s ease-in-out infinite', marginBottom:16 }}>
          <path d="M10 38 Q14 34 20 28 L36 12 Q39 9 41 11 Q43 13 40 16 L24 32 Q18 38 14 42Z" fill="#FF6B35" opacity="0.9"/>
          <circle cx="11" cy="39" r="4" fill="#FF6B35" opacity="0.5"/>
        </svg>
        <p style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'Fredoka One',sans-serif" }}>Loading...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', flexDirection:'column', gap:16, padding:24 }}>
      <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:64, color:'rgba(255,255,255,0.2)' }}>404</div>
      <p style={{ color:'rgba(255,255,255,0.4)', textAlign:'center' }}>This portfolio entry doesn't exist or has been made private.</p>
      <a href="/" style={{ color:'#FF6B35', fontSize:14, fontWeight:700 }}>← Back to PrimeLuck Creative OS</a>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Ambient paint splashes */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <svg style={{ position:'absolute', top:-60, right:-60, opacity:0.07 }} width="400" height="400" viewBox="0 0 400 400">
          <path d="M200 40 Q320 30 360 140 Q400 250 340 340 Q280 430 160 400 Q40 370 30 260 Q20 150 100 80 Q140 40 200 40Z" fill={dm?.color || '#FF6B35'}/>
        </svg>
        <svg style={{ position:'absolute', bottom:-40, left:-40, opacity:0.06 }} width="350" height="350" viewBox="0 0 350 350">
          <path d="M175 30 Q280 20 320 120 Q360 220 300 300 Q240 380 140 360 Q40 340 20 240 Q0 140 70 70 Q110 30 175 30Z" fill="#1ECBE1"/>
        </svg>
      </div>

      {/* Nav bar */}
      <nav style={{ padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:10, background:'rgba(13,8,32,0.9)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/primeluck-logo.jpg" alt="PrimeLuck" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,107,53,0.5)' }} onError={e=>(e.currentTarget.style.display='none')}/>
          <span style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:15, color:'#FF6B35' }}>PrimeLuck Creative OS</span>
        </div>
        <a href="/" style={{ background:'rgba(255,107,53,0.15)', border:'1px solid rgba(255,107,53,0.4)', color:'#FF6B35', borderRadius:10, padding:'7px 16px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
          Open Studio →
        </a>
      </nav>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* Artist + domain info */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32, animation:'fadeUp 0.5s ease' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${dm?.color}40,${dm?.color}20)`, border:`2px solid ${dm?.color}60`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:20, color:dm?.color }}>
            {firstName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'#fff' }}>{firstName}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
              {rank && <span style={{ color:dm?.color, fontWeight:700, marginRight:8 }}>{rank}</span>}
              {xp > 0 && <span>{xp} XP</span>}
            </div>
          </div>
          {dm && (
            <div style={{ marginLeft:'auto', background:`${dm.color}18`, border:`1px solid ${dm.color}40`, borderRadius:20, padding:'6px 14px', fontSize:12, color:dm.color, fontWeight:700 }}>
              {dm.label}
            </div>
          )}
        </div>

        {/* Main artwork */}
        <div style={{ borderRadius:24, overflow:'hidden', marginBottom:28, animation:'fadeUp 0.6s ease', boxShadow:`0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px ${dm?.color}20` }}>
          {entry?.image_url ? (
            <div style={{ position:'relative' }}>
              <img src={entry.image_url} alt={entry.title}
                style={{ width:'100%', display:'block', maxHeight:520, objectFit:'cover' }}
                onError={e=>(e.currentTarget.style.display='none')}/>
              {/* Domain colour left bar */}
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:6, background:`linear-gradient(180deg,${dm?.color},${dm?.color}44)` }}/>
            </div>
          ) : (
            <div style={{ height:300, background:`linear-gradient(135deg,${dm?.color}18,rgba(255,255,255,0.02))`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:6, background:dm?.color }}/>
              <svg width="80" height="80" viewBox="0 0 80 80" opacity="0.2">
                <rect x="8" y="8" width="64" height="64" rx="6" stroke={dm?.color} strokeWidth="2" fill="none"/>
                <path d="M18 54 Q28 40 40 46 Q52 52 62 36" stroke={dm?.color} strokeWidth="2.5" fill="none"/>
                <circle cx="30" cy="28" r="7" fill={dm?.color} opacity="0.5"/>
              </svg>
            </div>
          )}
        </div>

        {/* Title block */}
        <div style={{ marginBottom:24, animation:'fadeUp 0.7s ease' }}>
          <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:32, color:'#fff', margin:'0 0 8px', lineHeight:1.2 }}>
            {entry?.title}
          </h1>
          {entry?.mission_title && (
            <div style={{ fontSize:14, color:dm?.color, fontWeight:700, marginBottom:12 }}>
              {entry.mission_title}
            </div>
          )}
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>
            {entry && new Date(entry.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>

        {/* Reflection */}
        {entry?.description && (
          <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${dm?.color}20`, borderRadius:16, padding:'20px 24px', marginBottom:32, animation:'fadeUp 0.8s ease' }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:dm?.color, marginBottom:12 }}>Artist's reflection</div>
            <p style={{ color:'rgba(255,255,255,0.75)', fontSize:16, lineHeight:1.8, margin:0, fontStyle:'italic' }}>
              "{entry.description}"
            </p>
          </div>
        )}

        {/* Paint stroke divider */}
        <svg width="100%" height="12" viewBox="0 0 600 12" preserveAspectRatio="none" style={{ marginBottom:32, opacity:0.15 }}>
          <path d="M0 6 Q150 2 300 6 Q450 10 600 6" stroke={dm?.color || '#FF6B35'} strokeWidth="3" fill="none" strokeLinecap="round"/>
        </svg>

        {/* CTA */}
        <div style={{ textAlign:'center', animation:'fadeUp 0.9s ease' }}>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:20 }}>
            Created with PrimeLuck Creative OS — an AI-powered visual arts education platform.
          </p>
          <a href="/" style={{
            display:'inline-block', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)',
            border:'none', borderRadius:14, color:'#fff', fontSize:16,
            fontFamily:"'Fredoka One',sans-serif", padding:'14px 36px', textDecoration:'none',
            boxShadow:'0 8px 32px rgba(255,107,53,0.4)',
          }}>
            Build your portfolio →
          </a>
        </div>
      </div>
    </div>
  )
}
