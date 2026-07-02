import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

export async function callFunction(name: string, method: 'GET' | 'POST', body?: unknown, params?: Record<string, string>) {
  const session = (await supabase.auth.getSession()).data.session
  const token = session?.access_token
  let url = `${FUNCTIONS_URL}/${name}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    url = `${url}?${qs}`
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(e.error || 'Request failed')
  }
  return res.json()
}
