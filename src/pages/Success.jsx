import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Helmet from '../components/Helmet'

export const Success = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="page-wrapper">
      <Helmet>
        <title>Message Sent | TuS Cricket</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="success-page">
        <div className="success-card">
          <div className="success-icon-wrapper">
            <CheckCircle2 size={40} strokeWidth={1.5} />
          </div>
          <h1 className="success-title">Application Received!</h1>
          <p className="success-message">
            Thanks for joining the squad! <br />
            We have received your details and will get back to you shortly with training schedules.
          </p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Success
