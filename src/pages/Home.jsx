import React from 'react'
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
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-overlay"></div>
          <div className="container hero-container">
            <div className="hero-content fade-in">
              <h1 className="hero-title reveal delay-1">
                Cricket Excellence <br />
                <span className="text-primary">In Pfarrkirchen.</span>
              </h1>
              <p className="hero-subtitle reveal delay-3">
                Home of the official cricket department of TuS 1860 Pfarrkirchen. Where tradition meets talent, and every beginner finds a home.
              </p>
              <div className="hero-actions reveal delay-5">
                <a href="/join" className="btn btn-primary">Join the Team</a>
                <a href="/squad" className="btn btn-secondary">Meet the Squad</a>
              </div>
            </div>
          </div>
        </section>

        {/* Info & Training Section */}
        <section className="section-padding reveal">
          <div className="container">
            {/* Trial Session Alert */}
            <div className="trial-cta-container">
              <a href="/join" className="trial-cta-button fade-in delay-2">
                <div className="trial-cta-text">
                  <span className="trial-cta-icon">✨</span>
                  Beginner? Come for a FREE trial session!
                </div>
              </a>
            </div>

            {/* Training Calendars Grid */}
            <div className="grid-training">
              <div className="glass shadow-md training-card reveal delay-3">
                <div className="training-icon">❄️</div>
                <h3 className="training-title">Training (Winter – Indoor)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>Saturday:</strong> 12:00 – 16:00
                  </li>
                  <li>
                    <strong>Sunday:</strong> 10:00 – 15:00
                  </li>
                </ul>
              </div>

              <div className="glass shadow-md training-card reveal delay-5">
                <div className="training-icon">☀️</div>
                <h3 className="training-title">Summer Season</h3>
                <p>
                  We play T20 and 50 overs in the{' '}
                  <strong className="text-accent">Verbandsliga</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Club Heritage & Skyline */}
        <section className="skyline-section">
          <div className="container">
            <div className="skyline-grid">
              <div className="skyline-image-container">
                <img src="/pfarrkirchen-skyline.png" alt="Pfarrkirchen" className="skyline-image" />
              </div>
              <div className="skyline-content">
                <h2>Cricket at TuS 1860 e.V. Pfarrkirchen</h2>
                <p>
                  TuS 1860 e.V. Pfarrkirchen is a historic multi-sport club deeply rooted in the local community. As a proud department of this club, we uphold its core values—discipline, respect, and teamwork—while fostering a dynamic and competitive cricket culture in Pfarrkirchen. We offer structured training, intense league competition, and dedicated support for player development at all levels. If you seek consistent cricket, unwavering team spirit, and the honor of representing TuS 1860 e.V., you have found your home.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
