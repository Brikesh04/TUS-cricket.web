import React from 'react'
import { Link } from 'react-router-dom'
import Helmet from '../components/Helmet'

export const Home = () => {
  return (
    <div className="page-home">
      <Helmet>
        <title>TuS Cricket | Cricket Club in Pfarrkirchen</title>
        <meta name="description" content="Official cricket department of TuS 1860 Pfarrkirchen e.V. Indoor winter training and summer league matches (T20 + 50 overs Verbandsliga). Beginners and students welcome." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:title" content="TuS Cricket Pfarrkirchen | Cricket Club in Pfarrkirchen" />
        <meta property="og:description" content="Official cricket department of TuS 1860 Pfarrkirchen e.V. Indoor winter training and summer league matches." />
        <meta property="og:image" content="https://tus-cricket-pfarrkirchen.de/logo.png" />
        <meta property="og:url" content="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <main>
        {/* Masthead */}
        <header className="masthead fade-in">
          <div className="container">
            <img src="/logo.png" alt="" className="masthead-crest" />
            <h1 className="masthead-title">TuS Cricket</h1>
            <div className="masthead-rules" role="presentation"></div>
            <div className="masthead-meta">
              <span>Pfarrkirchen</span>
              <span>Gegründet 1860</span>
              <span>Verbandsliga</span>
            </div>
            <p className="masthead-sub">
              The cricket department of TuS 1860 Pfarrkirchen e.V. — T20 and 50 overs,
              indoors through the winter, on grass all summer.
            </p>
            <div className="masthead-actions">
              <Link to="/join" className="btn">Join the Team</Link>
              <Link to="/squad" className="btn btn-secondary">Meet the Squad</Link>
            </div>
          </div>
        </header>

        {/* Town plate */}
        <div className="skyline-band">
          <div className="container">
            <img src="/pfarrkirchen-skyline.png" alt="The Pfarrkirchen town silhouette" />
          </div>
        </div>

        {/* Trial line */}
        <div className="trial-line">
          <div className="container">
            <p>
              New to cricket? Your first session is free —{' '}
              <Link to="/join" className="text-link">come and try it</Link>.
            </p>
          </div>
        </div>

        {/* Training */}
        <section className="section-padding">
          <div className="container">
            <div className="section-head">
              <h2>Training &amp; Season</h2>
              <span className="label">All welcome · Beginners included</span>
            </div>

            <div className="timetable-grid">
              <div className="timetable">
                <h3>Winter</h3>
                <span className="label">Indoor</span>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Saturday</td><td>12:00 – 16:00</td></tr>
                    <tr><td>Sunday</td><td>10:00 – 15:00</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="timetable">
                <h3>Summer</h3>
                <span className="label">Outdoor · League</span>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Competition</th>
                      <th scope="col">Format</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Verbandsliga</td><td>T20</td></tr>
                    <tr><td>Verbandsliga</td><td>50 Overs</td></tr>
                  </tbody>
                </table>
                <p className="timetable-note">
                  Match fixtures run through the summer at our home ground on
                  Peter-Adam-Straße.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Club */}
        <section className="section-padding" style={{ paddingTop: 0 }}>
          <div className="container container--narrow">
            <div className="section-head">
              <h2>The Club</h2>
              <span className="label">Gegründet 1860</span>
            </div>
            <div className="prose">
              <p className="history-lead">
                TuS 1860 e.V. Pfarrkirchen is a historic multi-sport club deeply rooted in
                the local community. As a proud department of this club, we uphold its core
                values—discipline, respect, and teamwork—while fostering a dynamic and
                competitive cricket culture in Pfarrkirchen.
              </p>
              <p>
                We offer structured training, intense league competition, and dedicated
                support for player development at all levels. If you seek consistent
                cricket, unwavering team spirit, and the honour of representing
                TuS 1860 e.V., you have found your home.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
