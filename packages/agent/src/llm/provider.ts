/**
 * LLM Provider interface and error classes
 */

export type {
  LLMProvider,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  ToolUse,
  ToolUseResult,
  UsageStats,
  Tool,
} from '../types.js';

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class LLMRateLimitError extends LLMProviderError {
  constructor(
    provider: string,
    public readonly retryAfterMs?: number
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', true);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMTimeoutError extends LLMProviderError {
  constructor(
    provider: string,
    public readonly timeoutMs: number
  ) {
    super(`Request timed out after ${timeoutMs}ms for ${provider}`, provider, 'TIMEOUT', true);
    this.name = 'LLMTimeoutError';
  }
}
