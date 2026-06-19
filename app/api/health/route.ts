import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL:     Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY:    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  })
}
