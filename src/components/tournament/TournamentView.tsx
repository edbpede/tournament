/**
 * Tournament View
 * Main view for managing an active tournament
 * Shows matches, standings, and allows recording results with tabbed interface
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadTournamentState, saveTournamentState } from '../../lib/storage/localStorage';
import { restoreTournament } from '../../lib/tournaments/factory';
import type { BaseTournament } from '../../lib/tournaments/BaseTournament';
import type { Match, Standing, MatchResult, TournamentState } from '../../lib/tournaments/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SingleEliminationBracket from './brackets/SingleEliminationBracket';
import DoubleEliminationBracket from './brackets/DoubleEliminationBracket';
import MatchList from './MatchList';

interface Props {
  tournamentId: string;
  onBack: () => void;
}

export default function TournamentView({ tournamentId, onBack }: Props) {
  const { t } = useTranslation();
  const [tournament, setTournament] = useState<BaseTournament | null>(null);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tournament
  useEffect(() => {
    try {
      const state = loadTournamentState(tournamentId);
      if (!state) {
        setError(t('view.tournamentNotFound'));
        return;
      }

      const restored = restoreTournament(state);
      setTournament(restored);
      setTournamentState(state);
      setCurrentMatches(restored.getCurrentMatches());
      setStandings(restored.getStandings());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('view.loadError'));
      setLoading(false);
    }
  }, [tournamentId, t]);

  const refreshTournament = () => {
    if (!tournament) return;

    setCurrentMatches(tournament.getCurrentMatches());
    setStandings(tournament.getStandings());

    // Save to localStorage and update state
    const state = tournament.export();
    saveTournamentState(state);
    setTournamentState(state);
  };

  const handleRecordResult = (matchId: string, result: MatchResult) => {
    if (!tournament) return;

    try {
      tournament.recordMatchResult(matchId, result);
      refreshTournament();
      setSelectedMatch(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('view.resultError'));
    }
  };

  const handleMatchClick = (match: Match) => {
    if (match.participantIds.length === 2 && match.status !== 'completed') {
      setSelectedMatch(match);
    }
  };

  const hasBracketView = (type: string): boolean => {
    return type === 'single-elimination' || type === 'double-elimination';
  };

  const shouldGroupByRounds = (type: string): boolean => {
    return type === 'round-robin' || type === 'swiss' || type === 'free-for-all';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">{t('view.loadingTournament')}</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || t('view.tournamentNotFound')}</p>
          <Button
            onClick={onBack}
            className="mt-4"
          >
            {t('view.backToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single-elimination': t('tournamentTypes.singleElimination'),
      'double-elimination': t('tournamentTypes.doubleElimination'),
      'round-robin': t('tournamentTypes.roundRobin'),
      'swiss': t('tournamentTypes.swiss'),
      'free-for-all': t('tournamentTypes.freeForAll'),
    };
    return labels[type] || type;
  };

  const getParticipantName = (id: string) => {
    const participant = tournament.getParticipants().find((p) => p.id === id);
    return participant?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 -ml-4"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('view.backToDashboard')}
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tournament.getName()}</h1>
              <p className="text-sm text-gray-600 mt-1">{getTypeLabel(tournament.getType())}</p>
            </div>

            <div>
              {tournament.isComplete() ? (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                  {t('status.completed')}
                </span>
              ) : (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  {t('status.inProgress')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue={hasBracketView(tournament.getType()) ? "bracket" : "matches"} className="w-full">
          <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: hasBracketView(tournament.getType()) ? '1fr 1fr 1fr' : '1fr 1fr' }}>
            {hasBracketView(tournament.getType()) && (
              <TabsTrigger value="bracket">{t('view.bracket') || 'Bracket'}</TabsTrigger>
            )}
            <TabsTrigger value="matches">{t('view.matches') || 'Matches'}</TabsTrigger>
            <TabsTrigger value="standings">{t('view.standings')}</TabsTrigger>
          </TabsList>

          {/* Bracket Tab - Only for Single/Double Elimination */}
          {hasBracketView(tournament.getType()) && (
            <TabsContent value="bracket" className="mt-6">
              <div className="bg-white shadow rounded-lg">
                {tournament.getType() === 'single-elimination' && tournamentState?.type === 'single-elimination' && (
                  <SingleEliminationBracket
                    bracket={tournamentState.bracket}
                    thirdPlaceMatch={tournamentState.thirdPlaceMatch}
                    participants={tournament.getParticipants()}
                    onMatchClick={handleMatchClick}
                  />
                )}
                {tournament.getType() === 'double-elimination' && tournamentState?.type === 'double-elimination' && (
                  <DoubleEliminationBracket
                    winnersBracket={tournamentState.winnersBracket}
                    losersBracket={tournamentState.losersBracket}
                    grandFinal={tournamentState.grandFinal}
                    grandFinalReset={tournamentState.grandFinalReset}
                    participants={tournament.getParticipants()}
                    onMatchClick={handleMatchClick}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* Matches Tab - List View */}
          <TabsContent value="matches" className="mt-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('view.currentMatches')}</h2>

              <MatchList
                matches={currentMatches}
                participants={tournament.getParticipants()}
                onMatchClick={handleMatchClick}
                groupByRounds={shouldGroupByRounds(tournament.getType())}
                showRoundHeaders={shouldGroupByRounds(tournament.getType())}
              />
            </div>
          </TabsContent>

          {/* Standings Tab */}
          <TabsContent value="standings" className="mt-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('view.standings')}</h2>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">
                        {t('view.rank')}
                      </TableHead>
                      <TableHead>
                        {t('view.participant')}
                      </TableHead>
                      <TableHead className="w-32">
                        {t('view.wlt')}
                      </TableHead>
                      {standings.some((s) => s.points !== undefined) && (
                        <TableHead className="w-24 text-right">
                          {t('view.points')}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((standing) => (
                      <TableRow key={standing.participantId}>
                        <TableCell className="font-medium">
                          {standing.rank || '-'}
                        </TableCell>
                        <TableCell>
                          {standing.participantName}
                          {standing.isEliminated && (
                            <span className="ml-2 text-xs text-red-600">{t('view.eliminated')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {standing.wins}-{standing.losses}-{standing.ties}
                        </TableCell>
                        {standings.some((s) => s.points !== undefined) && (
                          <TableCell className="text-right">
                            {standing.points || 0}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Match Result Dialog */}
        <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('view.recordResult')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {selectedMatch?.participantIds.map((pid) => (
                <Button
                  key={pid}
                  variant="outline"
                  onClick={() => {
                    const result: MatchResult = {
                      winnerId: pid,
                      loserId: selectedMatch.participantIds.find((id) => id !== pid),
                    };
                    handleRecordResult(selectedMatch.id, result);
                  }}
                  className="w-full h-auto p-4 justify-start hover:border-green-500 hover:bg-green-50"
                >
                  <div className="flex items-center w-full">
                    <span className="font-medium text-gray-900">{getParticipantName(pid)}</span>
                    <span className="text-sm text-gray-500 ml-2">{t('common.wins')}</span>
                  </div>
                </Button>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedMatch(null)}
              >
                {t('common.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
