import { runStatsSync } from './lib/statsSync.js'
import { runFixturesSync } from './lib/fixturesSync.js'

// Netlify Scheduled Function (Functions API v2). Netlify's scheduler is the
// only thing that can invoke this in production — scheduled functions can't
// be called over public HTTP — so unlike trigger-stats-update.js this needs
// no session/auth check of its own.
export default async () => {
  const result = await runStatsSync()

  if (result.success) {
    console.log(`Scheduled stats sync complete: ${result.playersUpdated} players updated, ${result.totalFound} found.`)
    if (result.errors?.length) console.warn('Scheduled stats sync warnings:', result.errors)
  } else {
    console.error('Scheduled stats sync failed:', result.error)
  }

  // Fixtures and the league table run independently of the player stats: one
  // failing (a page moved, a column renamed) must not stop the other writing.
  let fixtures
  try {
    fixtures = await runFixturesSync()
    if (fixtures.success) {
      console.log(`Scheduled fixtures sync complete: ${fixtures.written?.matches ?? 0} matches, ${fixtures.written?.standings ?? 0} standings rows.`)
      if (fixtures.errors?.length) console.warn('Scheduled fixtures sync warnings:', fixtures.errors)
    } else {
      console.error('Scheduled fixtures sync failed:', fixtures.error)
    }
  } catch (err) {
    console.error('Scheduled fixtures sync threw:', err.message)
    fixtures = { success: false, error: err.message }
  }

  return new Response(JSON.stringify({ ...result, fixtures }), {
    status: result.statusCode || 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = {
  schedule: '@weekly' // Sundays 00:00 UTC. Change to any cron expression to adjust.
}
