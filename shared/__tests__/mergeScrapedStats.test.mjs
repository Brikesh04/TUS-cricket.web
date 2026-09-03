import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeScrapedStats } from '../mergeScrapedStats.js'

const base = { format: 'T20', season: 2026 }

test('the three pages fold into one record per player', () => {
  const rows = mergeScrapedStats({
    ...base,
    batting: [{ player_name: 'Isuru Dampathige', matches: 9, runs: 188, balls_faced: 140 }],
    bowling: [{ player_name: 'Isuru Dampathige', matches: 9, wickets: 9, overs: 24.0 }],
    fielding: [{ player_name: 'Isuru Dampathige', matches: 9, catches: 2 }]
  })
  assert.equal(rows.length, 1)
  assert.deepEqual(
    { runs: rows[0].runs, wickets: rows[0].wickets, catches: rows[0].catches, matches: rows[0].matches },
    { runs: 188, wickets: 9, catches: 2, matches: 9 }
  )
  assert.equal(rows[0].season, 2026)
  assert.equal(rows[0].format, 'T20')
})

test('matches is the highest seen, never the sum of three pages', () => {
  const rows = mergeScrapedStats({
    ...base,
    batting: [{ player_name: 'A Player', matches: 10, runs: 50 }],
    bowling: [{ player_name: 'A Player', matches: 10, wickets: 3 }],
    fielding: [{ player_name: 'A Player', matches: 8, catches: 1 }]
  })
  assert.equal(rows[0].matches, 10, 'not 28')
})

test('a null field does not overwrite a value another page supplied', () => {
  const rows = mergeScrapedStats({
    ...base,
    batting: [{ player_name: 'A Player', matches: 5, runs: 120, strike_rate: null }],
    bowling: [{ player_name: 'A Player', matches: 5, wickets: 2 }]
  })
  assert.equal(rows[0].runs, 120)
  assert.equal(rows[0].strike_rate, 0, 'stays at the default rather than becoming null')
})

test('case and spacing variants of one player collapse to a single record', () => {
  const rows = mergeScrapedStats({
    ...base,
    batting: [{ player_name: 'Adul Sherwin Xavier', matches: 6, runs: 16 }],
    bowling: [{ player_name: 'Adul Sherwin XAVIER', matches: 6, wickets: 5 }],
    fielding: [{ player_name: 'Adul  Sherwin  Xavier', matches: 6, catches: 1 }]
  })
  assert.equal(rows.length, 1, 'one player, not three')
  assert.equal(rows[0].runs, 16)
  assert.equal(rows[0].wickets, 5)
  assert.equal(rows[0].catches, 1)
})

test('a mapping is applied to the stored name', () => {
  const rows = mergeScrapedStats({
    ...base,
    batting: [{ player_name: 'Shubham Bhatta', matches: 3, runs: 40 }],
    mapName: (n) => (n === 'Shubham Bhatta' ? 'Shubam Bhatta' : n)
  })
  assert.equal(rows[0].player_name, 'Shubam Bhatta')
})

test('format and season are required rather than silently defaulted', () => {
  assert.throws(() => mergeScrapedStats({ season: 2026, batting: [] }), /needs a format/)
  assert.throws(() => mergeScrapedStats({ format: 'T20', batting: [] }), /needs a season/)
})
