import React from 'react'
import { NavLink } from 'react-router-dom'
import { Instagram, Facebook } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="footer-minimal">
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          © {new Date().getFullYear()} TuS Cricket Pfarrkirchen.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <NavLink to="/impressum" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
            Impressum
          </NavLink>
          <NavLink to="/privacy" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
            Privacy
          </NavLink>
          <NavLink to="/admin" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', opacity: 0.5 }}>
            Admin
          </NavLink>
          <div style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 0.25rem' }}></div>
          <a 
            href="https://www.instagram.com/pfarrkirchen_cricket/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'flex' }} 
            className="social-icon-link"
          >
            <Instagram size={20} />
          </a>
          <a 
            href="https://www.facebook.com/profile.php?id=61572521937073" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: 'rgba(255, 255, 255, 0.8)', display: 'flex' }} 
            className="social-icon-link"
          >
            <Facebook size={20} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
