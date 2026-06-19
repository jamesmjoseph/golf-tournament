'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSessionId, getAdminToken, storeAdminToken } from '@/lib/utils'
import type {
  Tournament, Course, Hole, Team, Player, Match,
  Score, BonusConfig, BonusResult, CtpLog, ScoreMap, HcpMode,
} from '@/lib/types'

interface TournamentContextValue {
  tournament: Tournament
  course: Course | null
  holes: Hole[]
  teams: Team[]
  players: Player[]
  matches: Match[]
  scores: ScoreMap
  bonusConfig: BonusConfig | null
  bonusResults: BonusResult[]
  ctpLog: CtpLog[]
  isAdmin: boolean
  adminToken: string | null
  upperTeam: Team | null
  lowerTeam: Team | null
  hcpMode: HcpMode
  setHcpMode: (mode: HcpMode) => void
  updateScore: (playerId: string, hole: number, rawScore: number | null) => Promise<void>
  updateBonusResult: (hole: number, scatTeamId: string | null, ctpPlayerId: string | null) => Promise<void>
  updateScatHole: (hole: number, excluded: boolean, overridePlayerId: string | null) => Promise<void>
  updateCtp: (hole: number, playerId: string | null, distanceFt: number | null, distanceIn: number | null) => Promise<void>
  refetch: () => Promise<void>
  setCourse: (c: Course) => void
  setHoles: (h: Hole[]) => void
}

interface ProviderProps {
  tournament: Tournament
  initialCourse: Course | null
  initialHoles: Hole[]
  initialTeams: Team[]
  initialPlayers: Player[]
  initialMatches: Match[]
  initialScores: Score[]
  initialBonusConfig: BonusConfig | null
  initialBonusResults: BonusResult[]
  initialCtpLog: CtpLog[]
  children: React.ReactNode
}

const Ctx = createContext<TournamentContextValue | null>(null)

export function useTournament(): TournamentContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTournament must be used inside TournamentProvider')
  return ctx
}

function scoresToMap(scores: Score[]): ScoreMap {
  const map: ScoreMap = {}
  scores.forEach(s => {
    if (!map[s.player_id]) map[s.player_id] = {}
    map[s.player_id][s.hole] = s.raw_score
  })
  return map
}

