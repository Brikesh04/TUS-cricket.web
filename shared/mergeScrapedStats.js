import { normalizeName } from './names.js'

// Batting, bowling and fielding are three separate CricClubs pages. A player
// appears on any or all of them, so the three lists fold into one record each.
//
// `matches` is taken as the highest seen rather than summed: the same fixtures
// are counted on every page, so adding them would treble the total. A field
// whose column was missing from a page arrives as null and is skipped, so
// "this page didn't carry the column" never overwrites a real value with 0.
export const mergeScrapedStats = ({ batting = [], bowling = [], fielding = [], format, season, mapName = (n) => n }) => {
  if (!format) throw new Error('mergeScrapedStats needs a format')
  if (!season) throw new Error('mergeScrapedStats needs a season')

  const byPlayer = new Map()

  const recordFor = (rawName) => {
    const player_name = mapName(rawName)
    const key = normalizeName(player_name)
    if (!byPlayer.has(key)) {
      byPlayer.set(key, {
        player_name,
        season: parseInt(season, 10),
        format,
        matches: 0,
        runs: 0,
        wickets: 0,
        catches: 0,
        overs: 0,
        runs_conceded: 0,
        balls_faced: 0,
        strike_rate: 0,
        economy: 0,
        batting_avg: 0,
        bowling_avg: 0
      })
    }
    return byPlayer.get(key)
  }

  const apply = (rows) => {
    for (const row of rows) {
      if (!row?.player_name) continue
      const record = recordFor(row.player_name)
      record.matches = Math.max(record.matches, row.matches ?? 0)
      for (const [field, value] of Object.entries(row)) {
        if (field === 'player_name' || field === 'matches') continue
        if (value === null || value === undefined) continue
        record[field] = value
      }
    }
  }

  apply(batting)
  apply(bowling)
  apply(fielding)

  return [...byPlayer.values()]
}
