/**
 * Agent domain types
 */

import type { Session as ConversationSession, Message as ConversationMessage } from '@kuramei/conversation';

export type Session = ConversationSession;
export type Message = ConversationMessage;

// ============================================================================
// Tool Types
// ============================================================================

export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolContext {
  session: Session;
  tenantId: string;
  correlationId: string;
  from?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  requiresApproval?: boolean;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolUseResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: Tool[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  toolResults?: ToolUseResult[];
  assistantToolUse?: ToolUse[];
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheHit?: boolean;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface ChatResponse {
  type: 'message' | 'tool_use';
  content?: string;
  toolUse?: ToolUse[];
  usage: UsageStats;
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}

export interface LLMProvider {
  name: string;
  supportsToolCalling: boolean;
  supportsPromptCaching: boolean;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentContext {
  session: Session;
  message: string;
  tools: Tool[];
  systemPrompt: string;
  correlationId: string;
}

export interface ConfirmationRequest {
  confirmationId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

export type AgentResponseType = 'message' | 'confirmation_request' | 'tool_executed';

export interface AgentResponse {
  type: AgentResponseType;
  content?: string;
  confirmationRequest?: ConfirmationRequest;
  toolResult?: {
    toolName: string;
    result: ToolResult;
  };
  session: Session;
  usage?: UsageStats;
}

export interface AgentClient {
  process(context: AgentContext): Promise<AgentResponse>;
  handleConfirmation(
    session: Session,
    approved: boolean,
    correlationId: string,
    tools: Tool[]
  ): Promise<AgentResponse>;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  complete: boolean;
  requiredFacts?: string[];
  nextStep?: string;
}

export type WorkflowEventType =
  | 'message_received'
  | 'tool_called'
  | 'tool_completed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'error';

export interface WorkflowEvent {
  type: WorkflowEventType;
  payload: Record<string, unknown>;
}

export interface WorkflowEngine {
  transition(session: Session, event: WorkflowEvent): Session;
  getCurrentStep(session: Session): WorkflowStep | undefined;
  getAvailableActions(session: Session): string[];
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheConfig {
  promptCaching: boolean;
  responseCaching: boolean;
  responseTtlSeconds: number;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  promptCaching: true,
  responseCaching: true,
  responseTtlSeconds: 3600,
};

export interface CachedResponse {
  cacheKey: string;
  response: ChatResponse;
  cachedAt: string;
  expiresAt: number;
}

export interface ResponseCache {
  get(
    systemPrompt: string,
    messages: ChatMessage[],
    tools?: Tool[]
  ): Promise<ChatResponse | null>;
  set(
    systemPrompt: string,
    messages: ChatMessage[],
    tools: Tool[] | undefined,
    response: ChatResponse
  ): Promise<void>;
  clear(): Promise<void>;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  provider: LLMProvider;
  cache?: ResponseCache;
  cacheConfig?: Partial<CacheConfig>;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  maxToolIterations?: number;
}

export const DEFAULT_AGENT_CONFIG = {
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
  maxToolIterations: 10,
} as const;
