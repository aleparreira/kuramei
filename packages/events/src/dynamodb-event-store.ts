/**
 * DynamoDB implementation of EventStore
 *
 * Table Design:
 * - PK: TENANT#<tenant_id>#CONV#<stream_id>
 * - SK: v#<version> (zero-padded to 6 digits)
 */

import type { DomainEvent, EventFilter } from './types.js';
import type { EventStore, ReadResult, AppendOptions, ReadOptions } from './event-store.js';
import { OptimisticLockError } from './event-store.js';

export interface DynamoDBDocumentClient {
  send(command: unknown): Promise<unknown>;
}

export interface TransactWriteItem {
  Put?: {
    TableName: string;
    Item: Record<string, unknown>;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
  };
}

export interface QueryCommandInput {
  TableName: string;
  KeyConditionExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
  ScanIndexForward?: boolean;
  Limit?: number;
  ExclusiveStartKey?: Record<string, unknown>;
}

export interface QueryCommandOutput {
  Items?: Record<string, unknown>[];
  LastEvaluatedKey?: Record<string, unknown>;
}

export interface DynamoDBCommandFactories {
  createTransactWriteCommand: (input: { TransactItems: TransactWriteItem[] }) => unknown;
  createQueryCommand: (input: QueryCommandInput) => unknown;
}

export interface DynamoDBEventStoreConfig {
  tableName: string;
}

function formatVersion(version: number): string {
  return `v#${version.toString().padStart(6, '0')}`;
}

function parseVersion(sk: string): number {
  const match = sk.match(/v#(\d+)/);
  if (!match?.[1]) {
    throw new Error(`Invalid sort key format: ${sk}`);
  }
  return parseInt(match[1], 10);
}

function buildStreamPK(tenantId: string, streamId: string): string {
  return `TENANT#${tenantId}#CONV#${streamId}`;
}

export class DynamoDBEventStore implements EventStore {
  private readonly client: DynamoDBDocumentClient;
  private readonly config: DynamoDBEventStoreConfig;
  private readonly commands: DynamoDBCommandFactories;

  constructor(
    client: DynamoDBDocumentClient,
    config: DynamoDBEventStoreConfig,
    commands: DynamoDBCommandFactories
  ) {
    this.client = client;
    this.config = config;
    this.commands = commands;
  }

  async append(
    tenantId: string,
    streamId: string,
    events: Omit<DomainEvent, 'version'>[],
    options?: AppendOptions
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const pk = buildStreamPK(tenantId, streamId);

    let startVersion: number;

    if (options?.expectedVersion !== undefined) {
      startVersion = options.expectedVersion;
    } else {
      startVersion = await this.getCurrentVersion(tenantId, streamId);
    }

    const transactItems: TransactWriteItem[] = events.map((event, index) => {
      const version = startVersion + index + 1;
      const sk = formatVersion(version);

      const item: Record<string, unknown> = {
        PK: pk,
        SK: sk,
        ...event,
        version,
        tenantId,
        streamId,
      };

      const put: TransactWriteItem['Put'] = {
        TableName: this.config.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      };

      return { Put: put };
    });

    try {
      const command = this.commands.createTransactWriteCommand({
        TransactItems: transactItems,
      });
      await this.client.send(command);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === 'TransactionCanceledException' ||
          error.message.includes('ConditionalCheckFailed'))
      ) {
        const actualVersion = await this.getCurrentVersion(tenantId, streamId);
        throw new OptimisticLockError(streamId, options?.expectedVersion ?? 0, actualVersion);
      }
      throw error;
    }
  }

  async read(tenantId: string, streamId: string, options?: ReadOptions): Promise<ReadResult> {
    const pk = buildStreamPK(tenantId, streamId);

    const queryInput: QueryCommandInput = {
      TableName: this.config.tableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'PK',
      },
      ExpressionAttributeValues: {
        ':pk': pk,
      },
      ScanIndexForward: true,
    };

    if (options?.fromVersion !== undefined) {
      queryInput.KeyConditionExpression += ' AND #sk >= :fromSk';
      queryInput.ExpressionAttributeNames!['#sk'] = 'SK';
      queryInput.ExpressionAttributeValues[':fromSk'] = formatVersion(options.fromVersion);
    }

    if (options?.limit) {
      queryInput.Limit = options.limit;
    }

    const events: DomainEvent[] = [];
    let currentVersion = 0;
    let lastKey: Record<string, unknown> | undefined;

    do {
      if (lastKey) {
        queryInput.ExclusiveStartKey = lastKey;
      }

      const command = this.commands.createQueryCommand(queryInput);
      const response = (await this.client.send(command)) as QueryCommandOutput;

      if (response.Items) {
        for (const item of response.Items) {
          const event = this.itemToEvent(item);
          events.push(event);
          if (event.version > currentVersion) {
            currentVersion = event.version;
          }
        }
      }

      lastKey = response.LastEvaluatedKey;

      if (options?.limit && events.length >= options.limit) {
        break;
      }
    } while (lastKey);

    return { events, currentVersion };
  }

  async *readAll(filter: EventFilter): AsyncIterable<DomainEvent> {
    if (!filter.tenantId && !filter.streamId) {
      throw new Error('readAll requires at least tenantId or streamId in filter');
    }

    if (filter.streamId && filter.tenantId) {
      const readOptions: ReadOptions = {};
      if (filter.limit !== undefined) {
        readOptions.limit = filter.limit;
      }
      const result = await this.read(filter.tenantId, filter.streamId, readOptions);

      for (const event of this.filterEvents(result.events, filter)) {
        yield event;
      }
      return;
    }

    throw new Error('Tenant-wide readAll requires GSI (not implemented)');
  }

  async getCurrentVersion(tenantId: string, streamId: string): Promise<number> {
    const pk = buildStreamPK(tenantId, streamId);

    const queryInput: QueryCommandInput = {
      TableName: this.config.tableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'PK',
      },
      ExpressionAttributeValues: {
        ':pk': pk,
      },
      ScanIndexForward: false,
      Limit: 1,
    };

    const command = this.commands.createQueryCommand(queryInput);
    const response = (await this.client.send(command)) as QueryCommandOutput;

    if (!response.Items || response.Items.length === 0) {
      return 0;
    }

    const sk = response.Items[0]?.['SK'] as string | undefined;
    if (!sk) {
      return 0;
    }

    return parseVersion(sk);
  }

  private itemToEvent(item: Record<string, unknown>): DomainEvent {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, ...eventData } = item;
    return eventData as unknown as DomainEvent;
  }

  private filterEvents(events: DomainEvent[], filter: EventFilter): DomainEvent[] {
    return events.filter((event) => {
      if (filter.eventTypes && !filter.eventTypes.includes(event.eventType as never)) {
        return false;
      }
      if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
        return false;
      }
      if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
        return false;
      }
      if (filter.correlationId && event.correlationId !== filter.correlationId) {
        return false;
      }
      if (filter.actor && event.actor !== filter.actor) {
        return false;
      }
      return true;
    });
  }
}

