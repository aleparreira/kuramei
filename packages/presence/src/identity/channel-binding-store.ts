/**
 * Channel Binding Store - Manages bindings between channels and identities
 *
 * Table Design (DynamoDB):
 * - PK: IDENTITY#<identity_id>
 * - SK: CHANNEL#<channel_type>#<channel_identifier>
 *
 * GSI ChannelIndex (reverse lookup):
 * - GSI-PK: channel_lookup (CHANNEL#<channel_type>#<channel_identifier>)
 * - GSI-SK: IDENTITY#<identity_id>
 */

import type { ChannelBinding, ChannelType, IdentityId } from './types.js';
import type {
  DynamoDBDocumentClient,
  DynamoDBCommandFactories,
  QueryCommandInput,
  QueryCommandOutput,
} from './dynamodb-types.js';

export interface ChannelBindingCommandFactories extends DynamoDBCommandFactories {
  createQueryCommand: (input: QueryCommandInput) => unknown;
}

export interface DynamoDBChannelBindingStoreConfig {
  tableName: string;
  channelIndexName?: string;
}

export interface BindChannelInput {
  channel: ChannelType;
  channelIdentifier: string;
  status?: 'active' | 'suspended' | 'revoked';
  metadata?: Record<string, unknown>;
}

export interface ChannelLookupResult {
  identityId: IdentityId;
  binding: ChannelBinding;
}

export interface ChannelBindingStore {
  bind(identityId: IdentityId, input: BindChannelInput): Promise<ChannelBinding>;
  unbind(identityId: IdentityId, channel: ChannelType, channelIdentifier: string): Promise<void>;
  getBindingsForIdentity(identityId: IdentityId): Promise<ChannelBinding[]>;
  findIdentityByChannel(
    channel: ChannelType,
    channelIdentifier: string
  ): Promise<ChannelLookupResult | null>;
  updateStatus(
    identityId: IdentityId,
    channel: ChannelType,
    channelIdentifier: string,
    status: 'active' | 'suspended' | 'revoked'
  ): Promise<void>;
}

function buildIdentityPK(identityId: IdentityId): string {
  return `IDENTITY#${identityId}`;
}

function buildChannelSK(channel: ChannelType, channelIdentifier: string): string {
  return `CHANNEL#${channel}#${channelIdentifier}`;
}

function buildChannelLookupKey(channel: ChannelType, channelIdentifier: string): string {
  return `CHANNEL#${channel}#${channelIdentifier}`;
}

export class DynamoDBChannelBindingStore implements ChannelBindingStore {
  private readonly client: DynamoDBDocumentClient;
  private readonly config: DynamoDBChannelBindingStoreConfig;
  private readonly commands: ChannelBindingCommandFactories;

  constructor(
    client: DynamoDBDocumentClient,
    config: DynamoDBChannelBindingStoreConfig,
    commands: ChannelBindingCommandFactories
  ) {
    this.client = client;
    this.config = config;
    this.commands = commands;
  }

  async bind(identityId: IdentityId, input: BindChannelInput): Promise<ChannelBinding> {
    const now = new Date().toISOString();
    const binding: ChannelBinding = {
      channel: input.channel,
      channelIdentifier: input.channelIdentifier,
      boundAt: now,
      status: input.status ?? 'active',
    };

    if (input.metadata) binding.metadata = input.metadata;

    const pk = buildIdentityPK(identityId);
    const sk = buildChannelSK(input.channel, input.channelIdentifier);
    const channelLookup = buildChannelLookupKey(input.channel, input.channelIdentifier);

    const item: Record<string, unknown> = {
      PK: pk,
      SK: sk,
      channel_lookup: channelLookup,
      identity_lookup: pk,
      channel: binding.channel,
      channelIdentifier: binding.channelIdentifier,
      boundAt: binding.boundAt,
      status: binding.status,
    };

    if (binding.metadata) item['metadata'] = binding.metadata;

    const command = this.commands.createPutCommand({
      TableName: this.config.tableName,
      Item: item,
    });

    await this.client.send(command);
    return binding;
  }

  async unbind(identityId: IdentityId, channel: ChannelType, channelIdentifier: string): Promise<void> {
    const pk = buildIdentityPK(identityId);
    const sk = buildChannelSK(channel, channelIdentifier);

    const command = this.commands.createDeleteCommand({
      TableName: this.config.tableName,
      Key: { PK: pk, SK: sk },
    });

    await this.client.send(command);
  }

  async getBindingsForIdentity(identityId: IdentityId): Promise<ChannelBinding[]> {
    const pk = buildIdentityPK(identityId);

    const command = this.commands.createQueryCommand({
      TableName: this.config.tableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: { '#pk': 'PK', '#sk': 'SK' },
      ExpressionAttributeValues: { ':pk': pk, ':skPrefix': 'CHANNEL#' },
    });

    const response = (await this.client.send(command)) as QueryCommandOutput;
    if (!response.Items) return [];
    return response.Items.map((item) => this.itemToBinding(item));
  }

