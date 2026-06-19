import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, scat_enabled, scat_amount, scat_pool, ctp_pool } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: t } = await supabase.from('tournaments').select('id').eq('slug', slug).single()
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const patch: Record<string, unknown> = {}
    if (scat_enabled !== undefined) patch.scat_enabled = scat_enabled
    if (scat_amount  !== undefined) patch.scat_amount  = scat_amount
    if (scat_pool    !== undefined) patch.scat_pool    = scat_pool
    if (ctp_pool     !== undefined) patch.ctp_pool     = ctp_pool

    const { error } = await supabase
      .from('bonus_config')
      .update(patch)
      .eq('tournament_id', t.id)

    if (error) {
      console.error('bonus_config update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
