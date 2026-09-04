import React from 'react'
import { Mail, MapPin } from 'lucide-react'
import Helmet from '../components/Helmet'

export const Contact = () => {
  return (
    <div className="page-contact">
      <Helmet>
        <title>Contact Us | TuS Cricket Pfarrkirchen</title>
        <meta name="description" content="Get in touch with TuS Cricket Pfarrkirchen. Contact us for training inquiries, friendly matches, or sponsorship." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/contact" />
      </Helmet>

      <main className="section-padding">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Say hello</span>
            <h1>Get in touch</h1>
            <p>Questions about training, a friendly fixture, or just want to come and watch? Drop us a line.</p>
          </div>

          <div className="contact-grid">
            {/* Email Card */}
            <div className="contact-card">
              <div className="contact-card-icon">
                <Mail size={40} strokeWidth={1.5} />
              </div>
              <h3 className="contact-card-title">Email Us</h3>
              <p className="contact-card-text">For training inquiries & matches</p>
              <a href="mailto:tuscricket@gmail.com" className="btn btn-secondary">
                tuscricket@gmail.com
              </a>
            </div>

            {/* Visit Card */}
            <div className="contact-card">
              <div className="contact-card-icon">
                <MapPin size={40} strokeWidth={1.5} />
              </div>
              <h3 className="contact-card-title">Visit Us</h3>
              <p className="contact-card-text">Our home ground, out on Peter-Adam-Stra&szlig;e.</p>
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=Peter-Adam-Straße+52,+84347+Pfarrkirchen" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary"
              >
                Peter-Adam-Straße 52
              </a>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div id="location-map" className="contact-map">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2647.606915640246!2d12.933402175822946!3d48.425690431060374!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4775b17317668aa9%3A0x453353125ac9a1c0!2sPeter-Adam-Stra%C3%9Fe%2052%2C%2084347%20Pfarrkirchen!5e0!3m2!1sen!2sde!4v1769038923194!5m2!1sen!2sde" 
              width="100%" 
              height="450" 
              className="contact-map-iframe"
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Contact
