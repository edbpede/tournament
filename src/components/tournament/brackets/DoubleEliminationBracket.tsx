/**
 * Double Elimination Bracket Visualization
 * Displays winners bracket, losers bracket, and grand finals with proper alignment
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Match, Participant } from '@/lib/tournaments/types';
import { calculateBracketLayout, getRoundLabel } from '@/lib/tournaments/bracketHelpers';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface Props {
  winnersBracket: Match[];
  losersBracket: Match[];
  grandFinal?: Match;
  grandFinalReset?: Match;
  participants: Participant[];
  onMatchClick: (match: Match) => void;
}

export default function DoubleEliminationBracket({
  winnersBracket,
  losersBracket,
  grandFinal,
  grandFinalReset,
  participants,
  onMatchClick,
}: Props) {
  const { t } = useTranslation();

  // Calculate proper tree-based layouts for both brackets
  const MATCH_HEIGHT = 120;
  const MATCH_GAP = 24;
  const ROUND_WIDTH = 240;
  const ROUND_GAP = 64;

  const winnersLayout = useMemo(
    () => calculateBracketLayout(winnersBracket, MATCH_HEIGHT, MATCH_GAP, ROUND_WIDTH),
    [winnersBracket]
  );

  const losersLayout = useMemo(
    () => calculateBracketLayout(losersBracket, MATCH_HEIGHT, MATCH_GAP, ROUND_WIDTH),
    [losersBracket]
  );

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

  const renderMatch = (match: Match, showMatchNumber: boolean = true) => (
    <Card
      className={cn(
        'p-2 md:p-3 transition-all touch-manipulation',
        getMatchStatusColor(match)
      )}
      onClick={() => {
        if (match.participantIds.length >= 2 && match.status !== 'completed') {
          onMatchClick(match);
        }
      }}
    >
      {showMatchNumber && (
        <div className="text-xs text-gray-500 mb-2">
          Match #{match.matchNumber}
        </div>
      )}

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

  const renderBracket = (
    layout: ReturnType<typeof calculateBracketLayout>,
    title: string,
    badgeVariant: 'default' | 'secondary' = 'default'
  ) => {
    // Calculate total height needed for this bracket
    let maxY = 0;
    layout.positions.forEach((pos) => {
      const bottom = pos.y + pos.height;
      if (bottom > maxY) maxY = bottom;
    });
    const totalHeight = maxY + 40;

    return (
      <div className="mb-6 md:mb-8">
        <div className="mb-4">
          <Badge variant={badgeVariant} className="text-sm md:text-base font-bold px-3 md:px-4 py-1">
            {title}
          </Badge>
        </div>

        <div className="relative min-w-max pb-4" style={{ height: `${totalHeight}px` }}>
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

                // Calculate line coordinates
                const x1 = roundIndex * (ROUND_WIDTH + ROUND_GAP) + ROUND_WIDTH;
                const y1 = matchPos.y + MATCH_HEIGHT / 2;
                const x2 = (roundIndex + 1) * (ROUND_WIDTH + ROUND_GAP);
                const y2 = parentPos.y + MATCH_HEIGHT / 2;
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
                  {getRoundLabel(round.round, layout.rounds.length)}
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
                      height: `${MATCH_HEIGHT}px`,
                    }}
                  >
                    {renderMatch(match)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <ScrollArea className="w-full h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
        <div className="p-4 md:p-6">
          {/* Mobile hint */}
          <div className="md:hidden mb-4 text-center">
            <p className="text-xs text-gray-500">← Scroll horizontally to view all rounds →</p>
          </div>

          {/* Winners Bracket */}
          {winnersLayout.rounds.length > 0 && renderBracket(winnersLayout, "Winners Bracket", "default")}

          {/* Losers Bracket */}
          {losersLayout.rounds.length > 0 && (
            <>
              <Separator className="my-8" />
              {renderBracket(losersLayout, "Losers Bracket", "secondary")}
            </>
          )}

          {/* Grand Finals */}
          {grandFinal && (
            <>
              <Separator className="my-8" />
              <div className="max-w-md mx-auto">
                <div className="mb-4 text-center">
                  <Badge className="text-base font-bold px-4 py-1 bg-yellow-500 hover:bg-yellow-600 gap-2">
                    <Trophy className="w-5 h-5" />
                    Grand Finals
                  </Badge>
                </div>

                {renderMatch(grandFinal, false)}

                {/* Grand Final Reset (if losers bracket winner wins first grand final) */}
                {grandFinalReset && (
                  <div className="mt-4">
                    <div className="mb-2 text-center">
                      <Badge variant="outline" className="text-sm font-semibold">
                        Grand Finals - Reset
                      </Badge>
                    </div>
                    {renderMatch(grandFinalReset, false)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

