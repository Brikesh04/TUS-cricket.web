// CricClubs answered the first live run with 403 on all three stats URLs. The
// request carried nothing but a User-Agent — no Accept, no Accept-Language, no
// Sec-Fetch-* and no session cookie — which is a common bot-filter trip. These
// cover the shape of the request we now send and, just as importantly, that a
// refusal comes back with enough detail to tell an edge block from an
// application-level deny.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPage, leagueBase, BROWSER_HEADERS } from '../statsSync.js'

const STATS_URL = 'https://cricclubs.com/BayerischerCricketVerbandeV/teamBatting.do?teamId=1815&clubId=40958'

test('the league base is derived from a stats URL', () => {
  assert.equal(leagueBase(STATS_URL), 'https://cricclubs.com/BayerischerCricketVerbandeV/')
  assert.equal(leagueBase('https://cricclubs.com/'), 'https://cricclubs.com/')
})

test('a navigation-shaped request is sent, not a bare User-Agent', async () => {
  let seen
  global.fetch = async (url, init) => {
    seen = { url, headers: init.headers }
    return new Response('<html></html>', { status: 200 })
  }

  await fetchPage(STATS_URL, new Map(), 'https://cricclubs.com/BayerischerCricketVerbandeV/')

  for (const header of ['User-Agent', 'Accept', 'Accept-Language', 'Sec-Fetch-Dest', 'Sec-Fetch-Mode']) {
    assert.ok(seen.headers[header], `${header} must be sent`)
  }
  assert.equal(seen.headers['Sec-Fetch-Site'], 'same-origin')
  assert.equal(seen.headers.Referer, 'https://cricclubs.com/BayerischerCricketVerbandeV/')
  assert.match(BROWSER_HEADERS['User-Agent'], /Chrome\/\d+/)
})

test('the first request of a run looks like a direct visit, with no Referer', async () => {
  let seen
  global.fetch = async (url, init) => { seen = init.headers; return new Response('ok', { status: 200 }) }

  await fetchPage('https://cricclubs.com/League/', new Map(), null)

  assert.equal(seen['Sec-Fetch-Site'], 'none')
  assert.equal(seen.Referer, undefined)
  assert.equal(seen.Cookie, undefined, 'nothing to replay yet')
})

test('cookies from the warm-up are replayed on the stats request', async () => {
  const jar = new Map()

  global.fetch = async () => new Response('ok', {
    status: 200,
    headers: [
      ['set-cookie', 'JSESSIONID=abc123; Path=/; HttpOnly'],
      ['set-cookie', 'clubId=40958; Path=/']
    ]
  })
  await fetchPage('https://cricclubs.com/League/', jar, null)

  assert.equal(jar.get('JSESSIONID'), 'abc123')
  assert.equal(jar.get('clubId'), '40958')

  let sent
  global.fetch = async (url, init) => { sent = init.headers; return new Response('ok', { status: 200 }) }
  await fetchPage(STATS_URL, jar, 'https://cricclubs.com/League/')

  assert.ok(sent.Cookie.includes('JSESSIONID=abc123'))
  assert.ok(sent.Cookie.includes('clubId=40958'))
})

test('a 403 reports what the server actually said, not just the number', async () => {
  global.fetch = async () => new Response(
    '<html><head><title>Attention Required! | Cloudflare</title></head><body>Sorry, you have been blocked</body></html>',
    { status: 403 }
  )

  await assert.rejects(
    () => fetchPage(STATS_URL, new Map(), null),
    (err) => {
      assert.match(err.message, /HTTP 403/)
      assert.match(err.message, /Cloudflare/, 'the body snippet identifies the blocker')
      return true
    }
  )
})

test('an empty error body still says so rather than looking like success', async () => {
  global.fetch = async () => new Response('', { status: 403 })
  await assert.rejects(
    () => fetchPage(STATS_URL, new Map(), null),
    /HTTP 403 fetching URL — empty response body/
  )
})
