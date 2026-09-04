import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { normalizeName } from '../../shared/names.js'
import { mergeScrapedStats } from '../../shared/mergeScrapedStats.js'
import { resolveSeason } from '../../shared/season.js'

// The bookmarklet is built from the same parser the server uses, plus the
// collector, so there is one implementation rather than a second copy on a
// separate maintenance path.
import parserSource from '../../shared/parseStatsTable.js?raw'
import collectorSource from '../bookmarklet/collectFromCricClubs.js?raw'

const buildBookmarklet = () => {
  const parser = parserSource.replace(/^export /gm, '')
  // Baked in so the collector knows where to send what it gathered.
  const origin = `const TUS_ORIGIN=${JSON.stringify(window.location.origin)};`
  return `javascript:${encodeURIComponent(`(function(){${origin}${parser}\n${collectorSource}})()`)}`
}

export const CricClubsImport = () => {
  const [pasted, setPasted] = useState('')
  const [format, setFormat] = useState('T20')
  const [season, setSeason] = useState(resolveSeason())
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const bookmarklet = useMemo(buildBookmarklet, [])
  const [handedOff, setHandedOff] = useState(false)

  // The bookmarklet opens this page with the figures in the fragment, so the
  // copy/switch-tab/paste round trip disappears. The fragment is cleared once
  // read, so a refresh does not silently re-import.
  useEffect(() => {
    const match = window.location.hash.match(/^#cricclubs=(.*)$/)
    if (!match) return
    try {
      const json = decodeURIComponent(match[1])
      JSON.parse(json)
      setPasted(json)
      setHandedOff(true)
    } catch {
      setResult({ ok: false, message: 'The figures handed over from CricClubs could not be read. Try the copy-and-paste route instead.' })
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // Not everyone keeps a bookmarks bar, and dragging is the only way to create
  // a bookmarklet from a link. Copying the code lets it be added by hand
  // through the bookmark manager instead.
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } catch {
      window.prompt('Copy this, then add it as a bookmark:', bookmarklet)
    }
  }

  const preview = useMemo(() => {
    if (!pasted.trim()) return null
    try {
      const data = JSON.parse(pasted)
      if (data.source !== 'cricclubs') return { error: 'That JSON did not come from the collector.' }
      return {
        batting: data.batting?.length ?? 0,
        bowling: data.bowling?.length ?? 0,
        fielding: data.fielding?.length ?? 0,
        collectedAt: data.collectedAt
      }
    } catch {
      return { error: 'That is not valid JSON — paste the whole thing the bookmarklet copied.' }
    }
  }, [pasted])

  const handleImport = async () => {
    setBusy(true)
    setResult(null)

    try {
      const data = JSON.parse(pasted)
      if (data.source !== 'cricclubs') throw new Error('That JSON did not come from the collector.')

      const { data: mappingRows, error: mappingError } = await supabase.from('mappings').select('*')
      if (mappingError) throw mappingError

      const mapName = (name) => {
        const hit = (mappingRows || []).find(m => normalizeName(m.source_name) === normalizeName(name))
        return hit ? hit.target_name : name
      }

      const records = mergeScrapedStats({
        batting: data.batting,
        bowling: data.bowling,
        fielding: data.fielding,
        format,
        season,
        mapName
      })

      if (records.length === 0) throw new Error('No player rows were found in that paste.')

      // Match on the normalised name so a casing or spacing variant updates the
      // existing row instead of inserting a twin — the bug that put 39 junk
      // rows in this table before.
      const { data: existing, error: existingError } = await supabase
        .from('player_stats').select('*').eq('season', parseInt(season, 10)).eq('format', format)
      if (existingError) throw existingError

      let inserted = 0
      let updated = 0

      for (const record of records) {
        const match = (existing || []).find(
          row => normalizeName(row.player_name) === normalizeName(record.player_name)
        )
        const payload = { ...record, updated_at: new Date().toISOString() }

        if (match) {
          const { error } = await supabase.from('player_stats').update(payload).eq('id', match.id)
          if (error) throw new Error(`Updating ${record.player_name}: ${error.message}`)
          updated += 1
        } else {
          const { error } = await supabase.from('player_stats').insert(payload)
          if (error) throw new Error(`Adding ${record.player_name}: ${error.message}`)
          inserted += 1
        }
      }

      setResult({ ok: true, updated, inserted, total: records.length })
    } catch (err) {
      setResult({ ok: false, message: err.message })
    }

    setBusy(false)
  }

  return (
    <div className="cricclubs-import">
      <h2>Import from CricClubs</h2>
      <p className="import-intro">
        CricClubs sits behind Cloudflare, which refuses our server — so the stats
        are collected by your own browser, which CricClubs already trusts, and
        written from here using your admin session.
      </p>

      <ol className="import-steps">
        <li>
          Drag this to your bookmarks bar:{' '}
          {/* eslint-disable-next-line react/jsx-no-script-url */}
          <a className="bookmarklet-link" href={bookmarklet} onClick={(e) => e.preventDefault()}>
            Collect CricClubs stats
          </a>
          <div className="bookmarklet-alt">
            No bookmarks bar? Press <kbd>⌘⇧B</kbd> (or <kbd>Ctrl+Shift+B</kbd>) to show it —
            or{' '}
            <button type="button" className="link-button" onClick={copyCode}>
              {copied ? 'copied' : 'copy the code'}
            </button>
            {' '}and add it by hand: <strong>Bookmarks → Bookmark Manager → Add new bookmark</strong>,
            any name, and paste the code as the URL.
          </div>
        </li>
        <li>Open your team&rsquo;s Batting, Bowling or Fielding page on CricClubs.</li>
        <li>Click the bookmark. It reads all three pages and copies the figures.</li>
        <li>It opens this page with the figures already filled in — check the format and press Import.</li>
      </ol>

      <div className="import-controls">
        <label>
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="T20">T20</option>
            <option value="Fifty">50 overs</option>
          </select>
        </label>
        <label>
          Season
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            min="2000"
            max="2100"
          />
        </label>
      </div>

      <textarea
        className="import-paste"
        rows="6"
        value={pasted}
        placeholder="Paste what the bookmarklet copied"
        onChange={(e) => setPasted(e.target.value)}
      />

      {handedOff && preview && !preview.error && (
        <p className="import-handoff">
          Figures arrived from CricClubs. Check the format below, then import.
        </p>
      )}

      {preview && !preview.error && (
        <p className="import-preview">
          Ready: {preview.batting} batting, {preview.bowling} bowling, {preview.fielding} fielding rows,
          collected {new Date(preview.collectedAt).toLocaleString()}.
        </p>
      )}
      {preview?.error && <p className="import-error">{preview.error}</p>}

      <button
        className="btn btn-primary"
        onClick={handleImport}
        disabled={busy || !preview || Boolean(preview.error)}
      >
        {busy ? 'Importing…' : `Import ${format} ${season}`}
      </button>

      {result?.ok && (
        <p className="import-success">
          Done — {result.updated} players updated, {result.inserted} added, {result.total} in total.
        </p>
      )}
      {result && !result.ok && <p className="import-error">Import failed: {result.message}</p>}
    </div>
  )
}

export default CricClubsImport
