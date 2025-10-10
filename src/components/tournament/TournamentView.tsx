/**
 * Tournament View
 * Main view for managing an active tournament
 * Shows matches, standings, and allows recording results
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadTournamentState, saveTournamentState } from '../../lib/storage/localStorage';
import { restoreTournament } from '../../lib/tournaments/factory';
import type { BaseTournament } from '../../lib/tournaments/BaseTournament';
import type { Match, Standing, MatchResult } from '../../lib/tournaments/types';

interface Props {
  tournamentId: string;
  onBack: () => void;
}

export default function TournamentView({ tournamentId, onBack }: Props) {
  const { t } = useTranslation();
  const [tournament, setTournament] = useState<BaseTournament | null>(null);
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

    // Save to localStorage
    const state = tournament.export();
    saveTournamentState(state);
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
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('view.backToDashboard')}
          </button>
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
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('view.backToDashboard')}
          </button>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Matches */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('view.currentMatches')}</h2>

            {currentMatches.length === 0 ? (
              <p className="text-sm text-gray-500">{t('view.noMatches')}</p>
            ) : (
              <div className="space-y-3">
                {currentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => setSelectedMatch(match)}
                  >
                    {match.participantIds.length === 1 ? (
                      <p className="text-sm text-gray-600">
                        {getParticipantName(match.participantIds[0])} {t('view.bye')}
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {match.participantIds.map((pid) => (
                            <div key={pid} className="text-sm font-medium text-gray-900">
                              {getParticipantName(pid)}
                            </div>
                          ))}
                        </div>
                        {match.round && (
                          <p className="text-xs text-gray-500 mt-2">{t('view.round', { number: match.round })}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Standings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('view.standings')}</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('view.rank')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('view.participant')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('view.wlt')}
                    </th>
                    {standings.some((s) => s.points !== undefined) && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('view.points')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {standings.map((standing) => (
                    <tr key={standing.participantId}>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {standing.rank || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {standing.participantName}
                        {standing.isEliminated && (
                          <span className="ml-2 text-xs text-red-600">{t('view.eliminated')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {standing.wins}-{standing.losses}-{standing.ties}
                      </td>
                      {standings.some((s) => s.points !== undefined) && (
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {standing.points || 0}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Match Result Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('view.recordResult')}</h3>

              <div className="space-y-4">
                {selectedMatch.participantIds.map((pid) => (
                  <button
                    key={pid}
                    onClick={() => {
                      const result: MatchResult = {
                        winnerId: pid,
                        loserId: selectedMatch.participantIds.find((id) => id !== pid),
                      };
                      handleRecordResult(selectedMatch.id, result);
                    }}
                    className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{getParticipantName(pid)}</span>
                    <span className="text-sm text-gray-500 ml-2">{t('common.wins')}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
