import { load as loadHtml } from 'cheerio'
import { createClient } from '@supabase/supabase-js'

// Scrapes fixtures/results and the league table from CricClubs into the
// `matches` and `standings` tables.
//
// IMPORTANT — this parser was written without access to the live CricClubs
// pages (they are unreachable from the environment it was authored in), so it
// deliberately does not hard-code column positions. Every column is located by
// matching its header text, and `runFixturesSync({ dryRun: true })` returns the
// detected header mapping plus the parsed rows WITHOUT writing anything, so a
// misparse can be diagnosed from the sync report rather than from corrupted
// rows. Run the dry run first after changing any of the URLs.

const clean = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

// Does this cell name our club? CricClubs spells the team a few different ways
// across pages, so match on a distinctive substring rather than equality.
const TEAM_NEEDLE = (process.env.CRICCLUBS_TEAM_NEEDLE || 'pfarrkirchen').toLowerCase()
const isUs = (text) => clean(text).toLowerCase().includes(TEAM_NEEDLE)

// Locate a column by header text. `patterns` are tried in order, so put the
// most specific first ('HOME TEAM' before 'TEAM').
//
// Exact matches are tried across every pattern before any substring match,
// and short codes are never matched as substrings: 'NR' occurs inside 'NRR',
// 'T' inside 'TEAM' and 'P' inside 'PTS', so a substring pass would silently
// bind no-result to net run rate and tied to the team name.
const headerIndex = (headers, patterns) => {
  for (const p of patterns) {
    const i = headers.findIndex(h => h === p)
    if (i !== -1) return i
  }
  for (const p of patterns) {
    if (p.length < 3) continue
    const i = headers.findIndex(h => h.includes(p))
    if (i !== -1) return i
  }
  return -1
}

// Pick the table on the page whose headers best match what we're looking for.
// Same approach as the player-stats scraper: CricClubs wraps content in nested
// layout tables, so "the first table" is never the right one.
const pickTable = ($, scoreHeaders) => {
  let best = null
  let bestScore = 0
  $('table').each((_, el) => {
    const headers = []
    $(el).find('th').each((_, th) => headers.push(clean($(th).text()).toUpperCase()))
    if (headers.length < 3) return
    let score = 0
    for (const [needles, weight] of scoreHeaders) {
      if (needles.some(n => headers.some(h => h.includes(n)))) score += weight
    }
    if (score > bestScore) {
      bestScore = score
      best = el
    }
  })
  return best
}

// Read a table into { headers, rows } where each row is an array of cell text.
// Handles CricClubs pages that use <td> for the header row.
const readTable = ($, tableEl) => {
  const rowEls = []
  $(tableEl).find('tr').each((_, tr) => rowEls.push(tr))
  if (!rowEls.length) return { headers: [], rows: [], headerRowIdx: -1 }

  let headerRowIdx = rowEls.findIndex(tr => $(tr).find('th').length >= 3)
  if (headerRowIdx === -1) headerRowIdx = 0

  const headers = []
  $(rowEls[headerRowIdx]).children().each((_, c) => headers.push(clean($(c).text()).toUpperCase()))

  const rows = []
  for (let i = headerRowIdx + 1; i < rowEls.length; i++) {
    const cells = []
    let link = null
    $(rowEls[i]).children().each((_, c) => {
      cells.push(clean($(c).text()))
      if (!link) {
        const href = $(c).find('a').attr('href')
        if (href) link = href
      }
    })
    if (cells.some(c => c)) rows.push({ cells, link })
  }
  return { headers, rows, headerRowIdx }
}

// CricClubs renders dates in several formats depending on the league's locale,
// and a numeric d/m/y is genuinely ambiguous with m/d/y. When the day is <= 12
// both readings are valid, so the order is configurable; the dry run prints the
// raw text next to the parsed date so the choice can be checked against reality.
const DATE_ORDER = (process.env.CRICCLUBS_DATE_ORDER || 'mdy').toLowerCase()

