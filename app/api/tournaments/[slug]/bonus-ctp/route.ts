import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, hole, player_id, distance_ft, distance_in } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: t } = await supabase.from('tournaments').select('id').eq('slug', slug).single()
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Upsert bonus_results with CTP fields
    const { error: upsertErr } = await supabase
      .from('bonus_results')
      .upsert(
        {
          tournament_id: t.id,
          hole,
          ctp_winner_player_id: player_id ?? null,
          ctp_distance_ft: distance_ft ?? null,
          ctp_distance_in: distance_in ?? null,
        },
        { onConflict: 'tournament_id,hole' },
      )
    if (upsertErr) throw upsertErr

    // Only log when a player is being assigned (not when clearing)
    if (player_id) {
      const { error: logErr } = await supabase.from('ctp_log').insert({
        tournament_id: t.id,
        hole,
        player_id,
        distance_ft: distance_ft ?? null,
        distance_in: distance_in ?? null,
      })
      if (logErr) throw logErr
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
