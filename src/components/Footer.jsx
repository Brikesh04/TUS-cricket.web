import React from 'react'
import { NavLink } from 'react-router-dom'
import { Instagram, Facebook } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="footer-minimal">
      <div className="container footer-container-inner">
        <p className="footer-copyright">
          © {new Date().getFullYear()} TuS Cricket Pfarrkirchen.
        </p>
        <div className="footer-links">
          <NavLink to="/impressum" className="footer-link-item">
            Impressum
          </NavLink>
          <NavLink to="/privacy" className="footer-link-item">
            Privacy
          </NavLink>
          <NavLink to="/admin" className="footer-link-admin">
            Admin
          </NavLink>
          <div className="footer-divider"></div>
          <a 
            href="https://www.instagram.com/pfarrkirchen_cricket/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="social-icon-link footer-social-icon"
          >
            <Instagram size={20} />
          </a>
          <a 
            href="https://www.facebook.com/profile.php?id=61572521937073" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="social-icon-link footer-social-icon"
          >
            <Facebook size={20} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
