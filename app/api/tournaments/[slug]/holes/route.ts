import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

interface HoleInput {
  hole: number
  par: number
  hcp: number
  yards: number | null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, holes }: { adminToken: string; holes: HoleInput[] } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: t } = await supabase
      .from('tournaments')
      .select('course_id')
      .eq('slug', slug)
      .single()

    if (!t?.course_id) {
      return NextResponse.json({ error: 'No course linked to this tournament' }, { status: 404 })
    }

    // Update each hole individually (course_id+hole is unique)
    const updates = holes.map(h =>
      supabase
        .from('holes')
        .update({ par: h.par, hcp: h.hcp, yards: h.yards })
        .eq('course_id', t.course_id)
        .eq('hole', h.hole),
    )

    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
