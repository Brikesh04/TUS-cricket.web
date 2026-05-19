import React from 'react'
import Helmet from '../components/Helmet'

export const Impressum = () => {
  return (
    <div className="page-legal">
      <Helmet>
        <title>Impressum | TuS Cricket Pfarrkirchen</title>
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/impressum" />
      </Helmet>

      <main className="section-padding">
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 className="mb-4">Impressum</h1>
          
          <section className="mb-4">
            <h3>Angaben gemäß § 5 TMG</h3>
            <p>
              TuS 1860 Pfarrkirchen e.V. <br />
              Abteilung Cricket <br />
              Peter-Adam-Straße 54 <br />
              84347 Pfarrkirchen
            </p>
          </section>

          <section className="mb-4">
            <h3>Vertreten durch</h3>
            <p>
              1. Vorsitzender: Horst Lackner <br />
              Abteilungsleiter Cricket: Ashwini Balaji
            </p>
          </section>

          <section className="mb-4">
            <h3>Kontakt</h3>
            <p>
              E-Mail:{' '}
              <a href="mailto:tuscricket@gmail.com" style={{ color: 'var(--color-primary)' }}>
                tuscricket@gmail.com
              </a>
            </p>
          </section>

          <section className="mb-4">
            <h3>Registereintrag</h3>
            <p>
              Eintragung im Vereinsregister. <br />
              Registergericht: Amtsgericht Landshut <br />
              Registernummer: VR 10087
            </p>
          </section>

          <section className="mb-4">
            <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
            <p>
              Ashwini Balaji <br />
              Peter-Adam-Straße 54 <br />
              84347 Pfarrkirchen
            </p>
          </section>

          <section>
            <h3>Streitschlichtung</h3>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a 
                href="https://ec.europa.eu/consumers/odr" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--color-primary)', marginLeft: '5px' }}
              >
                https://ec.europa.eu/consumers/odr
              </a>
              . Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Impressum
