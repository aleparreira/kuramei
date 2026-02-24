/**
 * @kuramei/agent-core — processMessage
 *
 * Framework-agnostic message processing function.
 * Used by both the Lambda (agent-processor) and the local simulator (simulator-api).
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
import type { ToolDefinition, ToolContext as SDKToolContext } from '@kuramei/tools';
import { buildSystemPrompt } from '@kuramei/sdk';
import { navigationExperience } from '@kuramei/experience-navigation';
import { reminderExperience } from '@kuramei/experience-reminder';
import { currencyExperience } from '@kuramei/experience-currency';
import { weatherExperience } from '@kuramei/experience-weather';

// ============================================================================
// Public types
// ============================================================================

export interface AgentCoreConfig {
  openRouterApiKey: string;
  dynamoDbTable: string;
  remindersTable: string;
  cloudflareAccountId: string;
  cloudflareKvNamespaceId: string;
  cloudflareApiToken: string;
  kurameiJwtSecret: string;
  kurameiBaseUrl: string;
}

export interface AgentResponse {
  text: string;
  uiLink?: string;
}

// ============================================================================
// DynamoDB command factories
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInput = any;

function buildCommandFactories(): ChannelBindingCommandFactories {
  return {
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
// Tool adapter: ToolDefinition (SDK) -> Tool (agent)
// ============================================================================

function adaptTool(def: ToolDefinition): Tool {
  const tool: Tool = {
    name: def.name,
    description: def.description,
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
  if (def.requiresApproval !== undefined) tool.requiresApproval = def.requiresApproval;
  return tool;
}

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_PROMPT_BASE =
  'Voce eh o Kuramei, assistente pessoal via WhatsApp. Responde sempre em PT-BR.\n' +
  'Quando gerar uma UI, sempre acompanhe o link com texto contextual e amigavel.\n' +
  'Nunca invente informacoes - se nao souber, diga que nao sabe.';

const experiences = [navigationExperience, reminderExperience, weatherExperience, currencyExperience];

const SYSTEM_PROMPT = buildSystemPrompt(SYSTEM_PROMPT_BASE, experiences);

// ============================================================================
// processMessage
// ============================================================================

/**
 * Process an incoming user message and return an agent response.
 *
 * Handles: identity resolution, session management, LLM call with tools,
 * and session persistence. Does NOT send any external messages - that is
 * the caller's responsibility.
 *
 * Config values are applied to environment variables so that downstream
 * packages (kv-client, experience packages) can read them.
 */
export async function processMessage(
  userId: string,
  message: string,
  config: AgentCoreConfig,
): Promise<AgentResponse> {
  // Apply config to env vars so downstream packages pick them up.
  process.env['OPENROUTER_API_KEY'] = config.openRouterApiKey;
  process.env['DYNAMODB_TABLE'] = config.dynamoDbTable;
  process.env['REMINDERS_TABLE'] = config.remindersTable;
  process.env['CLOUDFLARE_ACCOUNT_ID'] = config.cloudflareAccountId;
  process.env['CLOUDFLARE_KV_NAMESPACE_ID'] = config.cloudflareKvNamespaceId;
  process.env['CLOUDFLARE_API_TOKEN'] = config.cloudflareApiToken;
  process.env['KURAMEI_JWT_SECRET'] = config.kurameiJwtSecret;
  process.env['KURAMEI_BASE_URL'] = config.kurameiBaseUrl;

  const ddbRaw = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(ddbRaw, {
    marshallOptions: { removeUndefinedValues: true },
  });

  const commands = buildCommandFactories();
  const tableName = config.dynamoDbTable;

  // Identity resolution
  const identityStore = new DynamoDBIdentityStore(ddb, { tableName }, commands);
  const channelBindingStore = new DynamoDBChannelBindingStore(ddb, { tableName }, commands);
  const identityResolver = new IdentityResolver({ identityStore, channelBindingStore });

  await identityResolver.resolve({
    channel: 'whatsapp' as const,
    channelIdentifier: userId,
  });

  // Session
  const sessionManager = new DynamoDBSessionManager(ddb, { tableName }, commands);
  const session = await sessionManager.getOrCreate('kuramei', userId);

  // Agent
  const provider = new OpenRouterProvider({ apiKey: config.openRouterApiKey });
  const agentClient = new DefaultAgentClient({ provider });

  const tools: Tool[] = experiences.flatMap((exp) => exp.tools.map(adaptTool));

  const correlationId = `proc-${Date.now()}`;
  const agentResult = await agentClient.process({
    session,
    message,
    tools,
    systemPrompt: SYSTEM_PROMPT,
    correlationId,
  });

  await sessionManager.update(agentResult.session);

  const text = agentResult.content ?? '';

  // Extract UI link from text if present (generate_ui embeds it inline)
  const urlMatch = /https?:\/\/\S+\/ui\/\S+/.exec(text);
  const result: AgentResponse = { text };
  if (urlMatch) result.uiLink = urlMatch[0];

  return result;
}
