'use client'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import { matchTotals, cupTotals, effectiveScatWinner } from '@/lib/scoring'

export default function SummaryView() {
  const { matches, players, holes, scores, teams, upperTeam, lowerTeam, bonusConfig, bonusResults, hcpMode } = useTournament()
  const cup = cupTotals(matches, holes, players, scores, hcpMode)

  const winner = cup.upper > cup.lower ? upperTeam : cup.lower > cup.upper ? lowerTeam : null

  const scatWins = players
    .map(p => ({
      player: p,
      wins: holes.filter(h => effectiveScatWinner(h.hole, players, scores, bonusResults)?.id === p.id).length,
    }))
    .filter(x => x.wins > 0)
    .sort((a, b) => b.wins - a.wins)

  const scatPool = bonusConfig?.scat_pool ?? 0
  const winningHoles = holes.filter(h => effectiveScatWinner(h.hole, players, scores, bonusResults) !== null).length
  const payoutPerHole = winningHoles > 0 ? scatPool / winningHoles : 0

  const ctpPool = bonusConfig?.ctp_pool ?? 0

  const ctpList = bonusResults
    .filter(r => r.ctp_winner_player_id)
    .map(r => ({
      hole: r.hole,
      player: players.find(p => p.id === r.ctp_winner_player_id),
      distFt: r.ctp_distance_ft,
      distIn: r.ctp_distance_in,
    }))
    .filter(x => x.player)

  const ctpPayoutPerHole = ctpList.length > 0 ? ctpPool / ctpList.length : 0

  return (
    <div>
      {/* Champion */}
      <div style={{ background: 'var(--navy)', borderRadius: 20, padding: 28, textAlign: 'center', marginBottom: 24, boxShadow: '0 8px 28px rgba(19,32,54,.2)' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Champion</div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8, color: winner ? winner.light_hex : '#ffffff' }}>
          {winner ? winner.name : cup.total > 0 ? 'All Square — Tie' : 'In Progress'}
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{cup.upper} – {cup.lower} pts</div>
        {winner && (
          <div style={{ marginTop: 14, display: 'inline-block', background: 'var(--mint)', borderRadius: 12, padding: '8px 20px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>🎉 {winner.name} Wins!</span>
          </div>
        )}
      </div>

      {/* Match results */}
      <SectionHeader title="Match Results" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {matches.map(m => {
          const t = matchTotals(m, holes, players, scores, hcpMode)
          const u1 = players.find(p => p.id === m.upper_p1)
          const u2 = players.find(p => p.id === m.upper_p2)
          const l1 = players.find(p => p.id === m.lower_p1)
          const l2 = players.find(p => p.id === m.lower_p2)
          const mWin = t.upper > t.lower ? 'upper' : t.lower > t.upper ? 'lower' : null
          return (
            <div key={m.id} style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: '12px 16px', border: `1px solid ${mWin === 'upper' ? (upperTeam?.color_hex ?? '#2f6df0') + '44' : mWin === 'lower' ? (lowerTeam?.color_hex ?? '#ff6b5e') + '44' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ color: mWin === 'upper' ? upperTeam?.color_hex : 'var(--gold-lt)' }}>{u1?.name ?? '?'} & {u2?.name ?? '?'}</span>
                    <span style={{ color: 'var(--muted)', margin: '0 6px' }}>vs</span>
                    <span style={{ color: mWin === 'lower' ? lowerTeam?.color_hex : 'var(--gold-lt)' }}>{l1?.name ?? '?'} & {l2?.name ?? '?'}</span>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  <span style={{ color: mWin === 'upper' ? upperTeam?.color_hex : 'var(--muted)' }}>{t.upper}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 6px' }}>–</span>
                  <span style={{ color: mWin === 'lower' ? lowerTeam?.color_hex : 'var(--muted)' }}>{t.lower}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scat */}
      {bonusConfig?.scat_enabled && scatWins.length > 0 && (
        <>
          <SectionHeader title="Scat Pool" subtitle="Individual lowest score per hole" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {scatWins.map(({ player, wins }) => {
              const team = teams.find(t => t.id === player.team_id)
              const earnings = scatPool > 0 ? wins * payoutPerHole : 0
              return (
                <div key={player.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-mid)',
                  borderRadius: 10, border: `1px solid ${(team?.color_hex ?? 'var(--border)')}33`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? 'var(--muted)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: team?.color_hex ?? 'var(--gold-lt)' }}>{player.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{team?.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{wins} hole{wins !== 1 ? 's' : ''}</span>
                    {scatPool > 0 && (
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--mint)', marginLeft: 6 }}>
                        ${earnings % 1 === 0 ? earnings : earnings.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* CTP */}
      {ctpList.length > 0 && (
        <>
          <SectionHeader title="Closest to the Pin" />
          <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid rgba(20,196,163,0.25)' }}>
            {ctpList.map(({ hole, player, distFt, distIn }) => {
              const team = teams.find(t => t.id === player?.team_id)
              const distParts = [distFt != null ? `${distFt}'` : null, distIn != null ? `${distIn}"` : null].filter(Boolean)
              const dist = distParts.length > 0 ? distParts.join(' ') : null
              return (
                <div key={hole} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>📍 Hole {hole}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {dist && <span style={{ color: 'var(--mint)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{dist}</span>}
                    <span style={{ fontWeight: 700, color: team?.color_hex ?? 'var(--gold-lt)', fontSize: 13 }}>{player?.name}</span>
                    {ctpPool > 0 && ctpPayoutPerHole > 0 && (
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--mint)' }}>
                        ${ctpPayoutPerHole % 1 === 0 ? ctpPayoutPerHole : ctpPayoutPerHole.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
