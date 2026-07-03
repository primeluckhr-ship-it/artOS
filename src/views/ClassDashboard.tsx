import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../App'

interface Student {
  id: string
  name: string
  age_band: string | null
  total_xp: number
  rank: string
  rank_icon: string
  completed_mission: boolean
  reflection: string | null
  artwork_url: string | null
  completed_at: string | null
}

interface Mission {
  id: string
  theme: string
  story_premise: string
  difficulty: number
  time_minutes: number
  created_at: string
}

interface ClassInfo {
  id: string
  name: string
}

const RANK_XP: Record<string, number> = {
  Explorer: 0, Creator: 500, Inventor: 1500,
  Designer: 3500, 'Master Artist': 7000, 'Creative Visionary': 12000,
}
const RANK_ORDER = ['Explorer', 'Creator', 'Inventor', 'Designer', 'Master Artist', 'Creative Visionary']
const RANK_ICONS: Record<string, string> = {
  Explorer: '🧭', Creator: '🎨', Inventor: '💡',
  Designer: '📐', 'Master Artist': '🎭', 'Creative Visionary': '⭐',
}

function resolveRank(xp: number): string {
  return [...RANK_ORDER].reverse().find(r => xp >= RANK_XP[r]) || 'Explorer'
}

export default function ClassDashboard({ profile }: { profile: Profile }) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => { load() }, [profile.id])

  // Auto-refresh every 30 seconds during live sessions
  useEffect(() => {
    const interval = setInterval(() => { load(); setLastRefresh(new Date()) }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    // Get teacher's class
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .limit(1)
    const cls = classes?.[0]
    if (!cls) { setLoading(false); return }
    setClassInfo(cls)

    // Get latest mission for this school
    const { data: missions } = await supabase
      .from('missions')
      .select('id, theme, story_premise, difficulty, time_minutes, created_at')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
      .limit(1)
    const latestMission = missions?.[0] || null
    setMission(latestMission)

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles(id, name, age_band)')
      .eq('class_id', cls.id)
      .eq('status', 'active')

    if (!enrollments?.length) { setLoading(false); return }

    const studentIds = enrollments.map((e: { student_id: string }) => e.student_id)

    // Get XP for all students
    const { data: ledger } = await supabase
      .from('xp_ledger')
      .select('student_id, xp_amount')
      .in('student_id', studentIds)

    // Get portfolio entries for current mission
    const { data: portfolioEntries } = latestMission ? await supabase
      .from('portfolio_entries')
      .select(`
        student_id, reflection_text, created_at,
        artwork:artworks(id, media_url, student_caption, mission_id)
      `)
      .in('student_id', studentIds) : { data: [] }

    // Build student objects
    const studentList: Student[] = enrollments.map((e: { student_id: string; profiles: { id: string; name: string; age_band: string | null } | null }) => {
      const p = e.profiles as { id: string; name: string; age_band: string | null } | null
      if (!p) return null

      const xp = (ledger || [])
        .filter((l: { student_id: string; xp_amount: number }) => l.student_id === e.student_id)
        .reduce((sum: number, l: { xp_amount: number }) => sum + l.xp_amount, 0)

      const rank = resolveRank(xp)

      // Find completed entry for latest mission
      const entry = (portfolioEntries || []).find((pe: {
        student_id: string;
        artwork: { mission_id: string } | null
      }) =>
        pe.student_id === e.student_id &&
        latestMission &&
        pe.artwork?.mission_id === latestMission.id
      ) as {
        student_id: string;
        reflection_text: string | null;
        created_at: string;
        artwork: { id: string; media_url: string; student_caption: string; mission_id: string } | null
      } | undefined

      return {
        id: e.student_id,
        name: p.name,
        age_band: p.age_band,
        total_xp: xp,
        rank,
        rank_icon: RANK_ICONS[rank] || '🎨',
        completed_mission: !!entry,
        reflection: entry?.reflection_text || null,
        artwork_url: null, // signed URLs fetched on expand
        completed_at: entry?.created_at || null,
      }
    }).filter(Boolean) as Student[]

    // Sort: completed first, then by XP
    studentList.sort((a, b) => {
      if (a.completed_mission !== b.completed_mission) return a.completed_mission ? -1 : 1
      return b.total_xp - a.total_xp
    })

    setStudents(studentList)
    setLoading(false)
  }

  const completed = students.filter(s => s.completed_mission).length
  const total = students.length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🏫</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Fredoka One',sans-serif" }}>Loading your class...</p>
    </div>
  )

  if (!classInfo) return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏫</div>
      <h3 style={{ fontFamily: "'Fredoka One',sans-serif", color: '#FF9F1C', fontSize: 22, marginBottom: 10 }}>No class set up yet</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Generate a mission first — your class will appear here once students start completing work.</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 26, color: '#FF9F1C', marginBottom: 4 }}>
            🏫 {classInfo.name}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Last updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        </div>
        <button onClick={() => { load(); setLastRefresh(new Date()) }}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Mission banner */}
      {mission && (
        <div style={{ background: 'rgba(255,159,28,0.1)', border: '1px solid rgba(255,159,28,0.25)', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FF9F1C', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Current Mission · {mission.theme}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                {mission.story_premise.slice(0, 120)}{mission.story_premise.length > 120 ? '…' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <Stat label="Time" value={`${mission.time_minutes}m`} />
              <Stat label="Difficulty" value={`${mission.difficulty}/10`} />
            </div>
          </div>
        </div>
      )}

      {/* Completion bar */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: "'Fredoka One',sans-serif", color: '#fff', fontSize: 16 }}>
            Mission Completion
          </span>
          <span style={{ fontFamily: "'Fredoka One',sans-serif", color: completed === total && total > 0 ? '#4ade80' : '#FF9F1C', fontSize: 18 }}>
            {completed}/{total}
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
          <div style={{
            background: completed === total && total > 0
              ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
              : 'linear-gradient(90deg,#FF9F1C,#FFE135)',
            width: total > 0 ? `${(completed / total) * 100}%` : '0%',
            height: '100%', borderRadius: 6,
            transition: 'width 0.6s ease',
          }} />
        </div>
        {completed === total && total > 0 && (
          <p style={{ color: '#4ade80', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: 600 }}>
            🎉 Everyone's done! Time for a gallery walk.
          </p>
        )}
      </div>

      {/* Student cards */}
      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>👥</div>
          <h4 style={{ fontFamily: "'Fredoka One',sans-serif", color: '#FF9F1C', fontSize: 18, marginBottom: 8 }}>No students enrolled yet</h4>
          <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Students will appear here once they're enrolled in your class.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {students.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              isExpanded={expanded === student.id}
              onToggle={() => setExpanded(expanded === student.id ? null : student.id)}
              missionActive={!!mission}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentCard({ student, isExpanded, onToggle, missionActive }: {
  student: Student; isExpanded: boolean; onToggle: () => void; missionActive: boolean
}) {
  const xpToNext = (() => {
    const idx = RANK_ORDER.indexOf(student.rank)
    const next = RANK_ORDER[idx + 1]
    return next ? RANK_XP[next] - student.total_xp : null
  })()

  const completedTime = student.completed_at
    ? new Date(student.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div
      onClick={onToggle}
      style={{
        background: student.completed_mission ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${student.completed_mission ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Student row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Rank icon */}
        <div style={{ fontSize: 30, flexShrink: 0 }}>{student.rank_icon}</div>

        {/* Name + rank */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 16, color: '#fff', marginBottom: 2 }}>
            {student.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{student.rank}</span>
            <span style={{ color: '#FFE135', fontSize: 12, fontWeight: 700 }}>{student.total_xp.toLocaleString()} XP</span>
            {xpToNext && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{xpToNext} to next rank</span>}
          </div>
        </div>

        {/* Mission status */}
        {missionActive && (
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {student.completed_mission ? (
              <div>
                <div style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 20, padding: '4px 12px', color: '#4ade80', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                  ✅ Done
                </div>
                {completedTime && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center' }}>{completedTime}</div>}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600 }}>
                ⏳ In progress
              </div>
            )}
          </div>
        )}

        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16, marginLeft: 4 }}>
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded: reflection + artwork */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px', background: 'rgba(0,0,0,0.15)' }}>
          {student.completed_mission && student.reflection ? (
            <>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                💬 Reflection
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 14 }}>
                "{student.reflection}"
              </p>
            </>
          ) : student.completed_mission ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' }}>No reflection submitted yet.</p>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>⏳ Still working on the mission...</p>
            </div>
          )}

          {/* XP breakdown */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fredoka One',sans-serif", color: '#FFE135', fontSize: 20 }}>{student.total_xp.toLocaleString()}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Total XP</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fredoka One',sans-serif", color: '#1ECBE1', fontSize: 20 }}>{student.rank_icon}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{student.rank}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Fredoka One',sans-serif", color: '#fff', fontSize: 16 }}>{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{label}</div>
    </div>
  )
}
