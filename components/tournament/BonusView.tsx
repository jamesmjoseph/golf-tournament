'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import Toggle from '@/components/ui/Toggle'
import { getAdminToken } from '@/lib/utils'
import { effectiveScatWinner } from '@/lib/scoring'
import type { Hole } from '@/lib/types'

export default function BonusView() {
  const { tournament, holes, players, teams, bonusConfig, bonusResults, ctpLog, scores, updateScatHole, updateCtp, isAdmin, adminToken, refetch } = useTournament()
  const [savingConfig, setSavingConfig] = useState(false)
  const [poolDraft, setPoolDraft] = useState(() => String(bonusConfig?.scat_pool ?? 0))

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
        }),
      })
      await refetch()
    } finally {
      setSavingConfig(false)
    }
  }

  async function updateScatPool(amount: number) {
    if (!bonusConfig) return
    await fetch(`/api/tournaments/${tournament.slug}/bonus-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminToken: adminToken ?? getAdminToken(tournament.slug),
        scat_pool: amount,
      }),
    })
    await refetch()
  }

  const scatPool = bonusConfig?.scat_pool ?? 0

  // All holes with an effective winner (used for payout calculation)
  const winningHoles = holes.filter(h => effectiveScatWinner(h.hole, players, scores, bonusResults) !== null)
  const payoutPerHole = winningHoles.length > 0 ? scatPool / winningHoles.length : 0

  const scatWinsByPlayer = players.map(p => {
    const wins = holes.filter(h => effectiveScatWinner(h.hole, players, scores, bonusResults)?.id === p.id).length
    return { player: p, wins }
  }).filter(x => x.wins > 0)

  return (
    <div>
      {/* Scat Pool */}
      <SectionHeader title="Scat Pool" subtitle="Lowest individual raw score per hole · ties pay nothing · pool split by winners" />
      <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 24, boxShadow: '0 2px 8px rgba(19,32,54,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {isAdmin && <Toggle on={bonusConfig?.scat_enabled ?? true} onToggle={toggleScat} />}
          <span style={{ fontWeight: 700 }}>Scat {bonusConfig?.scat_enabled ? 'Enabled' : 'Disabled'}</span>
          {isAdmin && bonusConfig?.scat_enabled && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pool $:</span>
              <input
                type="number"
                min="0"
                value={poolDraft}
                onChange={e => setPoolDraft(e.target.value)}
                onBlur={() => {
                  const val = parseInt(poolDraft)
                  if (!isNaN(val) && val >= 0) updateScatPool(val)
                  else setPoolDraft(String(scatPool))
                }}
                style={{ width: 60, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--gold)', fontSize: 15, fontWeight: 700, padding: '4px 0', outline: 'none' }}
              />
            </div>
          )}
        </div>

        {bonusConfig?.scat_enabled && scatPool > 0 && winningHoles.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, fontFamily: 'var(--font-mono)', display: 'flex', gap: 16 }}>
            <span>${scatPool} pool ÷ {winningHoles.length} winning hole{winningHoles.length !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--mint)', fontWeight: 700 }}>${payoutPerHole % 1 === 0 ? payoutPerHole : payoutPerHole.toFixed(2)} / hole</span>
          </div>
        )}

        {bonusConfig?.scat_enabled && (
          <>
            {/* Hole-by-hole results */}
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Results by Hole</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {holes.map(h => {
                const br = getBonusResult(h.hole)
                const excluded = br?.scat_excluded ?? false
                const overrideId = br?.scat_override_player_id ?? null
                const winner = effectiveScatWinner(h.hole, players, scores, bonusResults)
                const allScores = players.map(p => scores[p.id]?.[h.hole]).filter((s): s is number => s !== undefined)
                const hasTie = allScores.length > 0 && !winner && !overrideId && !excluded
                const team = winner ? teams.find(t => t.id === winner.team_id) : null
                const rawScore = winner ? scores[winner.id]?.[h.hole] : null

                return (
                  <div key={h.hole}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: excluded ? 'transparent' : 'var(--surface)',
                      borderRadius: 8, padding: '8px 12px',
                      border: `1px solid ${excluded ? 'var(--border)' : winner ? (team?.color_hex ?? 'var(--border)') + '44' : hasTie ? 'rgba(47,109,240,0.2)' : 'var(--border)'}`,
                      opacity: excluded ? 0.45 : 1,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', width: 60, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                        H{h.hole} (p{h.par})
                      </span>

                      {excluded ? (
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', flex: 1 }}>Excluded</span>
                      ) : winner ? (
                        <>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? 'var(--muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: team?.light_hex ?? 'var(--gold-lt)', flex: 1 }}>
                            {winner.name}
                            {overrideId && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>(override)</span>}
                          </span>
                          {rawScore !== undefined && rawScore !== null && (
                            <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 700 }}>{rawScore}</span>
                          )}
                          {scatPool > 0 && payoutPerHole > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--mint)', fontWeight: 700, marginLeft: 8 }}>
                              ${payoutPerHole % 1 === 0 ? payoutPerHole : payoutPerHole.toFixed(2)}
                            </span>
                          )}
                        </>
                      ) : hasTie ? (
                        <span style={{ fontSize: 12, color: 'var(--gold)', fontStyle: 'italic', flex: 1 }}>Tied — no award</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>—</span>
                      )}
                    </div>

                    {/* Admin per-hole controls */}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 6, padding: '4px 12px 6px', alignItems: 'center' }}>
                        <button
                          onClick={() => updateScatHole(h.hole, !excluded, excluded ? null : overrideId)}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: `1px solid ${excluded ? 'var(--gold)' : 'var(--border)'}`, background: excluded ? 'rgba(47,109,240,0.08)' : 'transparent', color: excluded ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer' }}
                        >
                          {excluded ? 'Unexclude' : 'Exclude'}
                        </button>
                        {!excluded && (
                          <select
                            value={overrideId ?? ''}
                            onChange={e => updateScatHole(h.hole, false, e.target.value || null)}
                            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: overrideId ? 'var(--gold-lt)' : 'var(--muted)', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">Override winner…</option>
                            {players.filter(p => p.name).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        )}
                        {overrideId && !excluded && (
                          <button
                            onClick={() => updateScatHole(h.hole, false, null)}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                          >
                            Clear override
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Per-player totals */}
            {scatWinsByPlayer.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Player Totals</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scatWinsByPlayer
                    .sort((a, b) => b.wins - a.wins)
                    .map(({ player, wins }) => {
                      const team = teams.find(t => t.id === player.team_id)
                      const earnings = scatPool > 0 ? wins * payoutPerHole : 0
                      return (
                        <div key={player.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
                          padding: '10px 14px', background: (team?.color_hex ?? '#333') + '11',
                          borderRadius: 8, border: `1px solid ${(team?.color_hex ?? 'var(--border)')}33`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color_hex ?? 'var(--muted)' }} />
                            <span style={{ fontSize: 13, color: team?.light_hex ?? 'var(--gold-lt)', fontWeight: 700 }}>{player.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{team?.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{wins} hole{wins !== 1 ? 's' : ''}</span>
                            {scatPool > 0 && (
                              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--mint)', marginLeft: 8 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {par3Holes.map(h => (
              <CtpHoleCard
                key={h.hole}
                hole={h}
                players={players.filter(p => p.name)}
                teams={teams}
                br={getBonusResult(h.hole)}
                log={ctpLog.filter(l => l.hole === h.hole)}
                isAdmin={isAdmin}
                onSelectPlayer={pid => updateCtp(h.hole, pid, null, null)}
                onClear={() => updateCtp(h.hole, null, null, null)}
                onRecord={(pid, ft, inches) => updateCtp(h.hole, pid, ft, inches)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── CTP hole card (extracted to use local distance draft state) ───────────────

interface CtpCardProps {
  hole: Hole
  players: { id: string; name: string; team_id: string }[]
  teams: { id: string; name: string; color_hex: string; light_hex: string }[]
  br: { ctp_winner_player_id: string | null; ctp_distance_ft: number | null; ctp_distance_in: number | null } | null
  log: { id: string; player_id: string | null; distance_ft: number | null; distance_in: number | null; recorded_at: string }[]
  isAdmin: boolean
  onSelectPlayer: (pid: string) => void
  onClear: () => void
  onRecord: (pid: string, ft: number | null, inches: number | null) => void
}

function CtpHoleCard({ hole, players, teams, br, log, isAdmin, onSelectPlayer, onClear, onRecord }: CtpCardProps) {
  const ctpId = br?.ctp_winner_player_id ?? null
  const [draftFt, setDraftFt]       = useState<string>(br?.ctp_distance_ft != null ? String(br.ctp_distance_ft) : '')
  const [draftIn, setDraftIn]       = useState<string>(br?.ctp_distance_in != null ? String(br.ctp_distance_in) : '')
  const [showLog, setShowLog]       = useState(false)

  const currentPlayer = players.find(p => p.id === ctpId)
  const currentTeam   = currentPlayer ? teams.find(t => t.id === currentPlayer.team_id) : null

  function distStr(ft: number | null, inches: number | null) {
    if (ft == null && inches == null) return null
    const parts = []
    if (ft != null)     parts.push(`${ft}'`)
    if (inches != null) parts.push(`${inches}"`)
    return parts.join(' ')
  }

  function handleRecord() {
    if (!ctpId) return
    const ft      = draftFt !== '' ? parseInt(draftFt) : null
    const inches  = draftIn !== '' ? parseInt(draftIn) : null
    onRecord(ctpId, ft, inches)
  }

  return (
    <div style={{ background: 'var(--bg-mid)', borderRadius: 12, padding: 14, border: '1px solid rgba(20,196,163,0.25)' }}>
      {/* Header */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)', marginBottom: 10 }}>
        📍 Hole {hole.hole} · Par 3{hole.yards ? ` · ${hole.yards} yds` : ''}
      </div>

      {/* Current leader */}
      {ctpId && currentPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: (currentTeam?.color_hex ?? '#333') + '11', borderRadius: 8, border: `1px solid ${(currentTeam?.color_hex ?? 'var(--border)')}44` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentTeam?.color_hex ?? 'var(--muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: currentTeam?.color_hex ?? 'var(--gold-lt)', flex: 1 }}>
            🏆 {currentPlayer.name}
          </span>
          {distStr(br?.ctp_distance_ft ?? null, br?.ctp_distance_in ?? null) && (
            <span style={{ fontSize: 12, color: 'var(--mint)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {distStr(br?.ctp_distance_ft ?? null, br?.ctp_distance_in ?? null)}
            </span>
          )}
        </div>
      )}

      {/* Admin: player selector */}
      {isAdmin && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: ctpId ? 10 : 0 }}>
            <button
              onClick={onClear}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${!ctpId ? 'var(--gold)' : 'var(--border)'}`, background: !ctpId ? 'rgba(47,109,240,0.08)' : 'transparent', color: !ctpId ? 'var(--gold)' : 'var(--muted)', fontSize: 11, cursor: 'pointer', fontWeight: !ctpId ? 700 : 400 }}>
              None
            </button>
            {players.map(p => {
              const team = teams.find(t => t.id === p.team_id)
              const active = ctpId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { onSelectPlayer(p.id); setDraftFt(''); setDraftIn('') }}
                  style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? team?.color_hex : 'var(--border)'}`, background: active ? (team?.color_hex ?? '#333') + '22' : 'transparent', color: active ? team?.color_hex : 'var(--muted)', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400 }}>
                  {p.name}
                </button>
              )
            })}
          </div>

          {/* Distance input + Record */}
          {ctpId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Distance:</span>
              <input
                type="number"
                min="0"
                placeholder="ft"
                value={draftFt}
                onChange={e => setDraftFt(e.target.value)}
                style={{ width: 48, textAlign: 'center', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--gold-lt)', fontSize: 13, padding: '3px 4px', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>ft</span>
              <input
                type="number"
                min="0"
                max="11"
                placeholder="in"
                value={draftIn}
                onChange={e => setDraftIn(e.target.value)}
                style={{ width: 48, textAlign: 'center', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--gold-lt)', fontSize: 13, padding: '3px 4px', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>in</span>
              <button
                onClick={handleRecord}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--mint)', background: 'rgba(20,196,163,0.1)', color: 'var(--mint)', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}>
                Record
              </button>
            </div>
          )}
        </>
      )}

      {/* Running tally — latest distance per player, sorted closest first */}
      {(() => {
        const seen = new Set<string>()
        const tally: typeof log = []
        for (const entry of log) {
          if (entry.player_id && !seen.has(entry.player_id) && (entry.distance_ft != null || entry.distance_in != null)) {
            seen.add(entry.player_id)
            tally.push(entry)
          }
        }
        tally.sort((a, b) => {
          const aIn = (a.distance_ft ?? 9999) * 12 + (a.distance_in ?? 0)
          const bIn = (b.distance_ft ?? 9999) * 12 + (b.distance_in ?? 0)
          return aIn - bIn
        })
        if (tally.length === 0) return null
        return (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>Standings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {tally.map((entry, i) => {
                const p = players.find(pl => pl.id === entry.player_id)
                const t = p ? teams.find(tm => tm.id === p.team_id) : null
                const d = distStr(entry.distance_ft, entry.distance_in)
                const isLeader = i === 0
                return (
                  <div key={entry.player_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: isLeader ? (t?.color_hex ?? 'var(--gold)') + '11' : 'var(--surface)', borderRadius: 7, border: `1px solid ${isLeader ? (t?.color_hex ?? 'var(--border)') + '44' : 'var(--border)'}`, fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 14, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ color: t?.color_hex ?? 'var(--gold-lt)', fontWeight: isLeader ? 700 : 500, flex: 1 }}>
                      {isLeader && '🏆 '}{p?.name ?? '—'}
                    </span>
                    {d && <span style={{ color: isLeader ? 'var(--mint)' : 'var(--muted)', fontWeight: isLeader ? 700 : 500, fontFamily: 'var(--font-mono)' }}>{d}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Full update log */}
      {log.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowLog(v => !v)}
            style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            {showLog ? '▾' : '▸'} History ({log.length})
          </button>
          {showLog && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {log.map(entry => {
                const p  = players.find(pl => pl.id === entry.player_id)
                const t  = p ? teams.find(tm => tm.id === p.team_id) : null
                const d  = distStr(entry.distance_ft, entry.distance_in)
                const ts = new Date(entry.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--surface)', borderRadius: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{ts}</span>
                    <span style={{ color: t?.color_hex ?? 'var(--gold-lt)', fontWeight: 600, flex: 1 }}>{p?.name ?? '—'}</span>
                    {d && <span style={{ color: 'var(--mint)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
