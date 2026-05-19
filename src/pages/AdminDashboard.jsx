import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { LogOut, Plus, Trash2, RefreshCw } from 'lucide-react'
import Helmet from '../components/Helmet'
import { supabase } from '../supabaseClient'

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

// --- 2. CRICCLUBS NAME MAPPINGS TAB COMPONENT ---
const NameMappingsManager = () => {
  const [mappings, setMappings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sourceName, setSourceName] = useState('')
  const [targetName, setTargetName] = useState('')

  useEffect(() => {
    fetchMappings()
  }, [])

  const fetchMappings = async () => {
    if (!supabase) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .order('source_name')

    if (error) {
      console.error('Error loading mappings:', error)
    } else if (data) {
      setMappings(data)
    }
    setIsLoading(false)
  }

  const handleAddMapping = async (e) => {
    e.preventDefault()
    if (!sourceName.trim() || !targetName.trim() || !supabase) return

    const { error } = await supabase.from('mappings').insert([
      { source_name: sourceName.trim(), target_name: targetName.trim() }
    ])

    if (error) {
      console.error('Error adding mapping:', error)
      alert('Failed to add mapping: ' + error.message)
    } else {
      setSourceName('')
      setTargetName('')
      setShowAddModal(false)
      fetchMappings()
    }
  }

  const handleDeleteMapping = async (id) => {
    if (!confirm('Are you sure you want to delete this mapping?') || !supabase) return

    const { error } = await supabase.from('mappings').delete().eq('id', id)
    if (error) {
      console.error('Error deleting mapping:', error)
      alert('Failed to delete mapping: ' + error.message)
    } else {
      fetchMappings()
    }
  }

  const handleSyncStats = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/.netlify/functions/trigger-stats-update', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        let msg = `Sync completed!\n- Players updated: ${data.playersUpdated}\n- Total players found: ${data.totalFound}`
        
        if (data.diagnostics) {
          msg += `\n\nDiagnostics (Found):\nT20: Batting(${data.diagnostics.t20.batting}), Bowling(${data.diagnostics.t20.bowling}), Fielding(${data.diagnostics.t20.fielding})`
          msg += `\n50-Over: Batting(${data.diagnostics.fifty.batting}), Bowling(${data.diagnostics.fifty.bowling}), Fielding(${data.diagnostics.fifty.fielding})`
        }

        if (data.errors && data.errors.length > 0) {
          msg += `\n\nErrors (first 3):\n${data.errors.slice(0, 3).join('\n')}`
        }

        alert(msg)
      } else {
        alert('Error updating stats: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error syncing stats:', err)
      alert('Error syncing stats. Make sure your local codebase is deployed to Netlify and has CricClubs API secrets configured.')
    }
    setIsSyncing(false)
  }

  return (
    <div className="mappings-page">
      <Helmet>
        <title>Name Mappings | Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mappings-header">
        <div>
          <h2>CricClubs Name Mappings</h2>
          <p>Map CricClubs player names to your official squad names</p>
        </div>
        <div className="header-actions">
          <button onClick={handleSyncStats} className="sync-btn" disabled={isSyncing}>
            <RefreshCw size={18} className={isSyncing ? 'spinning' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Stats Now'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="add-btn">
            <Plus size={18} /> Add Mapping
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading mappings...</div>
      ) : (
        <div className="mappings-table-container">
          <table className="mappings-table">
            <thead>
              <tr>
                <th>CricClubs Name</th>
                <th>→</th>
                <th>Squad Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No mappings yet. Add a mapping to link CricClubs names to your squad.
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr key={mapping.id}>
                    <td className="source-name">{mapping.source_name}</td>
                    <td className="arrow">→</td>
                    <td className="target-name">{mapping.target_name}</td>
                    <td>
                      <button 
                        onClick={() => handleDeleteMapping(mapping.id)} 
                        className="delete-btn" 
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Name Mapping</h3>
            <form onSubmit={handleAddMapping}>
              <div className="form-group">
                <label htmlFor="sourceName">CricClubs Name</label>
                <input
                  type="text"
                  id="sourceName"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., Brikesh Vikin Gowrish"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="targetName">Squad Name</label>
                <input
                  type="text"
                  id="targetName"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g., Brikesh Gowrish"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// --- 3. MAIN DASHBOARD PAGE ---
export const AdminDashboard = () => {
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [activeTab, setActiveTab] = useState('players') // 'players' or 'mappings'

  const navigate = useNavigate()

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    if (!supabase) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('squad')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading players:', error)
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
          </div>

          {/* Conditional Tab Rendering */}
          {activeTab === 'players' ? (
            <>
              <div className="actions-bar">
                <h2>Squad Members ({players.length})</h2>
                <button onClick={() => setShowAddModal(true)} className="add-btn">
                  <Plus size={18} /> Add Player
                </button>
              </div>

              {isLoading ? (
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
          ) : (
            <NameMappingsManager />
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