export class InMemoryEventStore implements EventStore {
  private readonly streams = new Map<string, DomainEvent[]>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async append(
    tenantId: string,
    streamId: string,
    events: Omit<DomainEvent, 'version'>[],
    options?: AppendOptions
  ): Promise<void> {
    const key = `${tenantId}:${streamId}`;
    const currentEvents = this.streams.get(key) ?? [];
    const currentVersion = currentEvents.length;

    if (options?.expectedVersion !== undefined && options.expectedVersion !== currentVersion) {
      throw new OptimisticLockError(streamId, options.expectedVersion, currentVersion);
    }

    const newEvents = events.map((event, index) => ({
      ...event,
      streamId,
      tenantId,
      version: currentVersion + index + 1,
    }));

    this.streams.set(key, [...currentEvents, ...newEvents]);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async read(tenantId: string, streamId: string, options?: ReadOptions): Promise<ReadResult> {
    const key = `${tenantId}:${streamId}`;
    let events = this.streams.get(key) ?? [];

    if (options?.fromVersion) {
      events = events.filter((e) => e.version >= options.fromVersion!);
    }

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    const currentVersion = events.length > 0 ? events[events.length - 1]!.version : 0;

    return { events, currentVersion };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *readAll(filter: EventFilter): AsyncIterable<DomainEvent> {
    for (const [key, events] of this.streams.entries()) {
      const [tenantId] = key.split(':');

      if (filter.tenantId && tenantId !== filter.tenantId) {
        continue;
      }

      for (const event of events) {
        if (filter.streamId && event.streamId !== filter.streamId) {
          continue;
        }
        if (filter.eventTypes && !filter.eventTypes.includes(event.eventType as never)) {
          continue;
        }
        if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
          continue;
        }
        if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
          continue;
        }
        if (filter.correlationId && event.correlationId !== filter.correlationId) {
          continue;
        }
        if (filter.actor && event.actor !== filter.actor) {
          continue;
        }

        yield event;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getCurrentVersion(tenantId: string, streamId: string): Promise<number> {
    const key = `${tenantId}:${streamId}`;
    const events = this.streams.get(key) ?? [];
    return events.length;
  }

  clear(): void {
    this.streams.clear();
  }
}
