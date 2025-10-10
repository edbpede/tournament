/**
 * Swiss System Tournament
 * Participants are paired with others of similar running scores
 * No participant faces the same opponent twice
 */

import { BaseTournament } from '../BaseTournament';
import type {
  SwissOptions,
  SwissState,
  Match,
  Standing,
  MatchResult,
} from '../types';

interface ParticipantScore {
  participantId: string;
  matchPoints: number;
  gamePoints: number;
  opponentIds: string[];
  matchesPlayed: number;
}

export class SwissTournament extends BaseTournament<SwissOptions, SwissState> {
  private rounds: Match[][] = [];
  private currentRound: number = 0;
  private participantScores: Map<string, ParticipantScore> = new Map();
  private readonly options: SwissOptions;
  private numberOfRounds: number;

  constructor(options: SwissOptions, id?: string) {
    super(options, id);
    this.options = options;

    // Calculate number of rounds if not specified (typically log2(n) rounded up)
    this.numberOfRounds =
      options.numberOfRounds || Math.ceil(Math.log2(options.participantNames.length));
  }

  public start(): void {
    if (this.started) {
      throw new Error('Tournament already started');
    }

    this.validateParticipants(2);

    // Initialize participant scores
    this.participants.forEach((p) => {
      this.participantScores.set(p.id, {
        participantId: p.id,
        matchPoints: 0,
        gamePoints: 0,
        opponentIds: [],
        matchesPlayed: 0,
      });
    });

    // Generate first round pairings
    this.generateNextRound();

    this.started = true;
    this.currentRound = 1;
    this.touch();
  }

  private generateNextRound(): void {
    if (this.currentRound >= this.numberOfRounds) {
      return;
    }

    const roundMatches: Match[] = [];

    // Get participants sorted by their current score
    const sortedParticipants = [...this.participants]
      .map((p) => ({
        participant: p,
        score: this.participantScores.get(p.id)!,
      }))
      .sort((a, b) => {
        // Sort by match points, then game points
        if (a.score.matchPoints !== b.score.matchPoints) {
          return b.score.matchPoints - a.score.matchPoints;
        }
        return b.score.gamePoints - a.score.gamePoints;
      });

    const unpaired = new Set(sortedParticipants.map((sp) => sp.participant.id));

    // Pair participants with similar scores who haven't played each other
    while (unpaired.size > 1) {
      // Get the highest rated unpaired participant
      const participant1Data = sortedParticipants.find((sp) =>
        unpaired.has(sp.participant.id)
      );

      if (!participant1Data) break;

      const participant1 = participant1Data.participant;
      const score1 = participant1Data.score;

      unpaired.delete(participant1.id);

      // Find the best opponent (similar score, haven't played before)
      let opponent = null;

      for (const sp of sortedParticipants) {
        if (
          unpaired.has(sp.participant.id) &&
          !score1.opponentIds.includes(sp.participant.id)
        ) {
          opponent = sp.participant;
          break;
        }
      }

      // If no valid opponent found (all potential opponents already played), pair with anyone
      if (!opponent) {
        for (const sp of sortedParticipants) {
          if (unpaired.has(sp.participant.id)) {
            opponent = sp.participant;
            break;
          }
        }
      }

      if (opponent) {
        unpaired.delete(opponent.id);

        const match = this.createMatch(
          [participant1.id, opponent.id],
          this.rounds.length + 1
        );
        roundMatches.push(match);
      }
    }

    // Handle bye if odd number of participants
    if (unpaired.size === 1) {
      const byeParticipantId = unpaired.values().next().value;
      const byeMatch = this.createMatch([byeParticipantId], this.rounds.length + 1);

      // Auto-complete bye match
      byeMatch.status = 'completed';
      byeMatch.result = {
        winnerId: byeParticipantId,
        score: {
          [byeParticipantId]: this.options.pointsPerBye,
        },
      };

      // Update participant score for bye
      const score = this.participantScores.get(byeParticipantId)!;
      score.matchPoints += this.options.pointsPerBye;
      score.matchesPlayed++;

      roundMatches.push(byeMatch);
    }

    // Assign match numbers
    const existingMatches = this.rounds.flat().length;
    roundMatches.forEach((match, index) => {
      match.matchNumber = existingMatches + index + 1;
    });

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

    // Validate result has scores
    if (!result.score) {
      throw new Error('Swiss system requires game scores for each match');
    }

    // Calculate points for each participant
    const [p1Id, p2Id] = match.participantIds;
    const p1Score = result.score[p1Id] || 0;
    const p2Score = result.score[p2Id] || 0;

    // Determine match result
    if (p1Score > p2Score) {
      result.winnerId = p1Id;
      result.loserId = p2Id;
    } else if (p2Score > p1Score) {
      result.winnerId = p2Id;
      result.loserId = p1Id;
    } else {
      result.isTie = true;
    }

    // Update participant scores
    const score1 = this.participantScores.get(p1Id)!;
    const score2 = this.participantScores.get(p2Id)!;

    // Match points
    if (result.isTie) {
      score1.matchPoints += this.options.pointsPerMatchTie;
      score2.matchPoints += this.options.pointsPerMatchTie;
    } else if (result.winnerId === p1Id) {
      score1.matchPoints += this.options.pointsPerMatchWin;
    } else {
      score2.matchPoints += this.options.pointsPerMatchWin;
    }

    // Game/set points
    score1.gamePoints += p1Score * this.options.pointsPerGameWin;
    score2.gamePoints += p2Score * this.options.pointsPerGameWin;

    // Track opponents
    score1.opponentIds.push(p2Id);
    score2.opponentIds.push(p1Id);

    score1.matchesPlayed++;
    score2.matchesPlayed++;

    // Mark match as completed
    match.result = result;
    match.status = 'completed';

    // Check if round is complete
    this.checkRoundCompletion();

    this.touch();
  }

