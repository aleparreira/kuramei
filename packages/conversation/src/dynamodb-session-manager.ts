/**
 * DynamoDB implementation of SessionManager
 *
 * Table Design:
 * - PK: SESSION#kuramei#<user_id>  (hardcoded tenant 'kuramei')
 *
 * The tenantId parameter is accepted in the interface for compatibility
 * but defaults to 'kuramei' in the key builder.
 */

import type { Session, Message, SessionState, PendingApproval, SessionConfig } from './types.js';
import { DEFAULT_SESSION_CONFIG } from './types.js';
import type { SessionManager } from './session-manager.js';
import { addToContextWindow } from './context-window.js';

export interface DynamoDBDocumentClient {
  send(command: unknown): Promise<unknown>;
}

export interface GetCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
}

export interface GetCommandOutput {
  Item?: Record<string, unknown>;
}

export interface PutCommandInput {
  TableName: string;
  Item: Record<string, unknown>;
  ConditionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
}

export interface UpdateCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
  ConditionExpression?: string;
}

export interface DeleteCommandInput {
  TableName: string;
  Key: Record<string, unknown>;
}

export interface DynamoDBCommandFactories {
  createGetCommand: (input: GetCommandInput) => unknown;
  createPutCommand: (input: PutCommandInput) => unknown;
  createUpdateCommand: (input: UpdateCommandInput) => unknown;
  createDeleteCommand: (input: DeleteCommandInput) => unknown;
}

export interface DynamoDBSessionManagerConfig {
  tableName: string;
  sessionConfig?: Partial<SessionConfig>;
}

/**
 * Build partition key for a session
 * Always uses 'kuramei' as the tenant (single-tenant product)
 */
function buildSessionPK(userId: string): string {
  return `SESSION#kuramei#${userId}`;
}

export class DynamoDBSessionManager implements SessionManager {
  private readonly client: DynamoDBDocumentClient;
  private readonly config: DynamoDBSessionManagerConfig;
  private readonly commands: DynamoDBCommandFactories;
  private readonly sessionConfig: SessionConfig;

