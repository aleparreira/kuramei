/**
 * Tool Registry
 *
 * Manages tool registration and provides conversion to LLM format.
 */

import type { ToolDefinition, LLMTool, ToolHandler } from './types.js';

/**
 * Error thrown when a tool is already registered
 */
export class ToolAlreadyRegisteredError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool already registered: ${toolName}`);
    this.name = 'ToolAlreadyRegisteredError';
  }
}

/**
 * Error thrown when a tool is not found
 */
export class ToolNotFoundError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Tool Registry interface
 */
export interface IToolRegistry {
  /** Register a new tool */
  register(tool: ToolDefinition): void;
  /** Register multiple tools at once */
  registerMany(tools: ToolDefinition[]): void;
  /** Get a tool by name */
  get(name: string): ToolDefinition | undefined;
  /** Get all registered tools */
  getAll(): ToolDefinition[];
  /** Get tools by category */
  getByCategory(category: string): ToolDefinition[];
  /** Get tools by tag */
  getByTag(tag: string): ToolDefinition[];
  /** Check if a tool exists */
  has(name: string): boolean;
  /** Remove a tool by name */
  remove(name: string): boolean;
  /** Clear all tools */
  clear(): void;
  /** Get number of registered tools */
  size(): number;
  /** Convert all tools to LLM format */
  toClaudeFormat(): LLMTool[];
}

/**
 * Tool Registry implementation
 */
export class ToolRegistry implements IToolRegistry {
  private readonly tools: Map<string, ToolDefinition>;
  private readonly allowOverwrite: boolean;

  constructor(options?: { allowOverwrite?: boolean }) {
    this.tools = new Map();
    this.allowOverwrite = options?.allowOverwrite ?? false;
  }

  register(tool: ToolDefinition): void {
    if (!this.allowOverwrite && this.tools.has(tool.name)) {
      throw new ToolAlreadyRegisteredError(tool.name);
    }

    this.validateTool(tool);
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): ToolDefinition[] {
    return this.getAll().filter((tool) => tool.category === category);
  }

  getByTag(tag: string): ToolDefinition[] {
    return this.getAll().filter((tool) => tool.tags?.includes(tag));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }

  size(): number {
    return this.tools.size;
  }

  toClaudeFormat(): LLMTool[] {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler;
  }

  getToolsRequiringApproval(): ToolDefinition[] {
    return this.getAll().filter((tool) => tool.requiresApproval === true);
  }

  private validateTool(tool: ToolDefinition): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error(`Tool ${tool.name}: description is required and must be a string`);
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new Error(`Tool ${tool.name}: inputSchema is required and must be an object`);
    }

    if (tool.inputSchema.type !== 'object') {
      throw new Error(`Tool ${tool.name}: inputSchema.type must be 'object'`);
    }

    if (typeof tool.handler !== 'function') {
      throw new Error(`Tool ${tool.name}: handler is required and must be a function`);
    }
  }
}

/**
 * Create a tool definition helper
 */
export function defineTool<TInput = unknown>(
  definition: ToolDefinition<TInput>
): ToolDefinition<TInput> {
  return definition;
}
