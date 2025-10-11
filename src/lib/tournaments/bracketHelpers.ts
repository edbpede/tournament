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
  height: number; // Actual calculated height for this match card
}

export interface BracketLayout {
  rounds: BracketRound[];
  positions: Map<string, MatchPosition>; // matchId -> position
  baseMatchHeight: number; // Base height for a match with 2 participants
  roundWidth: number; // Width of each round column
}

/**
 * Calculate the actual height needed for a match card based on its content
 * This ensures match cards can expand to fit all participants without overflow
 */
export function calculateMatchHeight(match: Match, baseHeight: number = 120): number {
  const participantCount = match.participantIds.length;

  // Base components that are always present:
  // - Match number header: ~24px
  // - Card padding (p-2 md:p-3): ~12-16px top + bottom = ~28px
  // - Space between participants (space-y-2): 8px per gap

  const HEADER_HEIGHT = 24; // Match number
  const CARD_PADDING = 28; // Top + bottom padding
  const PARTICIPANT_HEIGHT = 40; // Height per participant row (text + padding + rounded bg)
  const PARTICIPANT_GAP = 8; // Gap between participants

  if (participantCount === 0) {
    // "Waiting..." text
    return HEADER_HEIGHT + CARD_PADDING + 24; // ~76px
  }

  if (participantCount === 1) {
    // Single participant with BYE badge
    return HEADER_HEIGHT + CARD_PADDING + PARTICIPANT_HEIGHT; // ~92px
  }

  // Multiple participants: each gets a row with padding
  const participantsHeight = (participantCount * PARTICIPANT_HEIGHT) + ((participantCount - 1) * PARTICIPANT_GAP);
  const totalHeight = HEADER_HEIGHT + CARD_PADDING + participantsHeight;

  // Ensure minimum height for proper connector line alignment
  return Math.max(totalHeight, baseHeight);
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
 * and prevents any overlap by using dynamic height calculation
 */
export function calculateBracketLayout(
  matches: Match[],
  baseMatchHeight: number = 120,
  matchGap: number = 16,
  roundWidth: number = 240
): BracketLayout {
  const rounds = organizeBracketByRounds(matches);
  const positions = new Map<string, MatchPosition>();

  if (rounds.length === 0) {
    return { rounds, positions, baseMatchHeight, roundWidth };
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

  // Add top offset to account for sticky round headers (badge + padding)
  const TOP_OFFSET = 60; // Space for round header badge and padding

  // Calculate spacing that scales with bracket depth
  // This ensures proper spacing for all tournament sizes
  const numRounds = rounds.length;

  // Calculate the minimum vertical spacing needed
  // For a perfect binary tree, each level doubles the spacing
  // We use a formula that ensures no overlap: spacing = baseMatchHeight + gap * 2^(numRounds - 1)
  const baseSpacing = baseMatchHeight + matchGap;
  const scaleFactor = Math.pow(2, Math.max(0, numRounds - 2));
  const minSpacing = baseSpacing * scaleFactor;

  // For first round, calculate actual heights and position matches
  let currentY = TOP_OFFSET;
  const firstRound = rounds[0];

  firstRound.matches.forEach((match) => {
    const actualHeight = calculateMatchHeight(match, baseMatchHeight);

    positions.set(match.id, {
      match,
      x: 0,
      y: currentY,
      height: actualHeight,
    });
    currentY += minSpacing;
  });

  // Subsequent rounds: position matches centered between their children
  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];

    // Track the maximum Y position used in this round to prevent overlap
    let maxYInRound = TOP_OFFSET;

    round.matches.forEach((match) => {
      const children = childrenMap.get(match.id) || [];
      const actualHeight = calculateMatchHeight(match, baseMatchHeight);
      let matchY = TOP_OFFSET;

      if (children.length === 0) {
        // No children yet - position below any previously positioned matches in this round
        matchY = maxYInRound;
      } else if (children.length === 1) {
        // Only one child (odd number of matches or bye)
        const childPos = positions.get(children[0]);
        if (childPos) {
          // Align with the single child, but ensure no overlap with previous matches
          matchY = Math.max(childPos.y, maxYInRound);
        }
      } else {
        // Multiple children: center between first and last child
        const childPositions = children
          .map(childId => positions.get(childId))
          .filter((pos): pos is MatchPosition => pos !== undefined);

        if (childPositions.length > 0) {
          const firstChildY = childPositions[0].y;
          const lastChildY = childPositions[childPositions.length - 1].y;
          const lastChildHeight = childPositions[childPositions.length - 1].height;

          // Center this match between the top of first child and bottom of last child
          const centerY = (firstChildY + lastChildY + lastChildHeight) / 2 - actualHeight / 2;

          // Ensure no overlap with previous matches in this round
          matchY = Math.max(centerY, maxYInRound);
        }
      }

      positions.set(match.id, {
        match,
        x: roundIndex,
        y: matchY,
        height: actualHeight,
      });

      // Update the maximum Y position for this round (bottom of current match + gap)
      maxYInRound = matchY + actualHeight + matchGap;
    });
  }

  return { rounds, positions, baseMatchHeight, roundWidth };
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
  roundWidth: number
): ConnectorLine[] {
  const matchPos = positions.get(matchId);
  if (!matchPos) return [];

  // Find parent match (next round, same or adjacent index)
  const parentMatch = Array.from(positions.values()).find(
    pos => pos.x === matchPos.x + 1 &&
           Math.abs(pos.y - matchPos.y) <= matchPos.height * 2
  );

  if (!parentMatch) return [];

  const lines: ConnectorLine[] = [];
  const gap = 16; // Gap between rounds

  // Horizontal line from match to midpoint (use actual match height for centering)
  const startX = 0;
  const startY = matchPos.height / 2;
  const midX = roundWidth + gap / 2;

  lines.push({
    x1: startX,
    y1: startY,
    x2: midX,
    y2: startY,
  });

  // Vertical line to parent's Y level (if needed)
  // Use actual parent height for centering
  const parentY = parentMatch.y - matchPos.y + parentMatch.height / 2;
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

