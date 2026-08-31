import { runStatsSync } from './lib/statsSync.js'

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

  return new Response(JSON.stringify(result), {
    status: result.statusCode || 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = {
  schedule: '@weekly' // Sundays 00:00 UTC. Change to any cron expression to adjust.
}