  constructor(
    client: DynamoDBDocumentClient,
    config: DynamoDBSessionManagerConfig,
    commands: DynamoDBCommandFactories
  ) {
    this.client = client;
    this.config = config;
    this.commands = commands;
    this.sessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      ...config.sessionConfig,
    };
  }

  async getOrCreate(tenantId: string, userId: string): Promise<Session> {
    const existing = await this.get(tenantId, userId);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const session: Session = {
      tenantId: 'kuramei',
      userId,
      state: 'idle',
      facts: {},
      context: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
    };

    await this.save(session);
    return session;
  }

  async get(_tenantId: string, userId: string): Promise<Session | null> {
    const pk = buildSessionPK(userId);

    const command = this.commands.createGetCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
    });

    const response = (await this.client.send(command)) as GetCommandOutput;

    if (!response.Item) {
      return null;
    }

    const session = this.itemToSession(response.Item);

    if (this.isExpired(session)) {
      await this.delete('kuramei', userId);
      return null;
    }

    return session;
  }

  async update(session: Session): Promise<void> {
    const now = new Date();
    const updatedSession: Session = {
      ...session,
      updatedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
    };

    await this.save(updatedSession);
  }

  async setState(_tenantId: string, userId: string, state: SessionState): Promise<void> {
    const pk = buildSessionPK(userId);
    const now = new Date();

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression: 'SET #state = :state, #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#state': 'state',
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':state': state,
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
  }

  async addMessage(_tenantId: string, userId: string, message: Message): Promise<void> {
    const session = await this.getOrCreate('kuramei', userId);

    const newContext = addToContextWindow(
      session.context,
      message,
      this.sessionConfig.contextWindowSize
    );

    const pk = buildSessionPK(userId);
    const now = new Date();

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression: 'SET #context = :context, #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#context': 'context',
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':context': newContext,
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
  }

  async setFact(_tenantId: string, userId: string, key: string, value: unknown): Promise<void> {
    const pk = buildSessionPK(userId);
    const now = new Date();

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression:
        'SET #facts.#key = :value, #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#facts': 'facts',
        '#key': key,
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':value': value,
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
  }

  async getFact(_tenantId: string, userId: string, key: string): Promise<unknown> {
    const session = await this.get('kuramei', userId);
    if (!session) {
      return undefined;
    }
    return session.facts[key];
  }

  async deleteFact(_tenantId: string, userId: string, key: string): Promise<void> {
    const pk = buildSessionPK(userId);
    const now = new Date();

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression: 'REMOVE #facts.#key SET #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#facts': 'facts',
        '#key': key,
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
  }

  async setPendingApproval(
    _tenantId: string,
    userId: string,
    approval: Omit<PendingApproval, 'requestedAt' | 'expiresAt'>
  ): Promise<PendingApproval> {
    const now = new Date();
    const fullApproval: PendingApproval = {
      ...approval,
      requestedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + this.sessionConfig.approvalTimeoutSeconds * 1000
      ).toISOString(),
    };

    const pk = buildSessionPK(userId);

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression:
        'SET #pendingApproval = :approval, #state = :state, #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#pendingApproval': 'pendingApproval',
        '#state': 'state',
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':approval': fullApproval,
        ':state': 'awaiting_approval',
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
    return fullApproval;
  }

  async getPendingApproval(_tenantId: string, userId: string): Promise<PendingApproval | null> {
    const session = await this.get('kuramei', userId);
    if (!session?.pendingApproval) {
      return null;
    }

    const expiresAt = new Date(session.pendingApproval.expiresAt);
    if (expiresAt < new Date()) {
      await this.clearPendingApproval('kuramei', userId);
      return null;
    }

    return session.pendingApproval;
  }

  async clearPendingApproval(_tenantId: string, userId: string): Promise<void> {
    const pk = buildSessionPK(userId);
    const now = new Date();

    const command = this.commands.createUpdateCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
      UpdateExpression:
        'REMOVE #pendingApproval SET #state = :state, #updatedAt = :updatedAt, #expiresAt = :expiresAt',
      ExpressionAttributeNames: {
        '#pendingApproval': 'pendingApproval',
        '#state': 'state',
        '#updatedAt': 'updatedAt',
        '#expiresAt': 'expires_at',
      },
      ExpressionAttributeValues: {
        ':state': 'idle',
        ':updatedAt': now.toISOString(),
        ':expiresAt': Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
      },
    });

    await this.client.send(command);
  }

  async delete(_tenantId: string, userId: string): Promise<void> {
    const pk = buildSessionPK(userId);

    const command = this.commands.createDeleteCommand({
      TableName: this.config.tableName,
      Key: { PK: pk },
    });

    await this.client.send(command);
  }

  private async save(session: Session): Promise<void> {
    const pk = buildSessionPK(session.userId);

    const item: Record<string, unknown> = {
      PK: pk,
      tenantId: 'kuramei',
      userId: session.userId,
      state: session.state,
      facts: session.facts,
      context: session.context,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expires_at: session.expiresAt,
    };

    if (session.pendingApproval) {
      item['pendingApproval'] = session.pendingApproval;
    }

    const command = this.commands.createPutCommand({
      TableName: this.config.tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  private itemToSession(item: Record<string, unknown>): Session {
    const session: Session = {
      tenantId: 'kuramei',
      userId: item['userId'] as string,
      state: item['state'] as SessionState,
      facts: (item['facts'] as Record<string, unknown>) ?? {},
      context: (item['context'] as Message[]) ?? [],
      createdAt: item['createdAt'] as string,
      updatedAt: item['updatedAt'] as string,
      expiresAt: item['expires_at'] as number,
    };

    if (item['pendingApproval']) {
      session.pendingApproval = item['pendingApproval'] as PendingApproval;
    }

    return session;
  }

  private isExpired(session: Session): boolean {
    const now = Math.floor(Date.now() / 1000);
    return session.expiresAt < now;
  }
}

export class InMemorySessionManager implements SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly sessionConfig: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    this.sessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      ...config,
    };
  }

  private buildKey(userId: string): string {
    return `kuramei:${userId}`;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getOrCreate(_tenantId: string, userId: string): Promise<Session> {
    const existing = await this.get('kuramei', userId);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const session: Session = {
      tenantId: 'kuramei',
      userId,
      state: 'idle',
      facts: {},
      context: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
    };

    const key = this.buildKey(userId);
    this.sessions.set(key, session);
    return session;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async get(_tenantId: string, userId: string): Promise<Session | null> {
    const key = this.buildKey(userId);
    const session = this.sessions.get(key);

    if (!session) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt < now) {
      this.sessions.delete(key);
      return null;
    }

    return session;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(session: Session): Promise<void> {
    const key = this.buildKey(session.userId);
    const now = new Date();

    const updatedSession: Session = {
      ...session,
      updatedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + this.sessionConfig.sessionTtlSeconds,
    };

    this.sessions.set(key, updatedSession);
  }

  async setState(_tenantId: string, userId: string, state: SessionState): Promise<void> {
    const session = await this.get('kuramei', userId);
    if (session) {
      session.state = state;
      await this.update(session);
    }
  }

  async addMessage(_tenantId: string, userId: string, message: Message): Promise<void> {
    const session = await this.getOrCreate('kuramei', userId);
    session.context = addToContextWindow(
      session.context,
      message,
      this.sessionConfig.contextWindowSize
    );
    await this.update(session);
  }

  async setFact(_tenantId: string, userId: string, key: string, value: unknown): Promise<void> {
    const session = await this.getOrCreate('kuramei', userId);
    session.facts[key] = value;
    await this.update(session);
  }

  async getFact(_tenantId: string, userId: string, key: string): Promise<unknown> {
    const session = await this.get('kuramei', userId);
    if (!session) {
      return undefined;
    }
    return session.facts[key];
  }

  async deleteFact(_tenantId: string, userId: string, key: string): Promise<void> {
    const session = await this.get('kuramei', userId);
    if (session) {
      delete session.facts[key];
      await this.update(session);
    }
  }

  async setPendingApproval(
    _tenantId: string,
    userId: string,
    approval: Omit<PendingApproval, 'requestedAt' | 'expiresAt'>
  ): Promise<PendingApproval> {
    const session = await this.getOrCreate('kuramei', userId);
    const now = new Date();

    const fullApproval: PendingApproval = {
      ...approval,
      requestedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + this.sessionConfig.approvalTimeoutSeconds * 1000
      ).toISOString(),
    };

    session.pendingApproval = fullApproval;
    session.state = 'awaiting_approval';
    await this.update(session);

    return fullApproval;
  }

  async getPendingApproval(_tenantId: string, userId: string): Promise<PendingApproval | null> {
    const session = await this.get('kuramei', userId);
    if (!session?.pendingApproval) {
      return null;
    }

    const expiresAt = new Date(session.pendingApproval.expiresAt);
    if (expiresAt < new Date()) {
      await this.clearPendingApproval('kuramei', userId);
      return null;
    }

    return session.pendingApproval;
  }

  async clearPendingApproval(_tenantId: string, userId: string): Promise<void> {
    const session = await this.get('kuramei', userId);
    if (session) {
      delete session.pendingApproval;
      session.state = 'idle';
      await this.update(session);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(_tenantId: string, userId: string): Promise<void> {
    const key = this.buildKey(userId);
    this.sessions.delete(key);
  }

  clear(): void {
    this.sessions.clear();
  }
}
