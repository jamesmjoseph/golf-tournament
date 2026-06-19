'use client'
import { useEffect, useState } from 'react'
import { useTournament } from './TournamentContext'
import SectionHeader from '@/components/ui/SectionHeader'
import QRCodeDisplay from '@/components/ui/QRCodeDisplay'
import { getAdminToken } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Course, Hole, Player, Team, HcpMode } from '@/lib/types'

export default function SetupView() {
  const { tournament, course, holes, teams, players, isAdmin, refetch } = useTournament()
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tournament.slug}` : ''

  return (
    <div>
      {/* QR / Share */}
      <SectionHeader title="Share Tournament" subtitle="Anyone with this link can view and score" />
      <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
        <QRCodeDisplay url={appUrl} label={tournament.name} />
      </div>

      {/* Handicap mode */}
      <SectionHeader title="Scoring Rules" subtitle="How handicaps are applied in match play" />
      <HcpModeAdmin />

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

// ── Handicap mode selector (always visible; toggle only active for admin) ─────
function HcpModeAdmin() {
  const { tournament, adminToken, isAdmin, hcpMode, setHcpMode } = useTournament()
  const [saving, setSaving] = useState(false)

  async function changeMode(mode: HcpMode) {
    if (mode === hcpMode || saving) return
    setHcpMode(mode)
    if (!isAdmin) return
    setSaving(true)
    try {
      await fetch(`/api/tournaments/${tournament.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: adminToken ?? getAdminToken(tournament.slug), hcp_mode: mode }),
      })
    } finally {
      setSaving(false)
    }
  }

  const modes: { value: HcpMode; label: string; desc: string }[] = [
    { value: 'low',    label: 'Play Off Low',    desc: 'Low handicap in the match plays scratch; others get the difference' },
    { value: 'course', label: 'Against Course',  desc: 'Each player uses their full handicap index against the course' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
      {modes.map(m => {
        const active = hcpMode === m.value
        return (
          <button key={m.value}
            onClick={() => isAdmin ? changeMode(m.value) : undefined}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              padding: '12px 16px', borderRadius: 10, cursor: isAdmin ? 'pointer' : 'default',
              border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              background: active ? 'rgba(47,109,240,0.08)' : 'var(--surface)',
              opacity: saving ? 0.6 : 1,
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              background: active ? 'var(--gold)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bg)' }} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: active ? 'bold' : 'normal', color: active ? 'var(--gold)' : 'var(--gold-lt)' }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.desc}</div>
            </div>
          </button>
        )
      })}
      {!isAdmin && <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Admin access required to change scoring rules.</div>}
    </div>
  )
}

// ── Course picker (admin) ──────────────────────────────────────────────────────
function CourseAdmin() {
  const { tournament, course, adminToken, refetch } = useTournament()
  const [courses, setCourses]   = useState<Course[]>([])
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('courses').select('*').order('name').then(({ data }) => {
      if (data) setCourses(data)
    })
  }, [])

  async function selectCourse(courseId: string) {
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/select-course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: adminToken ?? getAdminToken(tournament.slug), courseId }),
      })
      if (!res.ok) throw new Error('Failed to set course')
      await refetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (courses.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, fontStyle: 'italic' }}>
        No courses found. Run <code>supabase/seed.sql</code> in the Supabase SQL editor to add Lederach Golf Club.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {courses.map(c => {
          const active = c.id === course?.id
          return (
            <button key={c.id} onClick={() => !active && selectCourse(c.id)} disabled={saving}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10, cursor: active ? 'default' : 'pointer',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                background: active ? 'rgba(47,109,240,0.08)' : 'var(--surface)',
                opacity: saving ? 0.6 : 1,
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: active ? 'var(--gold)' : 'var(--gold-lt)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.location} · {c.tee_color} Tees</div>
              </div>
              {active && <span style={{ fontSize: 12, color: 'var(--gold)' }}>✓ Selected</span>}
            </button>
          )
        })}
      </div>
      {err && <div style={{ color: '#f1948a', fontSize: 12, marginTop: 8 }}>{err}</div>}
    </div>
  )
}

// ── Scorecard table (read + edit) ──────────────────────────────────────────────
type HoleDraft = { hole: number; par: number; hcp: number; yards: number | null }

