/**
 * @kuramei/tools - Tool registration SDK
 */

export type {
  JSONSchema,
  JSONSchemaProperty,
  ToolContext,
  ToolResult,
  ToolHandler,
  ToolDefinition,
  LLMTool,
  ClaudeTool,
} from './types.js';

export {
  ToolRegistry,
  ToolAlreadyRegisteredError,
  ToolNotFoundError,
  defineTool,
} from './registry.js';
export type { IToolRegistry } from './registry.js';

export { Tool, extractTools, registerToolClass } from './decorators.js';
export type { ToolDecoratorOptions } from './decorators.js';
