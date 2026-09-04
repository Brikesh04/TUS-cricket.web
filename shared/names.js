// One place that decides how a player's name is compared.
//
// CricClubs renders the same player differently across its pages — "Adul
// Sherwin Xavier" on one, "Adul Sherwin XAVIER" on another, sometimes with a
// non-breaking space or a doubled space between parts. Comparing those raw
// creates a second row for the same player, which is how 39 duplicate rows
// accumulated in player_stats. Every comparison goes through normalizeName so
// the variants collapse to one.
export const normalizeName = (name) =>
  String(name ?? '')
    .replace(/ /g, ' ')   // non-breaking space
    .replace(/\s+/g, ' ')      // doubled spaces, tabs, newlines
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
