/**
 * Tournament Factory
 * Creates and restores tournament instances based on type
 */

import type { TournamentOptions, TournamentState, TournamentType } from './types';
import { BaseTournament } from './BaseTournament';
import { SingleEliminationTournament } from './types/SingleElimination';
import { DoubleEliminationTournament } from './types/DoubleElimination';
import { RoundRobinTournament } from './types/RoundRobin';
import { SwissTournament } from './types/Swiss';
import { FreeForAllTournament } from './types/FreeForAll';
import { validatePointsSystem } from './pointsSystems';

/**
 * Create a new tournament instance from options
 */
export function createTournament(options: TournamentOptions): BaseTournament {
  switch (options.type) {
    case 'single-elimination':
      return new SingleEliminationTournament(options);

    case 'double-elimination':
      return new DoubleEliminationTournament(options);

    case 'round-robin':
      return new RoundRobinTournament(options);

    case 'swiss':
      return new SwissTournament(options);

    case 'free-for-all':
      return new FreeForAllTournament(options);

    default:
      // TypeScript should ensure this never happens
      const exhaustiveCheck: never = options;
      throw new Error(`Unknown tournament type: ${(exhaustiveCheck as any).type}`);
  }
}

/**
 * Restore a tournament from saved state
 */
export function restoreTournament(state: TournamentState): BaseTournament {
  let tournament: BaseTournament;

  switch (state.type) {
    case 'single-elimination': {
      tournament = new SingleEliminationTournament(state.options, state.id);
      tournament.import(state);
      break;
    }

    case 'double-elimination': {
      tournament = new DoubleEliminationTournament(state.options, state.id);
      tournament.import(state);
      break;
    }

    case 'round-robin': {
      tournament = new RoundRobinTournament(state.options, state.id);
      tournament.import(state);
      break;
    }

    case 'swiss': {
      tournament = new SwissTournament(state.options, state.id);
      tournament.import(state);
      break;
    }

    case 'free-for-all': {
      tournament = new FreeForAllTournament(state.options, state.id);
      tournament.import(state);
      break;
    }

    default: {
      // TypeScript should ensure this never happens
      const exhaustiveCheck: never = state;
      throw new Error(`Unknown tournament type: ${(exhaustiveCheck as any).type}`);
    }
  }

  return tournament;
}

/**
 * Get default options for a tournament type
 */
export function getDefaultOptions(type: TournamentType): Partial<TournamentOptions> {
  const base = {
    name: 'New Tournament',
    participantNames: [],
    matchType: 'head-to-head' as const,
    playersPerMatch: 2,
  };

  switch (type) {
    case 'single-elimination':
      return {
        ...base,
        type,
        thirdPlaceMatch: false,
        tieBreakers: true,
        advancementRule: 'winner-only',
      };

    case 'double-elimination':
      return {
        ...base,
        type,
        splitStart: false,
        tieBreakers: true,
      };

    case 'round-robin':
      return {
        ...base,
        type,
        rankingMethod: 'wins',
        rounds: 1,
        pointsSystem: undefined, // Set dynamically when matchType is multi-player
      };

    case 'swiss':
      return {
        ...base,
        type,
        pointsPerMatchWin: 3,
        pointsPerMatchTie: 1,
        pointsPerGameWin: 1,
        pointsPerGameTie: 0,
        pointsPerBye: 3,
        pointsSystem: undefined, // Set dynamically when matchType is multi-player
        matchPointsFormula: 'proportional',
      };

    case 'free-for-all':
      return {
        ...base,
        type,
        participantsPerMatch: 4,
        advancementRule: 'winner-only',
        pointsSystem: undefined, // Optional
      };

    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unknown tournament type: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Validate tournament options
 */
export function validateOptions(options: Partial<TournamentOptions>): string[] {
  const errors: string[] = [];

  if (!options.name || options.name.trim() === '') {
    errors.push('Tournament name is required');
  }

  if (!options.participantNames || options.participantNames.length < 2) {
    errors.push('At least 2 participants are required');
  }

  // Check for duplicate participant names
  if (options.participantNames) {
    const uniqueNames = new Set(options.participantNames.map((n) => n.trim().toLowerCase()));
    if (uniqueNames.size !== options.participantNames.length) {
      errors.push('Participant names must be unique');
    }
  }

  // Multi-player options validation
  const matchType = (options as any).matchType;
  const playersPerMatch = (options as any).playersPerMatch;

  if (matchType === 'multi-player') {
    if (!playersPerMatch || playersPerMatch < 2) {
      errors.push('Players per match must be at least 2 for multi-player matches');
    }

    if (playersPerMatch && options.participantNames && playersPerMatch > options.participantNames.length) {
      errors.push('Players per match cannot exceed total participant count');
    }

    // Validate points system if provided
    const pointsSystem = (options as any).pointsSystem;
    if (pointsSystem) {
      try {
        validatePointsSystem(pointsSystem);
      } catch (err) {
        errors.push((err as Error).message);
      }
    }
  }

  // Type-specific validation
  if (options.type === 'free-for-all') {
    const ffa = options as Partial<typeof options & {
      participantsPerMatch: number;
      advancementRule?: 'winner-only' | 'top-n';
      advancementCount?: number;
    }>;

    if (
      ffa.participantsPerMatch &&
      (ffa.participantsPerMatch < 2 || ffa.participantsPerMatch > (options.participantNames?.length || 0))
    ) {
      errors.push(
        `Participants per match must be between 2 and ${options.participantNames?.length || 0}`
      );
    }

    // Validate advancement options
    if (ffa.advancementRule === 'top-n') {
      if (!ffa.advancementCount || ffa.advancementCount < 1) {
        errors.push('Advancement count must be at least 1 when using top-n advancement');
      }

      if (ffa.advancementCount && ffa.participantsPerMatch && ffa.advancementCount >= ffa.participantsPerMatch) {
        errors.push('Advancement count must be less than participants per match');
      }
    }
  }

  if (options.type === 'swiss') {
    const swiss = options as Partial<
      typeof options & {
        pointsPerMatchWin: number;
        pointsPerMatchTie: number;
        pointsPerGameWin: number;
        pointsPerGameTie: number;
        pointsPerBye: number;
      }
    >;

    if (swiss.pointsPerMatchWin !== undefined && swiss.pointsPerMatchWin < 0) {
      errors.push('Points per match win must be non-negative');
    }

    if (swiss.pointsPerMatchTie !== undefined && swiss.pointsPerMatchTie < 0) {
      errors.push('Points per match tie must be non-negative');
    }

    if (swiss.pointsPerGameWin !== undefined && swiss.pointsPerGameWin < 0) {
      errors.push('Points per game win must be non-negative');
    }

    if (swiss.pointsPerGameTie !== undefined && swiss.pointsPerGameTie < 0) {
      errors.push('Points per game tie must be non-negative');
    }

    if (swiss.pointsPerBye !== undefined && swiss.pointsPerBye < 0) {
      errors.push('Points per bye must be non-negative');
    }
  }

  if (options.type === 'round-robin') {
    const rr = options as Partial<typeof options & { rounds: number }>;
    if (rr.rounds && (rr.rounds < 1 || rr.rounds > 3)) {
      errors.push('Rounds must be between 1 and 3');
    }

    // For multi-player round robin with wins-based ranking, require points system
    if (matchType === 'multi-player' && playersPerMatch && playersPerMatch > 2) {
      const rankingMethod = (options as any).rankingMethod;
      if (rankingMethod === 'points' && !(options as any).pointsSystem) {
        errors.push('Points system is required for multi-player round robin with points ranking');
      }
    }
  }

  return errors;
}
