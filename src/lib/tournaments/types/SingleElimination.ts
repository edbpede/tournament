/**
 * Single Elimination Tournament
 * Loser of each match is eliminated from the tournament
 * Supports both head-to-head (1v1) and multi-player matches (winner-takes-all)
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
    const isMultiPlayer = this.options.matchType === 'multi-player';
    const playersPerMatch = this.options.playersPerMatch || 2;

    if (!isMultiPlayer || playersPerMatch === 2) {
      // Standard head-to-head bracket
      this.generateHeadToHeadBracket();
    } else {
      // Multi-player bracket
      this.generateMultiPlayerBracket(playersPerMatch);
    }
  }

  private generateHeadToHeadBracket(): void {
    // Calculate the number of rounds needed
    const participantCount = this.participants.length;
    const rounds = Math.ceil(Math.log2(participantCount));

    // If not a power of 2, some participants get byes
    const bracketSize = Math.pow(2, rounds);
    const byes = bracketSize - participantCount;

    // Calculate actual matches needed in first round
    // Only participants without byes play in round 1
    const playingInRound1 = participantCount - byes;
    const firstRoundMatches = playingInRound1 / 2;

    // Build bracket structure from bottom up (round by round)
    this.bracket = [];

    // Round 1: Matches for participants without byes
    for (let i = 0; i < firstRoundMatches; i++) {
      this.bracket.push({
        id: this.generateId(),
        status: 'pending',
        participantIds: [],
        matchNumber: this.bracket.length + 1,
        round: 1,
      });
    }

    // Subsequent rounds: Build up to the final
    let matchesInPreviousRound = firstRoundMatches;
    let currentRound = 2;

    // Add matches for each subsequent round
    while (matchesInPreviousRound > 0 || currentRound === 2) {
      // In round 2, we need to account for bye participants
      let matchesInThisRound: number;

      if (currentRound === 2) {
        // Round 2 has winners from round 1 + bye participants
        const winnersFromRound1 = firstRoundMatches;
        const totalInRound2 = winnersFromRound1 + byes;
        matchesInThisRound = totalInRound2 / 2;
      } else {
        // Subsequent rounds: half the matches from previous round
        matchesInThisRound = matchesInPreviousRound / 2;
      }

      for (let i = 0; i < matchesInThisRound; i++) {
        this.bracket.push({
          id: this.generateId(),
          status: 'pending',
          participantIds: [],
          matchNumber: this.bracket.length + 1,
          round: currentRound,
        });
      }

      matchesInPreviousRound = matchesInThisRound;
      currentRound++;

      // Stop when we've created the final match
      if (matchesInThisRound === 1) {
        break;
      }
    }

    // Assign participants to matches
    this.seedBracket(firstRoundMatches, byes);
  }

  private generateMultiPlayerBracket(playersPerMatch: number): void {
    // For multi-player, calculate bracket size based on playersPerMatch
    const participantCount = this.participants.length;

    // Calculate how many rounds we need
    // Each match eliminates (playersPerMatch - 1) participants
    let remainingParticipants = participantCount;
    let rounds = 0;
    while (remainingParticipants > 1) {
      rounds++;
      const matchesInRound = Math.ceil(remainingParticipants / playersPerMatch);
      remainingParticipants = matchesInRound; // Winners advance to next round
    }

    // Create first round matches
    this.bracket = [];
    const seededParticipants = [...this.participants].sort((a, b) => {
      return (a.seed || 0) - (b.seed || 0);
    });

    // Distribute participants across first round matches
    for (let i = 0; i < participantCount; i += playersPerMatch) {
      const matchParticipants = seededParticipants.slice(i, i + playersPerMatch);

      if (matchParticipants.length > 0) {
        const match: Match = {
          id: this.generateId(),
          status: 'pending',
          participantIds: matchParticipants.map(p => p.id),
          matchNumber: this.bracket.length + 1,
          round: 1,
        };
        this.bracket.push(match);
      }
    }

    // Create placeholder matches for subsequent rounds
    let currentRound = 2;
    let matchesInPreviousRound = this.bracket.length;

    while (matchesInPreviousRound > 1) {
      const matchesInThisRound = Math.ceil(matchesInPreviousRound / playersPerMatch);

      for (let i = 0; i < matchesInThisRound; i++) {
        const match: Match = {
          id: this.generateId(),
          status: 'pending',
          participantIds: [],
          matchNumber: this.bracket.length + 1,
          round: currentRound,
        };
        this.bracket.push(match);
      }

      matchesInPreviousRound = matchesInThisRound;
      currentRound++;
    }
  }

  private seedBracket(firstRoundMatches: number, byes: number): void {
    const seededParticipants = [...this.participants].sort((a, b) => {
      return (a.seed || 0) - (b.seed || 0);
    });

    // Participants with byes advance automatically to round 2
    const byeParticipants = seededParticipants.slice(0, byes);

    // Remaining participants play in round 1
    const playingParticipants = seededParticipants.slice(byes);

    // Create first round matches with standard bracket seeding
    // Top seed plays bottom seed, 2nd plays 2nd-to-last, etc.
    for (let i = 0; i < firstRoundMatches; i++) {
      const participant1 = playingParticipants[i];
      const participant2 = playingParticipants[playingParticipants.length - 1 - i];

      if (participant1 && participant2) {
        this.bracket[i].participantIds = [participant1.id, participant2.id];
      }
    }

    // Add bye participants to second round matches
    // Second round starts after first round matches
    const secondRoundStart = firstRoundMatches;
    byeParticipants.forEach((p, index) => {
      const matchIndex = secondRoundStart + Math.floor(index / 2);
      if (this.bracket[matchIndex]) {
        this.bracket[matchIndex].participantIds.push(p.id);
      }
    });
  }



  public getCurrentMatches(): Match[] {
    if (!this.started) return [];

    const isMultiPlayer = this.options.matchType === 'multi-player';
    const playersPerMatch = this.options.playersPerMatch || 2;
    const minParticipants = isMultiPlayer ? 2 : 2; // At least 2 participants needed

    // Return all matches that have enough participants and are not completed
    const currentMatches = this.bracket.filter(
      (match) => match.participantIds.length >= minParticipants && match.status !== 'completed'
    );

    // Include third place match if it exists and is not completed
    if (this.thirdPlaceMatch && this.thirdPlaceMatch.status !== 'completed') {
      if (this.thirdPlaceMatch.participantIds.length >= minParticipants) {
        currentMatches.push(this.thirdPlaceMatch);
      }
    }

    return currentMatches;
  }

  public recordMatchResult(matchId: string, result: MatchResult): void {
    if (!this.started) {
      throw new Error('Tournament not started');
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

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    const isMultiPlayer = this.options.matchType === 'multi-player' && match.participantIds.length > 2;

    if (isMultiPlayer) {
      // Multi-player match result handling
      if (!result.rankings || result.rankings.length === 0) {
        throw new Error('Multi-player matches require rankings for all participants');
      }

      if (result.rankings.length !== match.participantIds.length) {
        throw new Error('All participants must be ranked');
      }

      // Validate match can be played
      if (match.participantIds.length < 2) {
        throw new Error('Match must have at least 2 participants');
      }

      // Winner is 1st place
      const winner = result.rankings.find((r) => r.position === 1);
      if (!winner) {
        throw new Error('Rankings must include a 1st place finisher');
      }

      result.winnerId = winner.participantId;
    } else {
      // Head-to-head result handling
      if (!result.winnerId) {
        if (this.options.tieBreakers) {
          throw new Error('Tie breakers are enabled - match cannot end in a tie');
        } else {
          throw new Error('Single elimination requires a winner for each match');
        }
      }

      // Validate match can be played
      if (match.participantIds.length !== 2) {
        throw new Error('Match does not have 2 participants');
      }

      if (!match.participantIds.includes(result.winnerId)) {
        throw new Error('Winner ID does not match a participant in this match');
      }
    }

    // Record result
    match.result = result;
    match.status = 'completed';

    // Advance winner to next round (if not final)
    if (matchIndex >= 0) {
      this.advanceWinner(matchIndex, result.winnerId!);
    }

    // Check if tournament is complete
    this.checkCompletion();

    this.touch();
  }

  private advanceWinner(matchIndex: number, winnerId: string): void {
    const totalMatches = this.bracket.length;
    const isMultiPlayer = this.options.matchType === 'multi-player';
    const playersPerMatch = this.options.playersPerMatch || 2;

    if (!isMultiPlayer || playersPerMatch === 2) {
      // Standard head-to-head advancement
      this.advanceWinnerHeadToHead(matchIndex, winnerId, totalMatches);
    } else {
      // Multi-player advancement
      this.advanceWinnerMultiPlayer(matchIndex, winnerId, totalMatches, playersPerMatch);
    }
  }

  private advanceWinnerHeadToHead(matchIndex: number, winnerId: string, totalMatches: number): void {
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

  private advanceWinnerMultiPlayer(
    matchIndex: number,
    winnerId: string,
    totalMatches: number,
    playersPerMatch: number
  ): void {
    const currentMatch = this.bracket[matchIndex];
    const currentRound = currentMatch.round || 1;

    // Find the next match in the next round that this winner should go to
    const nextRoundMatches = this.bracket.filter((m) => m.round === currentRound + 1);

    if (nextRoundMatches.length === 0) {
      // This was the final match, handle third place if needed
      if (this.options.thirdPlaceMatch && !this.thirdPlaceMatch && currentMatch.result?.rankings) {
        // Get 2nd and 3rd place finishers for third place match
        const rankings = currentMatch.result.rankings
          .filter((r) => r.position === 2 || r.position === 3)
          .sort((a, b) => a.position - b.position);

        if (rankings.length >= 2) {
          this.thirdPlaceMatch = {
            id: this.generateId(),
            status: 'pending',
            participantIds: rankings.map((r) => r.participantId),
            matchNumber: totalMatches + 1,
            round: currentRound,
          };
        }
      }
      return;
    }

    // Find next match with space for this winner
    // Distribute winners evenly across next round matches
    const matchesInCurrentRound = this.bracket.filter((m) => m.round === currentRound).length;
    const winnerIndex = this.bracket
      .filter((m) => m.round === currentRound)
      .findIndex((m) => m.id === currentMatch.id);

    const nextMatchIndex = Math.floor(winnerIndex / playersPerMatch);
    const nextMatch = nextRoundMatches[nextMatchIndex];

    if (nextMatch && !nextMatch.participantIds.includes(winnerId)) {
      nextMatch.participantIds.push(winnerId);
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
