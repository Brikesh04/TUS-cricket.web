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

  const carouselPhotos = [
    { src: '/team/team-lineup.jpg', alt: 'TUS Cricket Team Lineup' },
    { src: '/team/team-group.jpg', alt: 'TUS Cricket Team Group' },
    { src: '/team/team-dinner.jpg', alt: 'TUS Cricket Team Dinner' }
  ]

  useEffect(() => {
    const fetchSquadData = async () => {
      setIsLoading(true)
      if (!supabase) {
        setIsLoading(false)
        return
      }

      try {
        const [squadRes, statsRes] = await Promise.all([
          supabase.from('squad').select('*').eq('is_active', true),
          supabase.from('player_stats').select('*').eq('season', parseInt(season))
        ])

        if (squadRes.data) {
          const processedPlayers = squadRes.data.map(player => {
            const playerStatsList = statsRes.data?.filter(stat => stat.player_name === player.name) || []
            const t20Stats = playerStatsList.find(stat => stat.format === 'T20') || {}
            const fiftyStats = playerStatsList.find(stat => stat.format === 'Fifty') || {}

            return {
              ...player,
              total_runs: (t20Stats.runs || 0) + (fiftyStats.runs || 0),
              total_wickets: (t20Stats.wickets || 0) + (fiftyStats.wickets || 0),
              total_catches: (t20Stats.catches || 0) + (fiftyStats.catches || 0),
              total_matches: (t20Stats.matches || 0) + (fiftyStats.matches || 0)
            }
          })

          // Sort by points descending
          processedPlayers.sort((a, b) => calculatePoints(b) - calculatePoints(a))
          setPlayers(processedPlayers)
        }
      } catch (err) {
        console.error('Error fetching squad data:', err)
      }
      setIsLoading(false)
    }

    fetchSquadData()
  }, [season])

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
    if (runs > 100 && wickets > 5) return 'All-Rounder'
    if (wickets > runs / 20) return 'Bowler'
    return 'Batsman'
  }

  const calculatePoints = (player) => {
    const runs = player.total_runs || 0
    const wickets = player.total_wickets || 0
    const catches = player.total_catches || 0
    return runs + wickets * 20 + catches * 5
  }

  const visiblePlayers = showAll ? players : players.slice(0, 6)
  const hasMorePlayers = players.length > 6

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

          {isLoading ? (
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

              <div className="rankings-table">
                  {/* Table Header */}
                  <div className="rankings-table-header">
                    <div className="col-pos">POS</div>
                    <div className="col-role">ROLE</div>
                    <div className="col-player">Player</div>
                    <div className="col-runs">Runs</div>
                    <div className="col-wickets">Wkts</div>
                    <div className="col-catches">C/ST</div>
                    <div className="col-points">
                      Points
                      <span
                        className={`points-info-trigger ${showTooltip ? 'active' : ''}`}
                        onClick={() => setShowTooltip(!showTooltip)}
                      >
                        <Info size={14} />
                        <span className={`points-tooltip ${showTooltip ? 'visible' : ''}`}>
                          Points = Runs + (Wickets × 20) + (Catches × 5)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  {visiblePlayers.map((player, index) => {
                    const { first, last } = splitName(player.name)
                    const isTopPlayer = index === 0
                    const role = getPreferredRole(player)

                    return (
                      <div key={player.id} className={`rankings-row ${isTopPlayer ? 'top-player' : ''}`}>
                        <div className="col-pos">
                          <span className="pos-number">{String(index + 1).padStart(2, '0')}</span>
                          <span className="pos-dot"></span>
                        </div>
                        
                        <div className="col-role">
                          <span className={`role-badge ${role.toLowerCase().replace('-', '')}`}>
                            {role}
                          </span>
                        </div>

                        <div className="col-player">
                          {isTopPlayer && (
                            <div className="player-photo-container">
                              {player.photo_url ? (
                                <img src={player.photo_url} alt={player.name} className="player-photo" />
                              ) : (
                                <div className="player-photo-placeholder">
                                  {getInitials(player.name)}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="player-name-container">
                            <span className="name-first">{first}</span>
                            <span className="name-last">{last}</span>
                          </div>
                        </div>

                        <div className="col-runs">
                          <span className="stat-value">{player.total_runs || 0}</span>
                        </div>

                        <div className="col-wickets">
                          <span className="stat-value">{player.total_wickets || 0}</span>
                        </div>

                        <div className="col-catches">
                          <span className="stat-value">{player.total_catches || 0}</span>
                        </div>

                        <div className="col-points">
                          <span className="stat-value points-value">{calculatePoints(player)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

              {hasMorePlayers && (
                <button className="show-more-btn" onClick={() => setShowAll(!showAll)}>
                  {showAll ? (
                    <>
                      Show Less <ChevronUp size={20} />
                    </>
                  ) : (
                    <>
                      Show More ({players.length - 6} more) <ChevronDown size={20} />
                    </>
                  )}
                </button>
              )}

              {players.some(p => p.last_stats_update) && (
                <div className="stats-update-info">
                  <p>
                    Stats last updated:{' '}
                    {new Date(players.find(p => p.last_stats_update).last_stats_update).toLocaleDateString()}{' '}
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
