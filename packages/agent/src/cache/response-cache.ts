/**
 * Response Cache implementations
 */

import { createHash } from 'crypto';
import type {
  ResponseCache,
  CachedResponse,
  ChatResponse,
  ChatMessage,
  Tool,
  CacheConfig,
} from '../types.js';
import { DEFAULT_CACHE_CONFIG } from '../types.js';

export function buildCacheKey(
  systemPrompt: string,
  messages: ChatMessage[],
  tools?: Tool[]
): string {
  const keyComponents = {
    systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: tools?.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  };
  return createHash('sha256').update(JSON.stringify(keyComponents)).digest('hex');
}

export function shouldCacheResponse(response: ChatResponse): boolean {
  if (response.type === 'tool_use') return false;
  if (response.stopReason === 'max_tokens') return false;
  return response.stopReason === 'end_turn';
}

export interface CacheDynamoDBDocumentClient {
  send(command: unknown): Promise<unknown>;
}

export interface CacheDynamoDBCommandFactories {
  createGetCommand: (input: { TableName: string; Key: Record<string, unknown> }) => unknown;
  createPutCommand: (input: { TableName: string; Item: Record<string, unknown> }) => unknown;
  createDeleteCommand: (input: { TableName: string; Key: Record<string, unknown> }) => unknown;
}

export interface DynamoDBResponseCacheConfig {
  tableName: string;
  cacheConfig?: Partial<CacheConfig>;
}

export class DynamoDBResponseCache implements ResponseCache {
  private readonly client: CacheDynamoDBDocumentClient;
  private readonly commands: CacheDynamoDBCommandFactories;
  private readonly tableName: string;
  private readonly config: CacheConfig;

  constructor(
    client: CacheDynamoDBDocumentClient,
    config: DynamoDBResponseCacheConfig,
    commands: CacheDynamoDBCommandFactories
  ) {
    this.client = client;
    this.tableName = config.tableName;
    this.commands = commands;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config.cacheConfig };
  }

  async get(systemPrompt: string, messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse | null> {
    if (!this.config.responseCaching) return null;

    const cacheKey = buildCacheKey(systemPrompt, messages, tools);
    const pk = `CACHE#${cacheKey}`;

    const command = this.commands.createGetCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: 'RESPONSE' },
    });

    const result = (await this.client.send(command)) as { Item?: Record<string, unknown> };
    if (!result.Item) return null;

    const expiresAt = result.Item['expiresAt'] as number;
    if (expiresAt < Math.floor(Date.now() / 1000)) return null;

    const cached = result.Item as unknown as CachedResponse & { PK: string; SK: string };
    return { ...cached.response, usage: { ...cached.response.usage, cacheHit: true } };
  }

  async set(
    systemPrompt: string,
    messages: ChatMessage[],
    tools: Tool[] | undefined,
    response: ChatResponse
  ): Promise<void> {
    if (!this.config.responseCaching) return;
    if (!shouldCacheResponse(response)) return;

    const cacheKey = buildCacheKey(systemPrompt, messages, tools);
    const pk = `CACHE#${cacheKey}`;
    const now = new Date();
    const expiresAt = Math.floor(now.getTime() / 1000) + this.config.responseTtlSeconds;

    const command = this.commands.createPutCommand({
      TableName: this.tableName,
      Item: { PK: pk, SK: 'RESPONSE', cacheKey, response, cachedAt: now.toISOString(), expiresAt },
    });

    await this.client.send(command);
  }

  clear(): Promise<void> {
    console.warn('DynamoDBResponseCache.clear() is a no-op. Use TTL for automatic cleanup.');
    return Promise.resolve();
  }
}

export class InMemoryResponseCache implements ResponseCache {
  private readonly cache = new Map<string, CachedResponse>();
  private readonly config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  get(systemPrompt: string, messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse | null> {
    if (!this.config.responseCaching) return Promise.resolve(null);

    const cacheKey = buildCacheKey(systemPrompt, messages, tools);
    const cached = this.cache.get(cacheKey);
    if (!cached) return Promise.resolve(null);

    const now = Math.floor(Date.now() / 1000);
    if (cached.expiresAt <= now) {
      this.cache.delete(cacheKey);
      return Promise.resolve(null);
    }

    return Promise.resolve({ ...cached.response, usage: { ...cached.response.usage, cacheHit: true } });
  }

  set(systemPrompt: string, messages: ChatMessage[], tools: Tool[] | undefined, response: ChatResponse): Promise<void> {
    if (!this.config.responseCaching) return Promise.resolve();
    if (!shouldCacheResponse(response)) return Promise.resolve();

    const cacheKey = buildCacheKey(systemPrompt, messages, tools);
    const now = new Date();
    const expiresAt = Math.floor(now.getTime() / 1000) + this.config.responseTtlSeconds;

    this.cache.set(cacheKey, { cacheKey, response, cachedAt: now.toISOString(), expiresAt });
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.cache.clear();
    return Promise.resolve();
  }

  size(): number {
    return this.cache.size;
  }
}
