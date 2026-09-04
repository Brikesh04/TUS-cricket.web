import React, { useEffect, useState } from 'react'
import Helmet from '../components/Helmet'
import { supabase } from '../supabaseClient'
import { formatMatchDate } from '../hooks/useSeasonSnapshot'

const RESULT_LABEL = { won: 'Won', lost: 'Lost', tied: 'Tied', 'no result': 'No result' }

const MatchRow = ({ match }) => {
  const played = match.status === 'completed' || match.status === 'abandoned'
  return (
    <tr>
      <td className="col-date">
        <span className="fx-date">{formatMatchDate(match.match_date)}</span>
        <span className="fx-year">{match.match_date.slice(0, 4)}</span>
      </td>
      <td className="col-opponent">
        <span className="fx-vs">{match.is_home ? 'v' : 'away to'}</span> {match.opponent}
        {match.venue && <span className="fx-venue">{match.venue}</span>}
      </td>
      <td className="col-format">{match.format || '—'}</td>
      <td className="col-outcome">
        {played ? (
          <>
            {match.result && (
              <span className={`result-badge result-${match.result.replace(/\s/g, '-')}`}>
                {RESULT_LABEL[match.result] || match.result}
              </span>
            )}
            {match.result_summary && <span className="fx-summary">{match.result_summary}</span>}
          </>
        ) : (
          <span className="fx-time">{match.match_time || 'Time TBC'}</span>
        )}
      </td>
    </tr>
  )
}

const MatchTable = ({ caption, matches }) => (
  <div className="scorecard-wrap fixtures-wrap">
    <table className="scorecard fixtures-table">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="col-date">Date</th>
          <th scope="col" className="col-opponent">Opponent</th>
          <th scope="col" className="col-format">Format</th>
          <th scope="col" className="col-outcome">{caption === 'Results' ? 'Result' : 'Start'}</th>
        </tr>
      </thead>
      <tbody>
        {matches.map(m => <MatchRow key={m.id} match={m} />)}
      </tbody>
    </table>
  </div>
)

export const Fixtures = () => {
  const [state, setState] = useState({ loading: true, error: null, upcoming: [], results: [] })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!supabase) {
        if (!cancelled) setState({ loading: false, error: 'not-configured', upcoming: [], results: [] })
        return
      }
      const { data, error } = await supabase.from('matches').select('*').order('match_date', { ascending: false })
      if (cancelled) return
      if (error) {
        setState({ loading: false, error: error.message, upcoming: [], results: [] })
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      const all = data || []
      setState({
        loading: false,
        error: null,
        upcoming: all
          .filter(m => m.status === 'scheduled' && m.match_date >= today)
          .sort((a, b) => a.match_date.localeCompare(b.match_date)),
        results: all.filter(m => m.status === 'completed' || m.status === 'abandoned')
      })
    }

    load()
    return () => { cancelled = true }
  }, [])

  const { loading, error, upcoming, results } = state
  const nothing = !loading && !error && !upcoming.length && !results.length

  return (
    <div className="page-fixtures">
      <Helmet>
        <title>Fixtures &amp; Results | TuS Cricket</title>
        <meta name="description" content="TuS Cricket Pfarrkirchen fixtures and results from the Bavarian Verbandsliga, in T20 and 50-over cricket." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/fixtures" />
        <meta property="og:title" content="Fixtures & Results | TuS Cricket Pfarrkirchen" />
        <meta property="og:description" content="Fixtures and results from the Bavarian Verbandsliga." />
        <meta property="og:image" content="https://tus-cricket-pfarrkirchen.de/logo.png" />
        <meta property="og:url" content="https://tus-cricket-pfarrkirchen.de/fixtures" />
      </Helmet>

      <main className="section-padding">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The season</span>
            <h1>Fixtures &amp; results</h1>
            <p>
              Everything we play in the Verbandsliga, T20 and 50 overs. Home matches
              are at our ground on Peter-Adam-Straße — anyone is welcome to come
              and watch.
            </p>
          </div>

          {loading && <p className="fx-state">Loading the season…</p>}

          {error === 'not-configured' && (
            <p className="fx-state">Fixtures are temporarily unavailable.</p>
          )}
          {error && error !== 'not-configured' && (
            <p className="fx-state">Could not load fixtures right now. Please try again shortly.</p>
          )}

          {nothing && (
            <p className="fx-state">
              No fixtures are listed yet. They appear here automatically once the
              season schedule is published.
            </p>
          )}

          {!!upcoming.length && (
            <section className="fixtures-block">
              <h2>Coming up</h2>
              <MatchTable caption="Upcoming fixtures" matches={upcoming} />
            </section>
          )}

          {!!results.length && (
            <section className="fixtures-block">
              <h2>Results</h2>
              <MatchTable caption="Results" matches={results} />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default Fixtures
