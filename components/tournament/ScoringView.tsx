'use client'
import { useTournament } from './TournamentContext'
import { netScore, strokesGiven, matchMinHcp, playerEffHcp } from '@/lib/scoring'
import { parLabel } from '@/lib/utils'

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

  return (
    <div>
      {/* Match selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {matches.map((m, i) => {
          const active = i === activeMatchIdx
          return (
            <button key={m.id} onClick={() => setActiveMatchIdx(i)} style={{
              padding: '7px 16px', borderRadius: 8,
              border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              background: active ? 'var(--gold)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              {m.label}
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
          {/* Hole header */}
          <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              Hole {hole.hole} of {holes.length}{hole.par === 3 ? ' · 📍 CTP' : ''}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Par {hole.par} · HCP {hole.hcp}</div>
            {hole.yards && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{hole.yards} yards</div>}
          </div>

          {/* Players — stacked full width */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 24 }}>
            {([
              { side: 'upper' as const, team: upperTeam, pids: [match.upper_p1, match.upper_p2] },
              { side: 'lower' as const, team: lowerTeam, pids: [match.lower_p1, match.lower_p2] },
            ]).map(({ side, team, pids }) => {
              const validPids = pids.filter(Boolean) as string[]
              if (validPids.length === 0) return null
              return (
                <div key={side}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: team?.color_hex ?? 'var(--muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: team?.color_hex ?? 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>{team?.name}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {validPids.map(pid => {
                      const p = players.find(pl => pl.id === pid)
                      if (!p) return null
                      const effHcp  = playerEffHcp(p.handicap, minHcp, hcpMode)
                      const raw     = scores[pid]?.[currentHole]
                      const net     = raw !== undefined ? netScore(raw, effHcp, hole.hcp) : null
                      const sg      = strokesGiven(effHcp, hole.hcp)
                      const hcpLabel = hcpMode === 'low' && effHcp !== p.handicap
                        ? `HCP ${p.handicap} → eff. ${effHcp}`
                        : `HCP ${p.handicap}`

                      return (
                        <div key={pid} style={{
                          background: 'var(--bg-mid)', borderRadius: 10, padding: '12px 14px',
                          border: `1px solid ${raw !== undefined ? (team?.color_hex ?? 'var(--border)') + '66' : 'var(--border)'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name || '—'}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {hcpLabel}{sg > 0 ? ` · +${sg}` : ' · no stroke'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {[hole.par - 1, hole.par, hole.par + 1, hole.par + 2, hole.par + 3].map(s => (
                              <button key={s} onClick={() => updateScore(pid, currentHole, raw === s ? null : s)}
                                style={{
                                  flex: 1, height: 44, borderRadius: 8,
                                  border: `2px solid ${raw === s ? team?.color_hex : 'var(--border)'}`,
                                  background: raw === s ? team?.color_hex : 'var(--surface)',
                                  color: raw === s ? '#fff' : 'var(--muted)',
                                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                }}>{s}</button>
                            ))}
                            <input
                              type="number" min="1" max="15"
                              value={raw ?? ''}
                              placeholder="·"
                              onChange={e => updateScore(pid, currentHole, e.target.value === '' ? null : parseInt(e.target.value))}
                              style={{
                                width: 40, height: 44, textAlign: 'center', flexShrink: 0,
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 8, color: 'var(--gold)', fontSize: 13,
                                fontWeight: 700, padding: 0, outline: 'none',
                              }}
                            />
                          </div>
                          {net !== null && (
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                              <span style={{ color: 'var(--muted)' }}>Net: </span>
                              <span style={{ fontWeight: 700, color: net < hole.par ? 'var(--mint)' : net === hole.par ? 'var(--gold-lt)' : '#ff6b5e' }}>
                                {net} ({parLabel(net, hole.par)})
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Prev / Next */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
              disabled={currentHole === 1}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-mid)',
                color: currentHole === 1 ? 'var(--muted)' : 'var(--gold-lt)',
                cursor: currentHole === 1 ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 600,
              }}>← Prev</button>
            <button
              onClick={() => setCurrentHole(Math.min(holes.length, currentHole + 1))}
              disabled={currentHole === holes.length}
              style={{
                flex: 2, padding: '14px 0', borderRadius: 10,
                border: '1px solid var(--gold)',
                background: currentHole === holes.length ? 'transparent' : 'var(--gold)',
                color: currentHole === holes.length ? 'var(--muted)' : '#fff',
                cursor: currentHole === holes.length ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 700,
              }}>Next Hole →</button>
          </div>
        </>
      )}
    </div>
  )
}
