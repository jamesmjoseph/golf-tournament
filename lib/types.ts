export type TournamentStatus = 'setup' | 'active' | 'complete'
export type HcpMode = 'low' | 'course'

export interface Tournament {
  id: string
  slug: string
  name: string
  date: string
  status: TournamentStatus
  course_id: string | null
  hcp_mode: HcpMode
  created_at: string
}

export interface Course {
  id: string
  name: string
  location: string | null
  tee_color: string
}

export interface Hole {
  id: string
  course_id: string
  hole: number
  par: number
  hcp: number
  yards: number | null
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  color_hex: string
  light_hex: string
  sort_order: number
}

export interface Player {
  id: string
  tournament_id: string
  team_id: string
  name: string
  handicap: number
}

export interface Match {
  id: string
  tournament_id: string
  label: string
  upper_p1: string | null
  upper_p2: string | null
  lower_p1: string | null
  lower_p2: string | null
  sort_order: number
}

export interface Score {
  id: string
  tournament_id: string
  player_id: string
  hole: number
  raw_score: number
}

export interface BonusConfig {
  id: string
  tournament_id: string
  scat_enabled: boolean
  scat_amount: number
  scat_pool: number
  ctp_pool: number
}

export interface BonusResult {
  id: string
  tournament_id: string
  hole: number
  scat_winner_team_id: string | null
  ctp_winner_player_id: string | null
  scat_excluded: boolean
  scat_override_player_id: string | null
  ctp_distance_ft: number | null
  ctp_distance_in: number | null
}

export interface CtpLog {
  id: string
  tournament_id: string
  hole: number
  player_id: string | null
  distance_ft: number | null
  distance_in: number | null
  recorded_at: string
}

// playerId → hole → rawScore
export type ScoreMap = Record<string, Record<number, number>>

export interface HoleResult {
  upper: number  // 0, 0.5, or 1
  lower: number
}

export interface MatchTotals {
  upper: number
  lower: number
}

export interface CupTotals {
  upper: number
  lower: number
  total: number
}
