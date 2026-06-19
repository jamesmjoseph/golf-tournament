'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface RecentTournament {
  slug: string
  name: string
  date: string
  isAdmin: boolean
}

export default function Dashboard() {
  const [recent, setRecent] = useState<RecentTournament[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('golf_tournaments')
      if (raw) setRecent(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⛳</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 3, color: 'var(--gold-lt)' }}>GOLF TOURNAMENT</div>
          <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 }}>Live Scoring · Any Course</div>
        </div>

        {/* Create CTA */}
        <Link href="/new" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ background: 'var(--gold)', borderRadius: 12, padding: '18px 24px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--bg)', letterSpacing: 1 }}>+ Create Tournament</div>
          </div>
        </Link>

        {/* Recent tournaments */}
        {recent.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Recent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(t => (
                <Link key={t.slug} href={`/t/${t.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid #333', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 15 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatDate(t.date)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {t.isAdmin && <span style={{ fontSize: 9, color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 4, padding: '2px 6px', letterSpacing: 1 }}>ADMIN</span>}
                      <span style={{ color: 'var(--muted)', fontSize: 14 }}>→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
