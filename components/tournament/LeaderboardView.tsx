'use client'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import { matchTotals, cupTotals, holeMatchPoints } from '@/lib/scoring'

export default function LeaderboardView() {
  const { matches, players, holes, scores, teams, upperTeam, lowerTeam } = useTournament()
  const cup = cupTotals(matches, holes, players, scores)

  return (
    <div>
      {/* Cup totals */}
      <div style={{ background: 'linear-gradient(135deg,#1e2d00,var(--bg-mid))', borderRadius: 14, padding: 20, marginBottom: 20, border: '1px solid #c8a84b55', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }}>
          Total Points
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: upperTeam?.light_hex, letterSpacing: 1 }}>{upperTeam?.name?.toUpperCase()}</div>
            <div style={{ fontSize: 52, fontWeight: 'bold', color: upperTeam?.light_hex, lineHeight: 1 }}>{cup.upper}</div>
          </div>
          <div style={{ fontSize: 28, color: 'var(--muted)' }}>–</div>
          <div>
            <div style={{ fontSize: 10, color: lowerTeam?.light_hex, letterSpacing: 1 }}>{lowerTeam?.name?.toUpperCase()}</div>
            <div style={{ fontSize: 52, fontWeight: 'bold', color: lowerTeam?.light_hex, lineHeight: 1 }}>{cup.lower}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>of {cup.total} points played</div>
        {cup.upper !== cup.lower && cup.total > 0 && (
          <div style={{ marginTop: 12, display: 'inline-block', padding: '6px 18px', borderRadius: 8,
            background: (cup.upper > cup.lower ? upperTeam?.color_hex : lowerTeam?.color_hex) + '44',
            border: `1px solid ${cup.upper > cup.lower ? upperTeam?.color_hex : lowerTeam?.color_hex}`,
            color: cup.upper > cup.lower ? upperTeam?.light_hex : lowerTeam?.light_hex,
            fontWeight: 'bold', fontSize: 14,
          }}>
            {cup.upper > cup.lower ? upperTeam?.name : lowerTeam?.name} leads by {Math.abs(cup.upper - cup.lower)} pts
          </div>
        )}
      </div>

      <SectionHeader title="Match Scores" subtitle="Points per hole · 1 win · ½ tie" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {matches.map(m => {
          const t = matchTotals(m, holes, players, scores)
          const u1 = players.find(p => p.id === m.upper_p1)
          const u2 = players.find(p => p.id === m.upper_p2)
          const l1 = players.find(p => p.id === m.lower_p1)
          const l2 = players.find(p => p.id === m.lower_p2)
          const holesPlayed = holes.filter(h => holeMatchPoints(m, h.hole, holes, players, scores) !== null).length

          return (
            <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--gold)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    <span style={{ color: upperTeam?.light_hex }}>{u1?.name ?? '?'} & {u2?.name ?? '?'}</span>
                    <span style={{ color: 'var(--muted)', margin: '0 6px' }}>vs</span>
                    <span style={{ color: lowerTeam?.light_hex }}>{l1?.name ?? '?'} & {l2?.name ?? '?'}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{holesPlayed} / {holes.length} holes played</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: t.upper >= t.lower ? upperTeam?.light_hex : '#aaa' }}>{t.upper}</div>
                  </div>
                  <div style={{ color: 'var(--muted)' }}>–</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: t.lower >= t.upper ? lowerTeam?.light_hex : '#aaa' }}>{t.lower}</div>
                  </div>
                </div>
              </div>

              {/* Hole dots */}
              <div style={{ display: 'flex', gap: 3, marginTop: 10, flexWrap: 'wrap' }}>
                {holes.map(h => {
                  const r = holeMatchPoints(m, h.hole, holes, players, scores)
                  const bg = r
                    ? r.upper > r.lower ? upperTeam?.color_hex : r.lower > r.upper ? lowerTeam?.color_hex : 'var(--gold)'
                    : '#333'
                  return (
                    <div key={h.hole} title={`Hole ${h.hole}`} style={{
                      width: 18, height: 18, borderRadius: 4, background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: r ? '#fff' : '#555',
                    }}>
                      {r ? (r.upper > r.lower ? 'U' : r.lower > r.upper ? 'L' : '½') : h.hole}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
