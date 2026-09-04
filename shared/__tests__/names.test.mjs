// These are the exact name pairs that produced duplicate rows in the live
// player_stats table. Each pair is one player CricClubs spelled two ways; the
// old comparison (s.player_name === rec.player_name) treated them as two
// people and inserted a second row, which is how 39 duplicates accumulated.
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeName } from '../names.js'

const REAL_DUPLICATE_PAIRS = [
  ['Adul Sherwin Xavier', 'Adul Sherwin XAVIER'],
  ['Ashwini Balaji', 'Ashwini BALAJI'],
  ['Brikesh Vikin Gowrish', 'Brikesh Vikin GOWRISH'],
  ['David Perianayaga Raj Santiagu', 'David Perianayaga Raj SANTIAGU'],
  ['Dip Bhowmik Dipta', 'Dip Bhowmik DIPTA'],
  ['Gourav Srinivasalu', 'Gourav SRINIVASALU'],
  ['Huzaifa Ejaz', 'Huzaifa EJAZ'],
  ['Isuru Dampathige Koshitha Sandew', 'Isuru Dampathige Koshitha SANDEW'],
  ['Naren Senthil Kumar', 'Naren Senthil KUMAR'],
  ['Netharshanan Gnaneswaran', 'Netharshanan GNANESWARAN'],
  ['Pronoy Pronoy', 'Pronoy PRONOY'],
  ['Saurav Bhatta', 'Saurav BHATTA'],
  ['Shibin Babu Puthan Purayil', 'Shibin Babu Puthan PURAYIL'],
  ['Syed Muhammad Zain Al Abidin', 'Syed Muhammad Zain Al ABIDIN'],
  ['Tanzim Ahmed', 'Tanzim AHMED'],
  ['Vamsi Krishna Kannaji', 'Vamsi KRISHNA KANNAJI'],
  ['Vamsi Krishna Kannaji', 'Vamsi Krishna KANNAJI'],
  ['Vishnu Dutt Dwivedi', 'Vishnu Dutt DWIVEDI']
]

test('case variants that duplicated rows now compare equal', () => {
  for (const [stored, scraped] of REAL_DUPLICATE_PAIRS) {
    assert.notEqual(stored, scraped, `${stored} — the pair should differ as raw strings`)
    assert.equal(
      normalizeName(stored),
      normalizeName(scraped),
      `${stored} vs ${scraped} must match after normalising`
    )
  }
})

test('whitespace variants collapse: doubled spaces, tabs, non-breaking space', () => {
  const expected = 'vamsi krishna kannaji'
  assert.equal(normalizeName('Vamsi  Krishna   Kannaji'), expected)
  assert.equal(normalizeName('Vamsi\tKrishna Kannaji'), expected)
  assert.equal(normalizeName('Vamsi Krishna Kannaji'), expected)
  assert.equal(normalizeName('  Vamsi Krishna Kannaji  '), expected)
})

test('genuinely different players still differ', () => {
  assert.notEqual(normalizeName('Vishnu Dutt Dwivedi'), normalizeName('Vishnu Dwivedi'))
  assert.notEqual(normalizeName('Saurav Bhatta'), normalizeName('Shubham Bhatta'))
  assert.notEqual(normalizeName('Naren Senthil Kumar'), normalizeName('Naveen Kumar Shanmugam'))
})

test('null and undefined are handled rather than throwing', () => {
  assert.equal(normalizeName(null), '')
  assert.equal(normalizeName(undefined), '')
  assert.equal(normalizeName(''), '')
})
