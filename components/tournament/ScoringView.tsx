'use client'
import { useTournament } from './TournamentContext'
import { holeMatchPoints, matchTotals, netScore, strokesGiven, pairBestNet, matchMinHcp, playerEffHcp } from '@/lib/scoring'
import { parLabel } from '@/lib/utils'
import type { Match } from '@/lib/types'

interface Props {
  activeMatchIdx: number
  setActiveMatchIdx: (i: number) => void
  currentHole: number
  setCurrentHole: (h: number) => void
}

export default function ScoringView({ activeMatchIdx, setActiveMatchIdx, currentHole, setCurrentHole }: Props) {
  const { matches, players, holes, scores, updateScore, upperTeam, lowerTeam, hcpMode } = useTournament()

  if (holes.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Add a course in Setup before scoring.</div>
  }

  const match = matches[activeMatchIdx]
  const hole  = holes.find(h => h.hole === currentHole) ?? holes[0]
  const minHcp = match ? matchMinHcp(match, players) : 0
  const totals = match ? matchTotals(match, holes, players, scores, hcpMode) : { upper: 0, lower: 0 }
  const holeResult = match ? holeMatchPoints(match, currentHole, holes, players, scores, hcpMode) : null

  function matchStatus() {
    if (!match) return ''
    const diff = totals.upper - totals.lower
    const holesPlayed = holes.filter(h => holeMatchPoints(match, h.hole, holes, players, scores, hcpMode) !== null).length
    if (holesPlayed === 0 || diff === 0) return 'All Square'
    const side = diff > 0 ? upperTeam?.name : lowerTeam?.name
    return `${side} leads ${Math.abs(diff)}–${Math.min(totals.upper, totals.lower)}`
  }

  return (
    <div>
      {/* Match tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {matches.map((m, i) => {
          const t = matchTotals(m, holes, players, scores, hcpMode)
          const active = i === activeMatchIdx
          return (
            <button key={m.id} onClick={() => setActiveMatchIdx(i)} style={{
              padding: '6px 14px', borderRadius: 8,
              border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              background: active ? 'var(--gold)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--muted)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              {m.label}
              {(t.upper + t.lower) > 0 && <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.8 }}>{t.upper}–{t.lower}</span>}
            </button>
          )
        })}
      </div>

      {!match || (!match.upper_p1 && !match.lower_p1) ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
          Assign players to this match in the Matches tab first.
        </div>
      ) : (
        <>
          {/* Match status */}
          <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(19,32,54,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{match.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{matchStatus()}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ScoreChip pts={totals.upper} color={upperTeam?.light_hex ?? '#2f6df0'} label={upperTeam?.name ?? 'Upper'} />
              <span style={{ color: 'var(--muted)', fontSize: 18 }}>–</span>
              <ScoreChip pts={totals.lower} color={lowerTeam?.light_hex ?? '#ff6b5e'} label={lowerTeam?.name ?? 'Lower'} />
            </div>
          </div>

          {/* Hole selector */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {holes.map(h => {
              const r = holeMatchPoints(match, h.hole, holes, players, scores, hcpMode)
              let border = 'var(--border)', bg = 'var(--surface)', color = 'var(--muted)'
              if (r) {
                if (r.upper > r.lower)      { border = upperTeam?.color_hex ?? '#2f6df0'; bg = (upperTeam?.color_hex ?? '#2f6df0') + '22'; color = upperTeam?.light_hex ?? '#2f6df0' }
                else if (r.lower > r.upper) { border = lowerTeam?.color_hex ?? '#ff6b5e'; bg = (lowerTeam?.color_hex ?? '#ff6b5e') + '22'; color = lowerTeam?.light_hex ?? '#ff6b5e' }
                else                        { border = 'var(--gold)'; bg = 'rgba(47,109,240,0.1)'; color = 'var(--gold)' }
              }
              const active = h.hole === currentHole
              return (
                <button key={h.hole} onClick={() => setCurrentHole(h.hole)} style={{
                  width: 34, height: 34, borderRadius: 6,
                  border: `2px solid ${active ? 'var(--gold)' : border}`,
                  background: active ? 'var(--gold)' : bg,
                  color: active ? '#fff' : color,
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>{h.hole}</button>
              )
            })}
          </div>

          {/* Hole info */}
          <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Hole {hole.hole}{hole.par === 3 ? ' · 📍 CTP' : ''}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Par {hole.par} · HCP {hole.hcp}</div>
              {hole.yards && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{hole.yards} yards</div>}
            </div>
            {holeResult && (
              <div style={{
                textAlign: 'center', padding: '10px 16px', borderRadius: 10,
                background: holeResult.upper > holeResult.lower
                  ? (upperTeam?.color_hex ?? '#2f6df0') + '22'
                  : holeResult.lower > holeResult.upper
                    ? (lowerTeam?.color_hex ?? '#ff6b5e') + '22'
                    : 'rgba(47,109,240,0.08)',
                border: `1px solid ${holeResult.upper > holeResult.lower ? upperTeam?.color_hex : holeResult.lower > holeResult.upper ? lowerTeam?.color_hex : 'var(--gold)'}`,
              }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, fontFamily: 'var(--font-mono)' }}>HOLE RESULT</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: holeResult.upper > holeResult.lower ? upperTeam?.light_hex : holeResult.lower > holeResult.upper ? lowerTeam?.light_hex : 'var(--gold)' }}>
                  {holeResult.upper > holeResult.lower
                    ? upperTeam?.name
                    : holeResult.lower > holeResult.upper
                      ? lowerTeam?.name
                      : '½ Halved'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{holeResult.upper} – {holeResult.lower} pts</div>
              </div>
            )}
          </div>

          {/* Score entry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {([
              { side: 'upper' as const, team: upperTeam, pids: [match.upper_p1, match.upper_p2] },
              { side: 'lower' as const, team: lowerTeam, pids: [match.lower_p1, match.lower_p2] },
            ]).map(({ side, team, pids }) => {
              const validPids = pids.filter(Boolean) as string[]
              const bestNet = validPids.length
                ? pairBestNet(pids[0], pids[1], currentHole, holes, players, scores, hcpMode, hcpMode === 'low' ? minHcp : 0)
                : null
              return (
                <div key={side}>
                  <div style={{ fontSize: 10, color: team?.light_hex, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{team?.name}</div>
                  {validPids.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No players assigned</div>}
                  {validPids.map(pid => {
                    const p   = players.find(pl => pl.id === pid)
                    if (!p) return null
                    const effHcp = playerEffHcp(p.handicap, minHcp, hcpMode)
                    const raw = scores[pid]?.[currentHole]
                    const net = raw !== undefined ? netScore(raw, effHcp, hole.hcp) : null
                    const sg  = strokesGiven(effHcp, hole.hcp)
                    const hcpLabel = hcpMode === 'low' && effHcp !== p.handicap
                      ? `HCP ${p.handicap} (eff. ${effHcp})`
                      : `HCP ${p.handicap}`
                    return (
                      <div key={pid} style={{ background: 'var(--bg-mid)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: `1px solid ${team?.color_hex ?? 'var(--border)'}33` }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.name || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                          {hcpLabel}{sg > 0 ? ` · +${sg} stroke${sg > 1 ? 's' : ''}` : ' · no stroke'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {[hole.par - 1, hole.par, hole.par + 1, hole.par + 2, hole.par + 3].map(s => (
                            <button key={s} onClick={() => updateScore(pid, currentHole, raw === s ? null : s)}
                              style={{
                                width: 30, height: 30, borderRadius: 6,
                                border: `2px solid ${raw === s ? team?.color_hex : 'var(--border)'}`,
                                background: raw === s ? team?.color_hex : 'var(--surface)',
                                color: raw === s ? '#fff' : 'var(--muted)',
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                              }}>{s}</button>
                          ))}
                          <input type="number" min="1" max="15" value={raw ?? ''} placeholder="—"
                            onChange={e => updateScore(pid, currentHole, e.target.value === '' ? null : parseInt(e.target.value))}
                            style={{ width: 34, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--gold)', fontSize: 12, fontWeight: 700, padding: '4px 0', outline: 'none' }} />
                        </div>
                        {net !== null && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--muted)' }}>Net: </span>
                            <span style={{ fontWeight: 700, color: net < hole.par ? 'var(--mint)' : net === hole.par ? 'var(--gold-lt)' : '#ff6b5e' }}>
                              {net} ({parLabel(net, hole.par)})
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {bestNet !== null && (
                    <div style={{ textAlign: 'center', padding: 6, background: 'rgba(47,109,240,0.08)', borderRadius: 6, fontSize: 11, color: 'var(--gold)' }}>
                      Best ball net: <strong>{bestNet}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Running hole-by-hole table */}
          <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg-mid)' }}>
                  <th style={{ padding: '5px 6px', textAlign: 'left', color: 'var(--gold)' }}>Hole</th>
                  {holes.map(h => <th key={h.hole} style={{ padding: '5px 3px', textAlign: 'center', color: h.hole === currentHole ? 'var(--gold)' : 'var(--muted)', minWidth: 20 }}>{h.hole}</th>)}
                  <th style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--gold)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { side: 'upper' as const, team: upperTeam },
                  { side: 'lower' as const, team: lowerTeam },
                ]).map(({ side, team }) => {
                  let cum = 0
                  return (
                    <tr key={side}>
                      <td style={{ padding: '5px 6px', color: team?.light_hex, fontSize: 10, fontWeight: 700 }}>{team?.name?.slice(0,8)}</td>
                      {holes.map(h => {
                        const r = holeMatchPoints(match, h.hole, holes, players, scores, hcpMode)
                        const pts = r ? (side === 'upper' ? r.upper : r.lower) : null
                        if (pts !== null) cum += pts
                        return (
                          <td key={h.hole} style={{ padding: '5px 3px', textAlign: 'center',
                            color: pts === null ? 'var(--border)' : pts === 1 ? 'var(--mint)' : pts === 0.5 ? 'var(--gold)' : '#ff6b5e',
                            fontWeight: pts ? 'bold' : 'normal',
                            background: h.hole === currentHole ? 'rgba(47,109,240,0.06)' : 'transparent',
                          }}>
                            {pts === null ? '·' : pts === 0.5 ? '½' : pts}
                          </td>
                        )
                      })}
                      <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 'bold', color: team?.light_hex, fontSize: 12 }}>{cum}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Prev / Next */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setCurrentHole(Math.max(1, currentHole - 1))} disabled={currentHole === 1}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-mid)', color: currentHole === 1 ? 'var(--muted)' : 'var(--gold-lt)', cursor: currentHole === 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}>← Prev</button>
            <button onClick={() => setCurrentHole(Math.min(holes.length, currentHole + 1))} disabled={currentHole === holes.length}
              style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid var(--gold)', background: currentHole === holes.length ? 'transparent' : 'var(--gold)', color: currentHole === holes.length ? 'var(--muted)' : '#fff', cursor: currentHole === holes.length ? 'default' : 'pointer', fontSize: 14, fontWeight: 700 }}>Next →</button>
          </div>
        </>
      )}
    </div>
  )
}

function ScoreChip({ pts, color, label }: { pts: number; color: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{label.slice(0, 8)}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{pts}</div>
    </div>
  )
}
