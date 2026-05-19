import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Helmet from '../components/Helmet'
import { supabase } from '../supabaseClient'

export const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setErrorMsg(error.message)
        setIsSubmitting(false)
      } else {
        navigate('/admin')
      }
    } catch (err) {
      console.error('Authentication exception:', err)
      setErrorMsg('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <Helmet>
        <title>Admin Login | TuS Cricket</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="login-container">
        <div className="login-card glass shadow-lg">
          <div className="login-header">
            <h1>Admin Login</h1>
            <p>TuS Cricket Pfarrkirchen</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {errorMsg && <div className="error-message">{errorMsg}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
