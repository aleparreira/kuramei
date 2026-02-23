/**
 * Kuramei Agent Processor — AWS Lambda entry point
 *
 * Receives an invocation from webhook-handler (InvocationType: Event),
 * resolves the user's identity, loads/creates their session, runs the
 * AgentClient with the generate_ui tool, and sends the reply via WhatsApp.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { DynamoDBSessionManager } from '@kuramei/conversation';
import type {
  ChannelBindingCommandFactories,
  GetCommandInput as PresenceGetCommandInput,
  PutCommandInput as PresencePutCommandInput,
  UpdateCommandInput as PresenceUpdateCommandInput,
  DeleteCommandInput as PresenceDeleteCommandInput,
  QueryCommandInput as PresenceQueryCommandInput,
} from '@kuramei/presence';
import {
  DynamoDBIdentityStore,
  DynamoDBChannelBindingStore,
  IdentityResolver,
} from '@kuramei/presence';
import { DefaultAgentClient, OpenRouterProvider } from '@kuramei/agent';
import type { Tool, ToolContext as AgentToolContext } from '@kuramei/agent';
import { generateUiTool } from '@kuramei/tools';
import type { ToolDefinition, ToolContext as SDKToolContext } from '@kuramei/tools';
import { TenantBoundSender } from '@kuramei/whatsapp';
import type { Tenant, SecretsProvider } from '@kuramei/whatsapp';

// ============================================================================
// Lambda event type (sent by webhook-handler via InvocationType: Event)
// ============================================================================

export interface AgentProcessorEvent {
  from: string;
  phoneNumberId: string;
  messageText: string;
  profileName?: string;
  correlationId: string;
}

// ============================================================================
// Environment helpers
// ============================================================================

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// ============================================================================
// Simple env-based secrets provider (Phase 0 — no Secrets Manager needed)
// The whatsappTokenSecret field in Tenant holds the env var name to read.
// ============================================================================

class EnvSecretsProvider implements SecretsProvider {
  async getSecret(secretId: string): Promise<string> {
    const value = process.env[secretId];
    if (!value) throw new Error(`Secret not found in environment: ${secretId}`);
    return value;
  }
}

// ============================================================================
// Tool adapter: ToolDefinition (SDK) → Tool (agent)
// Maps @kuramei/tools ToolContext ↔ @kuramei/agent ToolContext
// ============================================================================

function adaptTool(def: ToolDefinition): Tool {
  const tool: Tool = {
    name: def.name,
    description: def.description,
    // @kuramei/tools JSONSchema allows "null" type; @kuramei/agent does not.
    // The schemas used by generate_ui never use "null", so this cast is safe.
    inputSchema: def.inputSchema as Tool['inputSchema'],
    execute: async (input: unknown, agentCtx: AgentToolContext) => {
      const sdkCtx: SDKToolContext = {
        sessionId: agentCtx.session.userId,
        userId: agentCtx.from ?? agentCtx.session.userId,
        correlationId: agentCtx.correlationId,
        facts: agentCtx.session.facts,
      };
      return def.handler(input, sdkCtx);
    },
  };
  // exactOptionalPropertyTypes: only set optional property if defined
  if (def.requiresApproval !== undefined) tool.requiresApproval = def.requiresApproval;
  return tool;
}

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_PROMPT = `Você é Kuramei, assistente pessoal via WhatsApp.

Quando o usuário pedir para navegar até algum lugar ou precisar de um mapa, use a ferramenta generate_ui com type="navigation" e version="1.0" para gerar uma página de navegação. Responda com o link gerado.

Seja breve e direto. Responda sempre em português brasileiro.`;

// ============================================================================
// DynamoDB command factories
//
// Bridges the internal DynamoDB interfaces (presence/conversation packages)
// with the actual @aws-sdk/lib-dynamodb commands. Input types are structurally
// compatible at runtime — `any` casts are safe at this integration boundary.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInput = any;

function buildCommandFactories(): ChannelBindingCommandFactories {
  return {
    // Presence/conversation packages define their own GetCommandInput etc.
    // AWS SDK command types are a strict superset, so the casts are safe.
    createGetCommand: (input: PresenceGetCommandInput) => new GetCommand(input as AnyInput),
    createPutCommand: (input: PresencePutCommandInput) => new PutCommand(input as AnyInput),
    createUpdateCommand: (input: PresenceUpdateCommandInput) =>
      new UpdateCommand(input as AnyInput),
    createDeleteCommand: (input: PresenceDeleteCommandInput) =>
      new DeleteCommand(input as AnyInput),
    createQueryCommand: (input: PresenceQueryCommandInput) => new QueryCommand(input as AnyInput),
  };
}

// ============================================================================
// Handler
// ============================================================================

export const handler = async (event: AgentProcessorEvent): Promise<void> => {
  const { from, messageText, profileName, correlationId } = event;

  const tableName = getEnv('DYNAMODB_TABLE_NAME');

  // Build DynamoDB client — Lambda IAM role grants table access
  const ddbRaw = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(ddbRaw, {
    marshallOptions: { removeUndefinedValues: true },
  });

  const commands = buildCommandFactories();

  // Identity stores
  const identityStore = new DynamoDBIdentityStore(ddb, { tableName }, commands);
  const channelBindingStore = new DynamoDBChannelBindingStore(ddb, { tableName }, commands);
  const identityResolver = new IdentityResolver({ identityStore, channelBindingStore });

  // Resolve identity — creates a new identity if first interaction
  const resolutionContext = {
    channel: 'whatsapp' as const,
    channelIdentifier: from,
    ...(profileName !== undefined ? { metadata: { profileName } } : {}),
  };
  const { identity } = await identityResolver.resolve(resolutionContext);

  // Session manager
  const sessionManager = new DynamoDBSessionManager(ddb, { tableName }, commands);
  const session = await sessionManager.getOrCreate('kuramei', identity.id);

  // Agent
  const provider = new OpenRouterProvider({
    apiKey: getEnv('OPENROUTER_API_KEY'),
  });

  const agentClient = new DefaultAgentClient({ provider });

  const tools: Tool[] = [adaptTool(generateUiTool)];

  const agentResponse = await agentClient.process({
    session,
    message: messageText,
    tools,
    systemPrompt: SYSTEM_PROMPT,
    correlationId,
  });

  // Persist updated session
  await sessionManager.update(agentResponse.session);

  // Send WhatsApp reply
  const replyText = agentResponse.content;
  if (replyText) {
    const kurameiTenant: Tenant = {
      id: 'kuramei',
      name: 'Kuramei',
      appType: 'whatsapp',
      systemPrompt: SYSTEM_PROMPT,
      config: {},
      whatsappPhoneId: getEnv('WHATSAPP_PHONE_NUMBER_ID'),
      // EnvSecretsProvider reads this env var name to get the token
      whatsappTokenSecret: 'WHATSAPP_ACCESS_TOKEN',
    };

    const sender = new TenantBoundSender(kurameiTenant, new EnvSecretsProvider());
    await sender.sendText(from, replyText);
  }
};
