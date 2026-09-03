// Reading a CricClubs stats table, independent of where the HTML came from.
//
// The same page has to be parsed in two places now: on the server by cheerio,
// and in the browser by a bookmarklet, because Cloudflare's challenge stops the
// server reaching CricClubs at all. Two hand-maintained copies of this logic is
// exactly what went wrong with the old bookmarklet — they drifted, and one
// reset fields the other didn't — so both callers reduce their tables to plain
// text and share everything below.
//
// A table is: { ths: string[], rows: string[][] }
//   ths  — text of the <th> cells, used only to decide which table is the one
//   rows — every <tr>, as the text of its cells, header row included

const upper = (s) => String(s ?? '').trim().toUpperCase()

const NAME_HEADER = (h) =>
  h.includes('PLAYER') || h === 'NAME' || h.includes('BATSMAN') ||
  h.includes('BATTER') || h.includes('BOWLER') || h.includes('FIELDER')

// CricClubs wraps its content in nested layout tables, so "the first table" is
// never the right one. Score each on how much it looks like a stats grid.
export const pickStatsTable = (tables) => {
  let best = null
  let bestScore = -1

  for (const table of tables) {
    const ths = (table.ths || []).map(upper)
    if (ths.length <= 4) continue

    let score = 0
    if (ths.some(NAME_HEADER)) score += 10
    if (ths.some(h => h === 'M' || h.includes('MAT') || h.includes('MATCHES'))) score += 5
    if (ths.some(h => h === 'R' || h.includes('RUNS') || h === 'W' || h.includes('WKTS') || h.includes('CATCH'))) score += 5

    if (score > bestScore) {
      bestScore = score
      best = table
    }
  }

  return bestScore > 0 ? best : null
}

// The header row is not always the first: CricClubs puts title and filter rows
// above it. Find the first row with enough cells that names a player column.
export const findHeaderRow = (rows) => {
  const idx = rows.findIndex(cells => cells.length > 4 && cells.map(upper).some(NAME_HEADER))
  return idx === -1 ? 0 : idx
}

export const findNameColumn = (headers) => {
  const idx = headers.map(upper).findIndex(NAME_HEADER)
  return idx === -1 ? 1 : idx
}

// Strip the captain/keeper marks CricClubs appends, and collapse whitespace —
// including the non-breaking spaces it sometimes emits, which JS \s covers.
export const cleanScrapedName = (raw) =>
  String(raw ?? '')
    .replace(/\(c\)|\(wk\)|\*|†/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

// Summary rows carried in the same table as the players.
export const isNoiseRow = (name) =>
  !name ||
  name.includes('Extras') ||
  name.includes('Total') ||
  name.includes('Did not bat')

const columnFor = (headers, test) => headers.map(upper).findIndex(test)
const int = (cells, i) => (i >= 0 ? parseInt(cells[i], 10) || 0 : null)
const num = (cells, i) => (i >= 0 ? parseFloat(cells[i]) || 0 : null)

const FIELDS = {
  Batting: (headers, cells) => ({
    runs: int(cells, columnFor(headers, h => h === 'R' || h.includes('RUNS'))),
    balls_faced: int(cells, columnFor(headers, h => h === 'BF' || h.includes('BALLS'))),
    batting_avg: num(cells, columnFor(headers, h => h === 'AVG' || h.includes('AVERAGE'))),
    strike_rate: num(cells, columnFor(headers, h => h === 'SR' || h.includes('STRIKE')))
  }),

  Bowling: (headers, cells) => ({
    wickets: int(cells, columnFor(headers, h => h === 'W' || h.includes('WKTS') || h.includes('WICKETS'))),
    overs: num(cells, columnFor(headers, h => h === 'O' || h.includes('OVERS'))),
    runs_conceded: int(cells, columnFor(headers, h => h === 'R' || h.includes('RUNS') || h.includes('CONCEDED'))),
    economy: num(cells, columnFor(headers, h => h === 'ECON' || h === 'E' || h.includes('ECONOMY'))),
    bowling_avg: num(cells, columnFor(headers, h => h === 'AVG' || h.includes('AVERAGE')))
  }),

  // Fielding spreads dismissals over several columns whose names vary, so every
  // column is inspected and the ones that count a dismissal are summed. The
  // 'WK' test runs first: a wicketkeeper catch column must not also be counted
  // as an outfield catch.
  Fielding: (headers, cells) => {
    let total = 0
    headers.map(upper).forEach((header, idx) => {
      const value = parseInt(cells[idx], 10) || 0
      const isWkCatch = header.includes('WK') && (header.includes('CATCH') || header.includes('CT') || header.includes('C'))
      const isCatch = (header.includes('CATCH') || header === 'C' || header === 'CT') && !header.includes('WK')
      const isStumping = header.includes('STUMP') || header === 'ST' || header === 'S'
      const isRunOut = header.includes('RO') || header.includes('RUNOUT') ||
        header.includes('RUN OUT') || header.includes('DIRECT') || header.includes('INDIRECT')

      if (isWkCatch || isCatch || isStumping || isRunOut) total += value
    })
    return { catches: total }
  }
}

// Returns one entry per player row: the cleaned name, matches, and the fields
// this page type carries. Fields whose column is absent come back null so a
// caller can tell "not on this page" from "genuinely zero".
export const parseStatsTable = (table, type) => {
  const rows = table.rows || []
  const headerRowIdx = findHeaderRow(rows)
  const headers = rows[headerRowIdx] || []
  const nameIdx = findNameColumn(headers)
  const matchesIdx = columnFor(headers, h => h === 'M' || h.includes('MAT') || h.includes('MATCHES'))
  const fieldsFor = FIELDS[type]
  if (!fieldsFor) throw new Error(`Unknown stats page type: ${type}`)

  const out = []
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.length < 4) continue

    const player_name = cleanScrapedName(cells[nameIdx])
    if (isNoiseRow(player_name)) continue

    out.push({
      player_name,
      matches: int(cells, matchesIdx) ?? 0,
      ...fieldsFor(headers, cells)
    })
  }
  return out
}
