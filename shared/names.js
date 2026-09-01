// Player-name handling, shared by the scraper and the Squad page.
//
// CricClubs cells arrive with tabs, non-breaking spaces and doubled spaces,
// and the name-column heuristic occasionally grabs a partial cell. Comparing
// raw strings therefore fails silently: a stats row simply never matches a
// squad member and disappears from the site with no error anywhere.

/**
 * Canonical form used for every name comparison: collapse all whitespace
 * (tabs, NBSP, doubled spaces) to single spaces, trim, casefold.
 * Never store this — it is a comparison key, not a display value.
 */
export const normalizeName = (name) =>
  String(name ?? '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * True for values that are almost certainly a misread cell rather than a
 * player: names with no lowercase at all — "KANNAJI", "PURAYIL", "DWIVEDI",
 * "KRISHNA KANNAJI" — each a trailing fragment of a real squad name that the
 * column heuristic clipped. Genuine entries are mixed case, so "Pronoy" and
 * "Anil Tiwari" pass.
 *
 * If CricClubs ever rendered a table entirely in capitals this would reject
 * every row, so callers must treat "rejected outnumber accepted" as a FAILED
 * scrape rather than an empty one. Otherwise the ghost-record pass reads the
 * absence as "nobody played" and zeroes everyone. runStatsSync does exactly
 * that, and reports rejected names rather than dropping them silently.
 */
export const isLikelyNameFragment = (name) => {
  const clean = String(name ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return true
  // No lowercase anywhere. Real entries in this feed are mixed case.
  return !/[a-z]/.test(clean)
}