export default function TournamentProvider({
  tournament,
  initialCourse,
  initialHoles,
  initialTeams,
  initialPlayers,
  initialMatches,
  initialScores,
  initialBonusConfig,
  initialBonusResults,
  initialCtpLog,
  children,
}: ProviderProps) {
  const [course, setCourse]               = useState<Course | null>(initialCourse)
  const [holes, setHoles]                 = useState<Hole[]>(initialHoles)
  const [teams, setTeams]                 = useState<Team[]>(initialTeams)
  const [players, setPlayers]             = useState<Player[]>(initialPlayers)
  const [matches, setMatches]             = useState<Match[]>(initialMatches)
  const [scores, setScores]               = useState<ScoreMap>(scoresToMap(initialScores))
  const [bonusConfig, setBonusConfig]     = useState<BonusConfig | null>(initialBonusConfig)
  const [bonusResults, setBonusResults]   = useState<BonusResult[]>(initialBonusResults)
  const [ctpLog, setCtpLog]               = useState<CtpLog[]>(initialCtpLog)
  const [adminToken, setAdminToken]       = useState<string | null>(null)
  const [hcpMode, setHcpMode]             = useState<HcpMode>(tournament.hcp_mode ?? 'low')

  // ── Admin token: read from URL → persist to localStorage → clean URL ─────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('admin')
    if (urlToken) {
      storeAdminToken(tournament.slug, urlToken)
      const url = new URL(window.location.href)
      url.searchParams.delete('admin')
      window.history.replaceState({}, '', url.toString())
    }
    setAdminToken(getAdminToken(tournament.slug))
  }, [tournament.slug])

  // ── Real-time: scores ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`scores:${tournament.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `tournament_id=eq.${tournament.id}` },
        payload => {
          if (payload.eventType === 'DELETE') {
            const s = payload.old as Score
            setScores(prev => {
              const next = { ...prev, [s.player_id]: { ...prev[s.player_id] } }
              delete next[s.player_id][s.hole]
              return next
            })
          } else {
            const s = payload.new as Score
            setScores(prev => ({
              ...prev,
              [s.player_id]: { ...(prev[s.player_id] ?? {}), [s.hole]: s.raw_score },
            }))
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournament.id])

  // ── Real-time: bonus_results ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`bonus:${tournament.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bonus_results', filter: `tournament_id=eq.${tournament.id}` },
        payload => {
          if (payload.eventType === 'DELETE') return
          const br = payload.new as BonusResult
          setBonusResults(prev => {
            const idx = prev.findIndex(r => r.hole === br.hole)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = br
              return next
            }
            return [...prev, br]
          })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournament.id])

  // ── Real-time: ctp_log ────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`ctp_log:${tournament.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ctp_log', filter: `tournament_id=eq.${tournament.id}` },
        payload => {
          const entry = payload.new as CtpLog
          setCtpLog(prev => [entry, ...prev])
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournament.id])

  // ── Score update — optimistic-first, then persist ────────────────────────
  const updateScore = useCallback(async (playerId: string, hole: number, rawScore: number | null) => {
    // Update local state immediately so the UI responds on click
    if (rawScore === null) {
      setScores(prev => {
        const next = { ...prev, [playerId]: { ...(prev[playerId] ?? {}) } }
        delete next[playerId][hole]
        return next
      })
    } else {
      setScores(prev => ({
        ...prev,
        [playerId]: { ...(prev[playerId] ?? {}), [hole]: rawScore },
      }))
    }

    // Persist to Supabase (real-time will confirm but UI is already updated)
    const supabase = createClient()
    if (rawScore === null) {
      const { error } = await supabase.from('scores').delete().match({ player_id: playerId, hole })
      if (error) console.error('Score delete failed:', error)
      return
    }
    const { error } = await supabase.rpc('upsert_score', {
      p_player_id: playerId,
      p_tournament_id: tournament.id,
      p_hole: hole,
      p_raw_score: rawScore,
      p_session_id: getSessionId(),
    })
    if (error) console.error('Score save failed:', error)
  }, [tournament.id])

  // ── Bonus result update — optimistic-first ───────────────────────────────
  const updateBonusResult = useCallback(async (
    hole: number,
    scatTeamId: string | null,
    ctpPlayerId: string | null,
  ) => {
    setBonusResults(prev => {
      const next = [...prev]
      const idx = next.findIndex(r => r.hole === hole)
      const updated: BonusResult = { id: '', tournament_id: tournament.id, hole, scat_winner_team_id: scatTeamId, ctp_winner_player_id: ctpPlayerId, scat_excluded: false, scat_override_player_id: null, ctp_distance_ft: null, ctp_distance_in: null }
      if (idx >= 0) { next[idx] = { ...next[idx], ...updated } } else { next.push(updated) }
      return next
    })

    const supabase = createClient()
    const { error } = await supabase.rpc('upsert_bonus', {
      p_tournament_id: tournament.id,
      p_hole: hole,
      p_scat_team_id: scatTeamId,
      p_ctp_player_id: ctpPlayerId,
    })
    if (error) console.error('Bonus save failed:', error)
  }, [tournament.id])

  // ── Scat per-hole admin override — optimistic-first ──────────────────────
  const updateScatHole = useCallback(async (
    hole: number,
    excluded: boolean,
    overridePlayerId: string | null,
  ) => {
    setBonusResults(prev => {
      const next = [...prev]
      const idx = next.findIndex(r => r.hole === hole)
      const base: BonusResult = { id: '', tournament_id: tournament.id, hole, scat_winner_team_id: null, ctp_winner_player_id: null, scat_excluded: excluded, scat_override_player_id: overridePlayerId, ctp_distance_ft: null, ctp_distance_in: null }
      if (idx >= 0) { next[idx] = { ...next[idx], scat_excluded: excluded, scat_override_player_id: overridePlayerId } } else { next.push(base) }
      return next
    })

    const token = getAdminToken(tournament.slug)
    const res = await fetch(`/api/tournaments/${tournament.slug}/bonus-scat-hole`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminToken: token, hole, scat_excluded: excluded, scat_override_player_id: overridePlayerId }),
    })
    if (!res.ok) console.error('Scat hole save failed:', await res.text())
  }, [tournament.id, tournament.slug])

  // ── CTP update — optimistic bonus_results, log handled server-side ───────
  const updateCtp = useCallback(async (
    hole: number,
    playerId: string | null,
    distanceFt: number | null,
    distanceIn: number | null,
  ) => {
    setBonusResults(prev => {
      const next = [...prev]
      const idx = next.findIndex(r => r.hole === hole)
      const patch = { ctp_winner_player_id: playerId, ctp_distance_ft: distanceFt, ctp_distance_in: distanceIn }
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...patch }
      } else {
        next.push({ id: '', tournament_id: tournament.id, hole, scat_winner_team_id: null, scat_excluded: false, scat_override_player_id: null, ...patch })
      }
      return next
    })

    const token = getAdminToken(tournament.slug)
    const res = await fetch(`/api/tournaments/${tournament.slug}/bonus-ctp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminToken: token, hole, player_id: playerId, distance_ft: distanceFt, distance_in: distanceIn }),
    })
    if (!res.ok) console.error('CTP save failed:', await res.text())
  }, [tournament.id, tournament.slug])

  // ── Refetch all mutable data ──────────────────────────────────────────────
  const refetch = useCallback(async () => {
    const supabase = createClient()
    const [
      { data: teamsData },
      { data: playersData },
      { data: matchesData },
      { data: scoresData },
      { data: bonusResultsData },
      { data: tData },
    ] = await Promise.all([
      supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('sort_order'),
      supabase.from('players').select('*').eq('tournament_id', tournament.id),
      supabase.from('matches').select('*').eq('tournament_id', tournament.id).order('sort_order'),
      supabase.from('scores').select('*').eq('tournament_id', tournament.id),
      supabase.from('bonus_results').select('*').eq('tournament_id', tournament.id),
      supabase.from('tournaments').select('course_id').eq('id', tournament.id).single(),
    ])
    if (teamsData)       setTeams(teamsData)
    if (playersData)     setPlayers(playersData)
    if (matchesData)     setMatches(matchesData)
    if (scoresData)      setScores(scoresToMap(scoresData))
    if (bonusResultsData) setBonusResults(bonusResultsData)

    if (tData?.course_id) {
      const [{ data: courseData }, { data: holesData }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', tData.course_id).single(),
        supabase.from('holes').select('*').eq('course_id', tData.course_id).order('hole'),
      ])
      if (courseData) setCourse(courseData)
      if (holesData)  setHoles(holesData)
    }
  }, [tournament.id])

  const upperTeam = teams.find(t => t.sort_order === 0) ?? null
  const lowerTeam = teams.find(t => t.sort_order === 1) ?? null

  return (
    <Ctx.Provider value={{
      tournament, course, holes, teams, players, matches,
      scores, bonusConfig, bonusResults, ctpLog,
      isAdmin: Boolean(adminToken),
      adminToken,
      upperTeam,
      lowerTeam,
      hcpMode,
      setHcpMode,
      updateScore,
      updateBonusResult,
      updateScatHole,
      updateCtp,
      refetch,
      setCourse,
      setHoles,
    }}>
      {children}
    </Ctx.Provider>
  )
}
