import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, hole, scat_excluded, scat_override_player_id } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: t } = await supabase.from('tournaments').select('id').eq('slug', slug).single()
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase
      .from('bonus_results')
      .upsert(
        {
          tournament_id: t.id,
          hole,
          scat_excluded: scat_excluded ?? false,
          scat_override_player_id: scat_override_player_id ?? null,
        },
        { onConflict: 'tournament_id,hole' },
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
