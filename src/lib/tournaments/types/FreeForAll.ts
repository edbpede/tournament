/**
 * Free For All Tournament
 * Multiple participants per match, winners advance to next round
 * Supports winner-only or top-N advancement
 */

import { BaseTournament } from '../BaseTournament';
import type {
  FreeForAllOptions,
  FreeForAllState,
  Match,
  Standing,
  MatchResult,
} from '../types';
import { getPointsForPlacement } from '../pointsSystems';

export class FreeForAllTournament extends BaseTournament<
  FreeForAllOptions,
  FreeForAllState
> {
  private rounds: Match[][] = [];
  private currentRound: number = 0;
  private eliminatedParticipants: Set<string> = new Set();
  private readonly options: FreeForAllOptions;

  constructor(options: FreeForAllOptions, id?: string) {
    super(options, id);
    this.options = options;

    // Validate participants per match
    if (options.participantsPerMatch < 2) {
      throw new Error('Participants per match must be at least 2');
    }

    // Validate advancement rule
    if (options.advancementRule === 'top-n') {
      if (!options.advancementCount || options.advancementCount < 1) {
        throw new Error('advancementCount must be at least 1 when using top-n advancement');
      }
      if (options.advancementCount >= options.participantsPerMatch) {
        throw new Error('advancementCount must be less than participantsPerMatch');
      }
    }
  }

  public start(): void {
    if (this.started) {
      throw new Error('Tournament already started');
    }

    this.validateParticipants(this.options.participantsPerMatch);

    // Generate first round
    this.generateRound(this.participants.map((p) => p.id));

    this.started = true;
    this.currentRound = 1;
    this.touch();
  }

  private generateRound(participantIds: string[]): void {
    const roundMatches: Match[] = [];
    const perMatch = this.options.participantsPerMatch;

    // Split participants into matches
    for (let i = 0; i < participantIds.length; i += perMatch) {
      const matchParticipants = participantIds.slice(i, i + perMatch);

      // Only create match if we have at least 2 participants
      if (matchParticipants.length >= 2) {
        const match = this.createMatch(
          matchParticipants,
          this.rounds.length + 1,
          roundMatches.length + 1
        );
        roundMatches.push(match);
      } else if (matchParticipants.length === 1) {
        // Single participant gets automatic bye to next round
        const match = this.createMatch(
          matchParticipants,
          this.rounds.length + 1,
          roundMatches.length + 1
        );

        // Auto-complete as completed (bye)
        match.status = 'completed';
        match.result = {
          rankings: [
            {
              participantId: matchParticipants[0],
              position: 1,
            },
          ],
        };

        roundMatches.push(match);
      }
    }

    this.rounds.push(roundMatches);
  }

  public getCurrentMatches(): Match[] {
    if (!this.started || this.currentRound === 0) return [];

    const currentRoundMatches = this.rounds[this.currentRound - 1] || [];
    return currentRoundMatches.filter((m) => m.status !== 'completed');
  }

  public recordMatchResult(matchId: string, result: MatchResult): void {
    if (!this.started) {
      throw new Error('Tournament not started');
    }

    // Find the match
    let match: Match | undefined;
    for (const round of this.rounds) {
      match = round.find((m) => m.id === matchId);
      if (match) break;
    }

    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    // Validate rankings
    if (!result.rankings || result.rankings.length === 0) {
      throw new Error('Free For All requires rankings for all participants');
    }

    // Ensure all participants are ranked
    if (result.rankings.length !== match.participantIds.length) {
      throw new Error('All participants must be ranked');
    }

    // Ensure rankings are valid (unique positions starting from 1)
    const positions = result.rankings.map((r) => r.position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i + 1) {
        throw new Error('Rankings must be consecutive starting from 1');
      }
    }

    // Calculate points if points system is enabled
    if (this.options.pointsSystem) {
      result.score = {};
      result.rankings.forEach((ranking) => {
        const points = getPointsForPlacement(
          this.options.pointsSystem!,
          ranking.position,
          match.participantIds.length
        );
        result.score![ranking.participantId] = points;
      });
    }

    // Mark match as completed
    match.result = result;
    match.status = 'completed';

    // Determine advancement threshold
    const advancementRule = this.options.advancementRule || 'winner-only';
    const advancementThreshold =
      advancementRule === 'top-n' ? (this.options.advancementCount || 1) : 1;

    // Eliminate participants who didn't place in top N
    result.rankings.forEach((ranking) => {
      if (ranking.position > advancementThreshold) {
        this.eliminatedParticipants.add(ranking.participantId);
      }
    });

    // Check if round is complete
    this.checkRoundCompletion();

    this.touch();
  }

  private checkRoundCompletion(): void {
    if (this.currentRound === 0 || this.currentRound > this.rounds.length) return;

    const currentRoundMatches = this.rounds[this.currentRound - 1];
    const allComplete = currentRoundMatches.every((m) => m.status === 'completed');

    if (!allComplete) return;

    // Get advancing participants from current round
    const advancingParticipants: string[] = [];
    const advancementRule = this.options.advancementRule || 'winner-only';
    const advancementThreshold =
      advancementRule === 'top-n' ? (this.options.advancementCount || 1) : 1;

    currentRoundMatches.forEach((match) => {
      if (match.result?.rankings) {
        // Get top N finishers
        const advancers = match.result.rankings
          .filter((r) => r.position <= advancementThreshold)
          .map((r) => r.participantId);
        advancingParticipants.push(...advancers);
      }
    });

    // Check if tournament is complete
    const minParticipantsForNextRound = 2;

    if (advancingParticipants.length < minParticipantsForNextRound) {
      // Tournament complete - only one or zero participants left
      this.completed = true;
      return;
    }

    // Special case: if we have exactly the right number for one final match
    if (
      advancingParticipants.length <= this.options.participantsPerMatch &&
      advancingParticipants.length >= 2
    ) {
      // Create final match if not already created
      if (this.rounds.length === this.currentRound) {
        this.currentRound++;
        this.generateRound(advancingParticipants);
      } else {
        // Final match already exists and is complete
        this.completed = true;
      }
      return;
    }

    // Generate next round
    if (advancingParticipants.length >= 2) {
      this.currentRound++;
      this.generateRound(advancingParticipants);
    } else {
      // Tournament complete
      this.completed = true;
    }
  }

  public getStandings(): Standing[] {
    const standings: Standing[] = [];

    this.participants.forEach((participant) => {
      let wins = 0;
      let losses = 0;
      let matchesPlayed = 0;
      let finalRound = 0;

      // Go through all rounds to find participant's matches
      this.rounds.forEach((round, roundIndex) => {
        const participantMatches = round.filter((m) =>
          m.participantIds.includes(participant.id)
        );

        participantMatches.forEach((match) => {
          if (match.status === 'completed' && match.result?.rankings) {
            matchesPlayed++;
            finalRound = Math.max(finalRound, roundIndex + 1);

            const ranking = match.result.rankings.find(
              (r) => r.participantId === participant.id
            );

            if (ranking) {
              if (ranking.position === 1) {
                wins++;
              } else {
                losses++;
              }
            }
          }
        });
      });

      const isEliminated = this.eliminatedParticipants.has(participant.id);

      // Determine rank based on how far they got and their performance
      // Winners of later rounds rank higher
      let rank = 0;

      if (this.completed) {
        // Tournament is complete, assign final ranks
        // The winner is the one who won all their matches and reached the final
        if (wins === matchesPlayed && matchesPlayed > 0) {
          // Check if they're in the final round
          const finalRoundIndex = this.rounds.length - 1;
          const finalMatch = this.rounds[finalRoundIndex]?.[0];

          if (finalMatch?.result?.rankings?.[0]?.participantId === participant.id) {
            rank = 1; // Champion
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
        matchesPlayed,
        isEliminated,
      });
    });

    // Sort standings: by round reached (descending), then by wins
    standings.sort((a, b) => {
      // Champions first
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;

      // Then by wins
      if (a.wins !== b.wins) return b.wins - a.wins;

      // Then by matches played (further in tournament)
      if (a.matchesPlayed !== b.matchesPlayed)
        return b.matchesPlayed - a.matchesPlayed;

      return a.participantName.localeCompare(b.participantName);
    });

    // Assign ranks if not already assigned
    let currentRank = 1;
    standings.forEach((standing, index) => {
      if (standing.rank === 0) {
        // Check if this is a tie with previous
        if (
          index > 0 &&
          standing.wins === standings[index - 1].wins &&
          standing.matchesPlayed === standings[index - 1].matchesPlayed
        ) {
          standing.rank = standings[index - 1].rank;
        } else {
          standing.rank = currentRank;
        }
      }
      currentRank = standing.rank + 1;
    });

    return standings;
  }

  public exportState(): FreeForAllState {
    return {
      version: '1.0.0',
      id: this.id,
      name: this.name,
      type: 'free-for-all',
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      started: this.started,
      completed: this.completed,
      participants: this.participants,
      options: this.options,
      rounds: this.rounds,
      currentRound: this.currentRound,
      eliminatedParticipants: Array.from(this.eliminatedParticipants),
    };
  }

  public importState(state: FreeForAllState): void {
    this.id = state.id;
    this.name = state.name;
    this.started = state.started;
    this.completed = state.completed;
    this.participants = state.participants;
    this.rounds = state.rounds;
    this.currentRound = state.currentRound;
    this.eliminatedParticipants = new Set(state.eliminatedParticipants);
    this.createdAt = new Date(state.createdAt);
    this.updatedAt = new Date(state.updatedAt);
  }

  // Public methods for UI
  public getRounds(): Match[][] {
    return this.rounds.map((round) => [...round]);
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public getEliminatedParticipants(): string[] {
    return Array.from(this.eliminatedParticipants);
  }
}
