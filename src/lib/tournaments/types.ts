/**
 * Core types and interfaces for the tournament system
 */

// Tournament Types
export type TournamentType =
  | 'single-elimination'
  | 'double-elimination'
  | 'round-robin'
  | 'swiss'
  | 'free-for-all';

// Match Type
export type MatchType = 'head-to-head' | 'multi-player';

// Points System Types
export type PointsSystemType = 'f1' | 'mario-kart' | 'linear' | 'winner-takes-most' | 'custom';

export interface PointsSystemConfig {
  type: PointsSystemType;
  customPoints?: number[]; // For 'custom' type
}

// Participant
export interface Participant {
  id: string;
  name: string;
  seed?: number; // Optional seeding for bracket tournaments
  isNPC?: boolean; // Flag for AI/NPC participants (future use)
}

// Match Status
export type MatchStatus = 'pending' | 'in-progress' | 'completed';

// Base Match Interface
export interface BaseMatch {
  id: string;
  status: MatchStatus;
  round?: number; // For tournaments with rounds
  matchNumber?: number; // For display purposes
}

// Match Result (generic to support different tournament types)
export interface MatchResult {
  winnerId?: string; // undefined for ties
  loserId?: string;
  isTie?: boolean;
  score?: {
    [participantId: string]: number;
  };
  // For multi-participant matches (Free For All)
  rankings?: {
    participantId: string;
    position: number;
  }[];
}

// Complete Match with participants and result
export interface Match extends BaseMatch {
  participantIds: string[];
  result?: MatchResult;
}

// Standing/Ranking
export interface Standing {
  participantId: string;
  participantName: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  points?: number; // For point-based systems
  gamesWon?: number; // For Swiss system
  gamesLost?: number;
  matchesPlayed: number;
  isEliminated?: boolean; // For elimination tournaments
}

// Base Tournament Options
export interface BaseTournamentOptions {
  name: string;
  participantNames: string[];
  // Multi-player options
  matchType?: MatchType; // Default: 'head-to-head'
  playersPerMatch?: number; // Default: 2
}

// Single Elimination Options
export interface SingleEliminationOptions extends BaseTournamentOptions {
  type: 'single-elimination';
  thirdPlaceMatch: boolean;
  tieBreakers: boolean;
  // Multi-player options
  advancementRule?: 'winner-only'; // Only winner-only supported for single elimination
}

// Double Elimination Options
export interface DoubleEliminationOptions extends BaseTournamentOptions {
  type: 'double-elimination';
  splitStart: boolean; // Start with half in losers bracket
  tieBreakers: boolean;
}

// Round Robin Options
export interface RoundRobinOptions extends BaseTournamentOptions {
  type: 'round-robin';
  rankingMethod: 'wins' | 'points';
  rounds: 1 | 2 | 3; // How many times participants play each other
  // Multi-player options
  pointsSystem?: PointsSystemConfig; // For multi-player mode
}

// Swiss Options
export interface SwissOptions extends BaseTournamentOptions {
  type: 'swiss';
  pointsPerMatchWin: number;
  pointsPerMatchTie: number;
  pointsPerGameWin: number;
  pointsPerGameTie: number;
  pointsPerBye: number;
  numberOfRounds?: number; // Optional, can be calculated
  // Multi-player options
  pointsSystem?: PointsSystemConfig; // For multi-player match scoring
  matchPointsFormula?: 'winner-only' | 'proportional'; // How placement converts to match points
}

// Free For All Options
export interface FreeForAllOptions extends BaseTournamentOptions {
  type: 'free-for-all';
  participantsPerMatch: number;
  // Enhancement options
  advancementRule?: 'winner-only' | 'top-n'; // How many advance per match
  advancementCount?: number; // Required if advancementRule is 'top-n'
  pointsSystem?: PointsSystemConfig; // Optional points tracking
}

// Union of all tournament options
export type TournamentOptions =
  | SingleEliminationOptions
  | DoubleEliminationOptions
  | RoundRobinOptions
  | SwissOptions
  | FreeForAllOptions;

// Tournament State for persistence (discriminated union)
export interface BaseTournamentState {
  version: string;
  id: string;
  name: string;
  type: TournamentType;
  createdAt: string;
  updatedAt: string;
  started: boolean;
  completed: boolean;
  participants: Participant[];
}

export interface SingleEliminationState extends BaseTournamentState {
  type: 'single-elimination';
  options: SingleEliminationOptions;
  bracket: Match[];
  thirdPlaceMatch?: Match;
}

export interface DoubleEliminationState extends BaseTournamentState {
  type: 'double-elimination';
  options: DoubleEliminationOptions;
  winnersBracket: Match[];
  losersBracket: Match[];
  grandFinal?: Match;
  grandFinalReset?: Match; // If loser of first grand final wins
}

export interface RoundRobinState extends BaseTournamentState {
  type: 'round-robin';
  options: RoundRobinOptions;
  matches: Match[];
  currentRound: number;
}

export interface SwissState extends BaseTournamentState {
  type: 'swiss';
  options: SwissOptions;
  rounds: Match[][]; // Array of rounds, each containing matches
  currentRound: number;
  participantScores: {
    [participantId: string]: {
      matchPoints: number;
      gamePoints: number;
      opponentIds: string[]; // Track who they've played
    };
  };
}

export interface FreeForAllState extends BaseTournamentState {
  type: 'free-for-all';
  options: FreeForAllOptions;
  rounds: Match[][]; // Array of rounds
  currentRound: number;
  eliminatedParticipants: string[];
}

// Union type for all tournament states
export type TournamentState =
  | SingleEliminationState
  | DoubleEliminationState
  | RoundRobinState
  | SwissState
  | FreeForAllState;

// Export data format (includes additional metadata)
export interface TournamentExport {
  exportVersion: string;
  exportDate: string;
  state: TournamentState;
}
