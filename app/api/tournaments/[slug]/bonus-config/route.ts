import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, scat_enabled, scat_amount } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: t } = await supabase.from('tournaments').select('id').eq('slug', slug).single()
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase
      .from('bonus_config')
      .update({ scat_enabled, scat_amount })
      .eq('tournament_id', t.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
