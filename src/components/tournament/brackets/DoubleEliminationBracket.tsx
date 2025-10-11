/**
 * Double Elimination Bracket Visualization
 * Displays winners bracket, losers bracket, and grand finals
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

  const winnersRounds = organizeBracketByRounds(winnersBracket);
  const losersRounds = organizeBracketByRounds(losersBracket);

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

  const renderBracket = (rounds: ReturnType<typeof organizeBracketByRounds>, title: string, badgeVariant: 'default' | 'secondary' = 'default') => (
    <div className="mb-6 md:mb-8">
      <div className="mb-4">
        <Badge variant={badgeVariant} className="text-sm md:text-base font-bold px-3 md:px-4 py-1">
          {title}
        </Badge>
      </div>

      <div className="flex gap-4 md:gap-8 min-w-max pb-4">
        {rounds.map((round, roundIndex) => (
          <div key={round.round} className="flex flex-col justify-around min-w-[200px] md:min-w-[240px]">
            <div className="mb-4 text-center">
              <Badge variant="outline" className="text-xs md:text-sm font-semibold">
                {getRoundLabel(round.round, rounds.length)}
              </Badge>
            </div>

            <div className="flex flex-col justify-around gap-3 md:gap-4 flex-1">
              {round.matches.map((match, matchIndex) => (
                <div
                  key={match.id}
                  className="relative"
                  style={{
                    marginTop: roundIndex > 0 ? `${matchIndex * 20}px` : '0',
                  }}
                >
                  {renderMatch(match)}

                  {roundIndex < rounds.length - 1 && (
                    <div className="absolute top-1/2 -right-4 md:-right-8 w-4 md:w-8 h-0.5 bg-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full">
      <ScrollArea className="w-full h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
        <div className="p-4 md:p-6">
          {/* Mobile hint */}
          <div className="md:hidden mb-4 text-center">
            <p className="text-xs text-gray-500">← Scroll horizontally to view all rounds →</p>
          </div>

          {/* Winners Bracket */}
          {winnersRounds.length > 0 && renderBracket(winnersRounds, "Winners Bracket", "default")}

          {/* Losers Bracket */}
          {losersRounds.length > 0 && (
            <>
              <Separator className="my-8" />
              {renderBracket(losersRounds, "Losers Bracket", "secondary")}
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

