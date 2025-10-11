/**
 * Single Elimination Bracket Visualization
 * Displays tournament bracket in a tree structure with proper alignment
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Match, Participant } from '@/lib/tournaments/types';
import { calculateBracketLayout, getRoundLabel } from '@/lib/tournaments/bracketHelpers';
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

  // Layout constants - using dynamic height calculation
  const BASE_MATCH_HEIGHT = 120; // Base height for matches with 2 participants
  const MATCH_GAP = 24;
  const ROUND_WIDTH = 240;

  const layout = useMemo(
    () => calculateBracketLayout(bracket, BASE_MATCH_HEIGHT, MATCH_GAP, ROUND_WIDTH),
    [bracket]
  );

  const totalRounds = layout.rounds.length;

  // Dynamic round gap based on tournament size
  // Smaller tournaments get tighter spacing to prevent excessive whitespace
  const ROUND_GAP = useMemo(() => {
    if (totalRounds <= 2) return 32; // Very small tournaments
    if (totalRounds === 3) return 40; // Small tournaments
    if (totalRounds === 4) return 48; // Medium tournaments
    return 56; // Large tournaments
  }, [totalRounds]);

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
    if (match.participantIds.length >= 2) return 'border-blue-500 hover:border-blue-600 cursor-pointer';
    return 'border-gray-300';
  };

  const isWinner = (match: Match, participantId: string): boolean => {
    return match.result?.winnerId === participantId;
  };

  // Render a single match card
  const renderMatchCard = (match: Match) => (
    <Card
      className={cn(
        'p-2 md:p-3 transition-all touch-manipulation w-full',
        getMatchStatusColor(match)
      )}
      onClick={() => {
        if (match.participantIds.length >= 2 && match.status !== 'completed') {
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
  );

  // Calculate total height needed for the bracket
  const totalHeight = useMemo(() => {
    let maxY = 0;
    layout.positions.forEach((pos) => {
      const bottom = pos.y + pos.height;
      if (bottom > maxY) maxY = bottom;
    });
    return maxY + 40; // Add padding
  }, [layout.positions]);

  // Calculate total width based on rounds and dynamic gap
  const totalWidth = useMemo(() => {
    return totalRounds * (ROUND_WIDTH + ROUND_GAP) - ROUND_GAP;
  }, [totalRounds, ROUND_GAP]);

  return (
    <div className="w-full h-full">
      <ScrollArea className="w-full h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]">
        {/* Mobile hint */}
        <div className="md:hidden pt-4 px-6 text-center">
          <p className="text-xs text-gray-500">← Scroll horizontally to view all rounds →</p>
        </div>

        {/* Centered bracket container */}
        <div className="flex justify-center items-start min-h-full p-6 md:p-8 pt-8 md:pt-10">
          {/* Main Bracket - Positioned Layout */}
          <div className="relative pb-8" style={{ height: `${totalHeight}px`, width: `${totalWidth}px` }}>
            {/* SVG for connector lines */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {layout.rounds.map((round, roundIndex) => {
                if (roundIndex >= layout.rounds.length - 1) return null;

                return round.matches.map((match) => {
                  const matchPos = layout.positions.get(match.id);
                  if (!matchPos) return null;

                  // Find the parent match (in next round)
                  const nextRound = layout.rounds[roundIndex + 1];
                  const parentIndex = Math.floor(
                    round.matches.findIndex(m => m.id === match.id) / 2
                  );
                  const parentMatch = nextRound.matches[parentIndex];
                  const parentPos = parentMatch ? layout.positions.get(parentMatch.id) : null;

                  if (!parentPos) return null;

                  // Calculate line coordinates using actual match heights for proper centering
                  const x1 = roundIndex * (ROUND_WIDTH + ROUND_GAP) + ROUND_WIDTH;
                  const y1 = matchPos.y + matchPos.height / 2;
                  const x2 = (roundIndex + 1) * (ROUND_WIDTH + ROUND_GAP);
                  const y2 = parentPos.y + parentPos.height / 2;
                  const midX = x1 + ROUND_GAP / 2;

                  return (
                    <g key={match.id}>
                      {/* Horizontal line from match */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={midX}
                        y2={y1}
                        stroke="#d1d5db"
                        strokeWidth="2"
                      />
                      {/* Vertical line */}
                      <line
                        x1={midX}
                        y1={y1}
                        x2={midX}
                        y2={y2}
                        stroke="#d1d5db"
                        strokeWidth="2"
                      />
                      {/* Horizontal line to parent */}
                      <line
                        x1={midX}
                        y1={y2}
                        x2={x2}
                        y2={y2}
                        stroke="#d1d5db"
                        strokeWidth="2"
                      />
                    </g>
                  );
                });
              })}
            </svg>

            {/* Render rounds with positioned matches */}
            {layout.rounds.map((round, roundIndex) => (
              <div
                key={round.round}
                className="absolute"
                style={{
                  left: `${roundIndex * (ROUND_WIDTH + ROUND_GAP)}px`,
                  top: 0,
                  width: `${ROUND_WIDTH}px`,
                }}
              >
                {/* Round Header */}
                <div className="mb-4 text-center sticky top-0 bg-white z-10 pb-2">
                  <Badge variant="outline" className="text-xs md:text-sm font-semibold">
                    {getRoundLabel(round.round, totalRounds)}
                  </Badge>
                </div>

                {/* Matches positioned absolutely */}
                {round.matches.map((match) => {
                  const pos = layout.positions.get(match.id);
                  if (!pos) return null;

                  return (
                    <div
                      key={match.id}
                      className="absolute"
                      style={{
                        top: `${pos.y}px`,
                        width: `${ROUND_WIDTH}px`,
                        minHeight: `${pos.height}px`,
                      }}
                    >
                      {renderMatchCard(match)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Third Place Match */}
        {thirdPlaceMatch && (
          <div className="px-6 md:px-8 pb-8">
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
                  if (thirdPlaceMatch.participantIds.length >= 2 && thirdPlaceMatch.status !== 'completed') {
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
          </div>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

