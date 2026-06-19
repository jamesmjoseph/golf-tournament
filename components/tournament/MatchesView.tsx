'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import { matchTotals } from '@/lib/scoring'
import { getAdminToken } from '@/lib/utils'
import type { Match } from '@/lib/types'

export default function MatchesView({ onGoToScoring }: { onGoToScoring: (matchIdx: number) => void }) {
  const { tournament, teams, players, matches, holes, scores, isAdmin, adminToken, refetch, upperTeam, lowerTeam } = useTournament()
  const [draft, setDraft]     = useState<Match[] | null>(null)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const upperPlayers = players.filter(p => p.team_id === upperTeam?.id && p.name)
  const lowerPlayers = players.filter(p => p.team_id === lowerTeam?.id && p.name)

  const working = draft ?? matches

  function startEdit() { setDraft(matches.map(m => ({ ...m }))) }

  function setSlot(matchId: string, slot: 'upper_p1'|'upper_p2'|'lower_p1'|'lower_p2', pid: string) {
    setDraft(d => d!.map(m => m.id === matchId ? { ...m, [slot]: pid || null } : m))
  }

  async function save() {
    if (!draft) return
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/matches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: adminToken ?? getAdminToken(tournament.slug), matches: draft }),
      })
      if (!res.ok) throw new Error('Save failed')
      await refetch()
      setDraft(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEditing = Boolean(draft)

  return (
    <div>
      <SectionHeader
        title="Match Pairings"
        subtitle={`${matches.length} matches · 2v2 best ball · assign players below`}
      />

      {isAdmin && !isEditing && (
        <button onClick={startEdit} style={adminBtn}>✏ Edit Pairings</button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {working.map((m, idx) => {
          const totals = matchTotals(m, holes, players, scores)
          const hasScores = totals.upper + totals.lower > 0
          const complete = m.upper_p1 && m.upper_p2 && m.lower_p1 && m.lower_p2

          const u1 = players.find(p => p.id === m.upper_p1)
          const u2 = players.find(p => p.id === m.upper_p2)
          const l1 = players.find(p => p.id === m.lower_p1)
          const l2 = players.find(p => p.id === m.lower_p2)

          return (
            <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--gold)', letterSpacing: 1 }}>{m.label}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {hasScores && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: upperTeam?.light_hex, fontWeight: 'bold' }}>{totals.upper}</span>
                      <span style={{ color: 'var(--muted)', margin: '0 6px' }}>–</span>
                      <span style={{ color: lowerTeam?.light_hex, fontWeight: 'bold' }}>{totals.lower}</span>
                    </div>
                  )}
                  {complete && !isEditing && (
                    <button onClick={() => onGoToScoring(idx)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gold)', background: 'transparent', color: 'var(--gold)', fontSize: 11, cursor: 'pointer' }}>
                      Score →
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([['upper', upperTeam, upperPlayers, ['upper_p1','upper_p2']], ['lower', lowerTeam, lowerPlayers, ['lower_p1','lower_p2']]] as const).map(([side, team, pool, slots]) => (
                    <div key={side}>
                      <div style={{ fontSize: 10, color: team?.light_hex, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{team?.name}</div>
                      {([...slots] as ('upper_p1'|'upper_p2'|'lower_p1'|'lower_p2')[]).map(slot => {
                        const current = m[slot]
                        return (
                          <select key={slot} value={current ?? ''} onChange={e => setSlot(m.id, slot, e.target.value)}
                            style={{ width: '100%', marginBottom: 6, background: 'var(--bg-mid)', border: `1px solid ${current ? team?.color_hex : '#444'}`, borderRadius: 6, color: current ? 'var(--gold-lt)' : 'var(--muted)', padding: '8px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                            <option value="">— Select —</option>
                            {pool.map(p => {
                              const usedInOtherSlot = [...slots].some(s => s !== slot && m[s as keyof Match] === p.id)
                              return (
                                <option key={p.id} value={p.id} disabled={usedInOtherSlot}>
                                  {p.name} (HCP {p.handicap})
                                </option>
                              )
                            })}
                          </select>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                complete ? (
                  <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 13, textAlign: 'center', color: 'var(--muted)' }}>
                    <span style={{ color: upperTeam?.light_hex }}>{u1?.name} & {u2?.name}</span>
                    <span style={{ margin: '0 8px' }}>vs</span>
                    <span style={{ color: lowerTeam?.light_hex }}>{l1?.name} & {l2?.name}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No players assigned yet</div>
                )
              )}
            </div>
          )
        })}
      </div>

      {isEditing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {err && <div style={{ color: '#f1948a', fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <button onClick={save} disabled={saving} style={{ ...adminBtn, flex: 1 }}>{saving ? 'Saving…' : '✓ Save Pairings'}</button>
          <button onClick={() => setDraft(null)} style={{ ...adminBtn, background: 'transparent', border: '1px solid #444', color: 'var(--muted)' }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

const adminBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gold)',
  background: 'rgba(200,168,75,0.12)', color: 'var(--gold)', fontSize: 12,
  cursor: 'pointer', fontWeight: 'bold', marginBottom: 14,
}
