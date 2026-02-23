/**
 * Claude LLM Provider implementation
 */

import type {
  LLMProvider,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  Tool,
  ToolUse,
  UsageStats,
} from '../types.js';
import { LLMProviderError, LLMRateLimitError, LLMTimeoutError } from './provider.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[] | string;
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  tools?: AnthropicTool[];
  temperature?: number;
}

export interface AnthropicClient {
  messages: {
    create(request: AnthropicRequest, options?: { headers?: Record<string, string> }): Promise<AnthropicResponse>;
  };
}

export interface ClaudeProviderConfig {
  model?: string;
  promptCaching?: boolean;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  timeoutMs?: number;
}

export const DEFAULT_CLAUDE_CONFIG: Required<ClaudeProviderConfig> = {
  model: 'claude-sonnet-4-20250514',
  promptCaching: true,
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
  timeoutMs: 30000,
};

function toAnthropicTool(tool: Tool): AnthropicTool {
  const inputSchema: AnthropicTool['input_schema'] = { type: 'object' };
  if (tool.inputSchema.properties !== undefined) {
    inputSchema.properties = tool.inputSchema.properties as Record<string, unknown>;
  }
  if (tool.inputSchema.required !== undefined) {
    inputSchema.required = tool.inputSchema.required;
  }
  return { name: tool.name, description: tool.description, input_schema: inputSchema };
}

function toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

function buildMessagesWithToolResults(
  messages: ChatMessage[],
  toolResults?: ChatRequest['toolResults'],
  assistantToolUse?: ChatRequest['assistantToolUse']
): AnthropicMessage[] {
  const anthropicMessages = toAnthropicMessages(messages);

  if (!toolResults || toolResults.length === 0) return anthropicMessages;

  if (assistantToolUse && assistantToolUse.length > 0) {
    const toolUseContent: AnthropicContent[] = assistantToolUse.map((tu) => ({
      type: 'tool_use' as const,
      id: tu.id,
      name: tu.name,
      input: tu.input,
    }));
    anthropicMessages.push({ role: 'assistant', content: toolUseContent });
  }

  const toolResultContent: AnthropicContent[] = toolResults.map((result) => {
    const content: AnthropicContent = {
      type: 'tool_result',
      tool_use_id: result.toolUseId,
      content: result.content,
    };
    if (result.isError === true) return { ...content, is_error: true };
    return content;
  });

  anthropicMessages.push({ role: 'user', content: toolResultContent });
  return anthropicMessages;
}

function extractToolUses(content: AnthropicContent[]): ToolUse[] {
  return content
    .filter((c): c is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
      c.type === 'tool_use'
    )
    .map((c) => ({ id: c.id, name: c.name, input: c.input }));
}

function extractTextContent(content: AnthropicContent[]): string {
  return content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('');
}

function toUsageStats(usage: AnthropicResponse['usage']): UsageStats {
  const stats: UsageStats = {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheHit: (usage.cache_read_input_tokens ?? 0) > 0,
  };
  if (usage.cache_read_input_tokens !== undefined) stats.cacheReadTokens = usage.cache_read_input_tokens;
  if (usage.cache_creation_input_tokens !== undefined) stats.cacheCreationTokens = usage.cache_creation_input_tokens;
  return stats;
}

function toStopReason(
  stopReason: AnthropicResponse['stop_reason']
): 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | undefined {
  switch (stopReason) {
    case 'end_turn': return 'end_turn';
    case 'tool_use': return 'tool_use';
    case 'max_tokens': return 'max_tokens';
    case 'stop_sequence': return 'stop_sequence';
    default: return undefined;
  }
}

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly supportsToolCalling = true;
  readonly supportsPromptCaching: boolean;

  private readonly client: AnthropicClient;
  private readonly config: Required<ClaudeProviderConfig>;

  constructor(client: AnthropicClient, config?: ClaudeProviderConfig) {
    this.client = client;
    this.config = { ...DEFAULT_CLAUDE_CONFIG, ...config };
    this.supportsPromptCaching = this.config.promptCaching;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const anthropicRequest = this.buildRequest(request);
      const headers = this.buildHeaders();
      const response = await this.client.messages.create(anthropicRequest, { headers });
      return this.toResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private buildRequest(request: ChatRequest): AnthropicRequest {
    const messages = buildMessagesWithToolResults(
      request.messages,
      request.toolResults,
      request.assistantToolUse
    );

    const anthropicRequest: AnthropicRequest = {
      model: this.config.model,
      max_tokens: request.maxTokens ?? this.config.defaultMaxTokens,
      messages,
    };

    if (request.systemPrompt) {
      if (this.supportsPromptCaching) {
        anthropicRequest.system = [
          { type: 'text', text: request.systemPrompt, cache_control: { type: 'ephemeral' } },
        ];
      } else {
        anthropicRequest.system = request.systemPrompt;
      }
    }

    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = request.tools.map(toAnthropicTool);
    }

    anthropicRequest.temperature = request.temperature ?? this.config.defaultTemperature;

    return anthropicRequest;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.supportsPromptCaching) {
      headers['anthropic-beta'] = 'prompt-caching-2024-07-31';
    }
    return headers;
  }

  private toResponse(response: AnthropicResponse): ChatResponse {
    const toolUses = extractToolUses(response.content);
    const textContent = extractTextContent(response.content);
    const stopReason = toStopReason(response.stop_reason);

    if (toolUses.length > 0) {
      const result: ChatResponse = {
        type: 'tool_use',
        toolUse: toolUses,
        usage: toUsageStats(response.usage),
      };
      if (textContent) result.content = textContent;
      if (stopReason !== undefined) result.stopReason = stopReason;
      return result;
    }

    const result: ChatResponse = {
      type: 'message',
      content: textContent,
      usage: toUsageStats(response.usage),
    };
    if (stopReason !== undefined) result.stopReason = stopReason;
    return result;
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('rate_limit') || message.includes('429')) {
        return new LLMRateLimitError(this.name);
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return new LLMTimeoutError(this.name, this.config.timeoutMs);
      }
      return new LLMProviderError(error.message, this.name);
    }
    return new LLMProviderError('Unknown error', this.name);
  }
}
