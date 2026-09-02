import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const today = () => new Date().toISOString().slice(0, 10)

// Everything the home page needs about the season, in one round trip each for
// matches, the league table and player stats. Returns nulls rather than
// throwing when a section has no data yet, so the page can simply omit it.
export const useSeasonSnapshot = () => {
  const [state, setState] = useState({
    loading: true,
    error: null,
    season: null,
    lastResult: null,
    nextFixture: null,
    recent: [],
    table: [],
    ourTeam: null,
    topRuns: null,
    topWickets: null,
    played: 0,
    won: 0
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!supabase) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: 'not-configured' }))
        return
      }

      try {
        const [{ data: matches, error: mErr }, { data: standings, error: sErr }] = await Promise.all([
          supabase.from('matches').select('*').order('match_date', { ascending: false }),
          supabase.from('standings').select('*').order('position', { ascending: true })
        ])
        if (mErr) throw mErr
        if (sErr) throw sErr

        const allMatches = matches || []
        const season =
          allMatches.find(m => m.season)?.season ??
          (standings || []).find(t => t.season)?.season ??
          new Date().getFullYear()

        const now = today()
        const completed = allMatches
          .filter(m => m.status === 'completed' || m.status === 'abandoned')
          .sort((a, b) => b.match_date.localeCompare(a.match_date))

        // A fixture is "next" only if it hasn't happened yet; a scheduled row
        // whose date has passed is stale data, not an upcoming match.
        const upcoming = allMatches
          .filter(m => m.status === 'scheduled' && m.match_date >= now)
          .sort((a, b) => a.match_date.localeCompare(b.match_date))

        const seasonMatches = completed.filter(m => m.season === season)

        const table = (standings || []).filter(t => t.season === season)
        const ourTeam = table.find(t => t.team_name.toLowerCase().includes('pfarrkirchen')) || null

        const { data: stats } = await supabase
          .from('player_stats')
          .select('player_name, runs, wickets, season')
          .eq('season', season)

        const rows = stats || []
        const byRuns = [...rows].sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))[0]
        const byWickets = [...rows].sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))[0]

        if (cancelled) return
        setState({
          loading: false,
          error: null,
          season,
          lastResult: completed[0] || null,
          nextFixture: upcoming[0] || null,
          recent: completed.slice(0, 5),
          table,
          ourTeam,
          topRuns: byRuns && byRuns.runs > 0 ? byRuns : null,
          topWickets: byWickets && byWickets.wickets > 0 ? byWickets : null,
          played: seasonMatches.length,
          won: seasonMatches.filter(m => m.result === 'won').length
        })
      } catch (err) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: err.message }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}

export const formatMatchDate = (iso, opts = {}) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...opts })
}
