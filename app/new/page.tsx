'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { storeAdminToken } from '@/lib/utils'
import Link from 'next/link'

const COLOR_PRESETS = [
  { color: '#1a5276', light: '#7fb3d3', label: 'Blue' },
  { color: '#922b21', light: '#f1948a', label: 'Red' },
  { color: '#1e8449', light: '#82e0aa', label: 'Green' },
  { color: '#6c3483', light: '#c39bd3', label: 'Purple' },
  { color: '#b7770d', light: '#f9c74f', label: 'Gold' },
  { color: '#117a65', light: '#76d7c4', label: 'Teal' },
]

export default function NewTournament() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [date, setDate]       = useState('')
  const [team1, setTeam1]     = useState({ name: '', colorIdx: 0 })
  const [team2, setTeam2]     = useState({ name: '', colorIdx: 1 })
  const [matchCount, setMatchCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleCreate() {
    if (!name || !date || !team1.name || !team2.name) {
      setError('Fill in tournament name, date, and both team names.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          team1: { name: team1.name, color_hex: COLOR_PRESETS[team1.colorIdx].color, light_hex: COLOR_PRESETS[team1.colorIdx].light },
          team2: { name: team2.name, color_hex: COLOR_PRESETS[team2.colorIdx].color, light_hex: COLOR_PRESETS[team2.colorIdx].light },
          matchCount,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { slug, adminToken } = await res.json()

      // Persist admin token and add to recent list
      storeAdminToken(slug, adminToken)
      try {
        const raw = localStorage.getItem('golf_tournaments')
        const existing = raw ? JSON.parse(raw) : []
        existing.unshift({ slug, name, date, isAdmin: true })
        localStorage.setItem('golf_tournaments', JSON.stringify(existing.slice(0, 20)))
      } catch { /* ignore */ }

      router.push(`/t/${slug}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      <div style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>← Back</Link>
          <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>New Tournament</div>
        </div>

        {/* Tournament details */}
        <Section title="Details">
          <Field label="Tournament Name">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Wentz Cup 2026"
              style={inputStyle} />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </Field>
          <Field label="Number of Matches">
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setMatchCount(n)} style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: `2px solid ${matchCount === n ? 'var(--gold)' : '#444'}`,
                  background: matchCount === n ? 'var(--gold)' : 'transparent',
                  color: matchCount === n ? 'var(--bg)' : 'var(--muted)',
                  fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Teams */}
        {[
          { label: 'Team 1', state: team1, setState: setTeam1 },
          { label: 'Team 2', state: team2, setState: setTeam2 },
        ].map(({ label, state, setState }) => (
          <Section key={label} title={label}>
            <Field label="Team Name">
              <input value={state.name} onChange={e => setState(s => ({ ...s, name: e.target.value }))}
                placeholder="Upper Wentz" style={inputStyle} />
            </Field>
            <Field label="Color">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => setState(s => ({ ...s, colorIdx: i }))}
                    title={p.label}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: p.color, cursor: 'pointer',
                      border: state.colorIdx === i ? '3px solid var(--gold)' : '3px solid transparent',
                    }} />
                ))}
              </div>
            </Field>
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: COLOR_PRESETS[state.colorIdx].color + '33', border: `1px solid ${COLOR_PRESETS[state.colorIdx].color}`, fontSize: 13, color: COLOR_PRESETS[state.colorIdx].light }}>
              {state.name || label} preview
            </div>
          </Section>
        ))}

        {error && <div style={{ color: '#f1948a', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button onClick={handleCreate} disabled={loading} style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: loading ? '#444' : 'var(--gold)', color: 'var(--bg)',
          fontSize: 16, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', letterSpacing: 1,
        }}>
          {loading ? 'Creating…' : 'Create Tournament →'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid #333', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: 1 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid #444',
  borderRadius: 8, color: 'var(--gold-lt)', fontSize: 15, padding: '10px 12px', outline: 'none',
}
