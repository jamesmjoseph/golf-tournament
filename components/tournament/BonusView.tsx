'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import Toggle from '@/components/ui/Toggle'
import { getAdminToken } from '@/lib/utils'
import { scatWinner } from '@/lib/scoring'

export default function BonusView() {
  const { tournament, holes, players, teams, bonusConfig, bonusResults, scores, updateBonusResult, isAdmin, adminToken, refetch } = useTournament()
  const [savingConfig, setSavingConfig] = useState(false)

  const par3Holes = holes.filter(h => h.par === 3)

  function getBonusResult(hole: number) {
    return bonusResults.find(r => r.hole === hole) ?? null
  }

  async function toggleScat() {
    if (!bonusConfig) return
    setSavingConfig(true)
    try {
      await fetch(`/api/tournaments/${tournament.slug}/bonus-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: adminToken ?? getAdminToken(tournament.slug),
          scat_enabled: !bonusConfig.scat_enabled,
          scat_amount: bonusConfig.scat_amount,
        }),
      })
      await refetch()
    } finally {
      setSavingConfig(false)
    }
  }

  async function updateScatAmount(amount: number) {
    if (!bonusConfig) return
    await fetch(`/api/tournaments/${tournament.slug}/bonus-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminToken: adminToken ?? getAdminToken(tournament.slug),
        scat_enabled: bonusConfig.scat_enabled,
        scat_amount: amount,
      }),
    })
    await refetch()
  }

  // Per-player scat win totals
  const scatWinsByPlayer = players.map(p => {
    const wins = holes.filter(h => scatWinner(h.hole, players, scores)?.id === p.id).length
    return { player: p, wins }
  }).filter(x => x.wins > 0)

  return (
    <div>
      {/* Scat Pool */}
      <SectionHeader title="Scat Pool" subtitle="Lowest individual raw score per hole · ties pay nothing" />
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid #c8a84b33', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {isAdmin && <Toggle on={bonusConfig?.scat_enabled ?? true} onToggle={toggleScat} />}
          <span style={{ fontWeight: 'bold' }}>Scat {bonusConfig?.scat_enabled ? 'Enabled' : 'Disabled'}</span>
          {isAdmin && bonusConfig?.scat_enabled && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>$/hole:</span>
              <input type="number" min="1" value={bonusConfig?.scat_amount ?? 5}
                onChange={e => updateScatAmount(parseInt(e.target.value) || 1)}
                style={{ width: 50, textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid #444', borderRadius: 6, color: 'var(--gold)', fontSize: 15, fontWeight: 'bold', padding: '4px 0', outline: 'none' }} />
            </div>
          )}
        </div>

        {bonusConfig?.scat_enabled && (
          <>
            {/* Auto-computed hole results */}
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Results by Hole</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {holes.map(h => {
                const winner = scatWinner(h.hole, players, scores)
                const allScores = players
                  .map(p => scores[p.id]?.[h.hole])
                  .filter((s): s is number => s !== undefined)
                const hasTie = allScores.length > 0 && !winner

                const team = winner ? teams.find(t => t.id === winner.team_id) : null
                const rawScore = winner ? scores[winner.id]?.[h.hole] : null

                return (
                  <div key={h.hole} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px',
                    border: `1px solid ${winner ? (team?.color_hex ?? '#555') + '55' : hasTie ? '#c8a84b33' : '#2a2a2a'}`,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 60, flexShrink: 0 }}>
                      H{h.hole} (p{h.par})
                    </span>
                    {winner ? (
                      <>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? '#aaa', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 'bold', color: team?.light_hex ?? 'var(--gold-lt)', flex: 1 }}>
                          {winner.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#58d68d', fontWeight: 'bold' }}>{rawScore}</span>
                      </>
                    ) : hasTie ? (
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontStyle: 'italic', flex: 1 }}>Tied — no award</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#444', flex: 1 }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Per-player totals */}
            {scatWinsByPlayer.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Player Totals</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scatWinsByPlayer
                    .sort((a, b) => b.wins - a.wins)
                    .map(({ player, wins }) => {
                      const team = teams.find(t => t.id === player.team_id)
                      const earnings = wins * (bonusConfig?.scat_amount ?? 5)
                      return (
                        <div key={player.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
                          padding: '10px 14px', background: (team?.color_hex ?? '#333') + '22',
                          borderRadius: 8, border: `1px solid ${(team?.color_hex ?? '#444')}44`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? '#aaa' }} />
                            <span style={{ fontSize: 13, color: team?.light_hex ?? 'var(--gold-lt)' }}>{player.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{team?.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: '#aaa' }}>{wins} hole{wins !== 1 ? 's' : ''} · </span>
                            <span style={{ fontSize: 15, fontWeight: 'bold', color: '#58d68d' }}>${earnings}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )}

            {scatWinsByPlayer.length === 0 && holes.some(h => players.some(p => scores[p.id]?.[h.hole] !== undefined)) && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                All holes tied so far — no scat awards yet.
              </div>
            )}
          </>
        )}
      </div>

      {/* Closest to the Pin */}
      {par3Holes.length > 0 && (
        <>
          <SectionHeader title="Closest to the Pin" subtitle={`Par 3 holes: ${par3Holes.map(h => h.hole).join(', ')}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {par3Holes.map(h => {
              const br = getBonusResult(h.hole)
              const ctpId = br?.ctp_winner_player_id
              const named = players.filter(p => p.name)
              return (
                <div key={h.hole} style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid #58d68d33' }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#58d68d', marginBottom: 10 }}>
                    📍 Hole {h.hole} · Par 3{h.yards ? ` · ${h.yards} yds` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => updateBonusResult(h.hole, null, null)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${!ctpId ? 'var(--gold)' : '#444'}`, background: !ctpId ? '#c8a84b22' : 'transparent', color: !ctpId ? 'var(--gold)' : '#666', fontSize: 11, cursor: 'pointer' }}>
                      None
                    </button>
                    {named.map(p => {
                      const team = teams.find(t => t.id === p.team_id)
                      return (
                        <button key={p.id} onClick={() => updateBonusResult(h.hole, null, ctpId === p.id ? null : p.id)}
                          style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${ctpId === p.id ? team?.color_hex : '#444'}`, background: ctpId === p.id ? (team?.color_hex ?? '#333') + '44' : 'transparent', color: ctpId === p.id ? team?.light_hex : '#777', fontSize: 12, cursor: 'pointer' }}>
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                  {ctpId && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#58d68d' }}>
                      🏆 {named.find(p => p.id === ctpId)?.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
