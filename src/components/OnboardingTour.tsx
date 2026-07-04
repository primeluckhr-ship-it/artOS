/**
 * OnboardingTour — first-login guided overlay.
 * Shows 4 steps for teachers, 4 for students.
 * Dismissed permanently by writing onboarding_done=true to profiles.
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Step {
  icon: React.ReactNode
  heading: string
  body: string
  cta: string
  color: string
  navHint?: string
}

const STUDENT_STEPS: Step[] = [
  {
    color: '#1ECBE1',
    icon: <MissionSVG />,
    heading: 'Pick a mission',
    body: 'Tap Mission in the nav. Choose a domain and difficulty level, then generate a unique creative challenge — built around what your classroom actually has available.',
    cta: 'Got it',
    navHint: 'Mission tab',
  },
  {
    color: '#FFE135',
    icon: <HintSVG />,
    heading: 'Use your hint credits',
    body: "You start with 5 hint credits 💡. When you're stuck, tap a locked slot to reveal a technique clue with a visual reference. Spend wisely.",
    cta: 'Got it',
    navHint: 'Inside any active mission',
  },
  {
    color: '#f472b6',
    icon: <ClanSVG />,
    heading: 'Join a clan',
    body: 'Clans are creative tribes. Join one, share your work, react to what others make, and take on clan challenges set by your teacher.',
    cta: 'Got it',
    navHint: 'Clans tab',
  },
  {
    color: '#a78bfa',
    icon: <PortfolioSVG />,
    heading: 'Build your portfolio',
    body: "Every piece you make can go here. Toggle it public to get a shareable link — send it to anyone, no login needed. This is your creative record.",
    cta: "Let's go →",
    navHint: 'Portfolio tab',
  },
]

const TEACHER_STEPS: Step[] = [
  {
    color: '#FF9F1C',
    icon: <MissionSVG />,
    heading: 'Generate missions',
    body: 'Open the Create tab. Pick a domain and difficulty — the AI generates a mission using only the materials available in your classroom. Regenerate until it fits your session.',
    cta: 'Got it',
    navHint: 'Create tab',
  },
  {
    color: '#4ade80',
    icon: <ClassSVG />,
    heading: 'Watch your class',
    body: 'The Class tab shows every student, their XP, rank, and mission count — live. It auto-refreshes every 30 seconds during a session.',
    cta: 'Got it',
    navHint: 'Class tab',
  },
  {
    color: '#FFE135',
    icon: <ClanSVG />,
    heading: 'Launch a clan challenge',
    body: 'In the Clans tab, open a clan and tap ⚡ New Challenge. Set a title, domain, deadline, and XP reward. Students see it immediately and can submit work.',
    cta: 'Got it',
    navHint: 'Clans tab',
  },
  {
    color: '#1ECBE1',
    icon: <LessonSVG />,
    heading: 'Explore the curriculum',
    body: '50 lessons across 7 domains, Foundation to Expert. Each has objectives, a detailed activity, materials, and reflection prompts. Use AI to rewrite any activity.',
    cta: "Let's teach →",
    navHint: 'Lessons tab',
  },
]

export default function OnboardingTour({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const isTeacher = profile.role !== 'student'
  const steps = isTeacher ? TEACHER_STEPS : STUDENT_STEPS
  const current = steps[step]
  const isLast = step === steps.length - 1

  async function advance() {
    if (isLast) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', profile.id)
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  async function skip() {
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', profile.id)
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(8px)',
    }}>
      <style>{`
        @keyframes tourPop { 0%{opacity:0;transform:scale(0.92) translateY(12px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes tourFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{
        background: 'linear-gradient(145deg,#1a1040,#0d1020)',
        border: `1px solid ${current.color}40`,
        borderRadius: 24, padding: '36px 32px 28px', maxWidth: 440, width: '100%',
        boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px ${current.color}20`,
        animation: 'tourPop 0.35s cubic-bezier(.4,0,.2,1)',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Background blob */}
        <svg style={{ position:'absolute', right:-40, top:-40, opacity:0.06, pointerEvents:'none' }} width="200" height="200" viewBox="0 0 200 200">
          <path d="M100 20 Q160 15 175 75 Q190 135 145 165 Q100 195 55 165 Q10 135 25 75 Q40 15 100 20Z" fill={current.color}/>
        </svg>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:28 }}>
          {steps.map((_,i) => (
            <div key={i} style={{ width: i===step?20:6, height:6, borderRadius:3, background: i<=step?current.color:'rgba(255,255,255,0.12)', transition:'all 0.3s' }}/>
          ))}
        </div>

        {/* Icon */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:24, animation:'tourFloat 3s ease-in-out infinite' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:`${current.color}18`, border:`2px solid ${current.color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {current.icon}
          </div>
        </div>

        {/* Content */}
        <h2 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:24, color:'#fff', margin:'0 0 12px', textAlign:'center' }}>
          {current.heading}
        </h2>
        <p style={{ color:'rgba(255,255,255,0.65)', fontSize:15, lineHeight:1.75, margin:'0 0 20px', textAlign:'center' }}>
          {current.body}
        </p>

        {/* Nav hint chip */}
        {current.navHint && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
            <span style={{ background:`${current.color}15`, border:`1px solid ${current.color}35`, borderRadius:20, padding:'5px 14px', fontSize:12, color:current.color, fontWeight:700 }}>
              📍 {current.navHint}
            </span>
          </div>
        )}

        {/* Step counter */}
        <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:20 }}>
          {step+1} of {steps.length}
        </div>

        {/* Buttons */}
        <button onClick={advance} style={{
          width:'100%', padding:'14px 0', background:`linear-gradient(135deg,${current.color},${current.color}bb)`,
          border:'none', borderRadius:12, color:'#000', fontSize:16, fontFamily:"'Fredoka One',sans-serif",
          cursor:'pointer', marginBottom:10, boxShadow:`0 8px 24px ${current.color}35`,
        }}>
          {current.cta}
        </button>
        <button onClick={skip} style={{ width:'100%', padding:'10px 0', background:'none', border:'none', color:'rgba(255,255,255,0.2)', fontSize:13, cursor:'pointer' }}>
          Skip tour
        </button>
      </div>
    </div>
  )
}

// ── Step icons ────────────────────────────────────────────────────────────────

function MissionSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="15" r="10" stroke="currentColor" strokeWidth="2" opacity="0.5" style={{ color:'#1ECBE1' }}/>
      <circle cx="16" cy="15" r="6" stroke="currentColor" strokeWidth="2" opacity="0.75" style={{ color:'#1ECBE1' }}/>
      <circle cx="16" cy="15" r="2.5" fill="#1ECBE1"/>
      <path d="M22 8 L17.5 13" stroke="#1ECBE1" strokeWidth="1.5" opacity="0.7"/>
      <path d="M22 8 L19 8.5 M22 8 L21.5 11" stroke="#1ECBE1" strokeWidth="1.5" opacity="0.7"/>
    </svg>
  )
}
function HintSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 5 Q22 5 25 11 Q28 17 25 22 L23 25 L9 25 L7 22 Q4 17 7 11 Q10 5 16 5Z" stroke="#FFE135" strokeWidth="2" fill="none"/>
      <path d="M12 25 L20 25 M13 28 L19 28" stroke="#FFE135" strokeWidth="2"/>
      <circle cx="16" cy="15" r="3" fill="#FFE135" opacity="0.6"/>
      <path d="M16 7 L16 9 M23 9 L21.5 10.5 M25 16 L23 16" stroke="#FFE135" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  )
}
function ClanSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="3" fill="#f472b6"/>
      <path d="M11 22 Q11.5 17 16 17 Q20.5 17 21 22" stroke="#f472b6" strokeWidth="2" fill="none"/>
      <circle cx="7" cy="12" r="2.2" fill="#f472b6" opacity="0.65"/>
      <path d="M4 22 Q4.5 18 7 18" stroke="#f472b6" strokeWidth="1.8" fill="none" opacity="0.65"/>
      <circle cx="25" cy="12" r="2.2" fill="#f472b6" opacity="0.65"/>
      <path d="M28 22 Q27.5 18 25 18" stroke="#f472b6" strokeWidth="1.8" fill="none" opacity="0.65"/>
    </svg>
  )
}
function PortfolioSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="5" width="24" height="22" rx="2" stroke="#a78bfa" strokeWidth="2"/>
      <path d="M9 18 Q13 13 16 16 Q19 19 23 14" stroke="#a78bfa" strokeWidth="2" fill="none"/>
      <circle cx="10" cy="12" r="2" fill="#a78bfa" opacity="0.5"/>
      <path d="M13 5 Q16 3 19 5" stroke="#a78bfa" strokeWidth="1.5" fill="none" opacity="0.5"/>
    </svg>
  )
}
function ClassSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="8" width="24" height="16" rx="2" stroke="#4ade80" strokeWidth="2"/>
      <path d="M10 14 L14 14 M10 18 L20 18 M10 22 L17 22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="22" cy="14" r="3" fill="#4ade80" opacity="0.5"/>
      <path d="M4 12 L16 6 L28 12" stroke="#4ade80" strokeWidth="1.5" opacity="0.4"/>
    </svg>
  )
}
function LessonSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 5 Q12 4.5 6 7 L6 25 Q12 22.5 16 23Z" fill="#1ECBE1" opacity="0.4"/>
      <path d="M16 5 Q20 4.5 26 7 L26 25 Q20 22.5 16 23Z" fill="#1ECBE1" opacity="0.7"/>
      <line x1="16" y1="5" x2="16" y2="23" stroke="#1ECBE1" strokeWidth="2"/>
      <path d="M19 11 Q22 10.5 24 11.2" stroke="#1ECBE1" strokeWidth="1.2" opacity="0.5"/>
      <path d="M19 14 Q22 13.5 23.5 14.2" stroke="#1ECBE1" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  )
}
