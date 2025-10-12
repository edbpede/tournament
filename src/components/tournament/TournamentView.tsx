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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import SingleEliminationBracket from './brackets/SingleEliminationBracket';
import DoubleEliminationBracket from './brackets/DoubleEliminationBracket';
import MatchList from './MatchList';
import MatchResultDialog from './MatchResultDialog';

interface Props {
  tournamentId: string;
  onBack: () => void;
  onEdit: (id: string, step: 'type' | 'options' | 'participants') => void;
}

export default function TournamentView({ tournamentId, onBack, onEdit }: Props) {
  const { t } = useTranslation();
  const [tournament, setTournament] = useState<BaseTournament | null>(null);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

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
    // Allow clicking on any non-completed match
    if (match.status !== 'completed') {
      setSelectedMatch(match);
    }
  };

  const handleResetClick = () => {
    setResetDialogOpen(true);
  };

  const handleResetConfirm = () => {
    if (!tournament) return;

    try {
      // Call reset method
      tournament.reset();

      // Save the reset state and refresh
      refreshTournament();
      setResetDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('view.resetError'));
    }
  };

  const handleResetCancel = () => {
    setResetDialogOpen(false);
  };

  const isMultiPlayerMatch = (match: Match): boolean => {
    return match.participantIds.length > 2;
  };

  const getPointsSystem = () => {
    if (!tournamentState) return undefined;

    // Extract points system from tournament state options
    const options = (tournamentState as any).options;
    return options?.pointsSystem;
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
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 -ml-2">
            <Button
              variant="ghost"
              onClick={onBack}
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('view.backToDashboard')}
            </Button>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600 mr-1">{t('view.editLabel')}:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tournamentId, 'type')}
                className="h-8"
              >
                {t('view.editType')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tournamentId, 'options')}
                className="h-8"
              >
                {t('view.editOptions')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tournamentId, 'participants')}
                className="h-8"
              >
                {t('view.editParticipants')}
              </Button>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetClick}
                className="h-8 text-orange-700 hover:bg-orange-50 hover:text-orange-700"
              >
                <svg
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('view.resetTournament')}
              </Button>
            </div>
          </div>

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
              <TabsTrigger value="bracket">{t('view.bracket')}</TabsTrigger>
            )}
            <TabsTrigger value="matches">{t('view.matches')}</TabsTrigger>
            <TabsTrigger value="standings">{t('view.standings')}</TabsTrigger>
          </TabsList>

          {/* Bracket Tab - Only for Single/Double Elimination */}
          {hasBracketView(tournament.getType()) && (
            <TabsContent value="bracket" className="mt-3">
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
          <TabsContent value="matches" className="mt-3">
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
          <TabsContent value="standings" className="mt-3">
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
        <MatchResultDialog
          match={selectedMatch}
          participants={tournament.getParticipants()}
          isMultiPlayer={selectedMatch ? isMultiPlayerMatch(selectedMatch) : false}
          pointsSystem={getPointsSystem()}
          onSave={handleRecordResult}
          onCancel={() => setSelectedMatch(null)}
        />

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('view.resetConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('view.resetConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleResetCancel}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirm} className="bg-orange-600 hover:bg-orange-700">
                {t('common.reset')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