function ScorecardTable() {
  const { holes, tournament, isAdmin, adminToken, refetch, setHoles } = useTournament()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<HoleDraft[]>([])
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const parTotal = holes.reduce((s, h) => s + h.par, 0)
  const ydsTotal = holes.reduce((s, h) => s + (h.yards ?? 0), 0)

  function startEdit() {
    setDraft(holes.map(h => ({ hole: h.hole, par: h.par, hcp: h.hcp, yards: h.yards })))
    setEditing(true)
    setErr('')
  }

  function updateDraft(holeNum: number, field: keyof HoleDraft, raw: string) {
    const val = raw === '' ? null : parseInt(raw)
    setDraft(d => d.map(h => h.hole === holeNum ? { ...h, [field]: val } : h))
  }

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}/holes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: adminToken ?? getAdminToken(tournament.slug),
          holes: draft,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      await refetch()
      setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const draftParTotal = draft.reduce((s, h) => s + (h.par ?? 0), 0)
  const draftYdsTotal = draft.reduce((s, h) => s + (h.yards ?? 0), 0)

  if (!editing) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-mid)' }}>
                {['Hole', 'Par', 'HCP', 'Yds'].map(h => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--gold)', letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holes.map((h, i) => (
                <tr key={h.hole} style={{ background: i % 2 === 0 ? 'rgba(47,109,240,0.03)' : 'transparent' }}>
                  <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 'bold', color: h.hole < 10 ? '#7fb3d3' : 'var(--gold-lt)' }}>
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
                <td style={{ padding: '8px', textAlign: 'center', color: 'var(--muted)' }}>
                  {ydsTotal > 0 ? `${ydsTotal.toLocaleString()} yds` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <button onClick={startEdit} style={{ ...adminBtnStyle, marginTop: 10 }}>✏ Edit Scorecard</button>
        )}
      </div>
    )
  }

  // Edit mode
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-mid)' }}>
              {['Hole', 'Par', 'HCP', 'Yds'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--gold)', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.map((h, i) => (
              <tr key={h.hole} style={{ background: i % 2 === 0 ? 'rgba(47,109,240,0.03)' : 'transparent' }}>
                <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', color: h.hole < 10 ? '#7fb3d3' : 'var(--gold-lt)' }}>
                  {h.hole}{h.hole === 10 ? ' ↩' : ''}
                </td>
                <td style={{ padding: '4px 3px', textAlign: 'center' }}>
                  <input type="number" min="3" max="5" value={h.par ?? ''}
                    onChange={e => updateDraft(h.hole, 'par', e.target.value)}
                    style={{ ...cellInputSt, color: h.par === 3 ? '#58d68d' : h.par === 5 ? '#f0a500' : 'var(--gold-lt)' }} />
                </td>
                <td style={{ padding: '4px 3px', textAlign: 'center' }}>
                  <input type="number" min="1" max="18" value={h.hcp ?? ''}
                    onChange={e => updateDraft(h.hole, 'hcp', e.target.value)}
                    style={{ ...cellInputSt, color: 'var(--muted)' }} />
                </td>
                <td style={{ padding: '4px 3px', textAlign: 'center' }}>
                  <input type="number" min="50" max="700" value={h.yards ?? ''}
                    onChange={e => updateDraft(h.hole, 'yards', e.target.value)}
                    style={{ ...cellInputSt, color: 'var(--muted)' }} />
                </td>
              </tr>
            ))}
            <tr style={{ background: 'var(--bg-mid)', fontWeight: 'bold' }}>
              <td style={{ padding: '8px', textAlign: 'center', color: 'var(--gold)' }}>TOT</td>
              <td style={{ padding: '8px', textAlign: 'center', color: 'var(--gold)' }}>{draftParTotal}</td>
              <td />
              <td style={{ padding: '8px', textAlign: 'center', color: 'var(--muted)' }}>
                {draftYdsTotal > 0 ? `${draftYdsTotal.toLocaleString()} yds` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {err && <div style={{ color: '#f1948a', fontSize: 12, margin: '6px 0' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={save} disabled={saving} style={{ ...adminBtnStyle, flex: 1 }}>{saving ? 'Saving…' : '✓ Save Scorecard'}</button>
        <button onClick={() => setEditing(false)} style={{ ...adminBtnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancel</button>
      </div>
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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<DraftPlayer[]>([])
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  function startEdit() {
    setDraft(players.map(p => ({ id: p.id, team_id: p.team_id, name: p.name, handicap: String(p.handicap) })))
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
        <button onClick={() => setEditing(false)} style={{ ...adminBtnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancel</button>
      </div>
    </div>
  )
}

const cellInputSt: React.CSSProperties = {
  width: 44, textAlign: 'center', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 5, fontSize: 12,
  color: 'var(--gold-lt)', padding: '4px 2px', outline: 'none',
}
const inputSt: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--gold-lt)', fontSize: 14, padding: '8px 10px', outline: 'none',
}
const adminBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gold)',
  background: 'rgba(47,109,240,0.08)', color: 'var(--gold)', fontSize: 12,
  cursor: 'pointer', fontWeight: 700,
}
