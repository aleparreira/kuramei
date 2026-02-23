/**
 * Tool SDK Types
 *
 * Types for registering tools that can be called by the agent.
 * These types are designed for app developers building on Kuramei.
 */

/**
 * JSON Schema definition for tool input validation
 * Subset of JSON Schema spec sufficient for tool definitions.
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
  description?: string;
  additionalProperties?: boolean;
}

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
  description?: string;
  enum?: readonly string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

/**
 * Context provided to tool handlers during execution
 */
export interface ToolContext {
  /** Current session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Session facts (accumulated knowledge) */
  facts: Record<string, unknown>;
}

/**
 * Result returned from tool execution
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;
  /** Result data (on success) */
  data?: unknown;
  /** Error message (on failure) */
  error?: string;
  /** Optional metadata about the execution */
  metadata?: Record<string, unknown>;
  /** Facts to add to the session (optional) */
  factsToAdd?: Record<string, unknown>;
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TInput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult>;

/**
 * Tool definition for the SDK
 */
export interface ToolDefinition<TInput = unknown> {
  /** Unique tool name (snake_case recommended) */
  name: string;
  /** Human-readable description for the LLM to understand when to use this tool */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: JSONSchema;
  /** Tool handler function */
  handler: ToolHandler<TInput>;
  /** Whether this tool requires user approval before execution */
  requiresApproval?: boolean;
  /** Category for grouping tools (e.g., 'social', 'calendar') */
  category?: string;
  /** Tags for filtering (e.g., ['write', 'external-api']) */
  tags?: string[];
}

/**
 * LLM-compatible tool format (generic, not Claude-specific)
 */
export interface LLMTool {
  name: string;
  description: string;
  input_schema: JSONSchema;
}

/**
 * @deprecated Use LLMTool instead
 */
export type ClaudeTool = LLMTool;
