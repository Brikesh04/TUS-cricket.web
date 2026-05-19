import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled glass' : ''}`}>
      <div className="container navbar-container">
        <NavLink to="/" className="navbar-logo">
          <img src="/logo.png" alt="TUS Cricket Logo" className="logo-img" />
          <span className="logo-text">TuS Cricket</span>
        </NavLink>

        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/squad" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Squad
          </NavLink>
          <NavLink to="/join" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Join Us
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Contact
          </NavLink>
        </div>

        <button 
          className="mobile-toggle" 
          onClick={() => setIsOpen(!isOpen)} 
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`mobile-menu glass ${isOpen ? 'active' : ''}`}>
          <NavLink to="/" onClick={() => setIsOpen(false)} className="mobile-nav-link">
            Home
          </NavLink>
          <NavLink to="/squad" onClick={() => setIsOpen(false)} className="mobile-nav-link">
            Squad
          </NavLink>
          <NavLink to="/join" onClick={() => setIsOpen(false)} className="mobile-nav-link">
            Join Us
          </NavLink>
          <NavLink to="/contact" onClick={() => setIsOpen(false)} className="mobile-nav-link">
            Contact
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
