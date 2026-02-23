/**
 * Tool Decorators (Optional)
 *
 * Decorators for class-based tool definitions.
 */

import type { ToolDefinition, ToolContext, ToolResult, JSONSchema } from './types.js';
import type { ToolRegistry } from './registry.js';

const TOOL_METADATA_KEY = Symbol('tool:metadata');

interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  requiresApproval?: boolean;
  category?: string;
  tags?: string[];
}

export interface ToolDecoratorOptions {
  name?: string;
  description: string;
  inputSchema: JSONSchema;
  requiresApproval?: boolean;
  category?: string;
  tags?: string[];
}

export function Tool(options: ToolDecoratorOptions) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const toolName = options.name ?? toSnakeCase(propertyKey);

    const metadata: ToolMetadata = {
      name: toolName,
      description: options.description,
      inputSchema: options.inputSchema,
    };

    if (options.requiresApproval !== undefined) {
      metadata.requiresApproval = options.requiresApproval;
    }
    if (options.category !== undefined) {
      metadata.category = options.category;
    }
    if (options.tags !== undefined) {
      metadata.tags = options.tags;
    }

    Reflect.defineMetadata(TOOL_METADATA_KEY, metadata, target, propertyKey);

    const rawMetadata: unknown = Reflect.getMetadata(TOOL_METADATA_KEY, target);
    const existingTools: string[] = Array.isArray(rawMetadata) ? rawMetadata as string[] : [];
    existingTools.push(propertyKey);
    Reflect.defineMetadata(TOOL_METADATA_KEY, existingTools, target);

    return descriptor;
  };
}

export function extractTools(instance: object): ToolDefinition[] {
  const prototype = Object.getPrototypeOf(instance) as object;
  const rawMetadata: unknown = Reflect.getMetadata(TOOL_METADATA_KEY, prototype);
  const methodNames: string[] = Array.isArray(rawMetadata) ? rawMetadata as string[] : [];

  return methodNames.map((methodName) => {
    const metadata = Reflect.getMetadata(TOOL_METADATA_KEY, prototype, methodName) as
      | ToolMetadata
      | undefined;

    if (!metadata) {
      throw new Error(`No tool metadata found for method: ${methodName}`);
    }

    const method = (instance as Record<string, unknown>)[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} is not a function`);
    }

    const handler = method.bind(instance) as (
      input: unknown,
      context: ToolContext
    ) => Promise<ToolResult>;

    const toolDef: ToolDefinition = {
      name: metadata.name,
      description: metadata.description,
      inputSchema: metadata.inputSchema,
      handler,
    };

    if (metadata.requiresApproval !== undefined) {
      toolDef.requiresApproval = metadata.requiresApproval;
    }
    if (metadata.category !== undefined) {
      toolDef.category = metadata.category;
    }
    if (metadata.tags !== undefined) {
      toolDef.tags = metadata.tags;
    }

    return toolDef;
  });
}

export function registerToolClass(instance: object, registry: ToolRegistry): void {
  const tools = extractTools(instance);
  registry.registerMany(tools);
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Reflect {
    function defineMetadata(
      metadataKey: symbol,
      metadataValue: unknown,
      target: object,
      propertyKey?: string
    ): void;
    function getMetadata(
      metadataKey: symbol,
      target: object,
      propertyKey?: string
    ): unknown;
  }
}

if (typeof Reflect.defineMetadata !== 'function') {
  const metadataStore = new WeakMap<object, Map<string | symbol, unknown>>();

  Reflect.defineMetadata = function (
    metadataKey: symbol,
    metadataValue: unknown,
    target: object,
    propertyKey?: string
  ): void {
    const key = propertyKey ? `${String(metadataKey)}:${propertyKey}` : metadataKey;
    let targetMetadata = metadataStore.get(target);

    if (!targetMetadata) {
      targetMetadata = new Map();
      metadataStore.set(target, targetMetadata);
    }

    targetMetadata.set(key, metadataValue);
  };

  Reflect.getMetadata = function (
    metadataKey: symbol,
    target: object,
    propertyKey?: string
  ): unknown {
    const key = propertyKey ? `${String(metadataKey)}:${propertyKey}` : metadataKey;
    const targetMetadata = metadataStore.get(target);
    return targetMetadata?.get(key);
  };
}
