/**
 * Double Elimination Tournament
 * Participants are eliminated after losing two matches
 * Winners bracket and losers bracket structure
 */

import { BaseTournament } from '../BaseTournament';
import type {
  DoubleEliminationOptions,
  DoubleEliminationState,
  Match,
  Standing,
  MatchResult,
} from '../types';

export class DoubleEliminationTournament extends BaseTournament<
  DoubleEliminationOptions,
  DoubleEliminationState
> {
  private winnersBracket: Match[] = [];
  private losersBracket: Match[] = [];
  private grandFinal?: Match;
  private grandFinalReset?: Match; // If needed (loser bracket winner wins first grand final)
  private readonly options: DoubleEliminationOptions;
  private participantLosses: Map<string, number> = new Map();

  constructor(options: DoubleEliminationOptions, id?: string) {
    super(options, id);
    this.options = options;
  }

  public start(): void {
    if (this.started) {
      throw new Error('Tournament already started');
    }

    this.validateParticipants(2);

    // Initialize loss tracking
    this.participants.forEach((p) => {
      this.participantLosses.set(p.id, 0);
    });

    // Generate brackets
    this.generateBrackets();

    this.started = true;
    this.touch();
  }

  private generateBrackets(): void {
    const participantCount = this.participants.length;
    let winnersParticipants = [...this.participants];
    let losersParticipants: typeof this.participants = [];

    // Handle split start option
    if (this.options.splitStart && participantCount >= 4) {
      const splitIndex = Math.floor(participantCount / 2);
      losersParticipants = winnersParticipants.splice(splitIndex);

      // Mark losers bracket starters with one loss
      losersParticipants.forEach((p) => {
        this.participantLosses.set(p.id, 1);
      });
    }

    // Generate winners bracket (like single elimination)
    this.generateWinnersBracket(winnersParticipants);

    // Generate initial losers bracket if split start
    if (losersParticipants.length > 0) {
      this.generateInitialLosersBracket(losersParticipants);
    }
  }

  private generateWinnersBracket(participants: typeof this.participants): void {
    const participantCount = participants.length;
    const rounds = Math.ceil(Math.log2(participantCount));
    const totalMatches = Math.pow(2, rounds) - 1;

    // Create matches
    for (let i = 0; i < totalMatches; i++) {
      this.winnersBracket.push({
        id: this.generateId(),
        status: 'pending',
        participantIds: [],
        matchNumber: i + 1,
      });
    }

    // Seed first round
    const firstRoundMatches = Math.ceil(participantCount / 2);
    const byes = Math.pow(2, rounds) - participantCount;

    const seededParticipants = [...participants].sort(
      (a, b) => (a.seed || 0) - (b.seed || 0)
    );

    const byeParticipants = seededParticipants.slice(0, byes);
    const playingParticipants = seededParticipants.slice(byes);

    // Create first round matches
    for (let i = 0; i < playingParticipants.length / 2; i++) {
      const participant1 = playingParticipants[i];
      const participant2 = playingParticipants[playingParticipants.length - 1 - i];

      if (participant1 && participant2) {
        this.winnersBracket[i].participantIds = [participant1.id, participant2.id];
      }
    }

    // Handle byes
    const secondRoundStart = firstRoundMatches;
    byeParticipants.forEach((p, index) => {
      const matchIndex = secondRoundStart + Math.floor(index / 2);
      if (this.winnersBracket[matchIndex]) {
        this.winnersBracket[matchIndex].participantIds.push(p.id);
      }
    });

    // Assign rounds
    this.assignRoundsToMatches(this.winnersBracket);
  }

  private generateInitialLosersBracket(participants: typeof this.participants): void {
    // Create first round of losers bracket
    for (let i = 0; i < Math.floor(participants.length / 2); i++) {
      const match = this.createMatch(
        [participants[i * 2].id, participants[i * 2 + 1]?.id].filter(Boolean),
        1
      );
      this.losersBracket.push(match);
    }

    // Handle odd participant
    if (participants.length % 2 === 1) {
      const lastParticipant = participants[participants.length - 1];
      const match = this.createMatch([lastParticipant.id], 1);
      match.status = 'completed';
      match.result = { winnerId: lastParticipant.id };
      this.losersBracket.push(match);
    }
  }

  private assignRoundsToMatches(bracket: Match[]): void {
    const totalMatches = bracket.length;
    let matchesAssigned = 0;
    let round = 1;

    while (matchesAssigned < totalMatches) {
      const matchesInRound = Math.pow(2, Math.ceil(Math.log2(totalMatches + 1)) - round);

      for (let i = 0; i < matchesInRound && matchesAssigned < totalMatches; i++) {
        bracket[matchesAssigned].round = round;
        matchesAssigned++;
      }

      round++;
    }
  }

  public getCurrentMatches(): Match[] {
    if (!this.started) return [];

    const currentMatches: Match[] = [];

    // Winners bracket matches
    currentMatches.push(
      ...this.winnersBracket.filter(
        (m) => m.participantIds.length === 2 && m.status !== 'completed'
      )
    );

    // Losers bracket matches
    currentMatches.push(
      ...this.losersBracket.filter(
        (m) => m.participantIds.length === 2 && m.status !== 'completed'
      )
    );

    // Grand final
    if (this.grandFinal && this.grandFinal.status !== 'completed') {
      if (this.grandFinal.participantIds.length === 2) {
        currentMatches.push(this.grandFinal);
      }
    }

    // Grand final reset
    if (this.grandFinalReset && this.grandFinalReset.status !== 'completed') {
      if (this.grandFinalReset.participantIds.length === 2) {
        currentMatches.push(this.grandFinalReset);
      }
    }

    return currentMatches;
  }

  public recordMatchResult(matchId: string, result: MatchResult): void {
    if (!this.started) {
      throw new Error('Tournament not started');
    }

    if (!result.winnerId) {
      if (this.options.tieBreakers) {
        throw new Error('Tie breakers are enabled - match cannot end in a tie');
      } else {
        throw new Error('Double elimination requires a winner for each match');
      }
    }

    // Find the match
    let match: Match | undefined;
    let isWinnersBracket = false;
    let isLosersBracket = false;
    let isGrandFinal = false;
    let isGrandFinalReset = false;

    const wbIndex = this.winnersBracket.findIndex((m) => m.id === matchId);
    if (wbIndex >= 0) {
      match = this.winnersBracket[wbIndex];
      isWinnersBracket = true;
    } else {
      const lbIndex = this.losersBracket.findIndex((m) => m.id === matchId);
      if (lbIndex >= 0) {
        match = this.losersBracket[lbIndex];
        isLosersBracket = true;
      } else if (this.grandFinal?.id === matchId) {
        match = this.grandFinal;
        isGrandFinal = true;
      } else if (this.grandFinalReset?.id === matchId) {
        match = this.grandFinalReset;
        isGrandFinalReset = true;
      }
    }

    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    // Record result
    match.result = result;
    match.status = 'completed';

    const winnerId = result.winnerId;
    const loserId = match.participantIds.find((id) => id !== winnerId)!;

    // Update loss count
    const currentLosses = this.participantLosses.get(loserId) || 0;
    this.participantLosses.set(loserId, currentLosses + 1);

    // Handle advancement based on bracket
    if (isWinnersBracket) {
      this.handleWinnersBracketResult(wbIndex, winnerId, loserId);
    } else if (isLosersBracket) {
      this.handleLosersBracketResult(winnerId, loserId);
    } else if (isGrandFinal) {
      this.handleGrandFinalResult(winnerId, loserId);
    } else if (isGrandFinalReset) {
      this.completed = true;
    }

    this.touch();
  }

  private handleWinnersBracketResult(
    matchIndex: number,
    winnerId: string,
    loserId: string
  ): void {
    const totalMatches = this.winnersBracket.length;

    // Check if this is winners bracket final
    if (matchIndex === totalMatches - 1) {
      // Winner goes to grand final
      this.createGrandFinalIfNeeded();
      if (this.grandFinal && !this.grandFinal.participantIds.includes(winnerId)) {
        this.grandFinal.participantIds.push(winnerId);
      }

      // Loser goes to losers bracket final
      this.addToLosersBracketFinal(loserId);
    } else {
      // Advance winner in winners bracket
      const nextMatchIndex = totalMatches - Math.floor((totalMatches - matchIndex) / 2);
      if (nextMatchIndex < totalMatches) {
        const nextMatch = this.winnersBracket[nextMatchIndex];
        if (!nextMatch.participantIds.includes(winnerId)) {
          nextMatch.participantIds.push(winnerId);
        }
      }

      // Send loser to losers bracket
      this.addToLosersBracket(loserId);
    }
  }

  private handleLosersBracketResult(winnerId: string, loserId: string): void {
    // Loser is eliminated (2 losses)
    // Winner continues in losers bracket or goes to grand final

    // Check if we need to create more losers bracket rounds
    const uncompletedLosersMatches = this.losersBracket.filter(
      (m) => m.status !== 'completed'
    );

    if (uncompletedLosersMatches.length === 0) {
      // This was the losers bracket final
      this.createGrandFinalIfNeeded();
      if (this.grandFinal && !this.grandFinal.participantIds.includes(winnerId)) {
        this.grandFinal.participantIds.push(winnerId);
      }
    } else {
      // Add winner to next losers bracket match
      this.addToLosersBracket(winnerId);
    }
  }

  private handleGrandFinalResult(winnerId: string, loserId: string): void {
    // Check if winner came from losers bracket
    const winnerLosses = this.participantLosses.get(winnerId) || 0;

    if (winnerLosses === 1) {
      // Winner from losers bracket won - need bracket reset
      // Both players now have 1 loss, play one more match
      this.grandFinalReset = {
        id: this.generateId(),
        status: 'pending',
        participantIds: [winnerId, loserId],
        matchNumber: (this.grandFinal?.matchNumber || 0) + 1,
      };
    } else {
      // Winner from winners bracket won - tournament complete
      this.completed = true;
    }
  }

  private addToLosersBracket(participantId: string): void {
    // Find the next available losers bracket match that needs participants
    const nextMatch = this.losersBracket.find(
      (m) => m.participantIds.length < 2 && m.status === 'pending'
    );

    if (nextMatch) {
      nextMatch.participantIds.push(participantId);
    } else {
      // Create new losers bracket match
      const newMatch = this.createMatch([participantId]);
      this.losersBracket.push(newMatch);
    }
  }

  private addToLosersBracketFinal(participantId: string): void {
    // Add to the final match of losers bracket before grand final
    const lastMatch = this.losersBracket[this.losersBracket.length - 1];

    if (lastMatch && lastMatch.status === 'pending' && lastMatch.participantIds.length < 2) {
      lastMatch.participantIds.push(participantId);
    } else {
      const finalMatch = this.createMatch([participantId]);
      this.losersBracket.push(finalMatch);
    }
  }

  private createGrandFinalIfNeeded(): void {
    if (!this.grandFinal) {
      this.grandFinal = {
        id: this.generateId(),
        status: 'pending',
        participantIds: [],
        matchNumber: this.winnersBracket.length + this.losersBracket.length + 1,
      };
    }
  }

  public getStandings(): Standing[] {
    const standings: Standing[] = [];

    this.participants.forEach((participant) => {
      const allMatches = [
        ...this.winnersBracket,
        ...this.losersBracket,
        ...(this.grandFinal ? [this.grandFinal] : []),
        ...(this.grandFinalReset ? [this.grandFinalReset] : []),
      ];

      const participantMatches = allMatches.filter((m) =>
        m.participantIds.includes(participant.id)
      );

      const completed = participantMatches.filter((m) => m.status === 'completed');
      const wins = completed.filter((m) => m.result?.winnerId === participant.id).length;
      const losses = this.participantLosses.get(participant.id) || 0;
      const isEliminated = losses >= 2;

      let rank = 0;

      // Determine rank
      if (this.completed) {
        if (this.grandFinalReset?.status === 'completed') {
          if (this.grandFinalReset.result?.winnerId === participant.id) {
            rank = 1;
          } else if (this.grandFinalReset.participantIds.includes(participant.id)) {
            rank = 2;
          }
        } else if (this.grandFinal?.status === 'completed') {
          if (this.grandFinal.result?.winnerId === participant.id) {
            rank = 1;
          } else if (this.grandFinal.participantIds.includes(participant.id)) {
            rank = 2;
          }
        }
      }

      standings.push({
        participantId: participant.id,
        participantName: participant.name,
        rank,
        wins,
        losses,
        ties: 0,
        matchesPlayed: completed.length,
        isEliminated,
      });
    });

    // Sort standings
    standings.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.participantName.localeCompare(b.participantName);
    });

    return standings;
  }

  public exportState(): DoubleEliminationState {
    return {
      version: '1.0.0',
      id: this.id,
      name: this.name,
      type: 'double-elimination',
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      started: this.started,
      completed: this.completed,
      participants: this.participants,
      options: this.options,
      winnersBracket: this.winnersBracket,
      losersBracket: this.losersBracket,
      grandFinal: this.grandFinal,
      grandFinalReset: this.grandFinalReset,
    };
  }

  public importState(state: DoubleEliminationState): void {
    this.id = state.id;
    this.name = state.name;
    this.started = state.started;
    this.completed = state.completed;
    this.participants = state.participants;
    this.winnersBracket = state.winnersBracket;
    this.losersBracket = state.losersBracket;
    this.grandFinal = state.grandFinal;
    this.grandFinalReset = state.grandFinalReset;
    this.createdAt = new Date(state.createdAt);
    this.updatedAt = new Date(state.updatedAt);

    // Rebuild loss tracking
    this.participantLosses = new Map();
    this.participants.forEach((p) => {
      let losses = 0;

      const allMatches = [
        ...this.winnersBracket,
        ...this.losersBracket,
        ...(this.grandFinal ? [this.grandFinal] : []),
        ...(this.grandFinalReset ? [this.grandFinalReset] : []),
      ];

      allMatches.forEach((match) => {
        if (
          match.status === 'completed' &&
          match.result?.winnerId &&
          match.participantIds.includes(p.id) &&
          match.result.winnerId !== p.id
        ) {
          losses++;
        }
      });

      this.participantLosses.set(p.id, losses);
    });
  }

  // Public methods for UI
  public getWinnersBracket(): Match[] {
    return [...this.winnersBracket];
  }

  public getLosersBracket(): Match[] {
    return [...this.losersBracket];
  }

  public getGrandFinal(): Match | undefined {
    return this.grandFinal;
  }

  public getGrandFinalReset(): Match | undefined {
    return this.grandFinalReset;
  }

  public reset(): void {
    // Clear all match results and regenerate brackets
    this.winnersBracket = [];
    this.losersBracket = [];
    this.grandFinal = undefined;
    this.grandFinalReset = undefined;
    this.completed = false;

    // Reset loss tracking
    this.participantLosses = new Map();
    this.participants.forEach((p) => {
      this.participantLosses.set(p.id, 0);
    });

    // Regenerate the initial bracket structure
    this.generateBrackets();

    this.touch();
  }
}
