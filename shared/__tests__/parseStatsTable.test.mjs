// The same parsing now runs in two places — cheerio on the server, the DOM in
// the bookmarklet — so it lives here as plain-data logic and is tested once.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  pickStatsTable, findHeaderRow, findNameColumn,
  cleanScrapedName, isNoiseRow, parseStatsTable
} from '../parseStatsTable.js'

const battingTable = {
  ths: ['#', 'Player', 'M', 'Inns', 'R', 'BF', 'Avg', 'SR'],
  rows: [
    ['Team Batting 2026'],
    ['#', 'Player', 'M', 'Inns', 'R', 'BF', 'Avg', 'SR'],
    ['1', 'Brikesh Vikin Gowrish', '10', '10', '273', '198', '27.30', '137.87'],
    ['2', 'Isuru Dampathige Koshitha Sandew (c)', '9', '9', '188', '140', '20.88', '134.28'],
    ['', 'Extras', '', '', '31', '', '', ''],
    ['', 'Total', '10', '', '842', '', '', '']
  ]
}

test('the stats table is picked out of the layout tables around it', () => {
  const layout = { ths: ['Home', 'Fixtures', 'Standings'], rows: [['Home', 'Fixtures', 'Standings']] }
  const nav = { ths: [], rows: [['nav']] }
  assert.equal(pickStatsTable([nav, layout, battingTable]), battingTable)
  assert.equal(pickStatsTable([nav, layout]), null, 'no stats-shaped table means none')
})

test('the header row is found below the title row', () => {
  assert.equal(findHeaderRow(battingTable.rows), 1)
  assert.equal(findNameColumn(battingTable.rows[1]), 1)
})

test('captain and keeper marks are stripped, whitespace collapsed', () => {
  assert.equal(cleanScrapedName('Isuru Dampathige (c)'), 'Isuru Dampathige')
  assert.equal(cleanScrapedName('Anil Tiwari (wk)'), 'Anil Tiwari')
  assert.equal(cleanScrapedName('Dip  Bhowmik\tDipta'), 'Dip Bhowmik Dipta')
  assert.equal(cleanScrapedName('Vamsi Krishna Kannaji'), 'Vamsi Krishna Kannaji')
  assert.equal(cleanScrapedName('  Saurav Bhatta*  '), 'Saurav Bhatta')
})

test('summary rows are not treated as players', () => {
  assert.ok(isNoiseRow('Extras'))
  assert.ok(isNoiseRow('Total'))
  assert.ok(isNoiseRow('Did not bat'))
  assert.ok(isNoiseRow(''))
  assert.ok(!isNoiseRow('Brikesh Vikin Gowrish'))
})

test('batting rows parse, and Extras/Total are excluded', () => {
  const rows = parseStatsTable(battingTable, 'Batting')
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    player_name: 'Brikesh Vikin Gowrish',
    matches: 10, runs: 273, balls_faced: 198, batting_avg: 27.30, strike_rate: 137.87
  })
  assert.equal(rows[1].player_name, 'Isuru Dampathige Koshitha Sandew', 'the (c) is gone')
  assert.equal(rows[1].runs, 188)
})

test('bowling reads wickets and overs, not the batting runs column', () => {
  const rows = parseStatsTable({
    ths: ['#', 'Player', 'M', 'O', 'R', 'W', 'Econ', 'Avg'],
    rows: [
      ['#', 'Player', 'M', 'O', 'R', 'W', 'Econ', 'Avg'],
      ['1', 'Anil Tiwari', '9', '31.2', '210', '14', '6.70', '15.00']
    ]
  }, 'Bowling')
  assert.deepEqual(rows[0], {
    player_name: 'Anil Tiwari',
    matches: 9, wickets: 14, overs: 31.2, runs_conceded: 210, economy: 6.70, bowling_avg: 15.00
  })
})

test('fielding sums catches, keeper catches, stumpings and run-outs once each', () => {
  const rows = parseStatsTable({
    ths: ['#', 'Player', 'M', 'Ct', 'WK Ct', 'St', 'RO'],
    rows: [
      ['#', 'Player', 'M', 'Ct', 'WK Ct', 'St', 'RO'],
      ['1', 'Netharshanan Gnaneswaran', '10', '6', '2', '1', '1']
    ]
  }, 'Fielding')
  // 6 + 2 + 1 + 1 — the WK column must not also count as an outfield catch.
  assert.equal(rows[0].catches, 10)
  assert.equal(rows[0].matches, 10)
})

test('a column the page does not carry comes back null, not zero', () => {
  const rows = parseStatsTable({
    ths: ['#', 'Player', 'M', 'R'],
    rows: [['#', 'Player', 'M', 'R'], ['1', 'Saurav Bhatta', '6', '119']]
  }, 'Batting')
  assert.equal(rows[0].runs, 119)
  assert.equal(rows[0].balls_faced, null, 'absent column is null so a caller can tell it apart from 0')
  assert.equal(rows[0].strike_rate, null)
})

test('an unknown page type is refused rather than silently producing nothing', () => {
  assert.throws(() => parseStatsTable(battingTable, 'Wicketkeeping'), /Unknown stats page type/)
})
