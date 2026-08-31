# TuS Cricket Pfarrkirchen Website

Official web application for **TuS Cricket Pfarrkirchen**, the dedicated cricket department of **TuS 1860 Pfarrkirchen e.V.** (located in Bavaria, Germany). This website serves as the club's public homepage, player recruiting portal, real-time squad statistics showcase, and administration hub.

---

## 🚀 Features

### 1. Public Portal
- **Homepage (`/`)**: Dynamic landing page showcasing team training times (indoor winter sessions vs. summer outdoor Verbandsliga season), club heritage, and call-to-actions (CTAs) for beginners.
- **Join Us (`/join`)**: Interactive recruitment application forms with Netlify Forms integration, anti-spam honeypots, and local development simulation.
- **Squad Showcase (`/squad`)**: 
  - Dynamic roster rendering pulling live profiles directly from the Supabase database.
  - Interactive photo carousel displaying team line-ups, group shots, and social events.
  - Season selector (2025, 2026, etc.) and role filters (All, Batsmen, Bowlers).
  - High-performance ranking system and sorting options (points, runs, wickets, catches, bowling/batting averages, strike rates, economy, and names).
- **Contact Us (`/contact`)**: Map pins, embedded Google Maps location search, mailto contact widgets, and links to official social profiles (Instagram & Facebook).

### 2. Administrative Dashboard (`/admin`)
- **Supabase Authentication**: Password-secured login route (`/admin/login`) with session guarding (`AuthGuard`).
- **Squad Roster Manager**: Add new players, toggle their active status on the frontend, upload status profiles, or permanently delete them.
- **Name Mappings Manager**: Create mappings to resolve differences between official squad display names and naming variations in CricClubs statistics reports.
- **CSV Statistics Importer**: Drag-and-drop parser for CricClubs player statistics exports. Automatically maps CSV headers, previews rows, flags unregistered players, and overwrites Supabase statistics databases cleanly.
- **Automated Sync Hook**: Post trigger capability mapped to Netlify functions (`/trigger-stats-update`) for automated scraper syncing.

### 3. Technical & SEO Core
- **Glassmorphic Aesthetics**: Modern design scheme written in vanilla CSS, utilizing custom animations (`fade-in`, `reveal`), smooth transitions, responsive grids, and CSS variables.
- **Dependency-Free Helmet Component**: Custom `Helmet.jsx` component that updates the document `<head>` (`title`, description `meta` tags, canonical links, and Open Graph attributes) directly using DOM APIs, avoiding heavy third-party packages.
- **SEO & Compliance**: Integrated JSON-LD Schema.org structured data, unique element identifiers, and GDPR-compliant legal documents (`Impressum` and `Datenschutzerklärung`).

---

## 🛠 Tech Stack

- **Core**: React 18 (SPA), Vite (Bundler), React Router DOM v6 (Routing)
- **Database / Auth**: Supabase Database & Auth (`@supabase/supabase-js`)
- **Styling**: Vanilla CSS, Lucide React (Icons)
- **Forms & Hosting**: Netlify Forms & Netlify Hosting (with SPA routing redirects)

---

## 📂 Project Structure

```bash
TuS_website/
├── public/                     # Static assets
│   ├── _redirects              # Netlify SPA routing rules (/* /index.html 200)
│   ├── logo.png                # Club logo
│   ├── hero-bg.jpg             # Landing page background
│   └── pfarrkirchen-skyline.png# Pfarrkirchen skyline graphic
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Sticky header with mobile sidebar drawer
│   │   ├── Footer.jsx          # Minimal footer with social & compliance links
│   │   └── Helmet.jsx          # Lightweight SEO header updater
│   ├── pages/
│   │   ├── Home.jsx            # Homepage showing training calendars
│   │   ├── Squad.jsx           # Roster, statistics rankings & photo carousel
│   │   ├── JoinUs.jsx          # Player enrollment form
│   │   ├── Contact.jsx         # Google maps & mail handlers
│   │   ├── Success.jsx         # Post-submission confirmation page
│   │   ├── Impressum.jsx       # Legal imprint page
│   │   ├── Privacy.jsx         # GDPR privacy policy
│   │   ├── AdminLogin.jsx      # Admin login authentication form
│   │   └── AdminDashboard.jsx  # Squad manager, name mappings, and CSV importer
│   ├── App.jsx                 # Routing configuration & scroll restoration
│   ├── main.jsx                # React DOM render entry point
│   ├── index.css               # Core CSS stylesheet containing theme tokens
│   └── supabaseClient.js       # Global Supabase client configuration
├── bookmarklet.js              # Client-side scraping script for CricClubs
├── package.json                # Project dependencies and scripts
└── vite.config.js              # Vite dev server configurations
```

