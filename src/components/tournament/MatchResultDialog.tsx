/**
 * Match Result Dialog
 * Dialog component for recording match results
 * Supports both 1v1 (winner selection) and multi-player (ranking) modes
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchResult, Participant } from '@/lib/tournaments/types';
import { getPointsForPlacement } from '@/lib/tournaments/pointsSystems';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  match: Match | null;
  participants: Participant[];
  isMultiPlayer: boolean;
  pointsSystem?: { type: string; customPoints?: number[] };
  onSave: (matchId: string, result: MatchResult) => void;
  onCancel: () => void;
}

export default function MatchResultDialog({
  match,
  participants,
  isMultiPlayer,
  pointsSystem,
  onSave,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState<string[]>([]);

  useEffect(() => {
    if (match) {
      // Initialize rankings with participant IDs in order
      setRankings(match.participantIds);
    }
  }, [match]);

  if (!match) return null;

  const getParticipantName = (id: string) => {
    const participant = participants.find((p) => p.id === id);
    return participant?.name || 'Unknown';
  };

  const getPositionLabel = (position: number): string => {
    if (position === 1) return t('view.first');
    if (position === 2) return t('view.second');
    if (position === 3) return t('view.third');
    if (position === 4) return t('view.fourth');
    return `${position}${getOrdinalSuffix(position)}`;
  };

  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const getPointsForPosition = (position: number): number => {
    if (!pointsSystem) return 0;
    try {
      return getPointsForPlacement(
        pointsSystem as any,
        position,
        match.participantIds.length
      );
    } catch {
      return 0;
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRankings = [...rankings];
    [newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]];
    setRankings(newRankings);
  };

  const handleMoveDown = (index: number) => {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
    setRankings(newRankings);
  };

  const handleSave = () => {
    if (isMultiPlayer) {
      // Create rankings result
      const result: MatchResult = {
        rankings: rankings.map((participantId, index) => ({
          participantId,
          position: index + 1,
        })),
      };
      onSave(match.id, result);
    } else {
      // For 1v1, this shouldn't be called - use the winner selection buttons instead
      // But included for completeness
      const winnerId = rankings[0];
      const loserId = rankings[1];
      const result: MatchResult = {
        winnerId,
        loserId,
      };
      onSave(match.id, result);
    }
  };

  const handleWinnerSelect = (winnerId: string) => {
    const loserId = match.participantIds.find((id) => id !== winnerId);
    const result: MatchResult = {
      winnerId,
      loserId,
    };
    onSave(match.id, result);
  };

  return (
    <Dialog open={!!match} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMultiPlayer ? t('view.recordRankings') : t('view.recordResult')}
          </DialogTitle>
        </DialogHeader>

        {/* 1v1 Mode - Simple Winner Selection */}
        {!isMultiPlayer && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">{t('view.selectWinner')}</p>
            {match.participantIds.map((pid) => (
              <Button
                key={pid}
                variant="outline"
                onClick={() => handleWinnerSelect(pid)}
                className="w-full h-auto p-4 justify-start hover:border-green-500 hover:bg-green-50"
              >
                <div className="flex items-center w-full">
                  <span className="font-medium text-gray-900">{getParticipantName(pid)}</span>
                  <span className="text-sm text-gray-500 ml-2">{t('common.wins')}</span>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Multi-Player Mode - Ranking Interface */}
        {isMultiPlayer && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('view.dragToReorder')}</p>

            <div className="space-y-2">
              {rankings.map((participantId, index) => {
                const position = index + 1;
                const points = getPointsForPosition(position);
                const positionLabel = getPositionLabel(position);

                return (
                  <div
                    key={participantId}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {/* Position Medal/Number */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {position === 1 && <span className="text-2xl">🥇</span>}
                      {position === 2 && <span className="text-2xl">🥈</span>}
                      {position === 3 && <span className="text-2xl">🥉</span>}
                      {position > 3 && (
                        <span className="text-lg font-semibold text-gray-600">{position}</span>
                      )}
                    </div>

                    {/* Participant Name */}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{getParticipantName(participantId)}</div>
                      <div className="text-xs text-gray-500">
                        {positionLabel}
                        {pointsSystem && (
                          <span className="ml-2 text-blue-600 font-medium">
                            {t('view.placementPoints', { points })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Move Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === rankings.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          {isMultiPlayer && (
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {t('view.saveResults')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
