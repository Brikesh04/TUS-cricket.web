import React, { useState, useEffect } from 'react'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'
import Helmet from '../components/Helmet'
import { supabase } from '../supabaseClient'

export const Squad = () => {
  const getInitialSeason = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed: 3 is April
    if (year === 2026 && month >= 3) return '2026'
    if (year >= 2027) return year.toString()
    return '2025'
  }

  const [players, setPlayers] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [season, setSeason] = useState(getInitialSeason())
  const [showTooltip, setShowTooltip] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [roleFilter, setRoleFilter] = useState('All')
  const [sortBy, setSortBy] = useState('points')
  const [sortOrder, setSortOrder] = useState('desc')
  const [error, setError] = useState(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  const carouselPhotos = [
    { src: '/team/team-lineup.jpg', alt: 'TUS Cricket Team Lineup' },
    { src: '/team/team-group.jpg', alt: 'TUS Cricket Team Group' },
    { src: '/team/team-dinner.jpg', alt: 'TUS Cricket Team Dinner' }
  ]

  const getPlayerStatsForFormat = (playerStatsList, format) => {
    const formatStats = playerStatsList.filter(stat => stat.format === format)
    if (formatStats.length === 0) return {}
    return formatStats.reduce((max, current) => {
      const currentRuns = current.runs || 0
      const maxRuns = max.runs || 0
      if (currentRuns > maxRuns) return current
      if (currentRuns < maxRuns) return max
      const currentMatches = current.matches || 0
      const maxMatches = max.matches || 0
      return currentMatches > maxMatches ? current : max
    }, formatStats[0])
  }

  useEffect(() => {
    const fetchSquadData = async () => {
      setIsLoading(true)
      setError(null)
      if (!supabase) {
        setIsLoading(false)
        return
      }

      try {
        const [squadRes, statsRes, mappingsRes] = await Promise.all([
          supabase.from('squad').select('*').eq('is_active', true),
          supabase.from('player_stats').select('*').eq('season', parseInt(season)),
          supabase.from('mappings').select('*')
        ])

        if (squadRes.error) throw squadRes.error
        if (statsRes.error) throw statsRes.error
        if (mappingsRes.error) throw mappingsRes.error

        if (squadRes.data) {
          const processedPlayers = squadRes.data.map(player => {
            const cleanPlayerName = player.name.trim().toLowerCase()
            const mappedNames = (mappingsRes.data || [])
              .filter(m => m.target_name.trim().toLowerCase() === cleanPlayerName)
              .map(m => m.source_name.trim().toLowerCase())

            const playerStatsList = statsRes.data?.filter(stat => {
              const cleanStatName = stat.player_name.trim().toLowerCase()
              return cleanStatName === cleanPlayerName || mappedNames.includes(cleanStatName)
            }) || []

            const t20Stats = getPlayerStatsForFormat(playerStatsList, 'T20')
            const fiftyStats = getPlayerStatsForFormat(playerStatsList, 'Fifty')

            const t20Runs = t20Stats.runs || 0
            const fiftyRuns = fiftyStats.runs || 0
            const totalRuns = t20Runs + fiftyRuns

            const t20Overs = t20Stats.overs || 0
            const fiftyOvers = fiftyStats.overs || 0
            const totalOvers = t20Overs + fiftyOvers

            const t20Matches = t20Stats.matches || 0
            const fiftyMatches = fiftyStats.matches || 0
            const totalMatches = t20Matches + fiftyMatches

            const weightedSR = totalRuns > 0
              ? ((t20Stats.strike_rate || 0) * t20Runs + (fiftyStats.strike_rate || 0) * fiftyRuns) / totalRuns
              : 0

            const weightedEcon = totalOvers > 0
              ? ((t20Stats.economy || 0) * t20Overs + (fiftyStats.economy || 0) * fiftyOvers) / totalOvers
              : 0

            const weightedAvg = totalMatches > 0
              ? ((t20Stats.batting_avg || 0) * t20Matches + (fiftyStats.batting_avg || 0) * fiftyMatches) / totalMatches
              : 0

            return {
              ...player,
              total_runs: totalRuns,
              total_wickets: (t20Stats.wickets || 0) + (fiftyStats.wickets || 0),
              total_catches: (t20Stats.catches || 0) + (fiftyStats.catches || 0),
              total_matches: totalMatches,
              // Detailed stats support
              strike_rate: weightedSR,
              economy: weightedEcon,
              overs: totalOvers,
              batting_avg: weightedAvg
            }
          })

          // Sort by points descending
          processedPlayers.sort((a, b) => calculatePoints(b) - calculatePoints(a))
          setPlayers(processedPlayers)
        }

        // Determine latest update timestamp across player stats
        if (statsRes.data && statsRes.data.length > 0) {
          const dates = statsRes.data
            .map(stat => stat.updated_at ? new Date(stat.updated_at).getTime() : 0)
            .filter(time => time > 0)
          if (dates.length > 0) {
            setLastUpdated(new Date(Math.max(...dates)))
          } else {
            setLastUpdated(null)
          }
        } else {
          setLastUpdated(null)
        }
      } catch (err) {
        console.error('Error fetching squad data:', err)
        setError(err.message || 'Failed to load squad data. Please try again.')
      }
      setIsLoading(false)
    }

    fetchSquadData()
  }, [season, reloadCounter])

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % carouselPhotos.length)
  }

  const setPhotoIndex = (index) => {
    setActivePhotoIndex(index)
  }

  const getInitials = (name) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
  }

  const splitName = (name) => {
    const parts = name.split(' ')
    if (parts.length === 1) return { first: '', last: name.toUpperCase() }
    const last = parts.pop()
    return { first: parts.join(' '), last: last.toUpperCase() }
  }

  const getPreferredRole = (player) => {
    const runs = player.total_runs || 0
    const wickets = player.total_wickets || 0
    if (wickets > runs / 20) return 'Bowler'
    return 'Batsman'
  }

  const calculatePoints = (player) => {
    const runs = player.total_runs || 0
    const wickets = player.total_wickets || 0
    const catches = player.total_catches || 0
    return runs + wickets * 20 + catches * 5
  }

  const getStrikeRate = (player) => {
    return typeof player.strike_rate === 'number' ? player.strike_rate : 0
  }

  const getBowlingOvers = (player) => {
    return typeof player.overs === 'number' ? player.overs : 0
  }

  const getBowlingEcon = (player) => {
    return typeof player.economy === 'number' ? player.economy : 0
  }

  const handleSort = (field) => {
    setSortBy(field);
    // 'name' and 'econ' are always sorted 'asc' (lowest/alphabetical first). Others are always sorted 'desc' (highest first).
    setSortOrder(field === 'name' || field === 'econ' ? 'asc' : 'desc');
  }

  // Filter players by dynamic stats suitability
  const filteredPlayers = players.filter(player => {
    if (roleFilter === 'All') return true;
    if (roleFilter === 'Batsman') {
      return (player.total_runs > 0 || player.total_matches > 0);
    }
    if (roleFilter === 'Bowler') {
      return (player.total_wickets > 0 || (typeof player.overs === 'number' ? player.overs > 0 : player.total_matches > 0));
    }
    return true;
  });

  // Sort filtered players dynamically
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'points') {
      valA = calculatePoints(a);
      valB = calculatePoints(b);
    } else if (sortBy === 'runs') {
      valA = a.total_runs || 0;
      valB = b.total_runs || 0;
    } else if (sortBy === 'wickets') {
      valA = a.total_wickets || 0;
      valB = b.total_wickets || 0;
    } else if (sortBy === 'catches') {
      valA = a.total_catches || 0;
      valB = b.total_catches || 0;
    } else if (sortBy === 'matches') {
      valA = a.total_matches || 0;
      valB = b.total_matches || 0;
    } else if (sortBy === 'batting_avg') {
      valA = a.batting_avg || (a.total_matches > 0 ? (a.total_runs || 0) / a.total_matches : 0);
      valB = b.batting_avg || (b.total_matches > 0 ? (b.total_runs || 0) / b.total_matches : 0);
    } else if (sortBy === 'bowling_avg') {
      valA = a.bowling_avg || (a.total_matches > 0 ? (a.total_wickets || 0) / a.total_matches : 0);
      valB = b.bowling_avg || (b.total_matches > 0 ? (b.total_wickets || 0) / b.total_matches : 0);
    } else if (sortBy === 'sr') {
      valA = getStrikeRate(a);
      valB = getStrikeRate(b);
    } else if (sortBy === 'overs') {
      valA = getBowlingOvers(a);
      valB = getBowlingOvers(b);
    } else if (sortBy === 'econ') {
      valA = getBowlingEcon(a);
      valB = getBowlingEcon(b);
    } else if (sortBy === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (valA === valB) {
      return a.name.localeCompare(b.name);
    }
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  const visiblePlayers = showAll ? sortedPlayers : sortedPlayers.slice(0, 6)
  const hasMorePlayers = sortedPlayers.length > 6

  return (
    <div className="page-squad">
      <Helmet>
        <title>The Squad | TuS Cricket Pfarrkirchen</title>
        <meta name="description" content="Meet the TuS Cricket Pfarrkirchen squad — players, leaders, and the community that makes us stronger." />
        <link rel="canonical" href="https://tus-cricket-pfarrkirchen.de/squad" />
      </Helmet>

      <main className="section-padding">
        <div className="container text-center">
          <h2 className="mb-4">Meet The Squad</h2>

          {/* Photo Carousel */}
          <div className="team-carousel">
            <div className="carousel-container" onClick={nextPhoto}>
              {carouselPhotos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.src}
                  alt={photo.alt}
                  className={`carousel-photo ${index === activePhotoIndex ? 'active' : ''}`}
                />
              ))}
            </div>
            <div className="carousel-dots">
              {carouselPhotos.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === activePhotoIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoIndex(index)
                  }}
                  aria-label={`Go to photo ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="error-state alert alert-danger" style={{ margin: '2rem auto', maxWidth: '600px', padding: '1.5rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', color: '#b91c1c', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>⚠️ Failed to Load Squad</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>{error}</p>
              <button onClick={() => setReloadCounter(prev => prev + 1)} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="squad-loading">Loading squad...</div>
          ) : players.length > 0 ? (
            <div className="rankings-section">
              <div className="rankings-header">
                <h3>{season} Season Rankings</h3>
                <div className="season-selector">
                  <select
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="season-dropdown"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
              
              <div className="role-filters">
                {['All', 'Batsman', 'Bowler'].map(role => (
                  <button
                    key={role}
                    className={`role-filter-btn ${roleFilter === role ? 'active' : ''}`}
                    onClick={() => {
                      setRoleFilter(role);
                      setShowAll(false);
                      if (role === 'All') {
                        setSortBy('points');
                        setSortOrder('desc');
                      } else if (role === 'Batsman') {
                        setSortBy('runs');
                        setSortOrder('desc');
                      } else if (role === 'Bowler') {
                        setSortBy('wickets');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    {role === 'All' ? 'All' : 
                     role === 'Batsman' ? 'Batsmen' : 'Bowlers'}
                  </button>
                ))}
              </div>

              <div className={`rankings-table ${roleFilter === 'Batsman' ? 'batting-mode' : roleFilter === 'Bowler' ? 'bowling-mode' : ''}`}>
                  {/* Table Header */}
                  {roleFilter === 'All' && (
                    <div className="rankings-table-header">
                      <span className="header-col-pos">Pos</span>
                      <span 
                        className={`header-col-player sortable ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Player
                      </span>
                      <span 
                        className={`header-col-runs sortable ${sortBy === 'runs' ? 'active' : ''}`}
                        onClick={() => handleSort('runs')}
                      >
                        R
                      </span>
                      <span 
                        className={`header-col-wickets sortable ${sortBy === 'wickets' ? 'active' : ''}`}
                        onClick={() => handleSort('wickets')}
                      >
                        W
                      </span>
                      <span 
                        className={`header-col-catches sortable ${sortBy === 'catches' ? 'active' : ''}`}
                        onClick={() => handleSort('catches')}
                      >
                        C
                      </span>
                      <span 
                        className={`header-col-points sortable ${sortBy === 'points' ? 'active' : ''}`}
                        onClick={() => handleSort('points')}
                      >
                        Pts
                        <span
                          className={`points-info-trigger ${showTooltip ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTooltip(!showTooltip);
                          }}
                          style={{ marginLeft: '4px', verticalAlign: 'middle', display: 'inline-flex', position: 'relative' }}
                        >
                          <Info size={11} />
                          <span className={`points-tooltip ${showTooltip ? 'visible' : ''}`} style={{ textTransform: 'none', fontWeight: 'normal' }}>
                            Points = Runs + (Wickets × 20) + (Catches × 5)
                          </span>
                        </span>
                      </span>
                    </div>
                  )}

                  {roleFilter === 'Batsman' && (
                    <div className="rankings-table-header">
                      <span className="header-col-pos">Pos</span>
                      <span 
                        className={`header-col-player sortable ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Player
                      </span>
                      <span 
                        className={`header-col-mat sortable ${sortBy === 'matches' ? 'active' : ''}`}
                        onClick={() => handleSort('matches')}
                      >
                        Mat
                      </span>
                      <span 
                        className={`header-col-runs sortable ${sortBy === 'runs' ? 'active' : ''}`}
                        onClick={() => handleSort('runs')}
                      >
                        Runs
                      </span>
                      <span 
                        className={`header-col-avg sortable ${sortBy === 'batting_avg' ? 'active' : ''}`}
                        onClick={() => handleSort('batting_avg')}
                      >
                        Avg
                      </span>
                      <span 
                        className={`header-col-sr sortable ${sortBy === 'sr' ? 'active' : ''}`}
                        onClick={() => handleSort('sr')}
                      >
                        SR
                      </span>
                    </div>
                  )}

                  {roleFilter === 'Bowler' && (
                    <div className="rankings-table-header">
                      <span className="header-col-pos">Pos</span>
                      <span 
                        className={`header-col-player sortable ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Player
                      </span>
                      <span 
                        className={`header-col-mat sortable ${sortBy === 'matches' ? 'active' : ''}`}
                        onClick={() => handleSort('matches')}
                      >
                        Mat
                      </span>
                      <span 
                        className={`header-col-overs sortable ${sortBy === 'overs' ? 'active' : ''}`}
                        onClick={() => handleSort('overs')}
                      >
                        Overs
                      </span>
                      <span 
                        className={`header-col-wickets sortable ${sortBy === 'wickets' ? 'active' : ''}`}
                        onClick={() => handleSort('wickets')}
                      >
                        Wkts
                      </span>
                      <span 
                        className={`header-col-econ sortable ${sortBy === 'econ' ? 'active' : ''}`}
                        onClick={() => handleSort('econ')}
                      >
                        Econ
                      </span>
                    </div>
                  )}
 
                  {/* Table Rows */}
                  {visiblePlayers.map((player, index) => {
                    const isTopPlayer = index === 0
                    const role = getPreferredRole(player)
 
                    return (
                      <div key={player.id} className={`rankings-row ${isTopPlayer ? 'top-player' : ''}`}>
                        <div className="col-pos">
                          <span className="pos-number">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        
                        <div className="col-player">
                          <h3 className="player-name-container">{player.name}</h3>
                          <span className="player-role-subtext">{role}</span>
                        </div>
 
                        {roleFilter === 'All' && (
                          <>
                            <span className="col-runs">{player.total_runs || 0}</span>
                            <span className="col-wickets">{player.total_wickets || 0}</span>
                            <span className="col-catches">{player.total_catches || 0}</span>
                            <div className="col-points">
                              <div className={`pts-badge ${isTopPlayer ? 'top' : 'other'}`}>
                                <span>{calculatePoints(player)}</span>
                              </div>
                            </div>
                          </>
                        )}

                        {roleFilter === 'Batsman' && (
                          <>
                            <span className="col-mat">{player.total_matches || 0}</span>
                            <span className="col-runs">{player.total_runs || 0}</span>
                            <span className="col-avg">
                              {typeof player.batting_avg === 'number' && player.batting_avg > 0 ? player.batting_avg.toFixed(1) : (player.total_matches > 0 ? (player.total_runs / player.total_matches).toFixed(1) : '0.0')}
                            </span>
                            <span className="col-sr">
                              {getStrikeRate(player) > 0 ? getStrikeRate(player).toFixed(1) : '-'}
                            </span>
                          </>
                        )}

                        {roleFilter === 'Bowler' && (
                          <>
                            <span className="col-mat">{player.total_matches || 0}</span>
                            <span className="col-overs">
                              {getBowlingOvers(player) > 0 ? getBowlingOvers(player).toFixed(1) : '0.0'}
                            </span>
                            <span className="col-wickets">{player.total_wickets || 0}</span>
                            <span className="col-econ">
                              {getBowlingEcon(player) > 0 ? getBowlingEcon(player).toFixed(2) : '-'}
                            </span>
                          </>
                        )}
                      </div>
                    )
                  })}
              </div>
 
              {hasMorePlayers && (
                <div style={{ padding: '0', margin: '24px 0 32px 0' }}>
                  <button 
                    className="view-full-leaderboard-btn" 
                    onClick={() => setShowAll(!showAll)}
                  >
                    <span>{showAll ? 'SHOW LESS' : 'VIEW FULL LEADERBOARD'}</span>
                    <span className="chevron-icon" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
                      {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                </div>
              )}

              {lastUpdated && (
                <div className="stats-update-info">
                  <p>
                    Stats last updated:{' '}
                    {lastUpdated.toLocaleDateString()}{' '}
                    from CricClubs
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Squad roster will be displayed once players are added to the database.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Squad
