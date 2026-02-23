/**
 * Kuramei Reminder Scheduler — AWS Lambda entry point
 *
 * Triggered every minute by EventBridge (rate(1 minute)).
 * Queries the kuramei-reminders GSI for pending reminders whose `when`
 * has passed, sends a WhatsApp notification, and updates the status.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TenantBoundSender } from '@kuramei/whatsapp';
import type { Tenant, SecretsProvider } from '@kuramei/whatsapp';

// ============================================================================
// Types
// ============================================================================

interface ReminderItem {
  PK: string;
  SK: string;
  text: string;
  when: string;
  phoneNumber?: string;
  status: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

class EnvSecretsProvider implements SecretsProvider {
  async getSecret(secretId: string): Promise<string> {
    const value = process.env[secretId];
    if (!value) throw new Error(`Secret not found in environment: ${secretId}`);
    return value;
  }
}

// ============================================================================
// Core logic
// ============================================================================

async function processReminder(
  item: ReminderItem,
  sender: TenantBoundSender,
  ddb: DynamoDBDocumentClient,
  table: string
): Promise<void> {
  const { PK, SK, text, phoneNumber } = item;

  if (!phoneNumber) {
    console.error('Reminder missing phoneNumber, skipping', { PK, SK });
    return;
  }

  let newStatus = 'triggered';
  let timestampField = 'triggeredAt';

  try {
    const result = await sender.sendText(phoneNumber, `⏰ Lembrete: *${text}*`);
    if (!result.success) {
      console.error('Failed to send reminder WhatsApp message', { PK, SK, error: result.error });
      newStatus = 'failed';
      timestampField = 'failedAt';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('sendText threw unexpectedly', { PK, SK, error: msg });
    newStatus = 'failed';
    timestampField = 'failedAt';
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { PK, SK },
        UpdateExpression: 'SET #status = :status, #ts = :ts',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#ts': timestampField,
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':ts': new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to update reminder status in DynamoDB', { PK, SK, error: msg });
  }
}

// ============================================================================
// Lambda handler
// ============================================================================

export const handler = async (): Promise<void> => {
  const table = getEnv('REMINDERS_TABLE');
  const phoneNumberId = getEnv('WHATSAPP_PHONE_NUMBER_ID');

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });

  const now = new Date().toISOString();

  const response = await ddb.send(
    new QueryCommand({
      TableName: table,
      IndexName: 'status-when-index',
      KeyConditionExpression: '#status = :pending AND #when <= :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#when': 'when',
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
        ':now': now,
      },
      Limit: 25,
    })
  );

  const items = (response.Items ?? []) as ReminderItem[];

  if (items.length === 0) {
    console.log('No pending reminders to dispatch at', now);
    return;
  }

  console.log(`Dispatching ${items.length} reminder(s) at`, now);

  const tenant: Tenant = {
    id: 'kuramei',
    name: 'Kuramei',
    appType: 'whatsapp',
    systemPrompt: '',
    config: {},
    whatsappPhoneId: phoneNumberId,
    // EnvSecretsProvider reads WHATSAPP_ACCESS_TOKEN from process.env
    whatsappTokenSecret: 'WHATSAPP_ACCESS_TOKEN',
  };

  const sender = new TenantBoundSender(tenant, new EnvSecretsProvider());

  await Promise.all(items.map((item) => processReminder(item, sender, ddb, table)));
};
