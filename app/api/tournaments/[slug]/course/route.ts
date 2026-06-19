import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, course }: { adminToken: string; course: { name: string; location: string; tee_color: string; holes: Record<string, unknown>[] } } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Insert course
    const { data: courseRow, error: cErr } = await supabase
      .from('courses')
      .insert({ name: course.name, location: course.location, tee_color: course.tee_color })
      .select()
      .single()
    if (cErr || !courseRow) throw cErr ?? new Error('Failed to insert course')

    // Insert holes
    const holeRows = course.holes.map(h => ({ course_id: courseRow.id, ...h }))
    const { error: hErr } = await supabase.from('holes').insert(holeRows)
    if (hErr) throw hErr

    // Link tournament to course
    const { error: tErr } = await supabase
      .from('tournaments')
      .update({ course_id: courseRow.id })
      .eq('slug', slug)
    if (tErr) throw tErr

    return NextResponse.json({ courseId: courseRow.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
