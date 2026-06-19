export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') +
    '-' +
    Date.now().toString(36)
  )
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = sessionStorage.getItem('golf_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('golf_session_id', id)
  }
  return id
}

export function getAdminToken(slug: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`admin_${slug}`)
}

export function storeAdminToken(slug: string, token: string): void {
  localStorage.setItem(`admin_${slug}`, token)
}

export function parLabel(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}
