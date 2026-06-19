import { createServiceClient } from './supabase/server'

export async function validateAdminToken(slug: string, token: string): Promise<boolean> {
  if (!token) return false
  const supabase = createServiceClient()
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tournament) return false

  const { data: secret } = await supabase
    .from('tournament_secrets')
    .select('admin_token')
    .eq('tournament_id', tournament.id)
    .single()

  return secret?.admin_token === token
}
