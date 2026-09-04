import { createClient } from '@supabase/supabase-js'
import { runStatsSync } from './lib/statsSync.js'
import { runFixturesSync } from './lib/fixturesSync.js'

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})

// Admin-triggered sync — the "Sync Stats Now" button. For the automatic
// nightly run see scheduled-stats-sync.js, which needs no session because
// Netlify only lets its own scheduler invoke a scheduled function.
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method Not Allowed' })
  }

  // This endpoint scrapes and then writes with the service role key, which
  // bypasses RLS entirely. Without a session check anyone who knows the URL
  // could trigger writes to squad stats, so require a signed-in admin first.
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      success: false,
      error: 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured.'
    })
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return jsonResponse(401, {
      success: false,
      error: 'Missing Authorization header. Please sign in as an admin and try again.'
    })
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData?.user) {
      return jsonResponse(401, { success: false, error: 'Invalid or expired session. Please sign in again.' })
    }
  } catch (err) {
    return jsonResponse(401, { success: false, error: `Could not verify session: ${err.message}` })
  }

  // Body is optional. `{ "dryRun": true }` parses the CricClubs schedule and
  // league table and reports the detected column mapping without writing
  // anything — use it to check the scrape after changing any of the URLs.
  let options = {}
  try {
    options = event.body ? JSON.parse(event.body) : {}
  } catch {
    return jsonResponse(400, { success: false, error: 'Request body is not valid JSON.' })
  }

  if (options.dryRun) {
    const dry = await runFixturesSync({ dryRun: true })
    const { statusCode, ...body } = dry
    return jsonResponse(statusCode, body)
  }

  const result = await runStatsSync()

  // As in the scheduled run, a fixtures failure must not sink the stats sync
  // that already succeeded, so it is reported alongside rather than thrown.
  let fixtures
  try {
    fixtures = await runFixturesSync()
  } catch (err) {
    fixtures = { success: false, error: err.message }
  }

  const { statusCode, ...body } = result
  return jsonResponse(statusCode, { ...body, fixtures })
}
