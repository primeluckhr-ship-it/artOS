/**
 * PublicReport — parent-facing weekly summary.
 * No auth required. Loaded at /report/:slug
 * Shows XP, level, missions, portfolio sample, domains, achievements.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DOMAIN_LABELS: Record<string, string> = {
  drawing:'Drawing', painting:'Painting', mixed_media:'Mixed Media',
  elements_of_art:'Elements of Art', principles_of_design:'Principles of Design',
  colour_theory:'Colour Theory', art_history:'Art History',
}
const DOMAIN_COLORS: Record<string, string> = {
  drawing:'#f9a8d4', painting:'#FF6B35', mixed_media:'#a78bfa',
  elements_of_art:'#1ECBE1', principles_of_design:'#4ade80',
  colour_theory:'#FFE135', art_history:'#fb923c',
}
const TIER_NAMES = ['Foundation','Beginner','Intermediate','Advanced','Expert']
const TIER_COLORS = ['#67e8f9','#86efac','#fde68a','#ff9f1c','#c084fc']

function levelFromXP(xp: number) { return Math.min(50, Math.floor(xp / 200) + 1) }
function tierFromLevel(l: number) { return Math.min(4, Math.floor((l - 1) / 10)) }

export default function PublicReport({ slug }: { slug: string }) {
  const [state, setState] = useState<'loading'|'found'|'notfound'>('loading')
  const [report, setReport] = useState<any>(null)

  useEffect(() => { load() }, [slug])

  async function load() {
    // 1. Get report row
    const { data: row } = await supabase
      .from('parent_reports')
      .select('student_id, school_id, week_start')
      .eq('share_slug', slug)
      .eq('is_public', true)
      .single()

    if (!row) { setState('notfound'); return }

    // 2. Parallel data fetch
    const [{ data: profile }, { data: xpAll }, { data: xpWeek }, { data: portfolio }, { data: school }] = await Promise.all([
      supabase.from('profiles').select('name, age_band').eq('id', row.student_id).single(),
      supabase.from('xp_ledger').select('xp_amount').eq('student_id', row.student_id),
      supabase.from('xp_ledger').select('xp_amount').eq('student_id', row.student_id).gte('created_at', row.week_start),
      supabase.from('portfolio_entries').select('title, domain, description, image_url, share_slug').eq('student_id', row.student_id).eq('is_public', true).order('created_at', { ascending: false }).limit(4),
      supabase.from('schools').select('name').eq('id', row.school_id).single(),
    ])

    const totalXP = (xpAll  || []).reduce((a:number, r:any) => a + r.xp_amount, 0)
    const weekXP  = (xpWeek || []).reduce((a:number, r:any) => a + r.xp_amount, 0)
    const level   = levelFromXP(totalXP)
    const tier    = tierFromLevel(level)

    const domainCounts: Record<string,number> = {}
    for (const p of portfolio || []) if (p.domain) domainCounts[p.domain] = (domainCounts[p.domain]||0)+1

    const achievements: string[] = []
    if (weekXP > 0) achievements.push(`Active this week (+${weekXP} XP earned)`)
    if (level >= 5)  achievements.push('Reached Level 5 — Beginner Artist')
    if (level >= 10) achievements.push('Reached Level 10 — Developing Practitioner')
    if (level >= 20) achievements.push('Reached Level 20 — Advanced Creator')
    if ((portfolio||[]).length >= 3)  achievements.push('Portfolio of 3+ artworks')
    if ((portfolio||[]).length >= 10) achievements.push('Portfolio milestone: 10 artworks')

    setReport({
      name:      (profile as any)?.name || 'Student',
      school:    (school  as any)?.name || 'Dice Arts Academy',
      weekStart: row.week_start,
      totalXP, weekXP, level, tier,
      missions:  (xpAll||[]).length,
      portfolio: portfolio || [],
      domainCounts,
      achievements,
      progressPct: Math.round(((totalXP % 200) / 200) * 100),
    })
    setState('found')
  }

  /* ── Loading ───────────────────────────────────────────────────── */
  if (state === 'loading') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation:'spin 1.2s ease-in-out infinite', marginBottom:16 }}>
            <path d="M10 38 Q14 34 20 28 L36 12 Q39 9 41 11 Q43 13 40 16 L24 32 Q18 38 14 42Z" fill="#FF9F1C" opacity="0.9"/>
            <circle cx="11" cy="39" r="4" fill="#FF9F1C" opacity="0.5"/>
          </svg>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'Fredoka One',sans-serif", fontSize:18 }}>Loading report…</p>
        </div>
      </div>
    )
  }

  /* ── Not found ─────────────────────────────────────────────────── */
  if (state === 'notfound' || !report) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ textAlign:'center', maxWidth:400 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🔍</div>
          <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:24, color:'#fff', marginBottom:12 }}>Report not found</h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:15, lineHeight:1.7 }}>
            This link may have expired or the report may not be public. Ask the teacher to resend the link.
          </p>
        </div>
      </div>
    )
  }

  const { name, school, weekStart, totalXP, weekXP, level, tier, missions, portfolio, domainCounts, achievements, progressPct } = report
  const tierColor = TIER_COLORS[tier]
  const firstName = name.split(' ')[0]
  const weekDate  = new Date(weekStart).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })

  /* ── Report ────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1E0B4E,#0D1020)', padding:'0 0 60px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Inter:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Topbar */}
      <div style={{ background:'rgba(13,8,32,0.9)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:15, color:'#fff' }}>P</div>
          <div>
            <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:13, color:'#FF6B35', lineHeight:1.1 }}>PrimeLuck Creative OS</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{school}</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Weekly Student Report</div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 20px', fontFamily:"'Inter',sans-serif" }}>

        {/* Hero card */}
        <div style={{ background:'linear-gradient(135deg,rgba(255,159,28,0.14),rgba(255,107,53,0.08))', border:'1px solid rgba(255,159,28,0.22)', borderRadius:22, padding:'28px 28px 22px', marginBottom:20, animation:'fadeUp 0.4s ease', position:'relative', overflow:'hidden' }}>
          <svg style={{ position:'absolute', right:-20, top:-20, opacity:0.06, pointerEvents:'none' }} width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="#FF9F1C"/></svg>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,159,28,0.7)', marginBottom:10 }}>
              Weekly Report · {weekDate}
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
              <div>
                <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:32, color:'#fff', margin:0, lineHeight:1 }}>{name}</h1>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginTop:6 }}>{school}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:40, color:tierColor, lineHeight:1 }}>Lv.{level}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 }}>{TIER_NAMES[tier]}</div>
              </div>
            </div>

            {/* XP bar */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                <span>Level {level} progress</span>
                <span>{totalXP % 200}/200 XP to Level {level+1}</span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#FF9F1C,#FFE135)', borderRadius:4 }}/>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20, animation:'fadeUp 0.4s 0.05s ease both' }}>
          {[
            { label:'XP This Week', value:`+${weekXP}`,   color:'#FFE135' },
            { label:'Missions Done',  value:missions,      color:'#4ade80' },
            { label:'Portfolio Pieces',value:(portfolio||[]).length, color:'#a78bfa' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${color}25`, borderRadius:14, padding:'14px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:28, color, lineHeight:1, marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Domains explored */}
        {Object.keys(domainCounts).length > 0 && (
          <div style={{ marginBottom:20, animation:'fadeUp 0.4s 0.1s ease both' }}>
            <SectionLabel>Domains Explored</SectionLabel>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(domainCounts).sort((a,b) => b[1]-a[1]).map(([domain, count]) => {
                const color = DOMAIN_COLORS[domain] || '#fff'
                return (
                  <div key={domain} style={{ background:`${color}14`, border:`1px solid ${color}35`, borderRadius:20, padding:'6px 14px', display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }}/>
                    <span style={{ fontSize:13, color, fontWeight:700 }}>{DOMAIN_LABELS[domain] || domain}</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>×{count as number}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div style={{ marginBottom:20, animation:'fadeUp 0.4s 0.15s ease both' }}>
            <SectionLabel>Achievements</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {achievements.map((a, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,225,53,0.05)', border:'1px solid rgba(255,225,53,0.15)', borderRadius:10, padding:'9px 14px' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>⭐</span>
                  <span style={{ color:'rgba(255,255,255,0.75)', fontSize:13 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio sample */}
        {portfolio.length > 0 && (
          <div style={{ marginBottom:20, animation:'fadeUp 0.4s 0.2s ease both' }}>
            <SectionLabel>Recent Portfolio Work</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {portfolio.map((p:any, i:number) => {
                const color = DOMAIN_COLORS[p.domain] || '#fff'
                return (
                  <a key={i} href={p.share_slug ? `/p/${p.share_slug}` : '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', display:'block', background:'rgba(255,255,255,0.03)', border:`1px solid ${color}22`, borderRadius:12, overflow:'hidden', transition:'transform 0.15s', cursor:'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                    {p.image_url && (
                      <div style={{ height:80, background:`${color}15`, backgroundImage:`url(${p.image_url})`, backgroundSize:'cover', backgroundPosition:'center' }}/>
                    )}
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontWeight:700, color:'#fff', fontSize:13, marginBottom:2 }}>{p.title}</div>
                      <div style={{ fontSize:10, color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{DOMAIN_LABELS[p.domain]||p.domain}</div>
                      {p.description && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4, lineHeight:1.5 }}>{p.description.slice(0,70)}{p.description.length>70?'…':''}</div>}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Parent note */}
        <div style={{ background:'rgba(30,203,225,0.05)', border:'1px solid rgba(30,203,225,0.15)', borderRadius:14, padding:'18px 20px', marginBottom:20, animation:'fadeUp 0.4s 0.25s ease both' }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:'rgba(30,203,225,0.6)', marginBottom:10 }}>About this report</div>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.8, margin:'0 0 10px' }}>
            This is {firstName}'s weekly creative activity summary from <strong style={{ color:'#fff' }}>PrimeLuck Creative OS</strong> at {school}. The platform gives students AI-generated art missions tailored to their classroom materials, with XP and levels tracking their growth over time.
          </p>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, lineHeight:1.7, margin:0 }}>
            Each mission takes 30–60 minutes and is grounded in real art education. Levels reflect cumulative practice — 200 XP per level, max Level 50. Portfolio entries above link to {firstName}'s public artwork pages.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', animation:'fadeUp 0.4s 0.3s ease both' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginBottom:8 }}>Questions? Contact {school}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#FF9F1C)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',sans-serif", fontSize:10, color:'#fff' }}>P</div>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>PrimeLuck Creative OS · art-os-nu.vercel.app</span>
          </div>
        </div>

      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>{children}</div>
  )
}
