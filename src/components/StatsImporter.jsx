import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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

export const StatsImporter = () => {
  const [season, setSeason] = useState('2025')
  const [format, setFormat] = useState('T20')
  const [csvData, setCsvData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [squad, setSquad] = useState([])
  const [mappings, setMappings] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  // Column mapping states
  const [playerCol, setPlayerCol] = useState('')
  const [runsCol, setRunsCol] = useState('')
  const [wicketsCol, setWicketsCol] = useState('')
  const [catchesCol, setCatchesCol] = useState('')
  const [matchesCol, setMatchesCol] = useState('')

  useEffect(() => {
    fetchSquadAndMappings()
  }, [reloadCounter])

  const fetchSquadAndMappings = async () => {
    if (!supabase) return
    setIsLoading(true)
    setError(null)
    try {
      const [squadRes, mappingsRes] = await Promise.all([
        supabase.from('squad').select('name, is_active'),
        supabase.from('mappings').select('source_name, target_name')
      ])
      
      if (squadRes.error) throw squadRes.error
      if (mappingsRes.error) throw mappingsRes.error

      if (squadRes.data) setSquad(squadRes.data)
      if (mappingsRes.data) setMappings(mappingsRes.data)
    } catch (err) {
      console.error('Error fetching metadata:', err)
      setError(err.message || 'Failed to load squad metadata.')
    }
    setIsLoading(false)
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
        {error ? (
          <div className="error-state alert alert-danger" style={{ margin: '1rem 0', padding: '1.5rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setReloadCounter(prev => prev + 1)} className="btn btn-secondary btn-small" style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem' }}>
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="loading" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading metadata...</div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

export default StatsImporter
