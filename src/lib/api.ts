import { supabase, FUNCTIONS_URL } from './supabase'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'apikey': 'sb_publishable_hA7WrAPtwKibQhWr63sXmg_3XN7KQZh',
  }
}

export interface MissionCard {
  id: string
  theme: string
  story_premise: string
  constraints: string[]
  materials: string[]
  time_minutes: number
  difficulty: number
  learning_outcomes: string[]
  curriculum_tags: string[]
  age_band: string
  teacher_tip: string
  extension_activity: string
}

export interface GenerateMissionInput {
  age_band: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  time_minutes: number
  theme?: string
  available_materials: string[]
}

export async function generateMission(input: GenerateMissionInput): Promise<{ mission: MissionCard; regeneration_hint: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/generate-mission`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to generate mission')
  return data
}

export interface XPResult {
  xp_awarded: number
  total_xp: number
  current_rank: string
  current_rank_icon: string
  previous_rank: string | null
  rank_up: boolean
  next_rank: string | null
  xp_to_next_rank: number | null
}

export async function awardXP(student_id: string, source_type: string, source_id: string): Promise<XPResult> {
  const res = await fetch(`${FUNCTIONS_URL}/award-xp`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ student_id, source_type, source_id }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to award XP')
  return data
}

export interface PortfolioEntry {
  id: string
  created_at: string
  reflection_text: string | null
  skills_tagged: string[]
  artwork: {
    id: string
    media_url: string
    signed_url: string | null
    student_caption: string | null
    created_at: string
    mission: {
      theme: string
      story_premise: string
      difficulty: number
    } | null
  } | null
}

export interface Portfolio {
  student: { id: string; name: string; age_band: string | null }
  rank: {
    current: string
    icon: string
    total_xp: number
    next_rank: string | null
    xp_to_next_rank: number | null
    is_max_rank: boolean
  }
  badges: Array<{ awarded_at: string; badge: { name: string; description: string; rarity: string } }>
  entries: PortfolioEntry[]
  pagination: { total: number; limit: number; offset: number; has_more: boolean }
}

export async function getPortfolio(student_id: string): Promise<Portfolio> {
  const res = await fetch(`${FUNCTIONS_URL}/get-portfolio?student_id=${student_id}`, {
    headers: await authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch portfolio')
  return data
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, school_id, role, name, age_band')
    .eq('auth_user_id', user.id)
    .single()
  return data
}

export async function getLatestMission(school_id: string): Promise<MissionCard | null> {
  const { data } = await supabase
    .from('missions')
    .select('*')
    .eq('school_id', school_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function submitCompletion(params: {
  student_id: string
  mission_id: string
  reflection: string
  photo?: File
}): Promise<XPResult> {
  const { student_id, mission_id, reflection, photo } = params
  let media_url: string | null = null

  // Upload photo if provided
  if (photo) {
    const ext = photo.name.split('.').pop()
    const path = `${student_id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('artwork-media')
      .upload(path, photo)
    if (!uploadError) media_url = path
  }

  // Insert artwork row if we have a photo
  let artwork_id: string | null = null
  if (media_url) {
    const { data: artwork } = await supabase.from('artworks').insert({
      student_id,
      mission_id,
      media_url,
      media_type: 'image',
      student_caption: reflection,
    }).select('id').single()
    artwork_id = artwork?.id ?? null
  }

  // Insert portfolio entry
  const { data: entry } = await supabase.from('portfolio_entries').insert({
    student_id,
    artwork_id,
    reflection_text: reflection,
    skills_tagged: [],
    badges_awarded: [],
  }).select('id').single()

  // Award XP for mission completion
  let result = await awardXP(student_id, 'mission_completed', mission_id)

  // Award XP for reflection
  await awardXP(student_id, 'reflection_submitted', entry?.id ?? mission_id)

  // Award XP for artwork if uploaded
  if (artwork_id) {
    result = await awardXP(student_id, 'artwork_uploaded', artwork_id)
  }

  return result
}

// Ensure demo profiles exist after first sign-in
export async function ensureProfile(role: 'teacher' | 'student') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) return existing

  // Create profile for demo user
  const DEMO_SCHOOL_ID = '0f97b005-43b1-4a12-be0d-1b71b06bcb5f'
  const { data } = await supabase.from('profiles').insert({
    auth_user_id: user.id,
    school_id: DEMO_SCHOOL_ID,
    role,
    name: role === 'teacher' ? 'Demo Teacher' : 'Demo Student',
    age_band: role === 'student' ? '8-10' : null,
  }).select('id, school_id, role, name, age_band').single()

  return data
}
