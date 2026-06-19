'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import QRCodeDisplay from '@/components/ui/QRCodeDisplay'
import { getAdminToken } from '@/lib/utils'
import type { CoursePreview, Player, Team } from '@/lib/types'

const TEE_COLORS = ['Black', 'Blue', 'White', 'Green', 'Red', 'Gold', 'Silver']

export default function SetupView() {
  const { tournament, course, holes, teams, players, upperTeam, lowerTeam, isAdmin, refetch } = useTournament()
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tournament.slug}` : ''

  return (
    <div>
      {/* QR / Share */}
      <SectionHeader title="Share Tournament" subtitle="Anyone with this link can view and score" />
      <div style={{ background: 'var(--surface)', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
        <QRCodeDisplay url={appUrl} label={tournament.name} />
      </div>

      {/* Course */}
      <SectionHeader title="Course" subtitle={course ? `${course.name} · ${course.tee_color} Tees` : 'No course set'} />
      {isAdmin && <CourseAdmin />}
      {course && holes.length > 0 && <ScorecardTable />}

      {/* Players */}
      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Player Roster" subtitle={`${players.length} players · ${teams[0]?.name ?? 'Team 1'} vs ${teams[1]?.name ?? 'Team 2'}`} />
        {isAdmin
          ? <PlayersAdmin teams={teams} players={players} slug={tournament.slug} onSave={refetch} />
          : <PlayersReadOnly teams={teams} players={players} />
        }
      </div>
    </div>
  )
}

// ── Course admin ───────────────────────────────────────────────────────────────
function CourseAdmin() {
  const { tournament, course, setCourse, setHoles, adminToken, refetch } = useTournament()
  const [showModal, setShowModal]         = useState(false)
  const [courseName, setCourseName]       = useState('')
  const [teeColor, setTeeColor]           = useState('Green')
  const [looking, setLooking]             = useState(false)
  const [preview, setPreview]             = useState<CoursePreview | null>(null)
  const [saving, setSaving]               = useState(false)
  const [err, setErr]                     = useState('')

  async function lookup() {
    setLooking(true); setErr(''); setPreview(null)
    try {
      const res = await fetch('/api/course-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseName, teeColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLooking(false)
    }
  }

  async function saveCourse() {
    if (!preview) return
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: adminToken ?? getAdminToken(tournament.slug), course: preview }),
      })
      if (!res.ok) throw new Error('Save failed')
      await refetch()
      setShowModal(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function updateHole(idx: number, field: string, val: string) {
    if (!preview) return
    const holes = [...preview.holes]
    holes[idx] = { ...holes[idx], [field]: field === 'yards' && val === '' ? null : parseInt(val) || 0 }
    setPreview({ ...preview, holes })
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={adminBtnStyle}>
        {course ? '✏ Edit Course' : '⛳ Add Course with AI'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: '#0d1f14', border: '1px solid var(--gold)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 560, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--gold)' }}>Add Course</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={courseName} onChange={e => setCourseName(e.target.value)}
                placeholder="Lederach Golf Club"
                style={{ ...inputSt, flex: 1 }} />
              <select value={teeColor} onChange={e => setTeeColor(e.target.value)}
                style={{ ...inputSt, width: 100, background: '#163322' }}>
                {TEE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <button onClick={lookup} disabled={!courseName || looking} style={{ ...adminBtnStyle, width: '100%', marginBottom: 12, opacity: looking ? 0.6 : 1 }}>
              {looking ? 'Looking up…' : '🤖 Look Up with AI'}
            </button>

            {err && <div style={{ color: '#f1948a', fontSize: 12, marginBottom: 10 }}>{err}</div>}

            {preview && (
              <>
                <div style={{ fontSize: 12, color: '#58d68d', marginBottom: 8 }}>
                  ✓ {preview.name} · {preview.tee_color} Tees · {preview.location}
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#163322' }}>
                      <tr>
                        {['Hole','Par','HCP','Yds'].map(h => (
                          <th key={h} style={{ padding: '6px 6px', color: 'var(--gold)', textAlign: 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.holes.map((h, i) => (
                        <tr key={h.hole} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                          <td style={{ textAlign: 'center', padding: '4px 6px', color: 'var(--gold)' }}>{h.hole}</td>
                          <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                            <input type="number" value={h.par} onChange={e => updateHole(i,'par',e.target.value)} style={{ ...cellInput, width: 36 }} />
                          </td>
                          <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                            <input type="number" value={h.hcp} onChange={e => updateHole(i,'hcp',e.target.value)} style={{ ...cellInput, width: 36 }} />
                          </td>
                          <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                            <input type="number" value={h.yards ?? ''} onChange={e => updateHole(i,'yards',e.target.value)} style={{ ...cellInput, width: 50 }} placeholder="—" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={saveCourse} disabled={saving} style={{ ...adminBtnStyle, width: '100%', background: '#58d68d', color: '#0d1f14' }}>
                  {saving ? 'Saving…' : '✓ Save Course'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Scorecard table ────────────────────────────────────────────────────────────
function ScorecardTable() {
  const { holes } = useTournament()
  const parTotal = holes.reduce((s, h) => s + h.par, 0)
  const ydsTotal = holes.reduce((s, h) => s + (h.yards ?? 0), 0)

  return (
    <div style={{ overflowX: 'auto', marginBottom: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg-mid)' }}>
            {['Hole','Par','HCP','Yds'].map(h => (
              <th key={h} style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--gold)', letterSpacing: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holes.map((h, i) => (
            <tr key={h.hole} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
              <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 'bold', color: h.hole === 10 ? '#aaa' : h.hole < 10 ? '#7fb3d3' : 'var(--gold-lt)' }}>
                {h.hole}{h.hole === 10 ? ' ↩' : ''}
              </td>
              <td style={{ padding: '6px 6px', textAlign: 'center', color: h.par === 3 ? '#58d68d' : h.par === 5 ? '#f0a500' : 'var(--gold-lt)' }}>{h.par}</td>
              <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--muted)' }}>{h.hcp}</td>
              <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--muted)' }}>{h.yards ?? '—'}</td>
            </tr>
          ))}
          <tr style={{ background: 'var(--bg-mid)', fontWeight: 'bold' }}>
            <td style={{ padding: '8px', textAlign: 'center', color: 'var(--gold)' }}>TOT</td>
            <td style={{ padding: '8px', textAlign: 'center', color: 'var(--gold)' }}>{parTotal}</td>
            <td />
            <td style={{ padding: '8px', textAlign: 'center', color: 'var(--muted)' }}>{ydsTotal > 0 ? `${ydsTotal.toLocaleString()} yds` : '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Players (read-only) ────────────────────────────────────────────────────────
function PlayersReadOnly({ teams, players }: { teams: Team[]; players: Player[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {teams.map(team => (
        <div key={team.id}>
          <div style={{ fontSize: 11, color: team.light_hex, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            {team.name}
          </div>
          {players.filter(p => p.team_id === team.id).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 6, border: `1px solid ${team.color_hex}33` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: team.color_hex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 14 }}>{p.name}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>HCP {p.handicap}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Players (admin edit) ───────────────────────────────────────────────────────
interface DraftPlayer { id?: string; team_id: string; name: string; handicap: string }

function PlayersAdmin({ teams, players, slug, onSave }: { teams: Team[]; players: Player[]; slug: string; onSave: () => Promise<void> }) {
  const { adminToken } = useTournament()
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState<DraftPlayer[]>([])
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  function startEdit() {
    setDraft(
      players.map(p => ({ id: p.id, team_id: p.team_id, name: p.name, handicap: String(p.handicap) }))
    )
    setEditing(true)
  }

  function addPlayer(teamId: string) {
    setDraft(d => [...d, { team_id: teamId, name: '', handicap: '0' }])
  }

  function updateDraft(idx: number, field: string, val: string) {
    setDraft(d => d.map((p, i) => i === idx ? { ...p, [field]: val } : p))
  }

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/tournaments/${slug}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: adminToken ?? getAdminToken(slug),
          players: draft.map(p => ({ ...p, handicap: parseInt(p.handicap) || 0 })),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      await onSave()
      setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <>
        <PlayersReadOnly teams={teams} players={players} />
        <button onClick={startEdit} style={{ ...adminBtnStyle, marginTop: 12 }}>✏ Edit Players</button>
      </>
    )
  }

  return (
    <div>
      {teams.map(team => {
        const teamDraft = draft.map((p, i) => ({ ...p, _i: i })).filter(p => p.team_id === team.id)
        return (
          <div key={team.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: team.light_hex, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{team.name}</div>
            {teamDraft.map(p => (
              <div key={p._i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input value={p.name} onChange={e => updateDraft(p._i, 'name', e.target.value)}
                  placeholder="Player name" style={{ ...inputSt, flex: 1 }} />
                <input type="number" value={p.handicap} onChange={e => updateDraft(p._i, 'handicap', e.target.value)}
                  placeholder="HCP" style={{ ...inputSt, width: 60, textAlign: 'center' }} />
              </div>
            ))}
            <button onClick={() => addPlayer(team.id)} style={{ fontSize: 11, color: team.light_hex, background: 'none', border: `1px dashed ${team.color_hex}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
              + Add Player
            </button>
          </div>
        )
      })}
      {err && <div style={{ color: '#f1948a', fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ ...adminBtnStyle, flex: 1 }}>{saving ? 'Saving…' : '✓ Save Players'}</button>
        <button onClick={() => setEditing(false)} style={{ ...adminBtnStyle, background: 'transparent', border: '1px solid #444', color: 'var(--muted)' }}>Cancel</button>
      </div>
    </div>
  )
}

const inputSt: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid #444', borderRadius: 8,
  color: 'var(--gold-lt)', fontSize: 14, padding: '8px 10px', outline: 'none',
}
const cellInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid #333', borderRadius: 4,
  color: 'var(--gold-lt)', fontSize: 12, textAlign: 'center', padding: '3px 2px', outline: 'none',
}
const adminBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gold)',
  background: 'rgba(200,168,75,0.12)', color: 'var(--gold)', fontSize: 12,
  cursor: 'pointer', fontWeight: 'bold',
}
