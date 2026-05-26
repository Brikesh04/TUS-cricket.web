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

// --- 3. CRICCLUBS CSV STATS IMPORTER TAB COMPONENT ---
const parseCSV = (text) => {
  const firstLine = text.split('\n')[0]
  const delimiter = firstLine.includes(';') ? ';' : ','

  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"'
          i++ // skip next quote
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++
        }
        currentRow.push(currentField.trim())
        if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) return null
  const headers = rows[0].map(h => h.trim().replace(/^["']|["']$/g, ''))
  const parsedRows = rows.slice(1).map(row => {
    const obj = {}
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index]?.trim().replace(/^["']|["']$/g, '') || ''
      }
    })
    return obj
  })

  return { headers, rows: parsedRows }
}

const StatsImporter = () => {
  const [season, setSeason] = useState('2025')
  const [format, setFormat] = useState('T20')
  const [csvData, setCsvData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [squad, setSquad] = useState([])
  const [mappings, setMappings] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  // Column mapping states
  const [playerCol, setPlayerCol] = useState('')
  const [runsCol, setRunsCol] = useState('')
  const [wicketsCol, setWicketsCol] = useState('')
  const [catchesCol, setCatchesCol] = useState('')
  const [matchesCol, setMatchesCol] = useState('')

  useEffect(() => {
    fetchSquadAndMappings()
  }, [])

  const fetchSquadAndMappings = async () => {
    if (!supabase) return
    const [squadRes, mappingsRes] = await Promise.all([
      supabase.from('squad').select('name, is_active'),
      supabase.from('mappings').select('source_name, target_name')
    ])
    if (squadRes.data) setSquad(squadRes.data)
    if (mappingsRes.data) setMappings(mappingsRes.data)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const parsed = parseCSV(text)
      if (parsed && parsed.headers.length > 0) {
        setCsvData(parsed)
        autoDetectColumns(parsed.headers)
      } else {
        alert('Failed to parse CSV file. Please check its format.')
        setCsvData(null)
        setFileName('')
      }
    }
    reader.readAsText(file)
  }

  const autoDetectColumns = (headers) => {
    const findColumn = (patterns) => {
      for (const pattern of patterns) {
        const match = headers.find(h => pattern.test(h))
        if (match) return match
      }
      return ''
    }

    setPlayerCol(findColumn([/player\s*name/i, /^player$/i, /^name$/i, /player/i]))
    setRunsCol(findColumn([/^runs$/i, /^r$/i, /runs\s*scored/i, /run/i]))
    setWicketsCol(findColumn([/^wickets$/i, /^wkts$/i, /^w$/i, /^wkt$/i, /wicket/i]))
    setCatchesCol(findColumn([/^catches$/i, /^ct$/i, /^c$/i, /catches\s*taken/i, /catch/i]))
    setMatchesCol(findColumn([/^matches$/i, /^m$/i, /^mat$/i, /^inn$/i, /matches/i]))
  }

  const handleRemoveFile = () => {
    setCsvData(null)
    setFileName('')
    setPlayerCol('')
    setRunsCol('')
    setWicketsCol('')
    setCatchesCol('')
    setMatchesCol('')
  }

  const getMappedRows = () => {
    if (!csvData || !playerCol) return []
    return csvData.rows
      .filter(row => row[playerCol] && row[playerCol].trim())
      .map(row => {
        const rawName = row[playerCol].trim()
        const cleanName = rawName.toLowerCase()

        // Check if recognized in squad or mapped
        const isRecognized = squad.some(s => s.name.trim().toLowerCase() === cleanName) ||
                             mappings.some(m => m.source_name.trim().toLowerCase() === cleanName)

        const runsVal = parseInt(row[runsCol])
        const wicketsVal = parseInt(row[wicketsCol])
        const catchesVal = parseInt(row[catchesCol])
        const matchesVal = parseInt(row[matchesCol])

        return {
          player_name: rawName,
          runs: isNaN(runsVal) ? 0 : runsVal,
          wickets: isNaN(wicketsVal) ? 0 : wicketsVal,
          catches: isNaN(catchesVal) ? 0 : catchesVal,
          matches: isNaN(matchesVal) ? 0 : matchesVal,
          isRecognized
        }
      })
  }

  const handleSaveStats = async () => {
    const rows = getMappedRows()
    if (rows.length === 0) {
      alert('No valid player data found to import.')
      return
    }

    if (!confirm(`This will OVERWRITE all T20 / Fifty stats for ${season} season with the ${rows.length} players from this CSV. Are you sure you want to proceed?`)) {
      return
    }

    setIsSaving(true)
    try {
      if (!supabase) throw new Error('Supabase not initialized')

      // 1. Delete existing stats for the selected season and format
      const { error: deleteError } = await supabase
        .from('player_stats')
        .delete()
        .eq('season', parseInt(season))
        .eq('format', format)

      if (deleteError) throw deleteError

      // 2. Insert new stats
      const rowsToInsert = rows.map(r => ({
        player_name: r.player_name,
        season: parseInt(season),
        format: format,
        runs: r.runs,
        wickets: r.wickets,
        catches: r.catches,
        matches: r.matches,
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('player_stats')
        .insert(rowsToInsert)

      if (insertError) throw insertError

      alert(`Successfully imported statistics for ${rows.length} players!`)
      handleRemoveFile()
    } catch (err) {
      console.error('Error importing stats:', err)
      alert('Failed to import stats: ' + err.message)
    }
    setIsSaving(false)
  }

  const mappedRows = getMappedRows()

  return (
    <div className="importer-section">
      <div className="mappings-header">
        <div>
          <h2>Import Player Stats from CSV</h2>
          <p>Upload a CricClubs player stats CSV file to instantly update player rankings</p>
        </div>
      </div>

      <div className="importer-card">
        <div className="importer-row">
          <div className="form-group">
            <label htmlFor="import-season">Season</label>
            <select
              id="import-season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="modal-content input"
              style={{ padding: '12px', background: '#fff', border: '1px solid rgba(0,0,0,.1)' }}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="import-format">Format</label>
            <select
              id="import-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="modal-content input"
              style={{ padding: '12px', background: '#fff', border: '1px solid rgba(0,0,0,.1)' }}
            >
              <option value="T20">T20</option>
              <option value="Fifty">Fifty (50-Over)</option>
            </select>
          </div>
        </div>

        {!fileName ? (
          <label className="upload-zone">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <span className="icon" style={{ fontSize: '2.5rem' }}>📊</span>
            <strong>Select CricClubs CSV File</strong>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tap to select file from your device</span>
          </label>
        ) : (
          <div className="file-info">
            <span>📄 {fileName}</span>
            <button onClick={handleRemoveFile} type="button" title="Remove File">
              ✕ Remove
            </button>
          </div>
        )}

        {csvData && (
          <>
            <div className="mapper-section">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Map CSV Columns to Stats</h3>
              <p style={{ margin: '4px 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
                We tried auto-detecting column mappings. Adjust if needed:
              </p>
              <div className="mapper-grid">
                <div className="mapper-field">
                  <label>Player Name</label>
                  <select value={playerCol} onChange={(e) => setPlayerCol(e.target.value)}>
                    <option value="">-- Select --</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="mapper-field">
                  <label>Matches Played</label>
                  <select value={matchesCol} onChange={(e) => setMatchesCol(e.target.value)}>
                    <option value="">-- Select --</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="mapper-field">
                  <label>Runs Scored</label>
                  <select value={runsCol} onChange={(e) => setRunsCol(e.target.value)}>
                    <option value="">-- Select --</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="mapper-field">
                  <label>Wickets Taken</label>
                  <select value={wicketsCol} onChange={(e) => setWicketsCol(e.target.value)}>
                    <option value="">-- Select --</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="mapper-field">
                  <label>Catches/Stumpings</label>
                  <select value={catchesCol} onChange={(e) => setCatchesCol(e.target.value)}>
                    <option value="">-- Select --</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {playerCol && mappedRows.length > 0 && (
              <div className="preview-section">
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Parsed Player Preview ({mappedRows.length})</h3>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>CricClubs Name</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Matches</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Runs</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Wkts</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Catches</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Squad Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRows.map((row, idx) => (
                        <tr key={idx} className={row.isRecognized ? '' : 'unrecognized'} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px', fontWeight: 500 }}>{row.player_name}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{row.matches}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{row.runs}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{row.wickets}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{row.catches}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {row.isRecognized ? (
                              <span className="association-badge recognized">✓ Recognized</span>
                            ) : (
                              <span className="association-badge unrecognized" title="This player name is not in the squad list or name mappings. It won't associate with any squad rankings score card until mapped.">⚠️ Mismatch</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="save-actions">
                  <button
                    onClick={handleSaveStats}
                    disabled={isSaving}
                    className="submit-btn"
                    style={{ padding: '14px 28px', fontSize: '1rem', width: '100%', maxWidth: '280px', border: 'none', cursor: 'pointer' }}
                  >
                    {isSaving ? 'Saving to Database...' : 'Confirm & Save Stats'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// --- 4. MAIN DASHBOARD PAGE ---
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
            <button 
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              Import CSV Stats
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
          )}

          {activeTab === 'mappings' && (
            <NameMappingsManager />
          )}

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
