'use client'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import { matchTotals, cupTotals, scatWinner } from '@/lib/scoring'

export default function SummaryView() {
  const { matches, players, holes, scores, teams, upperTeam, lowerTeam, bonusConfig, bonusResults, hcpMode } = useTournament()
  const cup = cupTotals(matches, holes, players, scores, hcpMode)

  const winner = cup.upper > cup.lower ? upperTeam : cup.lower > cup.upper ? lowerTeam : null

  // Scat: compute wins per player from scores
  const scatWins = players
    .map(p => ({
      player: p,
      wins: holes.filter(h => scatWinner(h.hole, players, scores)?.id === p.id).length,
    }))
    .filter(x => x.wins > 0)
    .sort((a, b) => b.wins - a.wins)

  const ctpList = bonusResults
    .filter(r => r.ctp_winner_player_id)
    .map(r => ({
      hole: r.hole,
      player: players.find(p => p.id === r.ctp_winner_player_id),
    }))
    .filter(x => x.player)

  return (
    <div>
      {/* Champion */}
      <div style={{ background: 'linear-gradient(135deg,#2d1a00,var(--bg-mid))', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 24, border: '2px solid var(--gold)' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 4, textTransform: 'uppercase' }}>Champion</div>
        <div style={{ fontSize: 30, fontWeight: 'bold', marginTop: 8, color: winner ? winner.light_hex : 'var(--gold)' }}>
          {winner ? winner.name : cup.total > 0 ? 'All Square — Tie' : 'In Progress'}
        </div>
        <div style={{ fontSize: 16, color: '#aaa', marginTop: 6 }}>{cup.upper} – {cup.lower} pts</div>
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
            <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 16px', border: `1px solid ${mWin === 'upper' ? (upperTeam?.color_hex ?? '#2471a3') + '55' : mWin === 'lower' ? (lowerTeam?.color_hex ?? '#a93226') + '55' : '#333'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    <span style={{ color: mWin === 'upper' ? upperTeam?.light_hex : '#aaa' }}>{u1?.name ?? '?'} & {u2?.name ?? '?'}</span>
                    <span style={{ color: 'var(--muted)', margin: '0 6px' }}>vs</span>
                    <span style={{ color: mWin === 'lower' ? lowerTeam?.light_hex : '#aaa' }}>{l1?.name ?? '?'} & {l2?.name ?? '?'}</span>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                  <span style={{ color: mWin === 'upper' ? upperTeam?.light_hex : '#aaa' }}>{t.upper}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 6px' }}>–</span>
                  <span style={{ color: mWin === 'lower' ? lowerTeam?.light_hex : '#aaa' }}>{t.lower}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scat — per player */}
      {bonusConfig?.scat_enabled && scatWins.length > 0 && (
        <>
          <SectionHeader title="Scat Pool" subtitle="Individual lowest score per hole" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {scatWins.map(({ player, wins }) => {
              const team = teams.find(t => t.id === player.team_id)
              const earnings = wins * bonusConfig.scat_amount
              return (
                <div key={player.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: (team?.color_hex ?? '#333') + '22',
                  borderRadius: 10, border: `1px solid ${(team?.color_hex ?? '#444')}44`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? '#aaa' }} />
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: team?.light_hex ?? 'var(--gold-lt)' }}>{player.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{team?.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{wins} hole{wins !== 1 ? 's' : ''} · </span>
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#58d68d' }}>${earnings}</span>
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
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #58d68d33' }}>
            {ctpList.map(({ hole, player }) => {
              const team = teams.find(t => t.id === player?.team_id)
              return (
                <div key={hole} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffffff08' }}>
                  <span style={{ color: '#aaa', fontSize: 13 }}>📍 Hole {hole}</span>
                  <span style={{ fontWeight: 'bold', color: team?.light_hex, fontSize: 13 }}>{player?.name}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
