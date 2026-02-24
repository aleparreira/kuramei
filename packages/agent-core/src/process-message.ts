/**
 * @kuramei/agent-core — processMessage
 *
 * Framework-agnostic message processing function.
 * Used by both the Lambda (agent-processor) and the local simulator (simulator-api).
 */

import { randomUUID } from 'node:crypto';
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
import { DefaultAgentClient, OpenRouterProvider, DEEPSEEK_CONFIG } from '@kuramei/agent';
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
  /** DeepSeek API key (or any OpenAI-compatible provider key) */
  llmApiKey: string;
  dynamoDbTable: string;
  remindersTable: string;
  conversationsTable: string;
  usersTable: string;
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
// User profile helpers
// ============================================================================

interface UserRecord {
  PK: string;
  SK: string;
  name: string | null;
  status: 'onboarding' | 'active';
  registeredAt: string;
}

async function getOrCreateUser(
  userId: string,
  usersTable: string,
  ddb: DynamoDBDocumentClient,
): Promise<UserRecord> {
  const pk = `USER#${userId}`;
  const sk = 'PROFILE';

  const result = await ddb.send(
    new GetCommand({ TableName: usersTable, Key: { PK: pk, SK: sk } }),
  );

  if (result.Item) {
    return result.Item as UserRecord;
  }

  const newUser: UserRecord = {
    PK: pk,
    SK: sk,
    name: null,
    status: 'onboarding',
    registeredAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: usersTable, Item: newUser }));
  return newUser;
}

async function activateUser(
  userId: string,
  usersTable: string,
  name: string,
  ddb: DynamoDBDocumentClient,
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: usersTable,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET #name = :name, #status = :status',
      ExpressionAttributeNames: { '#name': 'name', '#status': 'status' },
      ExpressionAttributeValues: { ':name': name, ':status': 'active' },
    }),
  );
}

/**
 * Sanitize and capitalize a user-provided name before persisting or injecting
 * into the system prompt. Strips characters outside the allowed set to prevent
 * prompt injection via the onboarding name field.
 *
 * Allowed: Unicode letters, spaces, hyphens, apostrophes (covers Brazilian
 * Portuguese names with accents, hyphens, and compound names).
 * Max length: 50 characters.
 */
function sanitizeName(raw: string): string {
  const trimmed = raw.trim().slice(0, 50);
  // Keep only letters (including accented), spaces, hyphens, apostrophes
  const clean = trimmed.replace(/[^\p{L}\s'\-]/gu, '').trim();
  if (!clean) return 'Usuário';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function persistConversationTurn(
  userId: string,
  convTable: string,
  userMessage: string,
  assistantMessage: string,
  ddb: DynamoDBDocumentClient,
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const nowIso = new Date().toISOString();
  // SK uses numeric role prefix (#0# = user, #1# = assistant) so user always
  // sorts before assistant within the same timestamp (lexicographic: '0' < '1').
  await Promise.all([
    ddb.send(
      new PutCommand({
        TableName: convTable,
        Item: {
          PK: `CONV#${userId}`,
          SK: `MSG#${nowIso}#0#${randomUUID()}`,
          role: 'user',
          content: userMessage,
          ttl,
        },
      }),
    ),
    ddb.send(
      new PutCommand({
        TableName: convTable,
        Item: {
          PK: `CONV#${userId}`,
          SK: `MSG#${nowIso}#1#${randomUUID()}`,
          role: 'assistant',
          content: assistantMessage,
          ttl,
        },
      }),
    ),
  ]);
}

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
  process.env['LLM_API_KEY'] = config.llmApiKey;
  process.env['DYNAMODB_TABLE'] = config.dynamoDbTable;
  process.env['REMINDERS_TABLE'] = config.remindersTable;
  process.env['CONVERSATIONS_TABLE'] = config.conversationsTable;
  process.env['USERS_TABLE'] = config.usersTable;
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

  // Conversation history (sliding window, newest 20 messages from kuramei-conversations)
  const convTable = config.conversationsTable;
  const historyResult = await ddb.send(
    new QueryCommand({
      TableName: convTable,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `CONV#${userId}`,
        ':skPrefix': 'MSG#',
      },
      Limit: 20,
      ScanIndexForward: false, // newest first
    }),
  );
  // Reverse to get chronological order, then map to Message[]
  const historyItems = (historyResult.Items ?? []).reverse();
  session.context = historyItems.map((item) => ({
    role: item['role'] as 'user' | 'assistant',
    content: item['content'] as string,
    // Extract ISO timestamp from SK: 'MSG#{ISO}#{uuid}' → split('#')[1]
    timestamp: (item['SK'] as string).split('#')[1] ?? new Date().toISOString(),
  }));

  // ── Onboarding flow (deterministic, no LLM) ──────────────────────────────
  const user = await getOrCreateUser(userId, config.usersTable, ddb);

  if (user.status === 'onboarding') {
    // Check if the last assistant message was the name-request prompt
    const lastAssistant = historyItems
      .filter((item) => item['role'] === 'assistant')
      .at(-1);

    const askedForName =
      lastAssistant !== undefined &&
      (lastAssistant['content'] as string).includes('Como posso te chamar');

    if (askedForName) {
      // Current message is the user's name — sanitize before persisting
      const name = sanitizeName(message);
      await activateUser(userId, config.usersTable, name, ddb);

      const responseText =
        `Oi, ${name}! Fico feliz em te conhecer 😊 ` +
        'Posso te ajudar com lembretes, navegação, clima, cotação de moeda, e muito mais. ' +
        'O que você precisa?';

      await persistConversationTurn(userId, convTable, message, responseText, ddb);
      return { text: responseText };
    }

    // First contact — return welcome prompt
    const responseText =
      'Olá! 👋 Sou o Kuramei, seu assistente pessoal via WhatsApp. Como posso te chamar?';

    await persistConversationTurn(userId, convTable, message, responseText, ddb);
    return { text: responseText };
  }
  // ── End onboarding ────────────────────────────────────────────────────────

  // Agent
  const provider = new OpenRouterProvider({ ...DEEPSEEK_CONFIG, apiKey: config.llmApiKey });
  const agentClient = new DefaultAgentClient({ provider });

  const tools: Tool[] = experiences.flatMap((exp) => exp.tools.map(adaptTool));

  // Inject user name into system prompt when known
  const systemPrompt =
    user.name !== null
      ? SYSTEM_PROMPT +
        `\nO nome do usuário é ${user.name}. Use o nome dele(a) nas respostas quando natural.`
      : SYSTEM_PROMPT;

  const correlationId = `proc-${Date.now()}`;
  const agentResult = await agentClient.process({
    session,
    message,
    tools,
    systemPrompt,
    correlationId,
  });

  await sessionManager.update(agentResult.session);

  const text = agentResult.content ?? '';

  // Persist conversation turn to kuramei-conversations (TTL = 30 days)
  await persistConversationTurn(userId, convTable, message, text, ddb);

  // Extract UI link from text if present (generate_ui embeds it inline)
  const uiPattern = /https?:\/\/\S+\/ui\/\S+/;
  const urlMatch = uiPattern.exec(text);
  const result: AgentResponse = { text };
  if (urlMatch) result.uiLink = urlMatch[0];

  return result;
}
