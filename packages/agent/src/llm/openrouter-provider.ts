/**
 * OpenRouter LLM Provider
 *
 * OpenAI-compatible provider using OpenRouter API.
 * Primary model: deepseek/deepseek-chat
 * Fallback model: google/gemini-flash-1.5
 */

import type {
  LLMProvider,
  ChatRequest,
  ChatResponse,
  Tool,
  ToolUse,
  UsageStats,
} from '../types.js';
import { LLMProviderError, LLMRateLimitError, LLMTimeoutError } from './provider.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================================
// OpenAI-compatible API types
// ============================================================================

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    };
  };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface OpenRouterProviderConfig {
  /** API key */
  apiKey: string;
  /** Primary model (default: deepseek/deepseek-chat) */
  model?: string;
  /** Site URL for HTTP-Referer header */
  siteUrl?: string;
  /** App name for X-Title header */
  appTitle?: string;
  /** Default max tokens (default: 4096) */
  defaultMaxTokens?: number;
  /** Default temperature (default: 0.7) */
  defaultTemperature?: number;
  /** Request timeout in ms (default: 60000) */
  timeoutMs?: number;
}

export const DEFAULT_OPENROUTER_CONFIG = {
  model: 'deepseek/deepseek-chat',
  siteUrl: 'https://kuramei.ai',
  appTitle: 'Kuramei',
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
  timeoutMs: 60000,
} as const;

// ============================================================================
// Conversion helpers
// ============================================================================

function toOpenAITool(tool: Tool): OpenAITool {
  const parameters: OpenAITool['function']['parameters'] = { type: 'object' };
  if (tool.inputSchema.properties !== undefined) {
    parameters.properties = tool.inputSchema.properties as Record<string, unknown>;
  }
  if (tool.inputSchema.required !== undefined) {
    parameters.required = tool.inputSchema.required;
  }
  return {
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters },
  };
}

function buildOpenAIMessages(request: ChatRequest): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];

  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }

  // Add conversation messages (filter out system role since handled above)
  for (const msg of request.messages) {
    if (msg.role === 'system') continue;
    messages.push({ role: msg.role, content: msg.content });
  }

  // Append tool results from previous turn
  if (request.toolResults && request.toolResults.length > 0 && request.assistantToolUse) {
    // Add assistant message with tool_calls
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: request.assistantToolUse.map((tu) => ({
        id: tu.id,
        type: 'function' as const,
        function: {
          name: tu.name,
          arguments: JSON.stringify(tu.input),
        },
      })),
    });

    // Add tool result messages
    for (const result of request.toolResults) {
      messages.push({
        role: 'tool',
        content: result.content,
        tool_call_id: result.toolUseId,
      });
    }
  }

  return messages;
}

function extractToolUses(toolCalls: OpenAIToolCall[]): ToolUse[] {
  return toolCalls.map((tc) => {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    } catch {
      // malformed JSON from model - use empty object
    }
    return { id: tc.id, name: tc.function.name, input };
  });
}

// ============================================================================
// Provider implementation
// ============================================================================

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';
  readonly supportsToolCalling = true;
  readonly supportsPromptCaching = false;

  private readonly config: Required<OpenRouterProviderConfig>;

  constructor(config: OpenRouterProviderConfig) {
    this.config = { ...DEFAULT_OPENROUTER_CONFIG, ...config };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = buildOpenAIMessages(request);

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens ?? this.config.defaultMaxTokens,
      temperature: request.temperature ?? this.config.defaultTemperature,
    };

    if (request.tools && request.tools.length > 0) {
      body['tools'] = request.tools.map(toOpenAITool);
      body['tool_choice'] = 'auto';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.siteUrl,
          'X-Title': this.config.appTitle,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          (errorBody as { error?: { message?: string } }).error?.message ||
          `HTTP ${response.status}`;

        if (response.status === 429) {
          throw new LLMRateLimitError(this.name);
        }

        throw new LLMProviderError(errorMessage, this.name, String(response.status));
      }

      const data = (await response.json()) as OpenAIResponse;
      return this.toResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LLMProviderError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new LLMTimeoutError(this.name, this.config.timeoutMs);
        }
        if (error.message.toLowerCase().includes('timeout')) {
          throw new LLMTimeoutError(this.name, this.config.timeoutMs);
        }
        throw new LLMProviderError(error.message, this.name);
      }

      throw new LLMProviderError('Unknown error', this.name);
    }
  }

  private toResponse(response: OpenAIResponse): ChatResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new LLMProviderError('No choices in response', this.name);
    }

    const usage: UsageStats = {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    };

    const toolCalls = choice.message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const result: ChatResponse = {
        type: 'tool_use',
        toolUse: extractToolUses(toolCalls),
        usage,
        stopReason: 'tool_use',
      };
      if (choice.message.content != null) result.content = choice.message.content;
      return result;
    }

    const result: ChatResponse = {
      type: 'message',
      content: choice.message.content ?? '',
      usage,
    };
    if (choice.finish_reason === 'stop') result.stopReason = 'end_turn';
    return result;
  }
}
