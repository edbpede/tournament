/**
 * Single Elimination Tournament
 * Loser of each match is eliminated from the tournament
 */

import { BaseTournament } from '../BaseTournament';
import type {
  SingleEliminationOptions,
  SingleEliminationState,
  Match,
  Standing,
  MatchResult,
  Participant,
} from '../types';

export class SingleEliminationTournament extends BaseTournament<
  SingleEliminationOptions,
  SingleEliminationState
> {
  private bracket: Match[] = [];
  private thirdPlaceMatch?: Match;
  private readonly options: SingleEliminationOptions;

  constructor(options: SingleEliminationOptions, id?: string) {
    super(options, id);
    this.options = options;
  }

  public start(): void {
    if (this.started) {
      throw new Error('Tournament already started');
    }

    this.validateParticipants(2);

    // Generate bracket
    this.generateBracket();

    this.started = true;
    this.touch();
  }

  private generateBracket(): void {
    // Calculate the number of rounds needed
    const participantCount = this.participants.length;
    const rounds = Math.ceil(Math.log2(participantCount));

    // Calculate matches needed in first round
    const firstRoundMatches = Math.ceil(participantCount / 2);

    // If not a power of 2, some participants get byes
    const byes = Math.pow(2, rounds) - participantCount;

    // Create all matches for the bracket
    const totalMatches = Math.pow(2, rounds) - 1;
    this.bracket = [];

    for (let i = 0; i < totalMatches; i++) {
      this.bracket.push({
        id: this.generateId(),
        status: 'pending',
        participantIds: [],
        matchNumber: i + 1,
      });
    }

    // Assign participants to first round matches
    this.seedBracket(firstRoundMatches, byes);

    // Calculate rounds for each match
    this.assignRounds();
  }

  private seedBracket(firstRoundMatches: number, byes: number): void {
    const seededParticipants = [...this.participants].sort((a, b) => {
      return (a.seed || 0) - (b.seed || 0);
    });

    // Pair participants for first round (standard bracket seeding)
    let participantIndex = 0;

    // Participants with byes advance automatically to round 2
    const byeParticipants = seededParticipants.slice(0, byes);

    // Remaining participants play in round 1
    const playingParticipants = seededParticipants.slice(byes);

    // Create first round matches
    for (let i = 0; i < firstRoundMatches; i++) {
      if (i < playingParticipants.length / 2) {
        // Standard seeding: 1 vs last, 2 vs second-last, etc.
        const participant1 = playingParticipants[i];
        const participant2 = playingParticipants[playingParticipants.length - 1 - i];

        if (participant1 && participant2) {
          this.bracket[i].participantIds = [participant1.id, participant2.id];
        }
      }
    }

    // Add bye participants to second round matches
    const secondRoundStart = firstRoundMatches;
    byeParticipants.forEach((p, index) => {
      const matchIndex = secondRoundStart + Math.floor(index / 2);
      if (this.bracket[matchIndex]) {
        this.bracket[matchIndex].participantIds.push(p.id);
      }
    });
  }

  private assignRounds(): void {
    const totalMatches = this.bracket.length;
    let matchesAssigned = 0;
    let round = 1;

    while (matchesAssigned < totalMatches) {
      const matchesInRound = Math.pow(2, Math.ceil(Math.log2(totalMatches + 1)) - round);

      for (let i = 0; i < matchesInRound && matchesAssigned < totalMatches; i++) {
        this.bracket[matchesAssigned].round = round;
        matchesAssigned++;
      }

      round++;
    }
  }

  public getCurrentMatches(): Match[] {
    if (!this.started) return [];

    // Return all matches that have 2 participants and are not completed
    const currentMatches = this.bracket.filter(
      (match) => match.participantIds.length === 2 && match.status !== 'completed'
    );

    // Include third place match if it exists and is not completed
    if (this.thirdPlaceMatch && this.thirdPlaceMatch.status !== 'completed') {
      if (this.thirdPlaceMatch.participantIds.length === 2) {
        currentMatches.push(this.thirdPlaceMatch);
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
        throw new Error('Single elimination requires a winner for each match');
      }
    }

    // Find the match
    const matchIndex = this.bracket.findIndex((m) => m.id === matchId);
    let match: Match;

    if (matchIndex >= 0) {
      match = this.bracket[matchIndex];
    } else if (this.thirdPlaceMatch && this.thirdPlaceMatch.id === matchId) {
      match = this.thirdPlaceMatch;
    } else {
      throw new Error(`Match with id ${matchId} not found`);
    }

    // Validate match can be played
    if (match.participantIds.length !== 2) {
      throw new Error('Match does not have 2 participants');
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    if (!match.participantIds.includes(result.winnerId)) {
      throw new Error('Winner ID does not match a participant in this match');
    }

    // Record result
    match.result = result;
    match.status = 'completed';

    // Advance winner to next round (if not final)
    if (matchIndex >= 0) {
      this.advanceWinner(matchIndex, result.winnerId);
    }

    // Check if tournament is complete
    this.checkCompletion();

    this.touch();
  }

  private advanceWinner(matchIndex: number, winnerId: string): void {
    const totalMatches = this.bracket.length;

    // Calculate next match index
    const nextMatchIndex = totalMatches - Math.floor((totalMatches - matchIndex) / 2);

    // If this is the final match, don't advance
    if (matchIndex === totalMatches - 1) {
      // Check if we need to create third place match
      if (this.options.thirdPlaceMatch && !this.thirdPlaceMatch) {
        const finalMatch = this.bracket[matchIndex];
        const loserId = finalMatch.participantIds.find((id) => id !== winnerId);

        if (loserId) {
          // Find the losers from the two semi-final matches
          const semiFinalMatches = this.bracket.filter(
            (m) => m.round === finalMatch.round! - 1 && m.status === 'completed'
          );

          if (semiFinalMatches.length === 2) {
            const semiFinalLosers = semiFinalMatches.map((m) => {
              const winner = m.result?.winnerId;
              return m.participantIds.find((id) => id !== winner);
            }).filter(Boolean) as string[];

            if (semiFinalLosers.length === 2) {
              this.thirdPlaceMatch = {
                id: this.generateId(),
                status: 'pending',
                participantIds: semiFinalLosers,
                matchNumber: totalMatches + 1,
                round: finalMatch.round,
              };
            }
          }
        }
      }
      return;
    }

    // Add winner to next match
    if (nextMatchIndex < totalMatches) {
      const nextMatch = this.bracket[nextMatchIndex];
      if (!nextMatch.participantIds.includes(winnerId)) {
        nextMatch.participantIds.push(winnerId);
      }
    }
  }

  private checkCompletion(): void {
    // Check if final match is complete
    const finalMatch = this.bracket[this.bracket.length - 1];

    if (finalMatch.status !== 'completed') {
      this.completed = false;
      return;
    }

    // If third place match is required, check if it's complete
    if (this.options.thirdPlaceMatch && this.thirdPlaceMatch) {
      this.completed = this.thirdPlaceMatch.status === 'completed';
    } else {
      this.completed = true;
    }
  }

  public getStandings(): Standing[] {
    const standings: Standing[] = [];

    this.participants.forEach((participant) => {
      const participantMatches = [
        ...this.bracket,
        ...(this.thirdPlaceMatch ? [this.thirdPlaceMatch] : []),
      ].filter((m) => m.participantIds.includes(participant.id));

      const completed = participantMatches.filter((m) => m.status === 'completed');
      const wins = completed.filter((m) => m.result?.winnerId === participant.id).length;
      const losses = completed.filter((m) => m.result?.winnerId && m.result.winnerId !== participant.id).length;

      const isEliminated = losses > 0;

      // Determine final rank
      let rank = 0;
      const finalMatch = this.bracket[this.bracket.length - 1];

      if (finalMatch.status === 'completed') {
        if (finalMatch.result?.winnerId === participant.id) {
          rank = 1; // Champion
        } else if (finalMatch.participantIds.includes(participant.id)) {
          rank = 2; // Runner-up
        }
      }

      if (this.thirdPlaceMatch?.status === 'completed') {
        if (this.thirdPlaceMatch.result?.winnerId === participant.id) {
          rank = 3;
        } else if (this.thirdPlaceMatch.participantIds.includes(participant.id) && rank === 0) {
          rank = 4;
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

    // Sort by rank (champions first), then by wins, then alphabetically
    standings.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.participantName.localeCompare(b.participantName);
    });

    return standings;
  }

  public exportState(): SingleEliminationState {
    return {
      version: '1.0.0',
      id: this.id,
      name: this.name,
      type: 'single-elimination',
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      started: this.started,
      completed: this.completed,
      participants: this.participants,
      options: this.options,
      bracket: this.bracket,
      thirdPlaceMatch: this.thirdPlaceMatch,
    };
  }

  public importState(state: SingleEliminationState): void {
    this.id = state.id;
    this.name = state.name;
    this.started = state.started;
    this.completed = state.completed;
    this.participants = state.participants;
    this.bracket = state.bracket;
    this.thirdPlaceMatch = state.thirdPlaceMatch;
    this.createdAt = new Date(state.createdAt);
    this.updatedAt = new Date(state.updatedAt);
  }

  // Public method to get bracket for UI display
  public getBracket(): Match[] {
    return [...this.bracket];
  }

  public getThirdPlaceMatch(): Match | undefined {
    return this.thirdPlaceMatch;
  }
}
