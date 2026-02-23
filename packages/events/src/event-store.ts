/**
 * Event Store Interface
 */

import type { DomainEvent, EventFilter } from './types.js';

export class OptimisticLockError extends Error {
  constructor(
    public readonly streamId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Optimistic lock failed for stream ${streamId}: expected version ${expectedVersion}, actual version ${actualVersion}`
    );
    this.name = 'OptimisticLockError';
  }
}

export class StreamNotFoundError extends Error {
  constructor(public readonly streamId: string) {
    super(`Event stream not found: ${streamId}`);
    this.name = 'StreamNotFoundError';
  }
}

export interface ReadResult<T extends DomainEvent = DomainEvent> {
  events: T[];
  currentVersion: number;
}

export interface AppendOptions {
  expectedVersion?: number;
}

export interface ReadOptions {
  fromVersion?: number;
  limit?: number;
}

export interface EventStore {
  append(
    tenantId: string,
    streamId: string,
    events: Omit<DomainEvent, 'version'>[],
    options?: AppendOptions
  ): Promise<void>;

  read(tenantId: string, streamId: string, options?: ReadOptions): Promise<ReadResult>;

  readAll(filter: EventFilter): AsyncIterable<DomainEvent>;

  getCurrentVersion(tenantId: string, streamId: string): Promise<number>;
}
