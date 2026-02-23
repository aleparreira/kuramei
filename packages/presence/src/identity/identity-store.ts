/**
 * Identity Store - Persistence layer for conversational identities
 *
 * Table Design (DynamoDB):
 * - PK: IDENTITY#<identity_id>
 * - SK: IDENTITY
 */

import type { ConversationalIdentity, IdentityId } from './types.js';
import type {
  DynamoDBDocumentClient,
  DynamoDBCommandFactories,
  GetCommandOutput,
} from './dynamodb-types.js';

export interface DynamoDBIdentityStoreConfig {
  tableName: string;
}

export type CreateIdentityInput = Omit<ConversationalIdentity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateIdentityInput = Omit<ConversationalIdentity, 'createdAt' | 'updatedAt'>;

export interface IdentityStore {
  create(input: CreateIdentityInput): Promise<ConversationalIdentity>;
  get(identityId: IdentityId): Promise<ConversationalIdentity | null>;
  update(input: UpdateIdentityInput): Promise<ConversationalIdentity>;
  delete(identityId: IdentityId): Promise<void>;
}

function buildIdentityPK(identityId: IdentityId): string {
  return `IDENTITY#${identityId}`;
}

const IDENTITY_SK = 'IDENTITY';

function generateUUID(): string {
  return crypto.randomUUID();
}

export class DynamoDBIdentityStore implements IdentityStore {
  private readonly client: DynamoDBDocumentClient;
  private readonly config: DynamoDBIdentityStoreConfig;
  private readonly commands: DynamoDBCommandFactories;

  constructor(
    client: DynamoDBDocumentClient,
    config: DynamoDBIdentityStoreConfig,
    commands: DynamoDBCommandFactories
  ) {
    this.client = client;
    this.config = config;
    this.commands = commands;
  }

  async create(input: CreateIdentityInput): Promise<ConversationalIdentity> {
    const now = new Date().toISOString();
    const identity: ConversationalIdentity = {
      ...input,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const pk = buildIdentityPK(identity.id);

    const item: Record<string, unknown> = {
      PK: pk,
      SK: IDENTITY_SK,
      id: identity.id,
      type: identity.type,
      displayName: identity.displayName,
      channels: identity.channels,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };

    if (identity.email) item['email'] = identity.email;
    if (identity.reputationId) item['reputationId'] = identity.reputationId;

    const command = this.commands.createPutCommand({
      TableName: this.config.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await this.client.send(command);
    return identity;
  }

  async get(identityId: IdentityId): Promise<ConversationalIdentity | null> {
    const pk = buildIdentityPK(identityId);

    const command = this.commands.createGetCommand({
      TableName: this.config.tableName,
      Key: { PK: pk, SK: IDENTITY_SK },
    });

    const response = (await this.client.send(command)) as GetCommandOutput;

    if (!response.Item) return null;
    return this.itemToIdentity(response.Item);
  }

  async update(input: UpdateIdentityInput): Promise<ConversationalIdentity> {
    const existing = await this.get(input.id);
    if (!existing) throw new Error(`Identity not found: ${input.id}`);

    const now = new Date().toISOString();
    const pk = buildIdentityPK(input.id);

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk, SK: IDENTITY_SK },
      UpdateExpression:
        'SET #type = :type, #displayName = :displayName, #channels = :channels, #updatedAt = :updatedAt, #email = :email, #reputationId = :reputationId',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#displayName': 'displayName',
        '#channels': 'channels',
        '#updatedAt': 'updatedAt',
        '#email': 'email',
        '#reputationId': 'reputationId',
      },
      ExpressionAttributeValues: {
        ':type': input.type,
        ':displayName': input.displayName,
        ':channels': input.channels,
        ':updatedAt': now,
        ':email': input.email ?? null,
        ':reputationId': input.reputationId ?? null,
      },
      ConditionExpression: 'attribute_exists(PK)',
    });

    await this.client.send(command);
    return { ...input, createdAt: existing.createdAt, updatedAt: now };
  }

  async delete(identityId: IdentityId): Promise<void> {
    const pk = buildIdentityPK(identityId);

    const command = this.commands.createDeleteCommand({
      TableName: this.config.tableName,
      Key: { PK: pk, SK: IDENTITY_SK },
    });

    await this.client.send(command);
  }

  private itemToIdentity(item: Record<string, unknown>): ConversationalIdentity {
    const identity: ConversationalIdentity = {
      id: item['id'] as string,
      type: item['type'] as 'human' | 'agent' | 'organization',
      displayName: item['displayName'] as string,
      channels: (item['channels'] as ConversationalIdentity['channels']) ?? [],
      createdAt: item['createdAt'] as string,
      updatedAt: item['updatedAt'] as string,
    };

    if (item['email']) identity.email = item['email'] as string;
    if (item['reputationId']) identity.reputationId = item['reputationId'] as string;

    return identity;
  }
}

export class InMemoryIdentityStore implements IdentityStore {
  private readonly identities = new Map<IdentityId, ConversationalIdentity>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async create(input: CreateIdentityInput): Promise<ConversationalIdentity> {
    const now = new Date().toISOString();
    const identity: ConversationalIdentity = {
      ...input,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.identities.set(identity.id, identity);
    return identity;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async get(identityId: IdentityId): Promise<ConversationalIdentity | null> {
    return this.identities.get(identityId) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(input: UpdateIdentityInput): Promise<ConversationalIdentity> {
    const existing = this.identities.get(input.id);
    if (!existing) throw new Error(`Identity not found: ${input.id}`);

    const now = new Date().toISOString();
    const updated: ConversationalIdentity = { ...input, createdAt: existing.createdAt, updatedAt: now };
    this.identities.set(input.id, updated);
    return updated;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(identityId: IdentityId): Promise<void> {
    this.identities.delete(identityId);
  }

  clear(): void {
    this.identities.clear();
  }

  getAll(): ConversationalIdentity[] {
    return Array.from(this.identities.values());
  }
}
