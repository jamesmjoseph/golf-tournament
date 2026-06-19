'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import Toggle from '@/components/ui/Toggle'
import { getAdminToken } from '@/lib/utils'

export default function BonusView() {
  const { tournament, holes, players, teams, upperTeam, lowerTeam, bonusConfig, bonusResults, updateBonusResult, isAdmin, adminToken, refetch } = useTournament()
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

  return (
    <div>
      {/* Scat Pool */}
      <SectionHeader title="Scat Pool" subtitle="Side bet · bonus pot per hole" />
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid #c8a84b33', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {isAdmin
            ? <Toggle on={bonusConfig?.scat_enabled ?? true} onToggle={toggleScat} />
            : null
          }
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
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Winning Team Per Hole</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 6 }}>
              {holes.map(h => {
                const br = getBonusResult(h.hole)
                const scatTeam = br?.scat_winner_team_id
                return (
                  <div key={h.hole} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 54, flexShrink: 0 }}>H{h.hole} (p{h.par})</span>
                    {teams.map(team => (
                      <button key={team.id}
                        onClick={() => updateBonusResult(h.hole, scatTeam === team.id ? null : team.id, br?.ctp_winner_player_id ?? null)}
                        style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: `1px solid ${team.color_hex}`, background: scatTeam === team.id ? team.color_hex : 'transparent', color: scatTeam === team.id ? '#fff' : '#666', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' }}>
                        {team.name.slice(0, 6)}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Scat totals */}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {teams.map(team => {
                const won = bonusResults.filter(r => r.scat_winner_team_id === team.id).length
                return (
                  <div key={team.id} style={{ padding: '10px 14px', background: team.color_hex + '22', borderRadius: 8, border: `1px solid ${team.color_hex}44` }}>
                    <div style={{ fontSize: 11, color: team.light_hex }}>{team.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: team.light_hex }}>{won} <span style={{ fontSize: 12, color: '#aaa' }}>holes</span></div>
                    <div style={{ fontSize: 16, color: '#58d68d', fontWeight: 'bold' }}>${won * (bonusConfig?.scat_amount ?? 5)}</div>
                  </div>
                )
              })}
            </div>
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
                    <button onClick={() => updateBonusResult(h.hole, br?.scat_winner_team_id ?? null, null)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${!ctpId ? 'var(--gold)' : '#444'}`, background: !ctpId ? '#c8a84b22' : 'transparent', color: !ctpId ? 'var(--gold)' : '#666', fontSize: 11, cursor: 'pointer' }}>
                      None
                    </button>
                    {named.map(p => {
                      const team = teams.find(t => t.id === p.team_id)
                      return (
                        <button key={p.id} onClick={() => updateBonusResult(h.hole, br?.scat_winner_team_id ?? null, ctpId === p.id ? null : p.id)}
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
