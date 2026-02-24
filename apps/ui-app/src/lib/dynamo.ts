import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

function getClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region: process.env['AWS_REGION'] ?? 'sa-east-1' });
  return DynamoDBDocumentClient.from(client);
}

export async function getUISpec(hash: string): Promise<string | null> {
  const table = process.env['DYNAMODB_TABLE'];
  if (!table) throw new Error('DYNAMODB_TABLE env var not set');

  const client = getClient();
  const result = await client.send(
    new GetCommand({
      TableName: table,
      Key: { PK: `UI_SPEC#${hash}`, SK: '#DATA' },
    })
  );

  if (!result.Item) return null;

  // Respect TTL even if DynamoDB hasn't deleted the item yet
  const ttl = result.Item['ttl'] as number | undefined;
  if (ttl !== undefined && ttl < Math.floor(Date.now() / 1000)) return null;

  return (result.Item['v'] as string) ?? null;
}
