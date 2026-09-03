// The nightly sync runs unattended, so the season it targets has to be right
// on every date, not just the one it was written on. The previous logic
// hard-coded 2026 and returned the calendar year from 2027 onward — in
// January 2027 that would have written 2026's scraped figures into a new
// season 2027, duplicating every player instead of updating last season.
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSeason } from '../season.js'

const on = (iso) => resolveSeason(new Date(iso + 'T12:00:00Z'))

test('during the season, the season is the current year', () => {
  assert.equal(on('2026-04-01'), '2026')   // first day of April
  assert.equal(on('2026-09-03'), '2026')
  assert.equal(on('2027-06-15'), '2027')
  assert.equal(on('2030-08-20'), '2030')
})

test('before April, the season still being reported is the previous year', () => {
  assert.equal(on('2026-01-15'), '2025')
  assert.equal(on('2026-03-31'), '2025')   // last day before April
  assert.equal(on('2027-01-15'), '2026')   // the case the old logic got wrong
  assert.equal(on('2028-02-01'), '2027')
})

test('no year is special-cased', () => {
  for (const year of [2026, 2027, 2030, 2045]) {
    assert.equal(on(`${year}-07-01`), String(year))
    assert.equal(on(`${year}-02-01`), String(year - 1))
  }
})
