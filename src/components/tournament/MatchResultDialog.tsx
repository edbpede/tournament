/**
 * Match Result Dialog
 * Dialog component for recording match results
 * Supports both 1v1 (winner selection) and multi-player (ranking) modes
 * Features drag-and-drop reordering for multi-player matches
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchResult, Participant } from '@/lib/tournaments/types';
import { getPointsForPlacement } from '@/lib/tournaments/pointsSystems';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  match: Match | null;
  participants: Participant[];
  isMultiPlayer: boolean;
  pointsSystem?: { type: string; customPoints?: number[] };
  onSave: (matchId: string, result: MatchResult) => void;
  onCancel: () => void;
}

interface SortableItemProps {
  id: string;
  index: number;
  participantName: string;
  position: number;
  points: number;
  positionLabel: string;
  hasPointsSystem: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  t: (key: string, options?: any) => string;
}

function SortableItem({
  id,
  index,
  participantName,
  position,
  points,
  positionLabel,
  hasPointsSystem,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  t,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 ${
        isDragging ? 'shadow-lg z-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Position Medal/Number */}
      <div className="flex-shrink-0 w-12 flex items-center justify-center">
        {position === 1 && (
          <Medal className="w-7 h-7 text-yellow-500 fill-yellow-100" aria-label="1st place" />
        )}
        {position === 2 && (
          <Medal className="w-7 h-7 text-gray-400 fill-gray-100" aria-label="2nd place" />
        )}
        {position === 3 && (
          <Medal className="w-7 h-7 text-amber-600 fill-amber-100" aria-label="3rd place" />
        )}
        {position > 3 && (
          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm font-semibold">
            {position}
          </Badge>
        )}
      </div>

      {/* Participant Name */}
      <div className="flex-1">
        <div className="font-medium text-gray-900">{participantName}</div>
        <div className="text-xs text-gray-500">
          {positionLabel}
          {hasPointsSystem && (
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
          onClick={onMoveUp}
          disabled={isFirst}
          className="h-6 w-6 p-0"
          type="button"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={isLast}
          className="h-6 w-6 p-0"
          type="button"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </div>
    </div>
  );
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

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (match) {
      // Initialize rankings with participant IDs in order
      setRankings(match.participantIds);
    }
  }, [match]);

  if (!match) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRankings((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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

        {/* Multi-Player Mode - Ranking Interface with Drag-and-Drop */}
        {isMultiPlayer && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('view.dragToReorder')}</p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {rankings.map((participantId, index) => {
                    const position = index + 1;
                    const points = getPointsForPosition(position);
                    const positionLabel = getPositionLabel(position);

                    return (
                      <SortableItem
                        key={participantId}
                        id={participantId}
                        index={index}
                        participantName={getParticipantName(participantId)}
                        position={position}
                        points={points}
                        positionLabel={positionLabel}
                        hasPointsSystem={!!pointsSystem}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        isFirst={index === 0}
                        isLast={index === rankings.length - 1}
                        t={t}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
