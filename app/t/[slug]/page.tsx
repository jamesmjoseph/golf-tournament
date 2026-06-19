import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TournamentProvider from '@/components/tournament/TournamentContext'
import TournamentApp from '@/components/tournament/TournamentApp'
import type { Score, CtpLog } from '@/lib/types'

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  // Parallel fetch everything else
  const [
    { data: teams },
    { data: players },
    { data: matches },
    { data: scores },
    { data: bonusConfig },
    { data: bonusResults },
    { data: ctpLog },
  ] = await Promise.all([
    supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('sort_order'),
    supabase.from('players').select('*').eq('tournament_id', tournament.id),
    supabase.from('matches').select('*').eq('tournament_id', tournament.id).order('sort_order'),
    supabase.from('scores').select('*').eq('tournament_id', tournament.id),
    supabase.from('bonus_config').select('*').eq('tournament_id', tournament.id).single(),
    supabase.from('bonus_results').select('*').eq('tournament_id', tournament.id),
    supabase.from('ctp_log').select('*').eq('tournament_id', tournament.id).order('recorded_at', { ascending: false }),
  ])

  // Fetch course + holes if linked
  let course = null, holes: unknown[] = []
  if (tournament.course_id) {
    const [{ data: c }, { data: h }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', tournament.course_id).single(),
      supabase.from('holes').select('*').eq('course_id', tournament.course_id).order('hole'),
    ])
    course = c
    holes  = h ?? []
  }

  return (
    <TournamentProvider
      tournament={tournament}
      initialCourse={course}
      initialHoles={holes as never[]}
      initialTeams={teams ?? []}
      initialPlayers={players ?? []}
      initialMatches={matches ?? []}
      initialScores={(scores ?? []) as Score[]}
      initialBonusConfig={bonusConfig ?? null}
      initialBonusResults={bonusResults ?? []}
      initialCtpLog={(ctpLog ?? []) as CtpLog[]}
    >
      <TournamentApp />
    </TournamentProvider>
  )
}