  async findIdentityByChannel(
    channel: ChannelType,
    channelIdentifier: string
  ): Promise<ChannelLookupResult | null> {
    const channelLookup = buildChannelLookupKey(channel, channelIdentifier);
    const indexName = this.config.channelIndexName ?? 'ChannelIndex';

    const command = this.commands.createQueryCommand({
      TableName: this.config.tableName,
      IndexName: indexName,
      KeyConditionExpression: '#cl = :cl',
      ExpressionAttributeNames: { '#cl': 'channel_lookup' },
      ExpressionAttributeValues: { ':cl': channelLookup },
      Limit: 1,
    });

    const response = (await this.client.send(command)) as QueryCommandOutput;
    if (!response.Items || response.Items.length === 0) return null;

    const item = response.Items[0];
    if (!item) return null;

    const pk = item['PK'] as string;
    const identityId = pk.replace('IDENTITY#', '');

    return { identityId, binding: this.itemToBinding(item) };
  }

  async updateStatus(
    identityId: IdentityId,
    channel: ChannelType,
    channelIdentifier: string,
    status: 'active' | 'suspended' | 'revoked'
  ): Promise<void> {
    const pk = buildIdentityPK(identityId);
    const sk = buildChannelSK(channel, channelIdentifier);

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      ConditionExpression: 'attribute_exists(PK)',
    });

    await this.client.send(command);
  }

  private itemToBinding(item: Record<string, unknown>): ChannelBinding {
    const binding: ChannelBinding = {
      channel: item['channel'] as ChannelType,
      channelIdentifier: item['channelIdentifier'] as string,
      boundAt: item['boundAt'] as string,
      status: item['status'] as 'active' | 'suspended' | 'revoked',
    };

    if (item['metadata']) binding.metadata = item['metadata'] as Record<string, unknown>;

    return binding;
  }
}

export class InMemoryChannelBindingStore implements ChannelBindingStore {
  private readonly bindingsByIdentity = new Map<IdentityId, ChannelBinding[]>();
  private readonly identityByChannel = new Map<string, IdentityId>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async bind(identityId: IdentityId, input: BindChannelInput): Promise<ChannelBinding> {
    const now = new Date().toISOString();
    const binding: ChannelBinding = {
      channel: input.channel,
      channelIdentifier: input.channelIdentifier,
      boundAt: now,
      status: input.status ?? 'active',
    };
    if (input.metadata) binding.metadata = input.metadata;

    const bindings = this.bindingsByIdentity.get(identityId) ?? [];
    const filtered = bindings.filter(
      (b) => !(b.channel === input.channel && b.channelIdentifier === input.channelIdentifier)
    );
    filtered.push(binding);
    this.bindingsByIdentity.set(identityId, filtered);

    const lookupKey = buildChannelLookupKey(input.channel, input.channelIdentifier);
    this.identityByChannel.set(lookupKey, identityId);

    return binding;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unbind(identityId: IdentityId, channel: ChannelType, channelIdentifier: string): Promise<void> {
    const bindings = this.bindingsByIdentity.get(identityId) ?? [];
    const filtered = bindings.filter(
      (b) => !(b.channel === channel && b.channelIdentifier === channelIdentifier)
    );
    if (filtered.length > 0) {
      this.bindingsByIdentity.set(identityId, filtered);
    } else {
      this.bindingsByIdentity.delete(identityId);
    }
    const lookupKey = buildChannelLookupKey(channel, channelIdentifier);
    this.identityByChannel.delete(lookupKey);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getBindingsForIdentity(identityId: IdentityId): Promise<ChannelBinding[]> {
    return this.bindingsByIdentity.get(identityId) ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findIdentityByChannel(
    channel: ChannelType,
    channelIdentifier: string
  ): Promise<ChannelLookupResult | null> {
    const lookupKey = buildChannelLookupKey(channel, channelIdentifier);
    const identityId = this.identityByChannel.get(lookupKey);
    if (!identityId) return null;

    const bindings = this.bindingsByIdentity.get(identityId) ?? [];
    const binding = bindings.find(
      (b) => b.channel === channel && b.channelIdentifier === channelIdentifier
    );
    if (!binding) return null;

    return { identityId, binding };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateStatus(
    identityId: IdentityId,
    channel: ChannelType,
    channelIdentifier: string,
    status: 'active' | 'suspended' | 'revoked'
  ): Promise<void> {
    const bindings = this.bindingsByIdentity.get(identityId);
    if (!bindings) throw new Error(`No bindings found for identity: ${identityId}`);

    const binding = bindings.find(
      (b) => b.channel === channel && b.channelIdentifier === channelIdentifier
    );
    if (!binding) {
      throw new Error(`Binding not found: ${channel}/${channelIdentifier} for identity ${identityId}`);
    }
    binding.status = status;
  }

  clear(): void {
    this.bindingsByIdentity.clear();
    this.identityByChannel.clear();
  }
}
