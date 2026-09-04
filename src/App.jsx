import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Squad from './pages/Squad'
import JoinUs from './pages/JoinUs'
import Contact from './pages/Contact'
import Success from './pages/Success'
import Impressum from './pages/Impressum'
import Privacy from './pages/Privacy'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard, { AuthGuard } from './pages/AdminDashboard'

// Scroll restoration component to reset scroll position on route changes
const ScrollToTop = () => {
  const { pathname } = useLocation()
  
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    })
  }, [pathname])

  return null
}

export const App = () => {
  return (
    <div className="App">
      {/* Scroll Restoration */}
      <ScrollToTop />
      
      {/* Navigation Bar */}
      <Navbar />
      
      {/* Main Routed Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<JoinUs />} />
          <Route path="/squad" element={<Squad />} />
          
          {/* Legacy redirects */}
          <Route path="/team" element={<Navigate to="/squad" replace />} />
          <Route path="/stats" element={<Navigate to="/squad" replace />} />
          
          <Route path="/contact" element={<Contact />} />
          <Route path="/success" element={<Success />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <AuthGuard>
              <AdminDashboard />
            </AuthGuard>
          } />
          
          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {/* Layout Footer */}
      <Footer />
    </div>
  )
}

export default App
