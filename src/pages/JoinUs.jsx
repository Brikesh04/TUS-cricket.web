import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Helmet from '../components/Helmet'

const JoinForm = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Local simulation for sandbox/localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Localhost detected - Simulating successful Netlify submission')
      setTimeout(() => {
        navigate('/success')
      }, 800)
      return
    }

    // Prepare Netlify form parameters
    const formData = new FormData(e.target)
    const urlSearchParams = new URLSearchParams(formData).toString()

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlSearchParams
      })

      if (response.ok) {
        navigate('/success')
      } else {
        alert(`Something went wrong. (Error ${response.status})`)
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Form submission error:', err)
      alert('Submission error. Please check your internet connection.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="join-form-container">
      <form 
        className="join-form" 
        name="join-form" 
        method="POST" 
        data-netlify="true" 
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="form-name" value="join-form" />
        <input type="hidden" name="subject" value="New Player Application via Website" />
        
        {/* Anti-spam Honeypot Field */}
        <p style={{ display: 'none' }}>
          <label>
            Don’t fill this out if you’re human: <input name="bot-field" />
          </label>
        </p>

        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="John Doe" 
              className="form-input" 
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="john@example.com" 
              className="form-input" 
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              placeholder="+49 123 45678" 
              className="form-input" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Preferred Role</label>
            <select id="role" name="role" className="form-select">
              <option>Batsman</option>
              <option>Bowler (Fast)</option>
              <option>Bowler (Spin)</option>
              <option>All-Rounder</option>
              <option>Wicket Keeper</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="experience" className="form-label">Experience Level</label>
            <select id="experience" name="experience" className="form-select">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Pro</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="message" className="form-label">Additional Notes</label>
            <textarea 
              id="message" 
              name="message" 
              rows="6" 
              placeholder="Tell us a bit about your cricketing journey..." 
              className="form-textarea"
            />
          </div>
        </div>

        <div className="form-footer-section join-form-footer-section">
          <div className="form-group-checkbox join-form-group-checkbox">
            <label className="checkbox-container join-checkbox-label">
              <input type="checkbox" name="privacy-agreement" required className="join-checkbox-input" />
              <span>
                I have read and agree to the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="join-privacy-link">
                  Privacy Policy
                </a>.
              </span>
            </label>
          </div>

          <div className="form-footer join-form-footer">
            <button 
              type="submit" 
              className="btn btn-primary btn-large" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export const JoinUs = () => {
  return (
    <div className="page-join">
      <Helmet>
        <title>Join Us | TuS Cricket</title>
        <meta name="description" content="Join TuS Cricket Pfarrkirchen in Pfarrkirchen, Bavaria. Beginners, students, and experienced players welcome." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/join" />
        <meta property="og:title" content="Join Us | TuS Cricket Pfarrkirchen" />
        <meta property="og:description" content="Join TuS Cricket Pfarrkirchen in Pfarrkirchen, Bavaria. Beginners welcome!" />
        <meta property="og:image" content="https://tus-cricket-pfarrkirchen.de/logo.png" />
        <meta property="og:url" content="https://tus-cricket-pfarrkirchen.de/join" />
      </Helmet>

      <main className="section-padding">
        <div className="container">
          <div className="text-center reveal join-header">
            <h1 className="mb-2 join-title">
              Join the Squad
            </h1>
            <p className="join-subtitle">
              Take your game to the next level with TUS Cricket Club.
            </p>
            <div className="fade-in delay-1 join-free-badge">
              ✨ First session is completely FREE!
            </div>
          </div>

          <div className="reveal delay-2 join-form-wrapper">
            <JoinForm />
          </div>
        </div>
      </main>
    </div>
  )
}

export default JoinUs
