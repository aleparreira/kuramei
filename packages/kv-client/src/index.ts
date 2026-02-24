/**
 * @kuramei/kv-client
 *
 * DynamoDB-based KV store for UI spec storage.
 *
 * Replaces the previous Cloudflare KV REST API implementation.
 * Uses the existing DYNAMODB_TABLE (kuramei-main) with a UI_SPEC# key prefix.
 *
 * Schema:
 *   PK: UI_SPEC#<key>
 *   SK: #DATA
 *   v:   string (the stored value)
 *   ttl: number (Unix timestamp for DynamoDB TTL auto-expiry)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function getClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region: process.env['AWS_REGION'] ?? 'sa-east-1' });
  return DynamoDBDocumentClient.from(client);
}

function tableName(): string {
  return getEnv('DYNAMODB_TABLE');
}

function pk(key: string): string {
  return `UI_SPEC#${key}`;
}

export async function put(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = getClient();
  const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        PK: pk(key),
        SK: '#DATA',
        v: value,
        ttl,
      },
    })
  );
}

export async function get(key: string): Promise<string | null> {
  const client = getClient();

  const result = await client.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: pk(key), SK: '#DATA' },
    })
  );

  if (!result.Item) return null;

  // Check if TTL has expired (DynamoDB may not delete instantly)
  const ttl = result.Item['ttl'] as number | undefined;
  if (ttl !== undefined && ttl < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return (result.Item['v'] as string) ?? null;
}

export async function del(key: string): Promise<void> {
  const client = getClient();

  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: { PK: pk(key), SK: '#DATA' },
    })
  );
}
