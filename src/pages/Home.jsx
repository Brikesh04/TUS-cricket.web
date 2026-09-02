import React from 'react'
import { Link } from 'react-router-dom'
import Helmet from '../components/Helmet'
import { useSeasonSnapshot, formatMatchDate } from '../hooks/useSeasonSnapshot'

const ResultBadge = ({ result }) => {
  if (!result) return null
  const label = { won: 'Won', lost: 'Lost', tied: 'Tied', 'no result': 'No result' }[result] || result
  return <span className={`result-badge result-${result.replace(/\s/g, '-')}`}>{label}</span>
}

// Last result and next fixture, side by side. This is what a club site is for;
// it renders only when there is actually something to show.
const MatchStrip = ({ lastResult, nextFixture }) => {
  if (!lastResult && !nextFixture) return null

  return (
    <section className="match-strip">
      <div className="container">
        <div className="match-strip-inner">
          {lastResult && (
            <article className="match-card">
              <p className="match-kicker">Last time out</p>
              <p className="match-teams">
                <span className="match-vs">{lastResult.is_home ? 'v' : 'away to'}</span>{' '}
                {lastResult.opponent}
              </p>
              <p className="match-meta">
                {formatMatchDate(lastResult.match_date, { year: 'numeric' })}
                {lastResult.venue ? ` · ${lastResult.venue}` : ''}
              </p>
              <div className="match-outcome">
                <ResultBadge result={lastResult.result} />
                {lastResult.result_summary && (
                  <span className="match-summary">{lastResult.result_summary}</span>
                )}
              </div>
            </article>
          )}

          {nextFixture && (
            <article className="match-card match-card--next">
              <p className="match-kicker">Next up</p>
              <p className="match-teams">
                <span className="match-vs">{nextFixture.is_home ? 'v' : 'away to'}</span>{' '}
                {nextFixture.opponent}
              </p>
              <p className="match-meta">
                {formatMatchDate(nextFixture.match_date, { weekday: 'long', year: 'numeric' })}
                {nextFixture.match_time ? ` · ${nextFixture.match_time}` : ''}
              </p>
              <p className="match-where">
                {nextFixture.is_home
                  ? 'At our ground on Peter-Adam-Straße — come and watch.'
                  : `Away at ${nextFixture.venue || 'their ground'}.`}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

const LeagueTable = ({ table, season }) => {
  if (!table.length) return null

  return (
    <div className="table-panel">
      <div className="panel-head">
        <h2>{season} table</h2>
        {table[0]?.format && <span className="panel-note">{table[0].format}</span>}
      </div>
      <div className="scorecard-wrap">
        <table className="scorecard standings-table">
          <thead>
            <tr>
              <th scope="col" className="col-pos">#</th>
              <th scope="col" className="col-team">Team</th>
              <th scope="col" className="num">P</th>
              <th scope="col" className="num">W</th>
              <th scope="col" className="num">L</th>
              <th scope="col" className="num">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map(row => {
              const us = row.team_name.toLowerCase().includes('pfarrkirchen')
              return (
                <tr key={row.id} className={us ? 'is-us' : undefined}>
                  <td className="col-pos">{row.position}</td>
                  <td className="col-team team-cell">{row.team_name}</td>
                  <td className="num">{row.played}</td>
                  <td className="num">{row.won}</td>
                  <td className="num">{row.lost}</td>
                  <td className="num strong">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const SeasonPanel = ({ snapshot }) => {
  const { season, played, won, ourTeam, topRuns, topWickets, recent } = snapshot
  const hasAny = played > 0 || ourTeam || topRuns || topWickets
  if (!hasAny) return null

  return (
    <div className="season-panel">
      <div className="panel-head">
        <h2>{season} so far</h2>
      </div>

      <dl className="season-figures">
        {played > 0 && (
          <div>
            <dt>Played</dt>
            <dd>{played}</dd>
          </div>
        )}
        {played > 0 && (
          <div>
            <dt>Won</dt>
            <dd>{won}</dd>
          </div>
        )}
        {ourTeam?.position && (
          <div>
            <dt>In the table</dt>
            <dd>{ourTeam.position}<span className="ord">{ordinal(ourTeam.position)}</span></dd>
          </div>
        )}
      </dl>

      {(topRuns || topWickets) && (
        <ul className="leaders">
          {topRuns && (
            <li>
              <span className="leader-role">Most runs</span>
              <span className="leader-name">{topRuns.player_name}</span>
              <span className="leader-figure">{topRuns.runs}</span>
            </li>
          )}
          {topWickets && (
            <li>
              <span className="leader-role">Most wickets</span>
              <span className="leader-name">{topWickets.player_name}</span>
              <span className="leader-figure">{topWickets.wickets}</span>
            </li>
          )}
        </ul>
      )}

      {recent.length > 1 && (
        <ul className="form-list">
          <li className="form-label">Recent</li>
          {recent.map(m => (
            <li key={m.id} className={`form-pill form-${(m.result || 'none').replace(/\s/g, '-')}`}
                title={`${m.is_home ? 'v' : 'away to'} ${m.opponent} — ${m.result_summary || 'no result'}`}>
              {({ won: 'W', lost: 'L', tied: 'T' })[m.result] || '–'}
            </li>
          ))}
        </ul>
      )}

      <Link to="/squad" className="panel-link">Full squad and season stats →</Link>
    </div>
  )
}

export const Home = () => {
  const snapshot = useSeasonSnapshot()
  const hasCricket = Boolean(
    snapshot.lastResult || snapshot.nextFixture || snapshot.table.length || snapshot.played
  )

  return (
    <div className="page-home">
      <Helmet>
        <title>TuS Cricket | Cricket Club in Pfarrkirchen</title>
        <meta name="description" content="Cricket in Pfarrkirchen, Bavaria. Fixtures, results and the league table from the Verbandsliga, plus training times. Beginners welcome — your first session is free." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:title" content="TuS Cricket Pfarrkirchen | Cricket Club in Pfarrkirchen" />
        <meta property="og:description" content="Fixtures, results and the table from the Verbandsliga. Beginners welcome — your first session is free." />
        <meta property="og:image" content="https://tus-cricket-pfarrkirchen.de/logo.png" />
        <meta property="og:url" content="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <main>
        <section className="hero on-dark">
          <div className="hero-body">
            <div className="hero-body-inner">
              <span className="eyebrow">TuS 1860 Pfarrkirchen</span>
              <h1>Cricket in Pfarrkirchen.</h1>
              <p className="hero-lead">
                We play T20 and 50-over cricket in the Verbandsliga, and train all
                year — indoors through the winter, out on the grass in summer.
              </p>
              <div className="hero-actions">
                <Link to="/join" className="btn btn-large">Come to a session</Link>
                <Link to="/squad" className="btn btn-secondary btn-large">Meet the squad</Link>
              </div>
            </div>
          </div>
          <div className="hero-media">
            <img
              src="/team/team-group.jpg"
              alt="The TuS Cricket squad together at the ground on a sunny training day"
            />
          </div>
        </section>

        <MatchStrip lastResult={snapshot.lastResult} nextFixture={snapshot.nextFixture} />

        {hasCricket && (
          <section className="section-padding">
            <div className="container">
              <div className="cricket-grid">
                <SeasonPanel snapshot={snapshot} />
                <LeagueTable table={snapshot.table} season={snapshot.season} />
              </div>
            </div>
          </section>
        )}

        <section className={hasCricket ? 'section-padding section-tint' : 'section-padding'}>
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">When we play</span>
              <h2>Training</h2>
              <p>
                Drop in on any session — no need to book, and there is always a spare
                bat. Just turn up in something you can run in.
              </p>
            </div>

            <div className="training-grid">
              <div className="training-card">
                <h3>Winter <span className="tag">Indoor</span></h3>
                <ul className="training-list">
                  <li><span className="day">Saturday</span><span className="time">12:00 – 16:00</span></li>
                  <li><span className="day">Sunday</span><span className="time">10:00 – 15:00</span></li>
                </ul>
                <p className="training-note">Nets and fitness in the hall while the ground is frozen.</p>
              </div>

              <div className="training-card">
                <h3>Summer <span className="tag">Outdoor</span></h3>
                <ul className="training-list">
                  <li><span className="day">Verbandsliga</span><span className="time">T20</span></li>
                  <li><span className="day">Verbandsliga</span><span className="time">50 overs</span></li>
                </ul>
                <p className="training-note">
                  Home matches at our ground on Peter-Adam-Straße. Come and watch —
                  there is usually tea.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="invite">
          <div className="container">
            <div className="invite-inner">
              <div>
                <h2>New to cricket? Start with us.</h2>
                <p>
                  Your first session is free, kit included. Quite a few of us had never
                  played before joining — tell us a bit about yourself and we&rsquo;ll
                  let you know when to come down.
                </p>
              </div>
              <Link to="/join" className="btn btn-large">Join the club</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