const parseDate = (raw) => {
  const text = clean(raw)
  if (!text) return null

  const numeric = text.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (numeric) {
    let [, a, b, c] = numeric.map(Number)
    let year, month, day
    if (String(numeric[1]).length === 4) {
      year = a; month = b; day = c              // ISO-ish y/m/d
    } else {
      year = c < 100 ? 2000 + c : c
      // A value over 12 can only be the day, whichever order the site uses.
      if (a > 12) { day = a; month = b }
      else if (b > 12) { month = a; day = b }
      else if (DATE_ORDER === 'dmy') { day = a; month = b }
      else { month = a; day = b }
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // Textual months: "Sat, 10 May 2025", "May 10, 2025", "10-May-2025".
  const parsed = Date.parse(text.replace(/^[A-Za-z]{3},?\s+/, ''))
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10)

  return null
}

const num = (raw) => {
  const m = clean(raw).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

// Turn CricClubs' result sentence into our enum. The sentence names the winner,
// e.g. "TuS Pfarrkirchen won by 5 wickets".
const readResult = (resultText) => {
  const t = clean(resultText)
  const lower = t.toLowerCase()
  if (!t) return { status: 'scheduled', result: null, summary: null }
  if (/abandon/.test(lower)) return { status: 'abandoned', result: 'no result', summary: t }
  if (/cancel/.test(lower)) return { status: 'cancelled', result: null, summary: t }
  if (/no result/.test(lower)) return { status: 'completed', result: 'no result', summary: t }
  if (/\btie[d]?\b|\bdraw\b/.test(lower)) return { status: 'completed', result: 'tied', summary: t }
  if (/\bwon\b|\bbeat\b|\bwins\b/.test(lower)) {
    // Whoever is named before "won"/"beat" is the winner.
    const winner = t.split(/\bwon\b|\bbeat\b|\bwins\b/i)[0]
    return { status: 'completed', result: isUs(winner) ? 'won' : 'lost', summary: t }
  }
  return { status: 'scheduled', result: null, summary: t || null }
}

// CricClubs links are usually root-relative ('/League/viewScorecard.do?...'),
// so they have to be resolved against the page they came from or they are lost.
const absoluteUrl = (link, pageUrl) => {
  if (!link) return null
  try {
    return new URL(link, pageUrl).href
  } catch {
    return /^https?:/i.test(link) ? link : null
  }
}

const parseScheduleTable = ($, tableEl, ctx) => {
  const { headers, rows } = readTable($, tableEl)

  const idx = {
    date:    headerIndex(headers, ['DATE', 'PLAYED ON', 'MATCH DATE']),
    time:    headerIndex(headers, ['TIME', 'START']),
    home:    headerIndex(headers, ['HOME TEAM', 'HOME', 'TEAM 1', 'TEAM A']),
    away:    headerIndex(headers, ['AWAY TEAM', 'AWAY', 'OPPONENT', 'TEAM 2', 'TEAM B', 'VS']),
    venue:   headerIndex(headers, ['GROUND', 'VENUE', 'LOCATION']),
    result:  headerIndex(headers, ['RESULT', 'WINNER', 'SUMMARY', 'STATUS']),
    teams:   headerIndex(headers, ['MATCH', 'TEAMS', 'FIXTURE'])
  }

  const parsed = []
  const skipped = []

  for (const { cells, link } of rows) {
    const at = (i) => (i >= 0 && i < cells.length ? cells[i] : '')

    let homeTeam = at(idx.home)
    let awayTeam = at(idx.away)

    // Some layouts put both sides in one "Match" cell as "A vs B".
    if ((!homeTeam || !awayTeam) && idx.teams >= 0) {
      const parts = at(idx.teams).split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
      if (parts.length === 2) { homeTeam = parts[0]; awayTeam = parts[1] }
    }

    const matchDate = parseDate(at(idx.date))
    if (!matchDate || (!homeTeam && !awayTeam)) {
      skipped.push({ reason: !matchDate ? 'unparseable date' : 'no teams', cells })
      continue
    }

    // Only our own fixtures belong on our site. A division-wide schedule page
    // lists every club's matches, so drop rows we aren't playing in.
    const weAreHome = isUs(homeTeam)
    const weAreAway = isUs(awayTeam)
    if (!weAreHome && !weAreAway) {
      skipped.push({ reason: 'not our match', cells })
      continue
    }

    const { status, result, summary } = readResult(at(idx.result))

    parsed.push({
      cricclubs_match_id: link ? (link.match(/matchId=(\d+)/i)?.[1] ?? null) : null,
      match_date: matchDate,
      match_time: at(idx.time) || null,
      opponent: clean(weAreHome ? awayTeam : homeTeam) || 'Unknown',
      is_home: weAreHome,
      venue: at(idx.venue) || null,
      format: ctx.format,
      competition: ctx.competition || null,
      season: ctx.season,
      status,
      result,
      result_summary: summary,
      scorecard_url: absoluteUrl(link, ctx.pageUrl),
      updated_at: new Date().toISOString()
    })
  }

  return { headers, idx, parsed, skipped }
}

const parseStandingsTable = ($, tableEl, ctx) => {
  const { headers, rows } = readTable($, tableEl)

  const idx = {
    position: headerIndex(headers, ['POS', 'RANK', '#']),
    team:     headerIndex(headers, ['TEAM', 'CLUB', 'NAME']),
    played:   headerIndex(headers, ['PLAYED', 'MAT', 'GP', 'P']),
    won:      headerIndex(headers, ['WON', 'W']),
    lost:     headerIndex(headers, ['LOST', 'L']),
    tied:     headerIndex(headers, ['TIED', 'TIE', 'T']),
    noResult: headerIndex(headers, ['N/R', 'NR', 'NO RESULT']),
    points:   headerIndex(headers, ['PTS', 'POINTS']),
    nrr:      headerIndex(headers, ['NRR', 'NET RUN RATE', 'RUN RATE'])
  }

  const parsed = []
  const skipped = []

  rows.forEach((row, i) => {
    const at = (j) => (j >= 0 && j < row.cells.length ? row.cells[j] : '')
    const team = clean(at(idx.team))
    if (!team) { skipped.push({ reason: 'no team name', cells: row.cells }); return }

    parsed.push({
      season: ctx.season,
      format: ctx.format,
      division: ctx.division || '',
      team_name: team,
      position: num(at(idx.position)) ?? i + 1,
      played: num(at(idx.played)) ?? 0,
      won: num(at(idx.won)) ?? 0,
      lost: num(at(idx.lost)) ?? 0,
      tied: num(at(idx.tied)) ?? 0,
      no_result: num(at(idx.noResult)) ?? 0,
      points: num(at(idx.points)) ?? 0,
      net_run_rate: num(at(idx.nrr)),
      updated_at: new Date().toISOString()
    })
  })

  return { headers, idx, parsed, skipped }
}

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

export const runFixturesSync = async ({ dryRun = false } = {}) => {
  const errors = []
  const report = { dryRun, schedule: [], standings: [] }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !(supabaseServiceKey || supabaseAnonKey)) {
    return { success: false, statusCode: 500, error: 'Supabase environment variables are not configured.' }
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

  const season = Number(process.env.CRICCLUBS_SEASON) || new Date().getFullYear()

  const tasks = [
    { envKey: 'CRICCLUBS_T20_SCHEDULE_URL',    kind: 'schedule',  format: 'T20' },
    { envKey: 'CRICCLUBS_FIFTY_SCHEDULE_URL',  kind: 'schedule',  format: 'Fifty' },
    { envKey: 'CRICCLUBS_T20_STANDINGS_URL',   kind: 'standings', format: 'T20' },
    { envKey: 'CRICCLUBS_FIFTY_STANDINGS_URL', kind: 'standings', format: 'Fifty' }
  ]

  const matchRows = []
  const standingRows = []
  let anyUrlConfigured = false

  for (const task of tasks) {
    const url = process.env[task.envKey]
    if (!url) continue
    anyUrlConfigured = true

    try {
      const $ = loadHtml(await fetchHtml(url))

      if (task.kind === 'schedule') {
        const tableEl = pickTable($, [
          [['DATE', 'PLAYED ON'], 10],
          [['HOME', 'TEAM 1', 'TEAM A', 'MATCH', 'TEAMS'], 6],
          [['RESULT', 'WINNER', 'STATUS'], 5],
          [['GROUND', 'VENUE'], 3]
        ])
        if (!tableEl) throw new Error('no table on the page looked like a schedule')

        const out = parseScheduleTable($, tableEl, { format: task.format, season, pageUrl: url })
        report.schedule.push({
          format: task.format, headers: out.headers, columnMap: out.idx,
          parsed: out.parsed.length, skipped: out.skipped.length,
          sample: out.parsed.slice(0, 3), skippedSample: out.skipped.slice(0, 3)
        })
        matchRows.push(...out.parsed)
      } else {
        const tableEl = pickTable($, [
          [['TEAM', 'CLUB'], 10],
          [['PTS', 'POINTS'], 8],
          [['PLAYED', 'MAT'], 5],
          [['NRR', 'NET RUN RATE'], 3]
        ])
        if (!tableEl) throw new Error('no table on the page looked like a league table')

        const out = parseStandingsTable($, tableEl, { format: task.format, season })
        report.standings.push({
          format: task.format, headers: out.headers, columnMap: out.idx,
          parsed: out.parsed.length, skipped: out.skipped.length,
          sample: out.parsed.slice(0, 3)
        })
        standingRows.push(...out.parsed)
      }
    } catch (err) {
      errors.push(`${task.format} ${task.kind}: ${err.message}`)
    }
  }

  if (!anyUrlConfigured) {
    return {
      success: false,
      statusCode: 400,
      error: 'No CricClubs fixture URLs configured. Set CRICCLUBS_T20_SCHEDULE_URL and/or CRICCLUBS_T20_STANDINGS_URL.'
    }
  }

  // Refuse to write a schedule scrape that found nothing but had rows to look
  // at — that means the column mapping is wrong, and writing would either do
  // nothing useful or bury good data under junk.
  if (!dryRun && matchRows.length === 0 && report.schedule.some(s => s.skipped > 0)) {
    return {
      success: false,
      statusCode: 422,
      error: 'Every schedule row was skipped — the column mapping looks wrong. Re-run with dryRun to see the detected headers.',
      report,
      errors
    }
  }

  if (dryRun) {
    return { success: true, statusCode: 200, dryRun: true, report, errors, wouldWrite: { matches: matchRows.length, standings: standingRows.length } }
  }

  let written = { matches: 0, standings: 0 }

  if (matchRows.length) {
    // Rows carrying a CricClubs id upsert on it; rows without one are matched
    // on the natural key instead so a re-run updates rather than duplicates.
    const withId = matchRows.filter(r => r.cricclubs_match_id)
    const withoutId = matchRows.filter(r => !r.cricclubs_match_id)

    if (withId.length) {
      const { error } = await supabase.from('matches').upsert(withId, { onConflict: 'cricclubs_match_id' })
      if (error) errors.push(`writing matches: ${error.message}`)
      else written.matches += withId.length
    }

    for (const row of withoutId) {
      const { data: existing } = await supabase
        .from('matches').select('id')
        .eq('match_date', row.match_date).eq('opponent', row.opponent).eq('format', row.format)
        .maybeSingle()

      const { error } = existing
        ? await supabase.from('matches').update(row).eq('id', existing.id)
        : await supabase.from('matches').insert(row)

      if (error) errors.push(`writing match ${row.match_date} v ${row.opponent}: ${error.message}`)
      else written.matches += 1
    }
  }

  if (standingRows.length) {
    const { error } = await supabase
      .from('standings')
      .upsert(standingRows, { onConflict: 'season,format,division,team_name' })
    if (error) errors.push(`writing standings: ${error.message}`)
    else written.standings = standingRows.length
  }

  return { success: errors.length === 0, statusCode: 200, report, written, errors }
}
