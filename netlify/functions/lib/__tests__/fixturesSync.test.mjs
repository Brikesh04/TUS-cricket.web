// Parser tests for the CricClubs fixtures/standings scrape.
//
// The live CricClubs pages are not reachable from CI, and the parser is the
// risky part of this feature: every column is located by header text, so a
// header the heuristics mis-bind produces plausible-looking but wrong rows.
// These cases cover the layouts CricClubs is known to serve, and two bugs that
// header matching got wrong on the first pass:
//   - 'NR' (no result) matching inside the 'NRR' header
//   - root-relative scorecard links being dropped instead of resolved
//
// Run with: node --test netlify/functions/lib/__tests__/
import test from 'node:test'
import assert from 'node:assert/strict'

const load = async (env, pages) => {
  Object.assign(process.env, {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon',
    CRICCLUBS_SEASON: '2026',
    ...env
  })
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => (String(url).includes('standings') ? pages.standings : pages.schedule)
  })
  const mod = await import('../fixturesSync.js?' + Math.random())
  return mod.runFixturesSync({ dryRun: true })
}

test('separate home/away columns, US-order dates, relative scorecard link', async () => {
  const r = await load(
    {
      CRICCLUBS_DATE_ORDER: 'mdy',
      CRICCLUBS_T20_SCHEDULE_URL: 'https://cricclubs.com/L/viewSchedule.do',
      CRICCLUBS_T20_STANDINGS_URL: ''
    },
    {
      schedule: `<table><tr><td>layout junk</td></tr></table>
      <table>
      <tr><th>Date</th><th>Time</th><th>Home Team</th><th>Away Team</th><th>Ground</th><th>Result</th></tr>
      <tr><td>05/17/2026</td><td>11:00</td><td>TuS Pfarrkirchen</td><td>Deggendorf CC</td><td>Pfarrkirchen</td>
          <td><a href="/L/viewScorecard.do?matchId=99123">TuS Pfarrkirchen won by 5 wickets</a></td></tr>
      <tr><td>05/24/2026</td><td>11:00</td><td>Straubing CC</td><td>TuS Pfarrkirchen</td><td>Straubing</td>
          <td>Straubing CC won by 12 runs</td></tr>
      <tr><td>06/07/2026</td><td>11:00</td><td>Regensburg CC</td><td>Passau CC</td><td>Regensburg</td>
          <td>Regensburg CC won by 8 wickets</td></tr>
      <tr><td>09/20/2026</td><td>11:00</td><td>TuS Pfarrkirchen</td><td>Landshut CC</td><td>Pfarrkirchen</td><td></td></tr>
      </table>`,
      standings: ''
    }
  )

  const s = r.report.schedule[0]
  assert.equal(s.parsed, 3, 'three of our matches')
  assert.equal(s.skipped, 1, 'the all-other-clubs row is dropped')

  const [won, lost, upcoming] = s.sample
  assert.deepEqual(
    [won.match_date, won.is_home, won.opponent, won.status, won.result],
    ['2026-05-17', true, 'Deggendorf CC', 'completed', 'won']
  )
  // Root-relative links must be resolved against the page, not discarded.
  assert.equal(won.scorecard_url, 'https://cricclubs.com/L/viewScorecard.do?matchId=99123')
  assert.equal(won.cricclubs_match_id, '99123')

  assert.deepEqual([lost.is_home, lost.opponent, lost.result], [false, 'Straubing CC', 'lost'])
  assert.deepEqual([upcoming.status, upcoming.result], ['scheduled', null])
})

test('combined "A vs B" cell, textual and day-first dates, abandoned and tied', async () => {
  const r = await load(
    {
      CRICCLUBS_DATE_ORDER: 'dmy',
      CRICCLUBS_T20_SCHEDULE_URL: 'https://cricclubs.com/L/viewSchedule.do',
      CRICCLUBS_T20_STANDINGS_URL: ''
    },
    {
      schedule: `<table>
      <tr><th>Match Date</th><th>Match</th><th>Venue</th><th>Winner</th></tr>
      <tr><td>17-05-2026</td><td>TuS Pfarrkirchen vs Deggendorf CC</td><td>Home</td><td>TuS Pfarrkirchen won by 5 wickets</td></tr>
      <tr><td>Sat, 24 May 2026</td><td>Straubing CC v TuS Pfarrkirchen</td><td>Away</td><td>Match abandoned</td></tr>
      <tr><td>02/06/2026</td><td>TuS Pfarrkirchen vs Passau CC</td><td>Home</td><td>Tied</td></tr>
      </table>`,
      standings: ''
    }
  )

  const s = r.report.schedule[0]
  assert.equal(s.parsed, 3)
  assert.deepEqual(s.sample.map(m => m.match_date), ['2026-05-17', '2026-05-24', '2026-06-02'])
  assert.deepEqual(s.sample.map(m => m.opponent), ['Deggendorf CC', 'Straubing CC', 'Passau CC'])
  assert.deepEqual(s.sample.map(m => m.is_home), [true, false, true])
  assert.deepEqual(s.sample.map(m => m.status), ['completed', 'abandoned', 'completed'])
  assert.deepEqual(s.sample.map(m => m.result), ['won', 'no result', 'tied'])
})

test('abbreviated standings codes: NR must not bind to the NRR column', async () => {
  const r = await load(
    {
      CRICCLUBS_T20_SCHEDULE_URL: '',
      CRICCLUBS_T20_STANDINGS_URL: 'https://cricclubs.com/L/standings'
    },
    {
      schedule: '',
      standings: `<table>
      <tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>Pts</th><th>NRR</th></tr>
      <tr><td>2</td><td>TuS Pfarrkirchen</td><td>9</td><td>5</td><td>3</td><td>0</td><td>1</td><td>11</td><td>0.331</td></tr>
      </table>`
    }
  )

  const t = r.report.standings[0]
  assert.deepEqual(t.columnMap, {
    position: 0, team: 1, played: 2, won: 3, lost: 4, tied: 5, noResult: 6, points: 7, nrr: 8
  })
  const row = t.sample[0]
  assert.equal(row.no_result, 1, 'no_result reads the NR column, not NRR')
  assert.equal(row.net_run_rate, 0.331)
  assert.equal(row.points, 11)
})

test('full-word standings headers with no NR column leave no_result at zero', async () => {
  const r = await load(
    {
      CRICCLUBS_T20_SCHEDULE_URL: '',
      CRICCLUBS_T20_STANDINGS_URL: 'https://cricclubs.com/L/standings'
    },
    {
      schedule: '',
      standings: `<table>
      <tr><th>Pos</th><th>Team</th><th>Played</th><th>Won</th><th>Lost</th><th>Tied</th><th>Pts</th><th>NRR</th></tr>
      <tr><td>1</td><td>Deggendorf CC</td><td>8</td><td>7</td><td>1</td><td>0</td><td>14</td><td>1.204</td></tr>
      </table>`
    }
  )

  const t = r.report.standings[0]
  assert.equal(t.columnMap.noResult, -1, 'absent column stays unbound')
  assert.equal(t.sample[0].no_result, 0)
  assert.equal(t.sample[0].net_run_rate, 1.204)
})
