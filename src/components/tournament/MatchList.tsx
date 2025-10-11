/**
 * Match List Component
 * Displays matches in a list format with optional round grouping
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Match, Participant } from '@/lib/tournaments/types';
import { cn } from '@/lib/utils';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  groupByRounds?: boolean;
  showRoundHeaders?: boolean;
}

export default function MatchList({
  matches,
  participants,
  onMatchClick,
  groupByRounds = false,
  showRoundHeaders = false,
}: Props) {
  const { t } = useTranslation();

  // Create participant Map for O(1) lookups instead of O(n) find()
  const participantMap = useMemo(() =>
    new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  const getParticipantName = (id: string): string => {
    const participant = participantMap.get(id);
    return participant?.name || 'Unknown';
  };

  const getMatchStatusColor = (match: Match): string => {
    if (match.status === 'completed') return 'border-green-500 bg-green-50';
    if (match.participantIds.length >= 2) return 'border-blue-500 hover:border-blue-600 cursor-pointer';
    return 'border-gray-300';
  };

  const isWinner = (match: Match, participantId: string): boolean => {
    return match.result?.winnerId === participantId;
  };

  const renderMatch = (match: Match) => (
    <Card
      key={match.id}
      className={cn(
        'p-3 md:p-4 transition-all touch-manipulation',
        getMatchStatusColor(match)
      )}
      onClick={() => {
        if (match.participantIds.length >= 2 && match.status !== 'completed') {
          onMatchClick(match);
        }
      }}
    >
      {/* Match Number */}
      {match.matchNumber && (
        <div className="text-xs text-gray-500 mb-2">
          Match #{match.matchNumber}
        </div>
      )}

      {/* Participants */}
      {match.participantIds.length === 0 ? (
        <div className="text-sm text-gray-400 italic">Waiting for participants...</div>
      ) : match.participantIds.length === 1 ? (
        <div className="text-sm">
          <span className="font-medium">{getParticipantName(match.participantIds[0])}</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {t('view.bye')}
          </Badge>
        </div>
      ) : (
        <div className="space-y-2">
          {match.participantIds.map((pid) => {
            const winner = isWinner(match, pid);
            
            return (
              <div
                key={pid}
                className={cn(
                  'flex items-center justify-between text-sm p-2 rounded',
                  winner && 'bg-green-100 font-semibold',
                  !winner && match.status === 'completed' && 'opacity-50'
                )}
              >
                <span className={cn(winner && 'font-semibold')}>
                  {getParticipantName(pid)}
                </span>
                {winner && (
                  <span className="text-green-600 font-bold">✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score Display (if available) */}
      {match.result?.score && (
        <div className="mt-2 text-xs text-gray-600">
          Score: {match.result.score.participant1Score} - {match.result.score.participant2Score}
        </div>
      )}
    </Card>
  );

  // Group matches by round if requested
  if (groupByRounds && showRoundHeaders) {
    const roundsMap = new Map<number, Match[]>();
    
    matches.forEach((match) => {
      const round = match.round || 1;
      if (!roundsMap.has(round)) {
        roundsMap.set(round, []);
      }
      roundsMap.get(round)!.push(match);
    });

    const rounds = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div className="space-y-6">
        {rounds.map(([roundNumber, roundMatches]) => (
          <div key={roundNumber}>
            <div className="mb-3">
              <Badge variant="outline" className="text-sm font-semibold">
                {t('view.round', { number: roundNumber })}
              </Badge>
              <span className="ml-2 text-xs text-gray-500">
                ({roundMatches.filter(m => m.status === 'completed').length}/{roundMatches.length} completed)
              </span>
            </div>
            <div className="space-y-3">
              {roundMatches.map(renderMatch)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple list without grouping
  return (
    <div className="space-y-3">
      {matches.length === 0 ? (
        <p className="text-sm text-gray-500">{t('view.noMatches')}</p>
      ) : (
        matches.map(renderMatch)
      )}
    </div>
  );
}

