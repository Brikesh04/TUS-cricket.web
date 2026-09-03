import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import Helmet from './Helmet'
import { supabase } from '../supabaseClient'

export const NameMappingsManager = () => {
  const [mappings, setMappings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sourceName, setSourceName] = useState('')
  const [targetName, setTargetName] = useState('')
  const [error, setError] = useState(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    fetchMappings()
  }, [reloadCounter])

  const fetchMappings = async () => {
    if (!supabase) return
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .order('source_name')

    if (error) {
      console.error('Error loading mappings:', error)
      setError(error.message || 'Failed to load name mappings.')
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
      // The endpoint now requires the signed-in admin's session, so pass the
      // access token through. Without it the sync returns 401.
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        alert('Your session has expired. Please sign in again before syncing.')
        setIsSyncing(false)
        return
      }

      const response = await fetch('/.netlify/functions/trigger-stats-update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
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

      {error ? (
        <div className="error-state alert alert-danger" style={{ margin: '1rem 0', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setReloadCounter(prev => prev + 1)} className="btn btn-secondary btn-small" style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem' }}>
            Retry
          </button>
        </div>
      ) : isLoading ? (
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

      {/* The old anon-key bookmarklet lived here. It wrote to Supabase with
          VITE_SUPABASE_ANON_KEY, and the anonymous INSERT/UPDATE policies it
          relied on were dropped, so every write it attempted was refused. It
          also matched players by raw string equality, which is what produced
          the 39 duplicate rows in player_stats. Replaced by the
          'Import from CricClubs' tab, which parses with the shared module and
          writes using the signed-in admin's own session. */}

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

export default NameMappingsManager
