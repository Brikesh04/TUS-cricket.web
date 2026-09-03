/* eslint-disable */
// Runs inside a CricClubs page, via a bookmarklet.
//
// Cloudflare's challenge stops the Netlify function reaching CricClubs at all
// (403, "Just a moment..."). A browser that has already passed that challenge
// reads the same pages normally, so the collection happens here and the writing
// happens back on the admin page, where the admin's own Supabase session is.
//
// This file is concatenated after shared/parseStatsTable.js, so pickStatsTable
// and parseStatsTable are already in scope — one parser, not a second copy that
// drifts from the server's.
(async function () {
  const fail = (message) => alert('CricClubs collect\n\n' + message)

  try {
    const here = new URL(window.location.href)

    if (!/(^|\.)cricclubs\.com$/i.test(here.hostname)) {
      fail('Open one of your CricClubs team stats pages first, then click this again.')
      return
    }

    // Build the three sibling pages from the ids in the query string rather
    // than by editing the path, so this works from any of them.
    const league = here.pathname.split('/').filter(Boolean)[0]
    const teamId = here.searchParams.get('teamId')
    const clubId = here.searchParams.get('clubId')

    if (!league || !teamId || !clubId) {
      fail('This does not look like a team stats page — it needs teamId and clubId in the address.\n\nOpen the team Batting, Bowling or Fielding page and try again.')
      return
    }

    const pageUrl = (kind) =>
      `${here.origin}/${league}/team${kind}.do?teamId=${encodeURIComponent(teamId)}&clubId=${encodeURIComponent(clubId)}`

    const tablesFrom = (doc) =>
      Array.from(doc.querySelectorAll('table')).map((table) => ({
        ths: Array.from(table.querySelectorAll('th')).map((th) => th.textContent),
        rows: Array.from(table.querySelectorAll('tr')).map((tr) =>
          Array.from(tr.children).map((cell) => cell.textContent)
        )
      }))

    const collect = async (kind) => {
      const response = await fetch(pageUrl(kind), { credentials: 'include' })
      if (!response.ok) throw new Error(`${kind} page returned HTTP ${response.status}`)
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
      const table = pickStatsTable(tablesFrom(doc))
      if (!table) throw new Error(`No stats table found on the ${kind} page`)
      return parseStatsTable(table, kind)
    }

    const payload = {
      source: 'cricclubs',
      collectedAt: new Date().toISOString(),
      league,
      teamId,
      clubId,
      batting: await collect('Batting'),
      bowling: await collect('Bowling'),
      fielding: await collect('Fielding')
    }

    const json = JSON.stringify(payload)
    const summary =
      `${payload.batting.length} batting, ${payload.bowling.length} bowling, ` +
      `${payload.fielding.length} fielding rows.`

    try {
      await navigator.clipboard.writeText(json)
      alert(`Copied ${summary}\n\nGo back to the admin page and paste it into Import from CricClubs.`)
    } catch (clipboardError) {
      // Clipboard access can be refused; show the text so it can be copied by
      // hand rather than losing the collection entirely.
      const box = document.createElement('textarea')
      box.value = json
      box.style.cssText = 'position:fixed;inset:5% 5% auto 5%;height:60vh;z-index:2147483647;font:12px monospace;padding:12px'
      document.body.appendChild(box)
      box.select()
      alert(`Collected ${summary}\n\nThe clipboard was blocked, so the data is in the box on this page — copy it (Ctrl/Cmd+C) and paste it into the admin page.`)
    }
  } catch (err) {
    fail('Could not collect the stats.\n\n' + err.message)
  }
})()
