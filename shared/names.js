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
