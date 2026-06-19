import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, courseId }: { adminToken: string; courseId: string } = await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('tournaments')
      .update({ course_id: courseId })
      .eq('slug', slug)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
