import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { adminToken, hcp_mode } = body

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (hcp_mode !== 'low' && hcp_mode !== 'course') {
      return NextResponse.json({ error: 'Invalid hcp_mode' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('tournaments')
      .update({ hcp_mode })
      .eq('slug', slug)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
