import type { Hole, Match, Player, BonusResult, ScoreMap, HoleResult, MatchTotals, CupTotals, HcpMode } from './types'

// ── Handicap helpers ──────────────────────────────────────────────────────────

// Strokes received by a player on a given hole using their full handicap.
function strokesForHcp(playerHcp: number, holeHcp: number): number {
  return Math.floor(playerHcp / 18) + (holeHcp <= playerHcp % 18 ? 1 : 0)
}

// In 'low' mode, the lowest-handicap player in the match plays scratch;
// everyone else gets the difference.  In 'course' mode, full handicap applies.
export function playerEffHcp(playerHcp: number, minMatchHcp: number, mode: HcpMode): number {
  return mode === 'low' ? Math.max(0, playerHcp - minMatchHcp) : playerHcp
}

// Minimum handicap across the (up to 4) assigned players in a match.
export function matchMinHcp(match: Match, players: Player[]): number {
  const hcps = [match.upper_p1, match.upper_p2, match.lower_p1, match.lower_p2]
    .filter((id): id is string => Boolean(id))
    .map(pid => players.find(p => p.id === pid)?.handicap ?? Infinity)
  return hcps.length ? Math.min(...hcps) : 0
}

// ── Core scoring ──────────────────────────────────────────────────────────────

export function netScore(rawScore: number, playerHcp: number, holeHcp: number): number {
  return rawScore - strokesForHcp(playerHcp, holeHcp)
}

export function strokesGiven(playerHcp: number, holeHcp: number): number {
  return strokesForHcp(playerHcp, holeHcp)
}

// ── Match-play scoring ────────────────────────────────────────────────────────

export function pairBestNet(
  p1id: string | null,
  p2id: string | null,
  holeNum: number,
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
  hcpMode: HcpMode = 'low',
  minMatchHcp: number = 0,
): number | null {
  const hole = holes.find(h => h.hole === holeNum)
  if (!hole) return null

  const nets = [p1id, p2id]
    .filter((id): id is string => Boolean(id))
    .map(pid => {
      const player = players.find(p => p.id === pid)
      if (!player) return null
      const raw = scores[pid]?.[holeNum]
      if (raw === undefined) return null
      const effHcp = playerEffHcp(player.handicap, minMatchHcp, hcpMode)
      return netScore(raw, effHcp, hole.hcp)
    })
    .filter((n): n is number => n !== null)

  return nets.length ? Math.min(...nets) : null
}

export function holeMatchPoints(
  match: Match,
  holeNum: number,
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
  hcpMode: HcpMode = 'low',
): HoleResult | null {
  const minHcp = hcpMode === 'low' ? matchMinHcp(match, players) : 0
  const u = pairBestNet(match.upper_p1, match.upper_p2, holeNum, holes, players, scores, hcpMode, minHcp)
  const l = pairBestNet(match.lower_p1, match.lower_p2, holeNum, holes, players, scores, hcpMode, minHcp)
  if (u === null || l === null) return null
  if (u < l) return { upper: 1, lower: 0 }
  if (l < u) return { upper: 0, lower: 1 }
  return { upper: 0.5, lower: 0.5 }
}

export function matchTotals(
  match: Match,
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
  hcpMode: HcpMode = 'low',
): MatchTotals {
  let upper = 0, lower = 0
  holes.forEach(h => {
    const r = holeMatchPoints(match, h.hole, holes, players, scores, hcpMode)
    if (r) { upper += r.upper; lower += r.lower }
  })
  return { upper, lower }
}

export function cupTotals(
  matches: Match[],
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
  hcpMode: HcpMode = 'low',
): CupTotals {
  let upper = 0, lower = 0
  matches.forEach(m => {
    const t = matchTotals(m, holes, players, scores, hcpMode)
    upper += t.upper
    lower += t.lower
  })
  return { upper, lower, total: upper + lower }
}

// ── Scat: individual lowest raw score per hole, unique winner only ─────────────

export function scatWinner(
  holeNum: number,
  players: Player[],
  scores: ScoreMap,
): Player | null {
  const entered = players
    .map(p => ({ player: p, raw: scores[p.id]?.[holeNum] }))
    .filter((e): e is { player: Player; raw: number } => e.raw !== undefined)
  if (entered.length === 0) return null
  const min = Math.min(...entered.map(e => e.raw))
  const winners = entered.filter(e => e.raw === min)
  return winners.length === 1 ? winners[0].player : null
}

// Respects admin overrides: excluded holes pay nothing, override replaces auto winner.
export function effectiveScatWinner(
  holeNum: number,
  players: Player[],
  scores: ScoreMap,
  bonusResults: BonusResult[],
): Player | null {
  const br = bonusResults.find(r => r.hole === holeNum)
  if (br?.scat_excluded) return null
  if (br?.scat_override_player_id) {
    return players.find(p => p.id === br.scat_override_player_id) ?? null
  }
  return scatWinner(holeNum, players, scores)
}
