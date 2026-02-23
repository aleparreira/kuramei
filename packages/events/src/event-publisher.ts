/**
 * Event Publisher Interface and EventBridge Implementation
 */

import type { DomainEvent } from './types.js';

export const EVENT_SOURCE_PREFIX = 'kuramei';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

export interface EventBridgePublisherConfig {
  eventBusName: string;
  sourcePrefix?: string;
  dryRun?: boolean;
}

export interface EventBridgeClient {
  send(command: PutEventsCommand): Promise<PutEventsResponse>;
}

export interface PutEventsRequestEntry {
  EventBusName?: string;
  Source?: string;
  DetailType?: string;
  Detail?: string;
  Time?: Date;
}

export interface PutEventsCommand {
  input: { Entries: PutEventsRequestEntry[] };
}

export interface PutEventsResultEntry {
  EventId?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface PutEventsResponse {
  FailedEntryCount?: number;
  Entries?: PutEventsResultEntry[];
}

export type PutEventsCommandFactory = (input: { Entries: PutEventsRequestEntry[] }) => PutEventsCommand;

export class EventBridgePublisher implements EventPublisher {
  private readonly client: EventBridgeClient;
  private readonly config: Required<EventBridgePublisherConfig>;
  private readonly createCommand: PutEventsCommandFactory;

  constructor(
    client: EventBridgeClient,
    config: EventBridgePublisherConfig,
    createCommand: PutEventsCommandFactory
  ) {
    this.client = client;
    this.config = {
      eventBusName: config.eventBusName,
      sourcePrefix: config.sourcePrefix ?? EVENT_SOURCE_PREFIX,
      dryRun: config.dryRun ?? false,
    };
    this.createCommand = createCommand;
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.publishBatch([event]);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    if (this.config.dryRun) {
      for (const event of events) {
        console.log(
          `[DRY-RUN] Would publish event: ${event.eventType} (${event.eventId}) to ${this.config.eventBusName}`
        );
      }
      return;
    }

    const batches = this.chunk(events, 10);

    for (const batch of batches) {
      const entries = batch.map((event) => this.toEventBridgeEntry(event));
      const command = this.createCommand({ Entries: entries });
      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failedEntries =
          response.Entries?.filter((entry) => entry.ErrorCode).map(
            (entry) => `${entry.ErrorCode}: ${entry.ErrorMessage}`
          ) ?? [];

        throw new EventPublishError(
          `Failed to publish ${response.FailedEntryCount} events: ${failedEntries.join(', ')}`
        );
      }
    }
  }

  private toEventBridgeEntry(event: DomainEvent): PutEventsRequestEntry {
    const source = `${this.config.sourcePrefix}.events`;

    return {
      EventBusName: this.config.eventBusName,
      Source: source,
      DetailType: event.eventType,
      Detail: JSON.stringify({
        ...event,
        metadata: {
          tenantId: event.tenantId,
          correlationId: event.correlationId,
          actor: event.actor,
          streamId: event.streamId,
          version: event.version,
        },
      }),
      Time: new Date(event.timestamp),
    };
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export class EventPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventPublishError';
  }
}

export class NoOpPublisher implements EventPublisher {
  public readonly publishedEvents: DomainEvent[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async publishBatch(events: DomainEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }

  clear(): void {
    this.publishedEvents.length = 0;
  }
}
