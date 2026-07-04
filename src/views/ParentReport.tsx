/**
 * ParentReport — weekly student summary.
 * Accessible from student profile (share link) or directly from PortfolioView.
 * No auth required when viewing a public report via share_slug.
 * Teachers/students can generate a new report from PortfolioView.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface ReportData {
  student: { name: string; role: string; age_band: string }
  week: { start: string; end: string }
  xp_this_week: number
  xp_total: number
  level: number
  missions_completed: number
  portfolio_entries: number
  domains: { domain: string; count: number }[]
  portfolio: { title: string; domain: string; description: string; image_url?: string }[]
  achievements: string[]
  school_name: string
}

const DOMAIN_LABELS: Record<string, string> = {
  drawing: 'Drawing', painting: 'Painting', mixed_media: 'Mixed Media',
  elements_of_art: 'Elements of Art', principles_of_design: 'Principles of Design',
  colour_theory: 'Colour Theory', art_history: 'Art History',
}
const DOMAIN_COLORS: Record<string, string> = {
  drawing: '#f9a8d4', painting: '#FF6B35', mixed_media: '#a78bfa',
  elements_of_art: '#1ECBE1', principles_of_design: '#4ade80',
  colour_theory: '#FFE135', art_history: '#fb923c',
}

function getWeekStart() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function getLevelFromXP(xp: number) { return Math.min(50, Math.floor(xp / 200) + 1) }

export default function ParentReport({ profile }: { profile: Profile }) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadReport() }, [profile])

  async function loadReport() {
    setLoading(true)
    const weekStart = getWeekStart()
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()))
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    const [{ data: xpAll }, { data: xpWeek }, { data: portfolio }, { data: school }] = await Promise.all([
      supabase.from('xp_ledger').select('xp_amount, source_type').eq('student_id', profile.id),
      supabase.from('xp_ledger').select('xp_amount').eq('student_id', profile.id).gte('created_at', weekStart),
      supabase.from('portfolio_entries').select('title, domain, description, image_url, created_at').eq('student_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('schools').select('name').eq('id', profile.school_id).single(),
    ])

    const totalXP = (xpAll || []).reduce((a: number, r: any) => a + r.xp_amount, 0)
    const weekXP  = (xpWeek  || []).reduce((a: number, r: any) => a + r.xp_amount, 0)

    // Domain breakdown from portfolio
    const domainCounts: Record<string, number> = {}
    for (const p of portfolio || []) {
      if (p.domain) domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1
    }

    // Achievements
    const achievements: string[] = []
    const lvl = getLevelFromXP(totalXP)
    if (lvl >= 5)  achievements.push('Reached Level 5 — Beginner Artist')
    if (lvl >= 10) achievements.push('Reached Level 10 — Developing Practitioner')
    if (lvl >= 20) achievements.push('Reached Level 20 — Advanced Creator')
    if ((portfolio || []).length >= 3) achievements.push('Portfolio of 3+ artworks created')
    if ((portfolio || []).length >= 10) achievements.push('Portfolio milestone: 10 artworks!')
    if (weekXP > 0) achievements.push(`Completed creative work this week (+${weekXP} XP)`)

    setReport({
      student: { name: profile.name, role: profile.role, age_band: profile.age_band || '—' },
      week: { start: weekStart, end: weekEndStr },
      xp_this_week: weekXP,
      xp_total: totalXP,
      level: lvl,
      missions_completed: (xpAll || []).length,
      portfolio_entries: (portfolio || []).length,
      domains: Object.entries(domainCounts).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count),
      portfolio: (portfolio || []).slice(0, 4),
      achievements,
      school_name: (school as any)?.name || 'Dice Arts Academy',
    })
    setLoading(false)

    // Check for existing share slug
    const { data: existing } = await supabase.from('parent_reports').select('share_slug').eq('student_id', profile.id).eq('week_start', weekStart).single()
    if (existing?.share_slug) setShareLink(`${window.location.origin}/report/${existing.share_slug}`)
  }

  async function generateShare() {
    setGenerating(true)
    const weekStart = getWeekStart()
    const { data } = await supabase.from('parent_reports')
      .upsert({ student_id: profile.id, school_id: profile.school_id, week_start: weekStart }, { onConflict: 'student_id,week_start' })
      .select('share_slug').single()
    if (data?.share_slug) {
      const link = `${window.location.origin}/report/${data.share_slug}`
      setShareLink(link)
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
    setGenerating(false)
  }

  function copyLink() {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.4)', fontFamily:"'Fredoka One',sans-serif", fontSize:18 }}>
        Preparing report…
      </div>
    )
  }
  if (!report) return null

  const progressPct = Math.min(100, ((report.xp_total % 200) / 200) * 100)

  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,rgba(255,159,28,0.12),rgba(255,107,53,0.08))', border:'1px solid rgba(255,159,28,0.2)', borderRadius:20, padding:'28px 28px 24px', marginBottom:20, animation:'fadeUp 0.4s ease' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,159,28,0.7)', marginBottom:8 }}>
              Weekly Creative Report · {report.school_name}
            </div>
            <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:28, color:'#fff', margin:0, marginBottom:4 }}>
              {report.student.name}
            </h1>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>
              Week of {new Date(report.week.start).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:36, color:'#FFE135', lineHeight:1 }}>
              Lv.{report.level}
            </div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:4 }}>{report.xp_total.toLocaleString()} XP total</div>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginTop:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
            <span>Level {report.level} progress</span>
            <span>{report.xp_total % 200}/200 XP to Level {report.level + 1}</span>
          </div>
          <div style={{ height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#FF9F1C,#FFE135)', borderRadius:4, transition:'width 1s ease' }}/>
          </div>
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20, animation:'fadeUp 0.4s 0.05s ease both' }}>
        {[
          { label:'XP This Week', value:`+${report.xp_this_week}`, color:'#FFE135' },
          { label:'Missions Done', value:report.missions_completed, color:'#4ade80' },
          { label:'Portfolio Pieces', value:report.portfolio_entries, color:'#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${color}25`, borderRadius:14, padding:'16px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:28, color, lineHeight:1, marginBottom:4 }}>{value}</div>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Domain breakdown */}
      {report.domains.length > 0 && (
        <Section title="Domains Explored" anim="0.1s">
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {report.domains.map(({ domain, count }) => {
              const color = DOMAIN_COLORS[domain] || '#fff'
              return (
                <div key={domain} style={{ background:`${color}14`, border:`1px solid ${color}35`, borderRadius:20, padding:'6px 14px', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}/>
                  <span style={{ fontSize:13, color, fontWeight:700 }}>{DOMAIN_LABELS[domain] || domain}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>×{count}</span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Achievements */}
      {report.achievements.length > 0 && (
        <Section title="This Week's Achievements" anim="0.15s">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {report.achievements.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,225,53,0.05)', border:'1px solid rgba(255,225,53,0.15)', borderRadius:10, padding:'10px 14px' }}>
                <span style={{ fontSize:18 }}>⭐</span>
                <span style={{ color:'rgba(255,255,255,0.75)', fontSize:14 }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent portfolio */}
      {report.portfolio.length > 0 && (
        <Section title="Recent Portfolio Work" anim="0.2s">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            {report.portfolio.map((p, i) => {
              const color = DOMAIN_COLORS[p.domain] || '#fff'
              return (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}25`, borderRadius:12, overflow:'hidden' }}>
                  {p.image_url && (
                    <div style={{ height:80, background:`${color}15`, backgroundImage:`url(${p.image_url})`, backgroundSize:'cover', backgroundPosition:'center' }}/>
                  )}
                  <div style={{ padding:'10px 12px' }}>
                    <div style={{ fontWeight:700, color:'#fff', fontSize:13, marginBottom:3 }}>{p.title}</div>
                    <div style={{ fontSize:11, color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{DOMAIN_LABELS[p.domain] || p.domain}</div>
                    {p.description && <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:4, lineHeight:1.5 }}>{p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Note to parent/guardian */}
      <Section title="A Note for Parents & Guardians" anim="0.25s">
        <div style={{ background:'rgba(30,203,225,0.05)', border:'1px solid rgba(30,203,225,0.15)', borderRadius:12, padding:'16px 18px' }}>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.75, margin:0 }}>
            This report summarises {report.student.name.split(' ')[0]}'s creative activity on PrimeLuck Creative OS at {report.school_name}.
            The platform uses AI-assisted mission generation to give students unique, tailored creative challenges
            that build real artistic skills across drawing, painting, colour theory, and more.
          </p>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, lineHeight:1.7, margin:'12px 0 0' }}>
            XP (experience points) is earned by completing missions and clan challenges. Level reflects cumulative
            creative practice — every 200 XP advances the student one level.
          </p>
        </div>
      </Section>

      {/* Share section */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px 22px', animation:'fadeUp 0.4s 0.3s ease both' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:12 }}>
          📬 Share with parents/guardians
        </div>
        {shareLink ? (
          <div style={{ display:'flex', gap:8 }}>
            <input readOnly value={shareLink} style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'rgba(255,255,255,0.6)', fontSize:12, outline:'none' }}/>
            <button onClick={copyLink} style={{ padding:'8px 16px', background: copied?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.08)', border:`1px solid ${copied?'rgba(74,222,128,0.35)':'rgba(255,255,255,0.15)'}`, color: copied?'#4ade80':'rgba(255,255,255,0.6)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <button onClick={generateShare} disabled={generating} style={{ padding:'10px 20px', background:'rgba(255,159,28,0.15)', border:'1px solid rgba(255,159,28,0.35)', color:'#FF9F1C', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            {generating ? 'Generating…' : '✦ Generate shareable link'}
          </button>
        )}
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:8 }}>
          The link can be viewed by anyone — no login required
        </div>
      </div>
    </div>
  )
}

function Section({ title, anim, children }: { title:string; anim:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:20, animation:`fadeUp 0.4s ${anim} ease both` }}>
      <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.3, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>{title}</div>
      {children}
    </div>
  )
}
