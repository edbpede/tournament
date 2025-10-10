/**
 * Helper functions for organizing bracket data for visualization
 */

import type { Match } from './types';

export interface BracketRound {
  round: number;
  matches: Match[];
}

/**
 * Organize matches into rounds for bracket visualization
 */
export function organizeBracketByRounds(matches: Match[]): BracketRound[] {
  const roundsMap = new Map<number, Match[]>();

  matches.forEach((match) => {
    const round = match.round || 1;
    if (!roundsMap.has(round)) {
      roundsMap.set(round, []);
    }
    roundsMap.get(round)!.push(match);
  });

  const rounds: BracketRound[] = [];
  roundsMap.forEach((matches, round) => {
    rounds.push({
      round,
      matches: matches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0)),
    });
  });

  return rounds.sort((a, b) => a.round - b.round);
}

/**
 * Calculate the number of rounds in a single elimination bracket
 */
export function calculateRounds(participantCount: number): number {
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Get the parent match index for a given match in single elimination
 */
export function getParentMatchIndex(matchIndex: number, totalMatches: number): number | null {
  if (matchIndex === totalMatches - 1) {
    return null; // This is the final match
  }
  return totalMatches - Math.floor((totalMatches - matchIndex) / 2);
}

/**
 * Get round label for display
 */
export function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) {
    return 'Finals';
  }
  if (round === totalRounds - 1) {
    return 'Semifinals';
  }
  if (round === totalRounds - 2) {
    return 'Quarterfinals';
  }
  return `Round ${round}`;
}