  private checkRoundCompletion(): void {
    if (this.currentRound === 0 || this.currentRound > this.rounds.length) return;

    const currentRoundMatches = this.rounds[this.currentRound - 1];
    const allComplete = currentRoundMatches.every((m) => m.status === 'completed');

    if (allComplete) {
      // Check if tournament is complete
      if (this.currentRound >= this.numberOfRounds) {
        this.completed = true;
      } else {
        // Generate next round
        this.currentRound++;
        this.generateNextRound();
      }
    }
  }

  public getStandings(): Standing[] {
    const standings: Standing[] = [];

    this.participants.forEach((participant) => {
      const score = this.participantScores.get(participant.id)!;

      // Calculate wins, losses, ties from all matches
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let gamesWon = 0;
      let gamesLost = 0;

      for (const round of this.rounds) {
        const participantMatches = round.filter((m) =>
          m.participantIds.includes(participant.id)
        );

        participantMatches.forEach((match) => {
          if (match.status === 'completed' && match.result) {
            if (match.result.isTie) {
              ties++;
            } else if (match.result.winnerId === participant.id) {
              wins++;
            } else if (match.participantIds.length > 1) {
              // Not a bye
              losses++;
            }

            // Game scores
            if (match.result.score) {
              const participantGameScore = match.result.score[participant.id] || 0;
              gamesWon += participantGameScore;

              // Opponent games
              match.participantIds.forEach((oppId) => {
                if (oppId !== participant.id && match.result!.score) {
                  gamesLost += match.result!.score[oppId] || 0;
                }
              });
            }
          }
        });
      }

      standings.push({
        participantId: participant.id,
        participantName: participant.name,
        rank: 0, // Will be assigned after sorting
        wins,
        losses,
        ties,
        points: score.matchPoints,
        gamesWon,
        gamesLost,
        matchesPlayed: score.matchesPlayed,
      });
    });

    // Sort by match points, then game points, then games won
    standings.sort((a, b) => {
      if (a.points !== b.points) return (b.points || 0) - (a.points || 0);
      if (a.gamesWon !== b.gamesWon) return (b.gamesWon || 0) - (a.gamesWon || 0);
      if (a.gamesLost !== b.gamesLost) return (a.gamesLost || 0) - (b.gamesLost || 0);
      return a.participantName.localeCompare(b.participantName);
    });

    // Assign ranks
    standings.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    return standings;
  }

  public exportState(): SwissState {
    const participantScoresObj: SwissState['participantScores'] = {};

    this.participantScores.forEach((score, id) => {
      participantScoresObj[id] = score;
    });

    return {
      version: '1.0.0',
      id: this.id,
      name: this.name,
      type: 'swiss',
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      started: this.started,
      completed: this.completed,
      participants: this.participants,
      options: this.options,
      rounds: this.rounds,
      currentRound: this.currentRound,
      participantScores: participantScoresObj,
    };
  }

  public importState(state: SwissState): void {
    this.id = state.id;
    this.name = state.name;
    this.started = state.started;
    this.completed = state.completed;
    this.participants = state.participants;
    this.rounds = state.rounds;
    this.currentRound = state.currentRound;
    this.createdAt = new Date(state.createdAt);
    this.updatedAt = new Date(state.updatedAt);

    // Restore participant scores
    this.participantScores = new Map();
    Object.entries(state.participantScores).forEach(([id, score]) => {
      this.participantScores.set(id, score);
    });

    this.numberOfRounds =
      state.options.numberOfRounds || Math.ceil(Math.log2(this.participants.length));
  }

  // Public methods for UI
  public getRounds(): Match[][] {
    return this.rounds.map((round) => [...round]);
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public getNumberOfRounds(): number {
    return this.numberOfRounds;
  }
}