---

## 🔌 CricClubs Stats Synchronization

To bridge the gap between match statistics tracked on **CricClubs** and the website's squad page, the project supports three data import avenues:

### 1. Browser Bookmarklet (`bookmarklet.js`)
An administrative utility designed to run inside the browser. `bookmarklet.js` is the single source of truth for its logic (with `__SUPABASE_URL__` / `__SUPABASE_ANON_KEY__` placeholders); the admin dashboard's "Alternate Sync" panel imports it at build time (`?raw`) and injects the live Supabase config to produce both the drag-to-bookmark link and the "copy code" button, so there's only one copy of the scraping logic to maintain.
1. From `/admin` → **Name Mappings**, drag the "Sync to TuS Website" button to your bookmarks bar, or use "Copy Bookmarklet Code" to add it manually.
2. Open a CricClubs stats page (Batting, Bowling, or Fielding stats table view).
3. Run the bookmarklet from your bookmarks bar. The bookmarklet scrapes the active HTML table, translates names against the Supabase `mappings` table, and patches/inserts the statistics directly to Supabase.

### 2. Administrative CSV Upload
Inside the `/admin` dashboard under **Import CSV Stats**:
1. Export player statistics from CricClubs in CSV format.
2. Select the targeted **Season** and **Format** (T20 / Fifty-Over).
3. Upload the CSV. The importer will auto-detect columns, display a preview, flag any name mismatches, and override the statistics database.

### 3. Serverless Netlify Function
The admin dashboard features a "Sync Stats Now" option that triggers a POST request to `/.netlify/functions/trigger-stats-update` for automated synchronizations in production. The request must carry the logged-in admin's Supabase session as an `Authorization: Bearer <access_token>` header — the function verifies it via `supabase.auth.getUser()` before scraping or writing anything, so the endpoint can't be triggered by an anonymous caller. Writes then use `SUPABASE_SERVICE_ROLE_KEY` so they aren't blocked by the RLS write policies below. The code falls back to the anon key if that variable is unset, but since the anonymous write policies were dropped that fallback will now fail — the key is effectively required.

The actual scrape-and-sync logic (fetching each CricClubs stats page, parsing the table, matching names, writing to Supabase) lives in `netlify/functions/lib/statsSync.js` as `runStatsSync()`, shared by this function and the scheduled sync below — there's one implementation to fix or extend, not two.

