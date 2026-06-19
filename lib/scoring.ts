import type { Hole, Match, Player, ScoreMap, HoleResult, MatchTotals, CupTotals } from './types'

export function netScore(rawScore: number, playerHcp: number, holeHcp: number): number {
  const strokes = Math.floor(playerHcp / 18) + (holeHcp <= playerHcp % 18 ? 1 : 0)
  return rawScore - strokes
}

export function strokesGiven(playerHcp: number, holeHcp: number): number {
  return Math.floor(playerHcp / 18) + (holeHcp <= playerHcp % 18 ? 1 : 0)
}

export function pairBestNet(
  p1id: string | null,
  p2id: string | null,
  holeNum: number,
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
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
      return netScore(raw, player.handicap, hole.hcp)
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
): HoleResult | null {
  const u = pairBestNet(match.upper_p1, match.upper_p2, holeNum, holes, players, scores)
  const l = pairBestNet(match.lower_p1, match.lower_p2, holeNum, holes, players, scores)
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
): MatchTotals {
  let upper = 0, lower = 0
  holes.forEach(h => {
    const r = holeMatchPoints(match, h.hole, holes, players, scores)
    if (r) { upper += r.upper; lower += r.lower }
  })
  return { upper, lower }
}

export function cupTotals(
  matches: Match[],
  holes: Hole[],
  players: Player[],
  scores: ScoreMap,
): CupTotals {
  let upper = 0, lower = 0
  matches.forEach(m => {
    const t = matchTotals(m, holes, players, scores)
    upper += t.upper
    lower += t.lower
  })
  return { upper, lower, total: upper + lower }
}
