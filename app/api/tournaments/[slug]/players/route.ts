import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

interface PlayerInput {
  id?: string
  team_id: string
  name: string
  handicap: number
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, players }: { adminToken: string; players: PlayerInput[] } =
      await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Resolve tournament id
    const { data: t } = await supabase.from('tournaments').select('id').eq('slug', slug).single()
    if (!t) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

    const toInsert = players
      .filter(p => !p.id && p.name.trim())
      .map(p => ({ tournament_id: t.id, team_id: p.team_id, name: p.name.trim(), handicap: p.handicap ?? 0 }))

    const toUpdate = players
      .filter(p => p.id && p.name.trim())
      .map(p => ({ id: p.id!, name: p.name.trim(), handicap: p.handicap ?? 0 }))

    const toDelete = players
      .filter(p => p.id && !p.name.trim())
      .map(p => p.id!)

    await Promise.all([
      toInsert.length ? supabase.from('players').insert(toInsert) : null,
      ...toUpdate.map(p =>
        supabase.from('players').update({ name: p.name, handicap: p.handicap }).eq('id', p.id),
      ),
      toDelete.length ? supabase.from('players').delete().in('id', toDelete) : null,
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
