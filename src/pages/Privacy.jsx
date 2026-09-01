import React, { useEffect } from 'react'
import Helmet from '../components/Helmet'

export const Privacy = () => {

  // These pages are entirely in German while index.html declares lang="en".
  // Screen readers and translation tools rely on this, so set it per route.
  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = 'de'
    return () => { document.documentElement.lang = previous }
  }, [])
  return (
    <div className="page-legal">
      <Helmet>
        <title>Datenschutzerklärung | TuS Cricket Pfarrkirchen</title>
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/privacy" />
      </Helmet>

      <main className="section-padding">
        <div className="container container--narrow">
          <h1 className="mb-4">Datenschutzerklärung</h1>

          <section className="mb-4">
            <h3>1. Datenschutz auf einen Blick</h3>
            <h4>Allgemeine Hinweise</h4>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section className="mb-4">
            <h3>2. Datenerfassung auf unserer Website</h3>
            <h4>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>
            <h4>Wie erfassen wir Ihre Daten?</h4>
            <p>
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
            </p>
            <p>
              Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie unsere Website betreten.
            </p>
          </section>

          <section className="mb-4">
            <h3>3. Ihre Rechte</h3>
            <p>
              Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu verlangen.
            </p>
          </section>

          <section className="mb-4">
            <h3>4. Kontaktformular / Join Us Form</h3>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
          </section>

          <section>
            <h3>5. Hosting durch Netlify</h3>
            <p>
              Wir hosten unsere Website bei Netlify. Anbieter ist die Netlify, Inc., 2325 3rd Street, Suite 215, San Francisco, CA 94107, USA. Netlify ist ein Tool zum Builden, Deployen und Hosten von Websites.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Privacy
