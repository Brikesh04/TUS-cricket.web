// Which season the scraper should write into.
//
// The Bavarian league runs April to September. Before April the current year
// has no fixtures yet, so the tables CricClubs is still serving belong to the
// previous season — writing them under the new year would insert a duplicate
// set of every player's figures rather than update last season's rows.
//
// `CRICCLUBS_SEASON` overrides this whenever a season needs pinning by hand.
export const resolveSeason = (now = new Date()) => {
  const seasonUnderway = now.getMonth() >= 3 // 0-based: 3 = April
  return String(seasonUnderway ? now.getFullYear() : now.getFullYear() - 1)
}
