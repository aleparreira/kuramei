/**
 * @kuramei/agent - LLM integration and workflow execution
 */

export type {
  Tool,
  ToolContext,
  ToolResult,
  JSONSchema,
  LLMProvider,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ToolUse,
  ToolUseResult,
  UsageStats,
  AgentClient,
  AgentContext,
  AgentResponse,
  AgentResponseType,
  AgentConfig,
  ConfirmationRequest,
  WorkflowEngine,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowStep,
  ResponseCache,
  CachedResponse,
  CacheConfig,
} from './types.js';

export { DEFAULT_CACHE_CONFIG, DEFAULT_AGENT_CONFIG } from './types.js';

// LLM Providers
export type { AnthropicClient, ClaudeProviderConfig } from './llm/claude-provider.js';
export { ClaudeProvider, DEFAULT_CLAUDE_CONFIG } from './llm/claude-provider.js';

export type { OpenRouterProviderConfig } from './llm/openrouter-provider.js';
export { OpenRouterProvider, DEFAULT_OPENROUTER_CONFIG } from './llm/openrouter-provider.js';

export { LLMProviderError, LLMRateLimitError, LLMTimeoutError } from './llm/provider.js';

// Tool Executor
export { ToolExecutor, ToolExecutionError, ToolNotFoundError, ToolInputValidationError } from './tool-executor.js';
export type { ToolExecutorConfig, ToolExecutionResult } from './tool-executor.js';

// Workflow Engine
export { DefaultWorkflowEngine, WorkflowEvents, createWorkflowEvent } from './workflow-engine.js';

// Confirmation Handler
export { ConfirmationHandler, createConfirmationHandler } from './confirmation.js';
export type { ConfirmationConfig, ConfirmationCheckResult } from './confirmation.js';

// Cache
export type { CacheDynamoDBDocumentClient, CacheDynamoDBCommandFactories, DynamoDBResponseCacheConfig } from './cache/index.js';
export { DynamoDBResponseCache, InMemoryResponseCache, buildCacheKey, shouldCacheResponse } from './cache/index.js';

// Agent Client
export { DefaultAgentClient, createAgentClient, AgentProcessingError } from './agent-client.js';
