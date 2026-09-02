import React from 'react'
import { Link } from 'react-router-dom'
import Helmet from '../components/Helmet'

export const Home = () => {
  return (
    <div className="page-home">
      <Helmet>
        <title>TuS Cricket | Cricket Club in Pfarrkirchen</title>
        <meta name="description" content="Cricket in Pfarrkirchen, Bavaria. We train indoors through the winter and play T20 and 50-over league cricket all summer. Beginners welcome — your first session is free." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:title" content="TuS Cricket Pfarrkirchen | Cricket Club in Pfarrkirchen" />
        <meta property="og:description" content="Cricket in Pfarrkirchen, Bavaria. Beginners welcome — your first session is free." />
        <meta property="og:image" content="https://tus-cricket-pfarrkirchen.de/logo.png" />
        <meta property="og:url" content="https://tus-cricket-pfarrkirchen.de/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <main>
        {/* Hero — the squad, on a good day */}
        <section className="hero on-dark">
          <div className="hero-body">
            <div className="hero-body-inner">
              <span className="eyebrow">TuS 1860 Pfarrkirchen</span>
              <h1>Cricket in Pfarrkirchen.</h1>
              <p className="hero-lead">
                We train indoors through the winter and play all summer in the
                Verbandsliga. Never held a bat before? That is genuinely fine — most of
                us started somewhere, and your first session is on us.
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

        {/* Quick facts */}
        <section className="facts">
          <div className="container">
            <div className="facts-inner">
              <div>
                <div className="fact-k">Since 1860</div>
                <p className="fact-v">The cricket side of TuS 1860 Pfarrkirchen e.V.</p>
              </div>
              <div>
                <div className="fact-k">Verbandsliga</div>
                <p className="fact-v">League cricket in T20 and 50-over formats</p>
              </div>
              <div>
                <div className="fact-k">All year</div>
                <p className="fact-v">Indoors in winter, out on the grass in summer</p>
              </div>
              <div>
                <div className="fact-k">Everyone</div>
                <p className="fact-v">Beginners, students, families — all welcome</p>
              </div>
            </div>
          </div>
        </section>

        {/* Training */}
        <section className="section-padding">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">When we play</span>
              <h2>Training &amp; season</h2>
              <p>
                Drop in on any training session — no need to book, and there is always
                a spare bat. Just turn up in something you can run in.
              </p>
            </div>

            <div className="training-grid">
              <div className="training-card">
                <h3>Winter <span className="tag">Indoor</span></h3>
                <ul className="training-list">
                  <li><span className="day">Saturday</span><span className="time">12:00 – 16:00</span></li>
                  <li><span className="day">Sunday</span><span className="time">10:00 – 15:00</span></li>
                </ul>
                <p className="training-note">
                  Nets and fitness in the hall while the ground is frozen.
                </p>
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

        {/* Invite */}
        <section className="invite">
          <div className="container">
            <div className="invite-inner">
              <div>
                <h2>New to cricket? Start with us.</h2>
                <p>
                  Your first session is free, kit included. Tell us a little about
                  yourself and we will let you know when to come down.
                </p>
              </div>
              <Link to="/join" className="btn btn-large">Join the club</Link>
            </div>
          </div>
        </section>

        {/* Club */}
        <section className="section-padding section-tint">
          <div className="container">
            <div className="club-grid">
              <div>
                <span className="eyebrow">About us</span>
                <h2>A cricket club in Lower Bavaria</h2>
                <div className="prose" style={{ marginTop: 'var(--space-4)' }}>
                  <p>
                    TuS 1860 Pfarrkirchen is a multi-sport club that has been part of this
                    town for well over a century. We are its cricket department — a mix of
                    people who grew up with the game and people who picked up a bat for the
                    first time here in Pfarrkirchen.
                  </p>
                  <p>
                    We take the league seriously and everything else a good deal less so.
                    If you want regular cricket, a team that travels together and somewhere
                    to spend your Saturdays, come and find us.
                  </p>
                </div>
              </div>
              <figure>
                <img src="/pfarrkirchen-skyline.png" alt="The Pfarrkirchen town silhouette" />
              </figure>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
