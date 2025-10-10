/**
 * Base Tournament Abstract Class
 * Provides common functionality and defines the contract for all tournament types
 */

import type {
  TournamentType,
  TournamentOptions,
  TournamentState,
  Participant,
  Match,
  Standing,
  MatchResult,
} from './types';

export abstract class BaseTournament<
  TOptions extends TournamentOptions = TournamentOptions,
  TState extends TournamentState = TournamentState
> {
  protected id: string;
  protected name: string;
  protected type: TournamentType;
  protected participants: Participant[];
  protected started: boolean;
  protected completed: boolean;
  protected createdAt: Date;
  protected updatedAt: Date;

  constructor(options: TOptions, id?: string) {
    this.id = id || this.generateId();
    this.name = options.name;
    this.type = options.type;
    this.participants = options.participantNames.map((name, index) => ({
      id: this.generateId(),
      name,
      seed: index + 1,
    }));
    this.started = false;
    this.completed = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Abstract methods that must be implemented by each tournament type
  abstract start(): void;
  abstract getCurrentMatches(): Match[];
  abstract recordMatchResult(matchId: string, result: MatchResult): void;
  abstract getStandings(): Standing[];
  abstract exportState(): TState;
  abstract importState(state: TState): void;

  // Common implementation methods

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public setName(name: string): void {
    this.name = name;
    this.touch();
  }

  public getType(): TournamentType {
    return this.type;
  }

  public getParticipants(): Participant[] {
    return [...this.participants];
  }

  public addParticipant(name: string): void {
    if (this.started) {
      throw new Error('Cannot add participants after tournament has started');
    }

    const newParticipant: Participant = {
      id: this.generateId(),
      name,
      seed: this.participants.length + 1,
    };

    this.participants.push(newParticipant);
    this.touch();
  }

  public removeParticipant(id: string): void {
    if (this.started) {
      throw new Error('Cannot remove participants after tournament has started');
    }

    const index = this.participants.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Participant with id ${id} not found`);
    }

    this.participants.splice(index, 1);

    // Re-seed remaining participants
    this.participants.forEach((p, i) => {
      p.seed = i + 1;
    });

    this.touch();
  }

  public isStarted(): boolean {
    return this.started;
  }

  public isComplete(): boolean {
    return this.completed;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Protected helper methods

  protected generateId(): string {
    // Simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }

  protected getParticipantById(id: string): Participant | undefined {
    return this.participants.find(p => p.id === id);
  }

  protected validateParticipants(minParticipants: number): void {
    if (this.participants.length < minParticipants) {
      throw new Error(
        `This tournament requires at least ${minParticipants} participants`
      );
    }
  }

  protected shuffleParticipants(): void {
    // Fisher-Yates shuffle
    for (let i = this.participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.participants[i], this.participants[j]] = [
        this.participants[j],
        this.participants[i],
      ];
    }

    // Re-seed after shuffle
    this.participants.forEach((p, i) => {
      p.seed = i + 1;
    });
  }

  protected createMatch(participantIds: string[], round?: number, matchNumber?: number): Match {
    return {
      id: this.generateId(),
      status: 'pending',
      participantIds,
      round,
      matchNumber,
    };
  }

  // Export/Import for persistence
  public export(): TState {
    this.touch();
    return this.exportState();
  }

  public import(state: TState): void {
    this.importState(state);
    this.touch();
  }
}
