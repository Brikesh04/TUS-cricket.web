import { load as loadHtml } from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import { normalizeName } from '../../shared/names.js'

export const handler = async (event, context) => {
  // Handle CORS preflight options request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  // Enforce POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    }
  }

  // This endpoint scrapes and then writes with the service role key, which
  // bypasses RLS entirely. Without a session check anyone who knows the URL
  // could trigger writes to squad stats, so require a signed-in admin first.
  const authUrl = process.env.VITE_SUPABASE_URL
  const authAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!authUrl || !authAnonKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Supabase environment variables are not configured.' })
    }
  }

  if (!token) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Missing Authorization header. Please sign in as an admin and try again.' })
    }
  }

  try {
    const authClient = createClient(authUrl, authAnonKey)
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData?.user) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Invalid or expired session. Please sign in again.' })
      }
    }
  } catch (err) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `Could not verify session: ${err.message}` })
    }
  }

  const errors = []
  const diagnostics = {
    t20: { batting: 0, bowling: 0, fielding: 0 },
    fifty: { batting: 0, bowling: 0, fielding: 0 }
  }

  // 1. Initialize Supabase Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Supabase environment variables (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY) are not configured.'
      })
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 2. Determine target season
  // Check CRICCLUBS_SEASON env, then fall back to dynamic date-based matching
  let season = process.env.CRICCLUBS_SEASON
  if (!season) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 3 is April
    if (year === 2026 && month >= 3) {
      season = '2026'
    } else if (year >= 2027) {
      season = year.toString()
    } else {
      season = '2025'
    }
  }

  try {
    // 3. Fetch name mappings & existing player stats
    const [mappingsRes, existingRes] = await Promise.all([
      supabase.from('mappings').select('*'),
      supabase.from('player_stats').select('*').eq('season', parseInt(season))
    ])

    if (mappingsRes.error) throw new Error(`Failed to load mappings: ${mappingsRes.error.message}`)
    if (existingRes.error) throw new Error(`Failed to load existing stats: ${existingRes.error.message}`)

    const mappings = mappingsRes.data || []
    const existingStats = existingRes.data || []

    const getMappedName = (name) => {
      const m = mappings.find(x => normalizeName(x.source_name) === normalizeName(name))
      return m ? m.target_name : name
    }

    // Define parsing tasks mapping env variable urls to formats/types
    const scrapeTasks = [
      { envKey: 'CRICCLUBS_T20_BATTING_URL', format: 'T20', type: 'Batting', diagKey: ['t20', 'batting'] },
      { envKey: 'CRICCLUBS_T20_BOWLING_URL', format: 'T20', type: 'Bowling', diagKey: ['t20', 'bowling'] },
      { envKey: 'CRICCLUBS_T20_FIELDING_URL', format: 'T20', type: 'Fielding', diagKey: ['t20', 'fielding'] },
      { envKey: 'CRICCLUBS_FIFTY_BATTING_URL', format: 'Fifty', type: 'Batting', diagKey: ['fifty', 'batting'] },
      { envKey: 'CRICCLUBS_FIFTY_BOWLING_URL', format: 'Fifty', type: 'Bowling', diagKey: ['fifty', 'bowling'] },
      { envKey: 'CRICCLUBS_FIFTY_FIELDING_URL', format: 'Fifty', type: 'Fielding', diagKey: ['fifty', 'fielding'] }
    ]

    const statsByPlayerFormat = {} // Key: `${format}_${player_name}`
    const scrapedCategories = {
      T20: { Batting: false, Bowling: false, Fielding: false },
      Fifty: { Batting: false, Bowling: false, Fielding: false }
    }

    const getPlayerRecord = (playerName, format) => {
      const key = `${format}_${normalizeName(playerName)}`
      if (!statsByPlayerFormat[key]) {
        statsByPlayerFormat[key] = {
          player_name: playerName,
          season: parseInt(season),
          format: format,
          runs: 0,
          wickets: 0,
          catches: 0,
          matches: 0,
          overs: 0,
          runs_conceded: 0,
          balls_faced: 0,
          strike_rate: 0,
          economy: 0,
          batting_avg: 0,
          bowling_avg: 0
        }
      }
      return statsByPlayerFormat[key]
    }

    // 4. Run scraping tasks
    let anyUrlConfigured = false
    for (const task of scrapeTasks) {
      const url = process.env[task.envKey]
      if (!url) {
        continue
      }
      anyUrlConfigured = true

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} fetching URL`)
        }

        const html = await response.text()
        const $ = loadHtml(html)

        // Locate main statistics table by scoring table structures
        let tableElement = null
        let maxScore = -1
        $('table').each((_, el) => {
          const ths = []
          $(el).find('th').each((_, thEl) => {
            ths.push($(thEl).text().toUpperCase())
          })
          if (ths.length > 4) {
            let score = 0
            if (ths.some(h => h.includes('PLAYER') || h === 'NAME' || h.includes('BATSMAN') || h.includes('BATTER') || h.includes('BOWLER') || h.includes('FIELDER'))) score += 10
            if (ths.some(h => h === 'M' || h.includes('MAT') || h.includes('MATCHES'))) score += 5
            if (ths.some(h => h === 'R' || h.includes('RUNS') || h === 'W' || h.includes('WKTS') || h.includes('CATCH'))) score += 5
            if (score > maxScore) {
              maxScore = score
              tableElement = el
            }
          }
        })

        if (!tableElement) {
          throw new Error('Could not find the main stats table on this page.')
        }

        // Find header row and parse column index positions
        const allRows = $(tableElement).find('tr')
        let headerRowIdx = -1
        const rowElements = []
        allRows.each((idx, el) => {
          rowElements.push(el)
          const text = $(el).text().toUpperCase()
          if ($(el).children().length > 4 && headerRowIdx === -1 && (
            text.includes('PLAYER') ||
            text.includes('NAME') ||
            text.includes('BATSMAN') ||
            text.includes('BATTER') ||
            text.includes('BOWLER') ||
            text.includes('FIELDER')
          )) {
            headerRowIdx = idx
          }
        })

        if (headerRowIdx === -1) headerRowIdx = 0
        const headerRow = rowElements[headerRowIdx]
        const ths = []
        $(headerRow).children().each((_, el) => {
          ths.push($(el).text().trim().toUpperCase())
        })

        let nameIdx = ths.findIndex(h => h.includes('PLAYER') || h === 'NAME' || h.includes('BATSMAN') || h.includes('BATTER') || h.includes('BOWLER') || h.includes('FIELDER'))
        if (nameIdx === -1) nameIdx = 1

        let scrapedCount = 0
        for (let i = headerRowIdx + 1; i < rowElements.length; i++) {
          const tds = $(rowElements[i]).children()
          if (tds.length < 4) continue

          const rawPlayerName = $(tds[nameIdx]).text().trim()
          const cleanPlayerName = rawPlayerName.replace(/\(c\)|\(wk\)|\*|\†/gi, '').replace(/\s+/g, ' ').trim()
          if (!cleanPlayerName || cleanPlayerName.includes('Extras') || cleanPlayerName.includes('Total') || cleanPlayerName.includes('Did not bat')) continue

          scrapedCount++
          const targetName = getMappedName(cleanPlayerName)
          const record = getPlayerRecord(targetName, task.format)

          let matches = 0
          const mIdx = ths.findIndex(h => h === 'M' || h.includes('MAT') || h.includes('MATCHES'))
          if (mIdx >= 0) {
            matches = parseInt($(tds[mIdx]).text(), 10) || 0
          }
          record.matches = Math.max(record.matches || 0, matches)

          if (task.type === 'Batting') {
            const runsIdx = ths.findIndex(h => h === 'R' || h.includes('RUNS'))
            if (runsIdx >= 0) record.runs = parseInt($(tds[runsIdx]).text(), 10) || 0

            const bfIdx = ths.findIndex(h => h === 'BF' || h.includes('BALLS'))
            if (bfIdx >= 0) record.balls_faced = parseInt($(tds[bfIdx]).text(), 10) || 0

            const avgIdx = ths.findIndex(h => h === 'AVG' || h.includes('AVERAGE'))
            if (avgIdx >= 0) record.batting_avg = parseFloat($(tds[avgIdx]).text()) || 0

            const srIdx = ths.findIndex(h => h === 'SR' || h.includes('STRIKE'))
            if (srIdx >= 0) record.strike_rate = parseFloat($(tds[srIdx]).text()) || 0
          } else if (task.type === 'Bowling') {
            const wktsIdx = ths.findIndex(h => h === 'W' || h.includes('WKTS') || h.includes('WICKETS'))
            if (wktsIdx >= 0) record.wickets = parseInt($(tds[wktsIdx]).text(), 10) || 0

            const oversIdx = ths.findIndex(h => h === 'OVERS' || h === 'O' || h.includes('OVERS'))
            if (oversIdx >= 0) record.overs = parseFloat($(tds[oversIdx]).text()) || 0

            const runsConcededIdx = ths.findIndex(h => h === 'RUNS' || h === 'R' || h.includes('RUNS') || h.includes('CONCEDED'))
            if (runsConcededIdx >= 0) record.runs_conceded = parseInt($(tds[runsConcededIdx]).text(), 10) || 0

            const econIdx = ths.findIndex(h => h === 'ECON' || h === 'E' || h.includes('ECONOMY'))
            if (econIdx >= 0) record.economy = parseFloat($(tds[econIdx]).text()) || 0

            const bowlingAvgIdx = ths.findIndex(h => h === 'AVG' || h.includes('AVERAGE'))
            if (bowlingAvgIdx >= 0) record.bowling_avg = parseFloat($(tds[bowlingAvgIdx]).text()) || 0
          } else if (task.type === 'Fielding') {
            let outfieldCatches = 0
            let wkCatches = 0
            let stumpings = 0
            let runOuts = 0

            ths.forEach((header, idx) => {
              const val = parseInt($(tds[idx]).text(), 10) || 0
              if (header.includes('WK') && (header.includes('CATCH') || header.includes('CT') || header.includes('C'))) {
                wkCatches += val
              } else if ((header.includes('CATCH') || header === 'C' || header === 'CT') && !header.includes('WK')) {
                outfieldCatches += val
              } else if (header.includes('STUMP') || header === 'ST' || header === 'S') {
                stumpings += val
              } else if (header.includes('RO') || header.includes('RUNOUT') || header.includes('RUN OUT') || header.includes('DIRECT') || header.includes('INDIRECT')) {
                runOuts += val
              }
            })

            record.catches = outfieldCatches + wkCatches + stumpings + runOuts
          }
        }

        diagnostics[task.diagKey[0]][task.diagKey[1]] = scrapedCount
        scrapedCategories[task.format][task.type] = true

      } catch (err) {
        errors.push(`Error scraping ${task.format} ${task.type}: ${err.message}`)
      }
    }

    if (!anyUrlConfigured) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'No CricClubs URLs configured in environment variables. Please configure CRICCLUBS_T20_BATTING_URL, etc.'
        })
      }
    }

    // 5. Match with existing records to bind IDs for UPDATE vs INSERT, and execute ghost resets
    const finalPayloads = []

    // Attach existing IDs to updated records
    for (const key of Object.keys(statsByPlayerFormat)) {
      const rec = statsByPlayerFormat[key]
      // Normalised on both sides: an existing row stored as "Adul Sherwin
      // XAVIER" must match a scrape of "Adul Sherwin Xavier" and update it,
      // rather than miss and insert a duplicate.
      const existing = existingStats.find(
        s => normalizeName(s.player_name) === normalizeName(rec.player_name) && s.format === rec.format
      )
      if (existing) {
        rec.id = existing.id
      }
      rec.updated_at = new Date().toISOString()
      finalPayloads.push(rec)
    }

    // Handle ghost records (in DB but missing from scraped pages, reset corresponding category stats to 0)
    for (const existing of existingStats) {
      const key = `${existing.format}_${normalizeName(existing.player_name)}`
      if (!statsByPlayerFormat[key]) {
        let changed = false
        const ghostRecord = { ...existing }

        if (scrapedCategories[existing.format].Batting && ghostRecord.runs !== 0) {
          ghostRecord.runs = 0
          ghostRecord.balls_faced = 0
          ghostRecord.batting_avg = 0
          ghostRecord.strike_rate = 0
          changed = true
        }
        if (scrapedCategories[existing.format].Bowling && ghostRecord.wickets !== 0) {
          ghostRecord.wickets = 0
          ghostRecord.overs = 0
          ghostRecord.runs_conceded = 0
          ghostRecord.economy = 0
          ghostRecord.bowling_avg = 0
          changed = true
        }
        if (scrapedCategories[existing.format].Fielding && ghostRecord.catches !== 0) {
          ghostRecord.catches = 0
          changed = true
        }

        if (changed) {
          ghostRecord.updated_at = new Date().toISOString()
          finalPayloads.push(ghostRecord)
        }
      }
    }

    // 6. Write changes to Supabase
    const inserts = finalPayloads.filter(p => !p.id)
    const updates = finalPayloads.filter(p => p.id)

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('player_stats').insert(inserts)
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`)
    }

    for (const up of updates) {
      const id = up.id
      const payload = { ...up }
      delete payload.id
      const { error: updateError } = await supabase.from('player_stats').update(payload).eq('id', id)
      if (updateError) throw new Error(`Update failed for ${payload.player_name}: ${updateError.message}`)
    }

    // Calculate unique players found
    const uniquePlayersScraped = new Set(finalPayloads.map(p => p.player_name))

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        playersUpdated: finalPayloads.length,
        totalFound: uniquePlayersScraped.size,
        diagnostics,
        errors
      })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: err.message,
        errors: [err.message]
      })
    }
  }
}
