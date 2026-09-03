import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import Helmet from '../components/Helmet'
import { supabase } from '../supabaseClient'
import NameMappingsManager from '../components/NameMappingsManager'
import StatsImporter from '../components/StatsImporter'
import CricClubsImport from '../components/CricClubsImport'

// --- 1. AUTHENTICATION GUARD WRAPPER ---
export const AuthGuard = ({ children }) => {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setCheckingAuth(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setCheckingAuth(false)
    }

    checkSession()
  }, [])

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#666' }}>
        Checking authentication...
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" replace={true} />
}

// --- 2. MAIN DASHBOARD PAGE ---
export const AdminDashboard = () => {
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [activeTab, setActiveTab] = useState('players') // 'players', 'mappings', 'import', or 'cricclubs'
  const [error, setError] = useState(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    fetchPlayers()
  }, [reloadCounter])

  const fetchPlayers = async () => {
    if (!supabase) return
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('squad')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading players:', error)
      setError(error.message || 'Failed to load players.')
    } else if (data) {
      setPlayers(data)
    }
    setIsLoading(false)
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    navigate('/admin/login')
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    if (!playerName.trim() || !supabase) return

    const { error } = await supabase
      .from('squad')
      .insert([{ name: playerName.trim(), is_active: true }])

    if (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player: ' + error.message)
    } else {
      setPlayerName('')
      setShowAddModal(false)
      fetchPlayers()
    }
  }

  const handleDeletePlayer = async (id) => {
    if (!confirm('Are you sure you want to delete this player?') || !supabase) return

    const { error } = await supabase.from('squad').delete().eq('id', id)
    if (error) {
      console.error('Delete error:', error)
      alert('Failed to delete player: ' + error.message)
    } else {
      fetchPlayers()
    }
  }

  const togglePlayerActive = async (player) => {
    if (!supabase) return
    const { error } = await supabase
      .from('squad')
      .update({ is_active: !player.is_active })
      .eq('id', player.id)

    if (error) {
      console.error('Update error:', error)
      alert('Failed to update player status: ' + error.message)
    } else {
      fetchPlayers()
    }
  }

  return (
    <div className="admin-dashboard">
      <Helmet>
        <title>Admin Dashboard | TuS Cricket</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Manage squad members and stats</p>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        <div className="container">
          {/* Dashboard Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => setActiveTab('players')}
            >
              Players
            </button>
            <button 
              className={`tab ${activeTab === 'mappings' ? 'active' : ''}`}
              onClick={() => setActiveTab('mappings')}
            >
              Name Mappings
            </button>
            <button 
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              Import CSV Stats
            </button>
            <button 
              className={`tab ${activeTab === 'cricclubs' ? 'active' : ''}`}
              onClick={() => setActiveTab('cricclubs')}
            >
              Import from CricClubs
            </button>
          </div>

          {/* Conditional Tab Rendering */}
          {activeTab === 'players' && (
            <>
              <div className="actions-bar">
                <h2>Squad Members ({players.length})</h2>
                <button onClick={() => setShowAddModal(true)} className="add-btn">
                  <Plus size={18} /> Add Player
                </button>
              </div>

               {error ? (
                <div className="error-state alert alert-danger" style={{ margin: '1rem 0', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ {error}</span>
                  <button onClick={() => setReloadCounter(prev => prev + 1)} className="btn btn-secondary btn-small" style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem' }}>
                    Retry
                  </button>
                </div>
              ) : isLoading ? (
                <div className="loading">Loading players...</div>
              ) : (
                <div className="players-table-container">
                  <table className="players-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Photo</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player) => (
                        <tr key={player.id}>
                          <td className="player-name">{player.name}</td>
                          <td>
                            <button
                              onClick={() => togglePlayerActive(player)}
                              className={`status-badge ${player.is_active ? 'active' : 'inactive'}`}
                            >
                              {player.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td>
                            {player.photo_url ? (
                              <span className="has-photo">✓ Has Photo</span>
                            ) : (
                              <span className="no-photo">No Photo</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleDeletePlayer(player.id)}
                                className="delete-btn"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'mappings' && (
            <NameMappingsManager />
          )}

          {activeTab === 'cricclubs' && <CricClubsImport />}

          {activeTab === 'import' && (
            <StatsImporter />
          )}
        </div>
      </main>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Player</h3>
            <form onSubmit={handleAddPlayer}>
              <div className="form-group">
                <label htmlFor="playerName">Player Name</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  autoFocus
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
