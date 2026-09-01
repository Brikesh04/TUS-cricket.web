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
 * player: a single all-caps token such as "KANNAJI", "PURAYIL" or "DWIVEDI".
 * A real single-word name ("Pronoy") has lower case and is left alone.
 */
export const isLikelyNameFragment = (name) => {
  const clean = String(name ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return true
  const singleToken = !clean.includes(' ')
  const hasNoLowercase = clean === clean.toUpperCase()
  return singleToken && hasNoLowercase
}
