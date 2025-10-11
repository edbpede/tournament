/**
 * Points Systems for Multi-Player Tournaments
 * Defines preset point distributions and utility functions
 */

import type { PointsSystemType, PointsSystemConfig } from './types';

export interface PointsSystemPreset {
  name: string;
  type: PointsSystemType;
  description: string;
  bestFor: string;
  points: number[];
  maxPlayers?: number; // Some systems have a maximum (e.g., F1 only top 10 score)
}

/**
 * Preset points systems for common scenarios
 */
export const POINTS_SYSTEM_PRESETS: Record<PointsSystemType, PointsSystemPreset> = {
  'f1': {
    name: 'Formula 1',
    type: 'f1',
    description: 'Official F1 scoring system (top 10 score points)',
    bestFor: 'Competitive racing with large gaps between placements',
    points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    maxPlayers: 10,
  },
  'mario-kart': {
    name: 'Mario Kart',
    type: 'mario-kart',
    description: 'Mario Kart 8 Deluxe scoring (all placements score)',
    bestFor: 'Casual racing where everyone earns points',
    points: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    maxPlayers: 12,
  },
  'linear': {
    name: 'Linear Descending',
    type: 'linear',
    description: 'Equal point gaps between placements (N, N-1, N-2, ..., 1)',
    bestFor: 'Equal point gaps between all placements',
    points: [], // Generated dynamically
  },
  'winner-takes-most': {
    name: 'Winner Takes Most',
    type: 'winner-takes-most',
    description: 'Winning is worth twice as much as 2nd place',
    bestFor: 'Emphasizing winning over consistent placement',
    points: [], // Generated dynamically
  },
  'custom': {
    name: 'Custom',
    type: 'custom',
    description: 'Define your own point distribution',
    bestFor: 'Specific tournament requirements',
    points: [], // User-defined
  },
};

/**
 * Generate points array for a given system and player count
 */
export function generatePointsArray(
  config: PointsSystemConfig,
  playerCount: number
): number[] {
  const preset = POINTS_SYSTEM_PRESETS[config.type];

  switch (config.type) {
    case 'f1':
    case 'mario-kart': {
      // Fixed points systems - pad with zeros if more players than points
      const basePoints = preset.points;
      if (playerCount <= basePoints.length) {
        return basePoints.slice(0, playerCount);
      }
      // More players than preset points - pad with zeros
      return [...basePoints, ...Array(playerCount - basePoints.length).fill(0)];
    }

    case 'linear': {
      // N, N-1, N-2, ..., 1
      return Array.from({ length: playerCount }, (_, i) => playerCount - i);
    }

    case 'winner-takes-most': {
      // Winner gets double points, others linear
      if (playerCount === 1) return [playerCount];
      const points = Array.from({ length: playerCount }, (_, i) => playerCount - i);
      points[0] = playerCount * 2; // Double for winner
      return points;
    }

    case 'custom': {
      if (!config.customPoints || config.customPoints.length === 0) {
        throw new Error('Custom points system requires customPoints array');
      }
      // Use custom points, pad with zeros if needed
      if (playerCount <= config.customPoints.length) {
        return config.customPoints.slice(0, playerCount);
      }
      return [...config.customPoints, ...Array(playerCount - config.customPoints.length).fill(0)];
    }

    default:
      throw new Error(`Unknown points system type: ${config.type}`);
  }
}

/**
 * Get points for a specific placement
 */
export function getPointsForPlacement(
  config: PointsSystemConfig,
  placement: number,
  totalPlayers: number
): number {
  const pointsArray = generatePointsArray(config, totalPlayers);
  // placement is 1-indexed, array is 0-indexed
  const index = placement - 1;
  if (index < 0 || index >= pointsArray.length) {
    return 0;
  }
  return pointsArray[index];
}

/**
 * Calculate match points from placement (for Swiss system)
 * Converts placement to match points for pairing purposes
 */
export function calculateMatchPointsFromPlacement(
  placement: number,
  totalPlayers: number,
  formula: 'winner-only' | 'proportional'
): number {
  if (formula === 'winner-only') {
    // Only 1st place gets match points
    return placement === 1 ? 3 : 0;
  }

  // Proportional: distribute points based on placement
  // 1st = 3 points, 2nd = 2 points, 3rd = 1 point, rest = 0
  if (placement === 1) return 3;
  if (placement === 2) return 2;
  if (placement === 3) return 1;
  return 0;
}

/**
 * Validate a points system configuration
 */
export function validatePointsSystem(config: PointsSystemConfig): void {
  if (!config.type) {
    throw new Error('Points system type is required');
  }

  if (config.type === 'custom') {
    if (!config.customPoints || config.customPoints.length === 0) {
      throw new Error('Custom points system requires customPoints array with at least one value');
    }

    // Check for negative points
    if (config.customPoints.some((p) => p < 0)) {
      throw new Error('Points cannot be negative');
    }

    // Warn if not in descending order (not an error, but unusual)
    for (let i = 1; i < config.customPoints.length; i++) {
      if (config.customPoints[i] > config.customPoints[i - 1]) {
        console.warn(
          'Custom points are not in descending order - this may lead to unexpected results'
        );
        break;
      }
    }
  }
}

/**
 * Get default points system for a tournament type
 */
export function getDefaultPointsSystem(
  matchType: 'head-to-head' | 'multi-player' | undefined
): PointsSystemConfig {
  if (matchType === 'multi-player') {
    return { type: 'mario-kart' }; // Good default for most multi-player scenarios
  }
  // For head-to-head, points systems aren't typically used
  return { type: 'linear' };
}

/**
 * Format points array for display
 */
export function formatPointsArray(points: number[]): string {
  if (points.length <= 6) {
    return points.join(', ');
  }
  return `${points.slice(0, 5).join(', ')}, ... (${points.length} total)`;
}
