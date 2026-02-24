/**
 * Kuramei Agent Processor - AWS Lambda entry point (thin wrapper)
 *
 * Receives an invocation from webhook-handler (InvocationType: Event),
 * delegates processing to @kuramei/agent-core, and sends the reply
 * via WhatsApp.
 */

import { processMessage } from '@kuramei/agent-core';
import type { AgentCoreConfig } from '@kuramei/agent-core';
import { TenantBoundSender } from '@kuramei/whatsapp';
import type { Tenant, SecretsProvider } from '@kuramei/whatsapp';

export interface AgentProcessorEvent {
  from: string;
  phoneNumberId: string;
  messageText: string;
  profileName?: string;
  correlationId: string;
}

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

export const handler = async (event: AgentProcessorEvent): Promise<void> => {
  const { from, phoneNumberId, messageText } = event;

  const config: AgentCoreConfig = {
    openRouterApiKey: getEnv('OPENROUTER_API_KEY'),
    dynamoDbTable: getEnv('DYNAMODB_TABLE'),
    remindersTable: getEnv('REMINDERS_TABLE'),
    cloudflareAccountId: getEnv('CLOUDFLARE_ACCOUNT_ID'),
    cloudflareKvNamespaceId: getEnv('CLOUDFLARE_KV_NAMESPACE_ID'),
    cloudflareApiToken: getEnv('CLOUDFLARE_API_TOKEN'),
    kurameiJwtSecret: getEnv('KURAMEI_JWT_SECRET'),
    kurameiBaseUrl: getEnv('KURAMEI_BASE_URL'),
  };

  const response = await processMessage(from, messageText, config);

  if (response.text) {
    const kurameiTenant: Tenant = {
      id: 'kuramei',
      name: 'Kuramei',
      appType: 'whatsapp',
      systemPrompt: '',
      config: {},
      whatsappPhoneId: phoneNumberId,
      whatsappTokenSecret: 'WHATSAPP_ACCESS_TOKEN',
    };

    const sender = new TenantBoundSender(kurameiTenant, new EnvSecretsProvider());
    try {
      const sendResult = await sender.sendText(from, response.text);
      if (!sendResult.success) {
        console.error('Failed to send WhatsApp reply', { from, error: sendResult.error });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('sendText threw unexpectedly', { from, error: msg });
    }
  }
};
