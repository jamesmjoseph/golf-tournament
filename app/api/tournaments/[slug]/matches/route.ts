import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateAdminToken } from '@/lib/auth'

interface MatchInput {
  id: string
  upper_p1: string | null
  upper_p2: string | null
  lower_p1: string | null
  lower_p2: string | null
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { adminToken, matches }: { adminToken: string; matches: MatchInput[] } =
      await request.json()

    if (!(await validateAdminToken(slug, adminToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    await Promise.all(
      matches.map(m =>
        supabase
          .from('matches')
          .update({ upper_p1: m.upper_p1, upper_p2: m.upper_p2, lower_p1: m.lower_p1, lower_p2: m.lower_p2 })
          .eq('id', m.id),
      ),
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
