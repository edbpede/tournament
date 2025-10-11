/**
 * Single Elimination Bracket Visualization
 * Displays tournament bracket in a tree structure
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Match, Participant } from '@/lib/tournaments/types';
import { organizeBracketByRounds, getRoundLabel } from '@/lib/tournaments/bracketHelpers';
import { cn } from '@/lib/utils';

interface Props {
  bracket: Match[];
  thirdPlaceMatch?: Match;
  participants: Participant[];
  onMatchClick: (match: Match) => void;
}

export default function SingleEliminationBracket({
  bracket,
  thirdPlaceMatch,
  participants,
  onMatchClick,
}: Props) {
  const { t } = useTranslation();

  const rounds = organizeBracketByRounds(bracket);
  const totalRounds = rounds.length;

  // Create participant Map for O(1) lookups instead of O(n) find()
  const participantMap = useMemo(() =>
    new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  const getParticipantName = (id: string): string => {
    const participant = participantMap.get(id);
    return participant?.name || 'TBD';
  };

  const getParticipantSeed = (id: string): number | undefined => {
    const participant = participantMap.get(id);
    return participant?.seed;
  };

  const getMatchStatusColor = (match: Match): string => {
    if (match.status === 'completed') return 'border-green-500 bg-green-50';
    if (match.participantIds.length === 2) return 'border-blue-500 hover:border-blue-600 cursor-pointer';
    return 'border-gray-300';
  };

  const isWinner = (match: Match, participantId: string): boolean => {
    return match.result?.winnerId === participantId;
  };

  return (
    <div className="w-full h-full">
      <ScrollArea className="w-full h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
        <div className="p-4 md:p-6">
          {/* Mobile hint */}
          <div className="md:hidden mb-4 text-center">
            <p className="text-xs text-gray-500">← Scroll horizontally to view all rounds →</p>
          </div>

          {/* Main Bracket */}
          <div className="flex gap-4 md:gap-8 min-w-max pb-4">
            {rounds.map((round, roundIndex) => (
              <div key={round.round} className="flex flex-col justify-around min-w-[200px] md:min-w-[240px]">
                {/* Round Header */}
                <div className="mb-4 text-center">
                  <Badge variant="outline" className="text-xs md:text-sm font-semibold">
                    {getRoundLabel(round.round, totalRounds)}
                  </Badge>
                </div>

                {/* Matches in Round */}
                <div className="flex flex-col justify-around gap-3 md:gap-4 flex-1">
                  {round.matches.map((match, matchIndex) => (
                    <div
                      key={match.id}
                      className="relative"
                      style={{
                        marginTop: roundIndex > 0 ? `${matchIndex * 20}px` : '0',
                      }}
                    >
                      <Card
                        className={cn(
                          'p-2 md:p-3 transition-all touch-manipulation',
                          getMatchStatusColor(match)
                        )}
                        onClick={() => {
                          if (match.participantIds.length === 2 && match.status !== 'completed') {
                            onMatchClick(match);
                          }
                        }}
                      >
                        {/* Match Number */}
                        <div className="text-xs text-gray-500 mb-2">
                          Match #{match.matchNumber}
                        </div>

                        {/* Participants */}
                        <div className="space-y-2">
                          {match.participantIds.length === 0 ? (
                            <div className="text-sm text-gray-400 italic">Waiting...</div>
                          ) : match.participantIds.length === 1 ? (
                            <div className="text-sm">
                              <span className="font-medium">{getParticipantName(match.participantIds[0])}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                BYE
                              </Badge>
                            </div>
                          ) : (
                            match.participantIds.map((pid) => {
                              const seed = getParticipantSeed(pid);
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
                                  <div className="flex items-center gap-2">
                                    {seed && (
                                      <span className="text-xs text-gray-500 font-mono w-6">
                                        ({seed})
                                      </span>
                                    )}
                                    <span className={cn(winner && 'font-semibold')}>
                                      {getParticipantName(pid)}
                                    </span>
                                  </div>
                                  {winner && (
                                    <span className="text-green-600 font-bold">✓</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </Card>

                      {/* Connector Line to Next Round */}
                      {roundIndex < rounds.length - 1 && (
                        <div className="absolute top-1/2 -right-4 md:-right-8 w-4 md:w-8 h-0.5 bg-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Third Place Match */}
          {thirdPlaceMatch && (
            <>
              <Separator className="my-8" />
              <div className="max-w-md mx-auto">
                <div className="mb-4 text-center">
                  <Badge variant="outline" className="text-sm font-semibold">
                    Third Place Match
                  </Badge>
                </div>

                <Card
                  className={cn(
                    'p-3 transition-all',
                    getMatchStatusColor(thirdPlaceMatch)
                  )}
                  onClick={() => {
                    if (thirdPlaceMatch.participantIds.length === 2 && thirdPlaceMatch.status !== 'completed') {
                      onMatchClick(thirdPlaceMatch);
                    }
                  }}
                >
                  <div className="text-xs text-gray-500 mb-2">
                    Match #{thirdPlaceMatch.matchNumber}
                  </div>

                  <div className="space-y-2">
                    {thirdPlaceMatch.participantIds.map((pid) => {
                      const seed = getParticipantSeed(pid);
                      const winner = isWinner(thirdPlaceMatch, pid);
                      
                      return (
                        <div
                          key={pid}
                          className={cn(
                            'flex items-center justify-between text-sm p-2 rounded',
                            winner && 'bg-green-100 font-semibold',
                            !winner && thirdPlaceMatch.status === 'completed' && 'opacity-50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {seed && (
                              <span className="text-xs text-gray-500 font-mono w-6">
                                ({seed})
                              </span>
                            )}
                            <span className={cn(winner && 'font-semibold')}>
                              {getParticipantName(pid)}
                            </span>
                          </div>
                          {winner && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