### 4. Automatic Weekly Sync
`netlify/functions/scheduled-stats-sync.js` is a [Netlify Scheduled Function](https://docs.netlify.com/build/functions/scheduled-functions/) that calls the same `runStatsSync()` on its own — no admin has to click anything. It runs every Sunday at 00:00 UTC (`export const config = { schedule: '@weekly' }`); edit that cron expression to change the cadence. Scheduled functions can't be invoked over public HTTP by anyone else — only Netlify's own scheduler (or the "Run now" button on the function's page in the Netlify dashboard, useful for testing) can trigger it — so it needs no session/auth check of its own, unlike the button-triggered function above.

**Required environment variables** (Netlify site dashboard → Site configuration → Environment variables — not `.env`, since these are read server-side by the function, not bundled into the client):
- At least one of `CRICCLUBS_T20_BATTING_URL`, `CRICCLUBS_T20_BOWLING_URL`, `CRICCLUBS_T20_FIELDING_URL`, `CRICCLUBS_FIFTY_BATTING_URL`, `CRICCLUBS_FIFTY_BOWLING_URL`, `CRICCLUBS_FIFTY_FIELDING_URL` — each is the URL of the corresponding CricClubs stats page for the team. Unlike the bookmarklet (which scrapes whatever page is open in your browser), the scheduled/button-triggered sync has no browser, so without these it has nothing to scrape and simply reports "No CricClubs URLs configured."
- `SUPABASE_SERVICE_ROLE_KEY` — required so both sync paths can write despite the RLS write policies below.
- Optional `CRICCLUBS_SEASON` to pin the season instead of relying on the date-based default.

---

## 💻 Getting Started

### 1. Prerequisites
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher

### 2. Environment Variables Setup
Create a `.env` file in the root directory and configure your Supabase project keys:
```env
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-api-key
```

### 3. Development Commands
```bash
# Install dependencies
npm install

# Start the Vite development server on http://localhost:3000
npm run dev

# Run ESLint validation check
npm run lint

# Build production-ready bundle inside the dist/ directory
npm run build

# Locally preview the built production bundle
npm run preview
```

---

## 🗄 Database Schema Guidelines (Supabase)

Below are the default tables required in your Supabase database instance to back the application data structures:

### `squad` (Player Profiles)
- `id` (uuid, primary key)
- `name` (text, unique) - official player name
- `is_active` (boolean, default: true) - show/hide from squad page
- `photo_url` (text, nullable) - profile image URL
- `created_at` (timestamptz)

### `player_stats` (Cricket Match Stats)
- `id` (uuid, primary key)
- `player_name` (text) - displays match stats
- `season` (int) - e.g., 2025, 2026
- `format` (text) - 'T20' or 'Fifty'
- `runs` (int, default: 0)
- `wickets` (int, default: 0)
- `catches` (int, default: 0)
- `matches` (int, default: 0)
- `overs` (numeric, default: 0.0)
- `runs_conceded` (int, default: 0)
- `balls_faced` (int, default: 0)
- `strike_rate` (numeric, default: 0.0)
- `economy` (numeric, default: 0.0)
- `batting_avg` (numeric, default: 0.0)
- `bowling_avg` (numeric, default: 0.0)
- `updated_at` (timestamptz)

### `mappings` (CricClubs Name Translators)
- `id` (uuid, primary key)
- `source_name` (text, unique) - name variant parsed from CricClubs
- `target_name` (text) - maps to the official name in `squad` table
- `created_at` (timestamptz)

---

## 🔒 Row Level Security (RLS) Configuration in Supabase

Because the client uses the public anonymous key (`anon`) to read player statistics, **Row Level Security (RLS)** is what actually prevents unauthorized users from modifying the database — the admin dashboard's `AuthGuard` only hides UI, it enforces nothing.

RLS is enabled on `squad`, `player_stats`, `mappings`, and `seasons`, and the access model below is live as of 2026-08-31.

> [!WARNING]
> Adding policies does **not** restrict access. Postgres RLS policies are *permissive* — they OR together, so one open policy grants access regardless of how many stricter policies sit beside it. Closing a hole means **dropping** the offending policy, which is what `supabase/migrations/20260831012527_drop_anon_write_policies.sql` does.

### Access model

1. **`squad` Table**:
   - **SELECT**: Enable for `anon` (public read-only access).
   - **INSERT, UPDATE, DELETE**: Restrict to authenticated users (`authenticated` role / admin email login).

2. **`player_stats` Table**:
   - **SELECT**: Enable for `anon` (public read-only access).
   - **INSERT, UPDATE, DELETE**: Restrict to authenticated users.

3. **`mappings` Table**:
   - **SELECT**: Enable for `anon` (public read-only access).
   - **INSERT, UPDATE, DELETE**: Restrict to authenticated users.

> [!IMPORTANT]
> **The browser bookmarklet no longer works for writing stats.** It authenticated with the anon key, which relied on the open anonymous INSERT/UPDATE policies that were dropped on 2026-08-31. Anonymous write access cannot be secured with a key that ships in the public JS bundle, so it was removed in favour of the paths below. `bookmarklet.js` is retained for reference only.

Write paths that work under this model:

| Path | Credential | Works |
|---|---|---|
| Admin dashboard CRUD (`/admin`) | Logged-in admin session (`authenticated`) | ✅ |
| CSV Importer | Logged-in admin session (`authenticated`) | ✅ |
| "Sync Stats Now" button | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | ✅ |
| Weekly scheduled sync | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | ✅ |
| Public squad page reads | anon key + public SELECT policies | ✅ |
| Browser bookmarklet | anon key | ❌ removed |

Because both sync paths depend on it, `SUPABASE_SERVICE_ROLE_KEY` **must** be set in Netlify. The sync functions fall back to the anon key when it's missing, and that fallback is now blocked by RLS — so an unset key means the sync silently stops writing.

