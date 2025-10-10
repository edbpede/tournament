/**
 * Round Robin Tournament
 * Each participant plays all other participants
 */

import { BaseTournament } from '../BaseTournament';
import type {
  RoundRobinOptions,
  RoundRobinState,
  Match,
  Standing,
  MatchResult,
} from '../types';

export class RoundRobinTournament extends BaseTournament<
  RoundRobinOptions,
  RoundRobinState
> {
  private matches: Match[] = [];
  private currentRound: number = 0;
  private readonly options: RoundRobinOptions;

  constructor(options: RoundRobinOptions, id?: string) {
    super(options, id);
    this.options = options;
  }

  public start(): void {
    if (this.started) {
      throw new Error('Tournament already started');
    }

    this.validateParticipants(2);

    // Generate all matches for the round robin
    this.generateMatches();

    this.started = true;
    this.currentRound = 1;
    this.touch();
  }

  private generateMatches(): void {
    this.matches = [];

    // Generate matches for each round
    for (let round = 1; round <= this.options.rounds; round++) {
      // Create a match between every pair of participants
      for (let i = 0; i < this.participants.length; i++) {
        for (let j = i + 1; j < this.participants.length; j++) {
          const match = this.createMatch(
            [this.participants[i].id, this.participants[j].id],
            round
          );
          this.matches.push(match);
        }
      }
    }

    // Assign match numbers
    this.matches.forEach((match, index) => {
      match.matchNumber = index + 1;
    });
  }

  public getCurrentMatches(): Match[] {
    if (!this.started) return [];

    // In round robin, all matches are available (participants can play in any order)
    // Return uncompleted matches from current and previous rounds
    return this.matches.filter(
      (match) => match.status !== 'completed' && match.round! <= this.currentRound
    );
  }

  public recordMatchResult(matchId: string, result: MatchResult): void {
    if (!this.started) {
      throw new Error('Tournament not started');
    }

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    // Validate result based on ranking method
    if (this.options.rankingMethod === 'points' && !result.score) {
      throw new Error('Score is required when ranking by points');
    }

    if (this.options.rankingMethod === 'wins' && !result.winnerId && !result.isTie) {
      throw new Error('Winner or tie must be specified when ranking by wins');
    }

    // Record result
    match.result = result;
    match.status = 'completed';

    // Check if we should advance to next round
    this.checkRoundCompletion();

    // Check if tournament is complete
    this.checkCompletion();

    this.touch();
  }

  private checkRoundCompletion(): void {
    if (this.currentRound >= this.options.rounds) return;

    // Check if all matches in current round are complete
    const currentRoundMatches = this.matches.filter((m) => m.round === this.currentRound);
    const allComplete = currentRoundMatches.every((m) => m.status === 'completed');

    if (allComplete) {
      this.currentRound++;
    }
  }

  private checkCompletion(): void {
    // Tournament is complete when all matches are played
    this.completed = this.matches.every((m) => m.status === 'completed');
  }

  public getStandings(): Standing[] {
    const standings: Standing[] = [];

    this.participants.forEach((participant) => {
      const participantMatches = this.matches.filter((m) =>
        m.participantIds.includes(participant.id)
      );

      const completed = participantMatches.filter((m) => m.status === 'completed');

      let wins = 0;
      let losses = 0;
      let ties = 0;
      let points = 0;

      completed.forEach((match) => {
        const result = match.result!;

        if (this.options.rankingMethod === 'wins') {
          if (result.isTie) {
            ties++;
          } else if (result.winnerId === participant.id) {
            wins++;
          } else {
            losses++;
          }
        } else if (this.options.rankingMethod === 'points' && result.score) {
          const participantScore = result.score[participant.id] || 0;
          points += participantScore;

          // Also count wins/losses based on score comparison
          const opponentId = match.participantIds.find((id) => id !== participant.id);
          if (opponentId) {
            const opponentScore = result.score[opponentId] || 0;
            if (participantScore > opponentScore) {
              wins++;
            } else if (participantScore < opponentScore) {
              losses++;
            } else {
              ties++;
            }
          }
        }
      });

      standings.push({
        participantId: participant.id,
        participantName: participant.name,
        rank: 0, // Will be assigned after sorting
        wins,
        losses,
        ties,
        points: this.options.rankingMethod === 'points' ? points : undefined,
        matchesPlayed: completed.length,
      });
    });

    // Sort standings
    if (this.options.rankingMethod === 'wins') {
      // Sort by wins (descending), then by losses (ascending)
      standings.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.participantName.localeCompare(b.participantName);
      });
    } else {
      // Sort by points (descending), then by wins
      standings.sort((a, b) => {
        const aPoints = a.points || 0;
        const bPoints = b.points || 0;
        if (aPoints !== bPoints) return bPoints - aPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return a.participantName.localeCompare(b.participantName);
      });
    }

    // Assign ranks
    standings.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    return standings;
  }

  public exportState(): RoundRobinState {
    return {
      version: '1.0.0',
      id: this.id,
      name: this.name,
      type: 'round-robin',
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      started: this.started,
      completed: this.completed,
      participants: this.participants,
      options: this.options,
      matches: this.matches,
      currentRound: this.currentRound,
    };
  }

  public importState(state: RoundRobinState): void {
    this.id = state.id;
    this.name = state.name;
    this.started = state.started;
    this.completed = state.completed;
    this.participants = state.participants;
    this.matches = state.matches;
    this.currentRound = state.currentRound;
    this.createdAt = new Date(state.createdAt);
    this.updatedAt = new Date(state.updatedAt);
  }

  // Public method to get match schedule for UI display
  public getMatchesByRound(): Map<number, Match[]> {
    const matchesByRound = new Map<number, Match[]>();

    this.matches.forEach((match) => {
      const round = match.round || 1;
      if (!matchesByRound.has(round)) {
        matchesByRound.set(round, []);
      }
      matchesByRound.get(round)!.push(match);
    });

    return matchesByRound;
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public getTotalRounds(): number {
    return this.options.rounds;
  }
}
