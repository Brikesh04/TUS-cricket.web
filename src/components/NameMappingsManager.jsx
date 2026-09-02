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

      {/* Dynamic Bookmarklet Panel */}
      <div className="bookmarklet-card card glass shadow-md" style={{ marginTop: '2.5rem', padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'left', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔌</span>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary-dark)' }}>Alternate Sync: Browser Bookmarklet</h3>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
          Instead of triggering server-side sync runs (which require configuring Netlify environment variables), you can sync CricClubs player statistics directly from your browser. This bookmarklet automatically uses your website's active Supabase configurations.
        </p>
        
        <div style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600' }}>Instructions:</h4>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
            <li>Drag the green <strong>Sync to TuS Website</strong> button below directly to your browser's Bookmarks Bar (or click the copy button and create a new bookmark manually).</li>
            <li>Open any CricClubs player statistics table in your browser (e.g., Batting, Bowling, or Fielding stats page).</li>
            <li>Click the bookmarklet from your bookmarks bar. Follow the prompts to select the format (T20/Fifty) and input the season year.</li>
          </ol>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <a
            href={`javascript:(async function(){ try { const S_URL="${import.meta.env.VITE_SUPABASE_URL || ''}"; const S_KEY="${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}"; const headers={"apikey":S_KEY,"Authorization":"Bearer "+S_KEY,"Content-Type":"application/json"}; const url=window.location.href; let type=""; const lowerUrl = url.toLowerCase(); if(lowerUrl.includes("teambatting") || lowerUrl.includes("battingstats") || lowerUrl.includes("batting")) type="Batting"; else if(lowerUrl.includes("teambowling") || lowerUrl.includes("bowlingstats") || lowerUrl.includes("bowling")) type="Bowling"; else if(lowerUrl.includes("teamfielding") || lowerUrl.includes("fieldingstats") || lowerUrl.includes("fielding")) type="Fielding"; else { alert("❌ Not a recognized CricClubs stats page!\\nMake sure the URL contains 'batting', 'bowling', or 'fielding'."); return; } const format=prompt("Enter Format ('T20' or 'Fifty'):","T20"); if(!format) return; const season=prompt("Enter Season Year:",new Date().getFullYear().toString()); if(!season) return; alert(\`⏳ Syncing \${season} \${format} \${type} stats... Please wait.\`); let table; const tables=document.querySelectorAll("table"); let maxScore = -1; for(let t of tables){ const ths = Array.from(t.querySelectorAll("th")).map(x => x.innerText.toUpperCase()); if(ths.length > 4) { let score = 0; if(ths.some(h => h.includes("PLAYER") || h === "NAME" || h.includes("BATSMAN") || h.includes("BATTER") || h.includes("BOWLER") || h.includes("FIELDER"))) score += 10; if(ths.some(h => h === "M" || h.includes("MAT") || h.includes("MATCHES"))) score += 5; if(ths.some(h => h === "R" || h.includes("RUNS") || h === "W" || h.includes("WKTS") || h.includes("CATCH"))) score += 5; if (score > maxScore) { maxScore = score; table = t; } } } if(!table){ alert("❌ Could not find the main stats table on this page."); return; } const allRows=Array.from(table.querySelectorAll("tr")); let headerRowIdx=-1; for(let i=0;i<allRows.length;i++){ const text = allRows[i].innerText.toUpperCase(); if(Array.from(allRows[i].children).length>4 && ( text.includes("PLAYER") || text.includes("NAME") || text.includes("BATSMAN") || text.includes("BATTER") || text.includes("BOWLER") || text.includes("FIELDER") )){ headerRowIdx=i; break; } } if(headerRowIdx===-1) headerRowIdx=0; const headerRow=allRows[headerRowIdx]; const ths=Array.from(headerRow.children).map(th=>th.innerText.trim().toUpperCase()); let nameIdx=ths.findIndex(h=>h.includes("PLAYER")||h==="NAME"||h.includes("BATSMAN")||h.includes("BATTER")||h.includes("BOWLER")||h.includes("FIELDER")); if(nameIdx===-1) nameIdx=1; const statsMap=[]; for(let i=headerRowIdx+1;i<allRows.length;i++){ const tds=Array.from(allRows[i].children); if(tds.length<4) continue; let playerNameText=tds[nameIdx]?tds[nameIdx].textContent.trim():""; let playerName=playerNameText.replace(/\\(c\\)|\\(wk\\)|\\*|\\†/gi,'').replace(/\\s+/g, ' ').trim(); if(!playerName||playerName.includes("Extras")||playerName.includes("Total")||playerName.includes("Did not bat")) continue; let value=0,matches=0; let ballsFaced=0, battingAvg=0, strikeRate=0; let overs=0, runsConceded=0, economy=0, bowlingAvg=0; const mIdx=ths.findIndex(h=>h==="M"||h.includes("MAT")||h.includes("MATCHES")); if(mIdx>=0) matches=parseInt(tds[mIdx]?.textContent||"0",10)||0; if(type==="Batting"){ const runsIdx=ths.findIndex(h=>h==="R"||h.includes("RUNS")); if(runsIdx>=0) value=parseInt(tds[runsIdx]?.textContent||"0",10); const bfIdx=ths.findIndex(h=>h==="BF"||h.includes("BALLS")); if(bfIdx>=0) ballsFaced=parseInt(tds[bfIdx]?.textContent||"0",10)||0; const avgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE")); if(avgIdx>=0) battingAvg=parseFloat(tds[avgIdx]?.textContent||"0.0")||0; const srIdx=ths.findIndex(h=>h==="SR"||h.includes("STRIKE")); if(srIdx>=0) strikeRate=parseFloat(tds[srIdx]?.textContent||"0.0")||0; } else if(type==="Bowling"){ const wktsIdx=ths.findIndex(h=>h==="W"||h.includes("WKTS")||h.includes("WICKETS")); if(wktsIdx>=0) value=parseInt(tds[wktsIdx]?.textContent||"0",10); const oversIdx=ths.findIndex(h=>h==="OVERS"||h==="O"||h.includes("OVERS")); if(oversIdx>=0) overs=parseFloat(tds[oversIdx]?.textContent||"0.0")||0; const runsConcededIdx=ths.findIndex(h=>h==="RUNS"||h==="R"||h.includes("RUNS")||h.includes("CONCEDED")); if(runsConcededIdx>=0) runsConceded=parseInt(tds[runsConcededIdx]?.textContent||"0",10)||0; const econIdx=ths.findIndex(h=>h==="ECON"||h==="E"||h.includes("ECONOMY")); if(econIdx>=0) economy=parseFloat(tds[econIdx]?.textContent||"0.0")||0; const bowlingAvgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE")); if(bowlingAvgIdx>=0) bowlingAvg=parseFloat(tds[bowlingAvgIdx]?.textContent||"0.0")||0; } else if(type==="Fielding"){ let outfieldCatches = 0; let wkCatches = 0; let stumpings = 0; let runOuts = 0; ths.forEach((header, idx) => { const val = parseInt(tds[idx]?.textContent || "0", 10) || 0; if (header.includes("WK") && (header.includes("CATCH") || header.includes("CT") || header.includes("C"))) { wkCatches += val; } else if ((header.includes("CATCH") || header === "C" || header === "CT") && !header.includes("WK")) { outfieldCatches += val; } else if (header.includes("STUMP") || header === "ST" || header === "S") { stumpings += val; } else if (header.includes("RO") || header.includes("RUNOUT") || header.includes("RUN OUT") || header.includes("DIRECT") || header.includes("INDIRECT")) { runOuts += val; } }); value = outfieldCatches + wkCatches + stumpings + runOuts; } if(isNaN(value)) value=0; statsMap.push({ name:playerName, value, matches, ballsFaced, battingAvg, strikeRate, overs, runsConceded, economy, bowlingAvg }); } if(statsMap.length===0){ alert("❌ No players found in the table."); return; } const mapRes=await fetch(\`\${S_URL}/rest/v1/mappings?select=*\`,{headers}); if(!mapRes.ok) throw new Error("Failed to fetch name mappings."); const mappings=await mapRes.json(); const getMappedName=(name)=>{ const m=mappings.find(x=>x.source_name.toLowerCase()===name.toLowerCase()); return m?m.target_name:name; }; const exRes=await fetch(\`\${S_URL}/rest/v1/player_stats?season=eq.\${season}&format=eq.\${format}\`,{headers}); if(!exRes.ok) throw new Error("Failed to fetch existing stats."); const existingStats=await exRes.json(); const payloads=statsMap.map(stat=>{ const targetName=getMappedName(stat.name); let existing=existingStats.find(s=>s.player_name===targetName); let record={...existing}; if(!existing){ record={ player_name:targetName, season:parseInt(season), format:format, runs:0, wickets:0, catches:0, matches:0, overs:0, runs_conceded:0, balls_faced:0, strike_rate:0, economy:0, batting_avg:0, bowling_avg:0 }; } record.updated_at = new Date().toISOString(); if(type==="Batting"){ record.runs=stat.value; record.balls_faced=stat.ballsFaced; record.batting_avg=stat.battingAvg; record.strike_rate=stat.strikeRate; record.matches=Math.max(record.matches||0,stat.matches); } if(type==="Bowling"){ record.wickets=stat.value; record.overs=stat.overs; record.runs_conceded=stat.runsConceded; record.economy=stat.economy; record.bowling_avg=stat.bowlingAvg; record.matches=Math.max(record.matches||0,stat.matches); } if(type==="Fielding"){ record.catches=stat.value; record.matches=Math.max(record.matches||0,stat.matches); } return record; }); existingStats.forEach(existing=>{ const isFound=statsMap.some(stat=>getMappedName(stat.name)===existing.player_name); if(!isFound){ let ghostUpdate={...existing}; let changed=false; if(type==="Batting"&&ghostUpdate.runs!==0){ ghostUpdate.runs=0; changed=true; } if(type==="Bowling"&&ghostUpdate.wickets!==0){ ghostUpdate.wickets=0; changed=true; } if(type==="Fielding"&&ghostUpdate.catches!==0){ ghostUpdate.catches=0; changed=true; } if(changed){ ghostUpdate.updated_at = new Date().toISOString(); payloads.push(ghostUpdate); } } }); const inserts=payloads.filter(p=>!p.id); const updates=payloads.filter(p=>p.id); let errorMsg=null; if(inserts.length>0){ const res=await fetch(\`\${S_URL}/rest/v1/player_stats\`,{ method:"POST", headers, body:JSON.stringify(inserts) }); if(!res.ok) errorMsg=await res.text(); } for(const up of updates){ const id=up.id; const payload={...up}; delete payload.id; const res=await fetch(\`\${S_URL}/rest/v1/player_stats?id=eq.\${id}\`,{ method:"PATCH", headers, body:JSON.stringify(payload) }); if(!res.ok&&!errorMsg) errorMsg=await res.text(); } if(errorMsg){ alert("⚠️ Finished with errors: "+errorMsg); } else { alert(\`✅ Successfully synced \${payloads.length} players for \${season} (\${type} - \${format})!\\n\\nCheck your website!\`); } } catch(err) { alert("❌ Unexpected Error: "+err.message); } })();`}
            className="bookmarklet-btn"
            onClick={(e) => {
              e.preventDefault()
              alert('Drag this button to your bookmarks bar to install it, or copy the code using the button on the right.')
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              textDecoration: 'none',
              cursor: 'grab',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
            }}
          >
            <ExternalLink size={16} />
            Sync to TuS Website
          </a>
          <button
            onClick={() => {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
              const code = `javascript:(async function(){ try { const S_URL="${supabaseUrl}"; const S_KEY="${supabaseAnonKey}"; const headers={"apikey":S_KEY,"Authorization":"Bearer "+S_KEY,"Content-Type":"application/json"}; const url=window.location.href; let type=""; const lowerUrl = url.toLowerCase(); if(lowerUrl.includes("teambatting") || lowerUrl.includes("battingstats") || lowerUrl.includes("batting")) type="Batting"; else if(lowerUrl.includes("teambowling") || lowerUrl.includes("bowlingstats") || lowerUrl.includes("bowling")) type="Bowling"; else if(lowerUrl.includes("teamfielding") || lowerUrl.includes("fieldingstats") || lowerUrl.includes("fielding")) type="Fielding"; else { alert("❌ Not a recognized CricClubs stats page!\\nMake sure the URL contains 'batting', 'bowling', or 'fielding'."); return; } const format=prompt("Enter Format ('T20' or 'Fifty'):","T20"); if(!format) return; const season=prompt("Enter Season Year:",new Date().getFullYear().toString()); if(!season) return; alert(\`⏳ Syncing \${season} \${format} \${type} stats... Please wait.\`); let table; const tables=document.querySelectorAll("table"); let maxScore = -1; for(let t of tables){ const ths = Array.from(t.querySelectorAll("th")).map(x => x.innerText.toUpperCase()); if(ths.length > 4) { let score = 0; if(ths.some(h => h.includes("PLAYER") || h === "NAME" || h.includes("BATSMAN") || h.includes("BATTER") || h.includes("BOWLER") || h.includes("FIELDER"))) score += 10; if(ths.some(h => h === "M" || h.includes("MAT") || h.includes("MATCHES"))) score += 5; if(ths.some(h => h === "R" || h.includes("RUNS") || h === "W" || h.includes("WKTS") || h.includes("CATCH"))) score += 5; if (score > maxScore) { maxScore = score; table = t; } } } if(!table){ alert("❌ Could not find the main stats table on this page."); return; } const allRows=Array.from(table.querySelectorAll("tr")); let headerRowIdx=-1; for(let i=0;i<allRows.length;i++){ const text = allRows[i].innerText.toUpperCase(); if(Array.from(allRows[i].children).length>4 && ( text.includes("PLAYER") || text.includes("NAME") || text.includes("BATSMAN") || text.includes("BATTER") || text.includes("BOWLER") || text.includes("FIELDER") )){ headerRowIdx=i; break; } } if(headerRowIdx===-1) headerRowIdx=0; const headerRow=allRows[headerRowIdx]; const ths=Array.from(headerRow.children).map(th=>th.innerText.trim().toUpperCase()); let nameIdx=ths.findIndex(h=>h.includes("PLAYER")||h==="NAME"||h.includes("BATSMAN")||h.includes("BATTER")||h.includes("BOWLER")||h.includes("FIELDER")); if(nameIdx===-1) nameIdx=1; const statsMap=[]; for(let i=headerRowIdx+1;i<allRows.length;i++){ const tds=Array.from(allRows[i].children); if(tds.length<4) continue; let playerNameText=tds[nameIdx]?tds[nameIdx].textContent.trim():""; let playerName=playerNameText.replace(/\\(c\\)|\\(wk\\)|\\*|\\†/gi,'').replace(/\\s+/g, ' ').trim(); if(!playerName||playerName.includes("Extras")||playerName.includes("Total")||playerName.includes("Did not bat")) continue; let value=0,matches=0; let ballsFaced=0, battingAvg=0, strikeRate=0; let overs=0, runsConceded=0, economy=0, bowlingAvg=0; const mIdx=ths.findIndex(h=>h==="M"||h.includes("MAT")||h.includes("MATCHES")); if(mIdx>=0) matches=parseInt(tds[mIdx]?.textContent||"0",10)||0; if(type==="Batting"){ const runsIdx=ths.findIndex(h=>h==="R"||h.includes("RUNS")); if(runsIdx>=0) value=parseInt(tds[runsIdx]?.textContent||"0",10); const bfIdx=ths.findIndex(h=>h==="BF"||h.includes("BALLS")); if(bfIdx>=0) ballsFaced=parseInt(tds[bfIdx]?.textContent||"0",10)||0; const avgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE")); if(avgIdx>=0) battingAvg=parseFloat(tds[avgIdx]?.textContent||"0.0")||0; const srIdx=ths.findIndex(h=>h==="SR"||h.includes("STRIKE")); if(srIdx>=0) strikeRate=parseFloat(tds[srIdx]?.textContent||"0.0")||0; } else if(type==="Bowling"){ const wktsIdx=ths.findIndex(h=>h==="W"||h.includes("WKTS")||h.includes("WICKETS")); if(wktsIdx>=0) value=parseInt(tds[wktsIdx]?.textContent||"0",10); const oversIdx=ths.findIndex(h=>h==="OVERS"||h==="O"||h.includes("OVERS")); if(oversIdx>=0) overs=parseFloat(tds[oversIdx]?.textContent||"0.0")||0; const runsConcededIdx=ths.findIndex(h=>h==="RUNS"||h==="R"||h.includes("RUNS")||h.includes("CONCEDED")); if(runsConcededIdx>=0) runsConceded=parseInt(tds[runsConcededIdx]?.textContent||"0",10)||0; const econIdx=ths.findIndex(h=>h==="ECON"||h==="E"||h.includes("ECONOMY")); if(econIdx>=0) economy=parseFloat(tds[econIdx]?.textContent||"0.0")||0; const bowlingAvgIdx=ths.findIndex(h=>h==="AVG"||h.includes("AVERAGE")); if(bowlingAvgIdx>=0) bowlingAvg=parseFloat(tds[bowlingAvgIdx]?.textContent||"0.0")||0; } else if(type==="Fielding"){ let outfieldCatches = 0; let wkCatches = 0; let stumpings = 0; let runOuts = 0; ths.forEach((header, idx) => { const val = parseInt(tds[idx]?.textContent || "0", 10) || 0; if (header.includes("WK") && (header.includes("CATCH") || header.includes("CT") || header.includes("C"))) { wkCatches += val; } else if ((header.includes("CATCH") || header === "C" || header === "CT") && !header.includes("WK")) { outfieldCatches += val; } else if (header.includes("STUMP") || header === "ST" || header === "S") { stumpings += val; } else if (header.includes("RO") || header.includes("RUNOUT") || header.includes("RUN OUT") || header.includes("DIRECT") || header.includes("INDIRECT")) { runOuts += val; } }); value = outfieldCatches + wkCatches + stumpings + runOuts; } if(isNaN(value)) value=0; statsMap.push({ name:playerName, value, matches, ballsFaced, battingAvg, strikeRate, overs, runsConceded, economy, bowlingAvg }); } if(statsMap.length===0){ alert("❌ No players found in the table."); return; } const mapRes=await fetch(\`\${S_URL}/rest/v1/mappings?select=*\`,{headers}); if(!mapRes.ok) throw new Error("Failed to fetch name mappings."); const mappings=await mapRes.json(); const getMappedName=(name)=>{ const m=mappings.find(x=>x.source_name.toLowerCase()===name.toLowerCase()); return m?m.target_name:name; }; const exRes=await fetch(\`\${S_URL}/rest/v1/player_stats?season=eq.\${season}&format=eq.\${format}\`,{headers}); if(!exRes.ok) throw new Error("Failed to fetch existing stats."); const existingStats=await exRes.json(); const payloads=statsMap.map(stat=>{ const targetName=getMappedName(stat.name); let existing=existingStats.find(s=>s.player_name===targetName); let record={...existing}; if(!existing){ record={ player_name:targetName, season:parseInt(season), format:format, runs:0, wickets:0, catches:0, matches:0, overs:0, runs_conceded:0, balls_faced:0, strike_rate:0, economy:0, batting_avg:0, bowling_avg:0 }; } record.updated_at = new Date().toISOString(); if(type==="Batting"){ record.runs=stat.value; record.balls_faced=stat.ballsFaced; record.batting_avg=stat.battingAvg; record.strike_rate=stat.strikeRate; record.matches=Math.max(record.matches||0,stat.matches); } if(type==="Bowling"){ record.wickets=stat.value; record.overs=stat.overs; record.runs_conceded=stat.runsConceded; record.economy=stat.economy; record.bowling_avg=stat.bowlingAvg; record.matches=Math.max(record.matches||0,stat.matches); } if(type==="Fielding"){ record.catches=stat.value; record.matches=Math.max(record.matches||0,stat.matches); } return record; }); existingStats.forEach(existing=>{ const isFound=statsMap.some(stat=>getMappedName(stat.name)===existing.player_name); if(!isFound){ let ghostUpdate={...existing}; let changed=false; if(type==="Batting"&&ghostUpdate.runs!==0){ ghostUpdate.runs=0; changed=true; } if(type==="Bowling"&&ghostUpdate.wickets!==0){ ghostUpdate.wickets=0; changed=true; } if(type==="Fielding"&&ghostUpdate.catches!==0){ ghostUpdate.catches=0; changed=true; } if(changed){ ghostUpdate.updated_at = new Date().toISOString(); payloads.push(ghostUpdate); } } }); const inserts=payloads.filter(p=>!p.id); const updates=payloads.filter(p=>p.id); let errorMsg=null; if(inserts.length>0){ const res=await fetch(\`\${S_URL}/rest/v1/player_stats\`,{ method:"POST", headers, body:JSON.stringify(inserts) }); if(!res.ok) errorMsg=await res.text(); } for(const up of updates){ const id=up.id; const payload={...up}; delete payload.id; const res=await fetch(\`\${S_URL}/rest/v1/player_stats?id=eq.\${id}\`,{ method:"PATCH", headers, body:JSON.stringify(payload) }); if(!res.ok&&!errorMsg) errorMsg=await res.text(); } if(errorMsg){ alert("⚠️ Finished with errors: "+errorMsg); } else { alert(\`✅ Successfully synced \${payloads.length} players for \${season} (\${type} - \${format})!\\n\\nCheck your website!\`); } } catch(err) { alert("❌ Unexpected Error: "+err.message); } })();`
              navigator.clipboard.writeText(code)
              alert('Bookmarklet code copied to clipboard!')
            }}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600'
            }}
          >
            <Copy size={16} />
            Copy Bookmarklet Code
          </button>
        </div>
      </div>

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
