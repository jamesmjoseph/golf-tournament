'use client'
import { useState } from 'react'
import { useTournament } from './TournamentContext'
import SetupView from './SetupView'
import MatchesView from './MatchesView'
import ScoringView from './ScoringView'
import LeaderboardView from './LeaderboardView'
import BonusView from './BonusView'
import SummaryView from './SummaryView'
import { formatDate } from '@/lib/utils'
import { cupTotals } from '@/lib/scoring'

type Tab = 'Setup' | 'Matches' | 'Scoring' | 'Leaderboard' | 'Bonuses' | 'Summary'

const ALL_TABS: Tab[] = ['Setup', 'Matches', 'Scoring', 'Leaderboard', 'Bonuses', 'Summary']

export default function TournamentApp() {
  const { tournament, course, holes, matches, players, scores, upperTeam, lowerTeam, isAdmin, hcpMode } = useTournament()
  const [tab, setTab]                 = useState<Tab>('Scoring')
  const [activeMatchIdx, setActiveMatchIdx] = useState(0)
  const [currentHole, setCurrentHole]       = useState(1)

  const cup = cupTotals(matches, holes, players, scores)

  function goToScoring(matchIdx: number) {
    setActiveMatchIdx(matchIdx)
    setTab('Scoring')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--gold-lt)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)',
        padding: '14px 16px 0',
        boxShadow: '0 4px 16px rgba(19,32,54,.18)',
      }}>
        <div style={{ textAlign: 'center', paddingBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
            {formatDate(tournament.date)}{course ? ` · ${course.name}` : ''}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: '#ffffff' }}>⛳ {tournament.name.toUpperCase()}</div>
          <div style={{ fontSize: 11, letterSpacing: 2, marginTop: 2, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: upperTeam?.light_hex }}>{upperTeam?.name}</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
              {cup.total > 0 ? `${cup.upper} – ${cup.lower}` : 'vs'}
            </span>
            <span style={{ color: lowerTeam?.light_hex }}>{lowerTeam?.name}</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            {matches.length} Matches · 2v2 Best Ball · {hcpMode === 'low' ? 'Play Off Low' : 'Against Course'} · 1 pt/hole
            {isAdmin && <span style={{ color: 'var(--mint)', marginLeft: 8 }}>· ADMIN</span>}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {ALL_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: '0 0 auto', padding: '8px 10px', fontSize: 10, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '3px solid var(--gold)' : '3px solid transparent',
              background: 'transparent',
              color: tab === t ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 14px' }}>
        {tab === 'Setup'       && <SetupView />}
        {tab === 'Matches'     && <MatchesView onGoToScoring={goToScoring} />}
        {tab === 'Scoring'     && (
          <ScoringView
            activeMatchIdx={activeMatchIdx}
            setActiveMatchIdx={setActiveMatchIdx}
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
          />
        )}
        {tab === 'Leaderboard' && <LeaderboardView />}
        {tab === 'Bonuses'     && <BonusView />}
        {tab === 'Summary'     && <SummaryView />}
      </div>
    </div>
  )
}
