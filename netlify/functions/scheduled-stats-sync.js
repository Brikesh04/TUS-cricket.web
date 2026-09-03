import { runStatsSync } from './lib/statsSync.js'

// Automatic stats sync. Netlify Scheduled Function (Functions API v2):
// Netlify's own scheduler is the only thing that can invoke this — scheduled
// functions are not reachable over public HTTP — so unlike the admin endpoint
// it needs no session check of its own.
//
// Runs nightly rather than weekly: league matches are played at weekends and
// CricClubs is often updated a day or two afterwards, so a nightly pass picks
// up new figures within a day of them appearing instead of up to a week.
export default async () => {
  const result = await runStatsSync()

  if (result.success) {
    console.log(
      `Scheduled stats sync complete: ${result.playersUpdated} rows written, ` +
      `${result.totalFound} players found.`
    )
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
  // 02:00 UTC daily. Any standard cron expression works — '@weekly' for
  // Sundays only, '0 2 * * 1' for Mondays after the weekend's fixtures.
  schedule: '0 2 * * *'
}
