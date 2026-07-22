/**
 * Vercel cron endpoint — runs every 6 days to keep Supabase active.
 * Supabase free tier pauses after 7 days of zero database activity.
 * A lightweight SELECT 1 is enough to register as activity.
 */

const SUPABASE_URL = 'https://hpyznfxnltreviijyhct.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweXpuZnhubHRyZXZpaWp5aGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTU2MzAsImV4cCI6MjA5ODM3MTYzMH0.IcAVafpZzPFxi1hK5exfIljt2Y-sd1Xz2LurlcimlNw'

export default async function handler(req: Request): Promise<Response> {
  // Only allow Vercel cron calls (or manual GET for testing)
  const isVercelCron = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const isManualGet  = req.method === 'GET'
  if (!isVercelCron && !isManualGet) {
    return new Response('Forbidden', { status: 403 })
  }

  const start = Date.now()

  try {
    // Ping the database — fetch one row from schools (always has Dice Arts)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    const elapsed = Date.now() - start
    const body    = await res.json()
    const ok      = res.ok && Array.isArray(body) && body.length > 0

    const result = {
      status:   ok ? 'ok' : 'warn',
      database: ok ? 'active' : 'no rows returned',
      rows:     ok ? body.length : 0,
      ms:       elapsed,
      ts:       new Date().toISOString(),
    }

    console.log('[keepalive]', JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      status:  ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    const result = { status: 'error', message: err.message, ts: new Date().toISOString() }
    console.error('[keepalive]', result)
    return new Response(JSON.stringify(result), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { runtime: 'edge' }
