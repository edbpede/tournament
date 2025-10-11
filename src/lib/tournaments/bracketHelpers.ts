/**
 * Helper functions for organizing bracket data for visualization
 */

import type { Match } from './types';

export interface BracketRound {
  round: number;
  matches: Match[];
}

export interface MatchPosition {
  match: Match;
  x: number; // Column position (round)
  y: number; // Vertical position
  height: number; // Height of this match's subtree
}

export interface BracketLayout {
  rounds: BracketRound[];
  positions: Map<string, MatchPosition>; // matchId -> position
  matchHeight: number; // Base height of a single match card
  roundWidth: number; // Width of each round column
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

/**
 * Calculate proper tree-based layout positions for bracket matches
 * This ensures child matches align properly with their parent matches
 */
export function calculateBracketLayout(
  matches: Match[],
  matchHeight: number = 120,
  matchGap: number = 16,
  roundWidth: number = 240
): BracketLayout {
  const rounds = organizeBracketByRounds(matches);
  const positions = new Map<string, MatchPosition>();

  if (rounds.length === 0) {
    return { rounds, positions, matchHeight, roundWidth };
  }

  // Build parent-child relationships
  const childrenMap = new Map<string, string[]>(); // parentId -> childIds[]
  const parentMap = new Map<string, string>(); // childId -> parentId

  // For each round (except the last), determine which matches feed into next round
  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
    const currentRound = rounds[roundIndex];
    const nextRound = rounds[roundIndex + 1];

    // In a standard bracket, every 2 matches in current round feed into 1 match in next round
    currentRound.matches.forEach((match, matchIndex) => {
      const parentIndex = Math.floor(matchIndex / 2);
      if (parentIndex < nextRound.matches.length) {
        const parentMatch = nextRound.matches[parentIndex];

        if (!childrenMap.has(parentMatch.id)) {
          childrenMap.set(parentMatch.id, []);
        }
        childrenMap.get(parentMatch.id)!.push(match.id);
        parentMap.set(match.id, parentMatch.id);
      }
    });
  }

  // Calculate positions starting from the first round (leftmost)
  // Each match's Y position is determined by its children's positions
  let currentY = 0;

  // First round: position matches sequentially
  const firstRound = rounds[0];
  firstRound.matches.forEach((match, index) => {
    positions.set(match.id, {
      match,
      x: 0,
      y: currentY,
      height: matchHeight,
    });
    currentY += matchHeight + matchGap;
  });

  // Subsequent rounds: position matches centered between their children
  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];

    round.matches.forEach((match) => {
      const children = childrenMap.get(match.id) || [];

      if (children.length === 0) {
        // No children yet (waiting for matches to complete)
        // Position at the top for now
        positions.set(match.id, {
          match,
          x: roundIndex,
          y: 0,
          height: matchHeight,
        });
      } else if (children.length === 1) {
        // Only one child (odd number of matches or bye)
        const childPos = positions.get(children[0]);
        if (childPos) {
          positions.set(match.id, {
            match,
            x: roundIndex,
            y: childPos.y,
            height: matchHeight,
          });
        }
      } else {
        // Multiple children: center between first and last child
        const childPositions = children
          .map(childId => positions.get(childId))
          .filter((pos): pos is MatchPosition => pos !== undefined);

        if (childPositions.length > 0) {
          const firstChildY = childPositions[0].y;
          const lastChildY = childPositions[childPositions.length - 1].y;
          const centerY = (firstChildY + lastChildY + matchHeight) / 2 - matchHeight / 2;

          positions.set(match.id, {
            match,
            x: roundIndex,
            y: centerY,
            height: matchHeight,
          });
        }
      }
    });
  }

  return { rounds, positions, matchHeight, roundWidth };
}

/**
 * Get connector line coordinates for a match to its parent
 */
export interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function getConnectorLines(
  matchId: string,
  positions: Map<string, MatchPosition>,
  roundWidth: number,
  matchHeight: number
): ConnectorLine[] {
  const matchPos = positions.get(matchId);
  if (!matchPos) return [];

  // Find parent match (next round, same or adjacent index)
  const parentMatch = Array.from(positions.values()).find(
    pos => pos.x === matchPos.x + 1 &&
           Math.abs(pos.y - matchPos.y) <= matchHeight * 2
  );

  if (!parentMatch) return [];

  const lines: ConnectorLine[] = [];
  const gap = 16; // Gap between rounds

  // Horizontal line from match to midpoint
  const startX = 0;
  const startY = matchHeight / 2;
  const midX = roundWidth + gap / 2;

  lines.push({
    x1: startX,
    y1: startY,
    x2: midX,
    y2: startY,
  });

  // Vertical line to parent's Y level (if needed)
  const parentY = parentMatch.y - matchPos.y + matchHeight / 2;
  if (Math.abs(startY - parentY) > 1) {
    lines.push({
      x1: midX,
      y1: startY,
      x2: midX,
      y2: parentY,
    });
  }

  // Horizontal line to parent
  lines.push({
    x1: midX,
    y1: parentY,
    x2: roundWidth + gap,
    y2: parentY,
  });

  return lines;
}

