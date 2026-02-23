/**
 * Tool Executor
 */

import type { Session } from '@kuramei/conversation';
import type { Tool, ToolContext, ToolResult, ToolUse } from './types.js';

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class ToolNotFoundError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}

export class ToolInputValidationError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly validationError: string
  ) {
    super(`Invalid input for tool ${toolName}: ${validationError}`);
    this.name = 'ToolInputValidationError';
  }
}

export interface ToolExecutionResult {
  toolUseId: string;
  toolName: string;
  result: ToolResult;
  durationMs: number;
}

export interface ToolExecutorConfig {
  timeoutMs?: number;
  validateInput?: boolean;
}

const DEFAULT_TOOL_EXECUTOR_CONFIG: Required<ToolExecutorConfig> = {
  timeoutMs: 30000,
  validateInput: true,
};

function validateInput(
  input: unknown,
  schema: Tool['inputSchema'],
  toolName: string
): void {
  if (schema.type !== 'object') return;

  if (typeof input !== 'object' || input === null) {
    throw new ToolInputValidationError(toolName, 'Input must be an object');
  }

  const inputObj = input as Record<string, unknown>;

  if (schema.required) {
    for (const prop of schema.required) {
      if (!(prop in inputObj)) {
        throw new ToolInputValidationError(toolName, `Missing required property: ${prop}`);
      }
    }
  }
}

export class ToolExecutor {
  private readonly tools: Map<string, Tool>;
  private readonly config: Required<ToolExecutorConfig>;

  constructor(tools: Tool[], config?: ToolExecutorConfig) {
    this.tools = new Map(tools.map((t) => [t.name, t]));
    this.config = { ...DEFAULT_TOOL_EXECUTOR_CONFIG, ...config };
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  requiresApproval(name: string): boolean {
    const tool = this.tools.get(name);
    return tool?.requiresApproval ?? false;
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(
    toolUse: ToolUse,
    session: Session,
    correlationId: string
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolUse.name);

    if (!tool) throw new ToolNotFoundError(toolUse.name);

    if (this.config.validateInput) {
      validateInput(toolUse.input, tool.inputSchema, toolUse.name);
    }

    const context: ToolContext = {
      session,
      tenantId: session.tenantId,
      correlationId,
      from: session.userId,
    };

    try {
      const result = await this.executeWithTimeout(tool, toolUse.input, context);
      return { toolUseId: toolUse.id, toolName: toolUse.name, result, durationMs: Date.now() - startTime };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof ToolExecutionError) {
        return { toolUseId: toolUse.id, toolName: toolUse.name, result: { success: false, error: error.message }, durationMs };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { toolUseId: toolUse.id, toolName: toolUse.name, result: { success: false, error: errorMessage }, durationMs };
    }
  }

  async executeMany(
    toolUses: ToolUse[],
    session: Session,
    correlationId: string
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(toolUses.map((toolUse) => this.execute(toolUse, session, correlationId)));
  }

  private async executeWithTimeout(
    tool: Tool,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ToolExecutionError(`Tool ${tool.name} timed out`, tool.name));
      }, this.config.timeoutMs);
    });

    return Promise.race([tool.execute(input, context), timeoutPromise]);
  }
}
