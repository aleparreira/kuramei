/**
 * App Configuration
 *
 * Configuration interface for Kuramei apps.
 * Bundles tools, system prompts, and UI specs for an app.
 */

import type { ToolDefinition, ToolRegistry, LLMTool } from '@kuramei/tools';

export interface PolicyOverride {
  tool: string;
  action: 'allow' | 'deny' | 'require-approval';
  condition?: string;
  reason?: string;
}

export interface SystemPromptSection {
  name: string;
  content: string;
  priority?: number;
}

/**
 * UI Spec template for Kuramei UI interactions
 */
export type UISpecTemplate = unknown;

export interface AppConfig {
  name: string;
  version?: string;
  description?: string;
  systemPrompt: string;
  systemPromptSections?: SystemPromptSection[];
  tools: ToolDefinition[];
  policies?: PolicyOverride[];
  /** UI spec templates for link/UI interactions */
  uiSpec?: UISpecTemplate[];
  metadata?: Record<string, unknown>;
}

export interface BuiltApp {
  name: string;
  systemPrompt: string;
  toolRegistry: ToolRegistry;
  /** LLM-format tools (renamed from claudeTools) */
  llmTools: LLMTool[];
  policies: PolicyOverride[];
  /** UI spec templates */
  uiSpec: UISpecTemplate[];
  config: AppConfig;
}

export class SystemPromptBuilder {
  private readonly sections: SystemPromptSection[] = [];
  private basePrompt = '';

  setBase(prompt: string): this {
    this.basePrompt = prompt;
    return this;
  }

  addSection(section: SystemPromptSection): this {
    this.sections.push(section);
    return this;
  }

  identity(content: string): this {
    return this.addSection({ name: 'identity', content, priority: 0 });
  }

  capabilities(content: string): this {
    return this.addSection({ name: 'capabilities', content, priority: 10 });
  }

  toolsDoc(tools: ToolDefinition[]): this {
    const content = this.formatToolsDoc(tools);
    return this.addSection({ name: 'tools', content, priority: 20 });
  }

  rules(content: string): this {
    return this.addSection({ name: 'rules', content, priority: 30 });
  }

  constraints(content: string): this {
    return this.addSection({ name: 'constraints', content, priority: 40 });
  }

  examples(content: string): this {
    return this.addSection({ name: 'examples', content, priority: 50 });
  }

  build(): string {
    const sortedSections = [...this.sections].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100)
    );

    const parts: string[] = [];
    if (this.basePrompt) parts.push(this.basePrompt);

    for (const section of sortedSections) {
      if (section.content.trim()) {
        parts.push(`## ${this.formatSectionName(section.name)}\n\n${section.content}`);
      }
    }

    return parts.join('\n\n').trim();
  }

  private formatSectionName(name: string): string {
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatToolsDoc(tools: ToolDefinition[]): string {
    if (tools.length === 0) return '';

    const lines: string[] = ['Available tools:'];
    for (const tool of tools) {
      lines.push(`\n### ${tool.name}`);
      lines.push(tool.description);
      if (tool.requiresApproval) {
        lines.push('*Requires user approval before execution.*');
      }
    }

    return lines.join('\n');
  }
}

export class AppBuilder {
  private readonly config: Partial<AppConfig>;
  private readonly promptBuilder: SystemPromptBuilder;

  constructor(name: string) {
    this.config = { name, tools: [] };
    this.promptBuilder = new SystemPromptBuilder();
  }

  version(version: string): this {
    this.config.version = version;
    return this;
  }

  description(description: string): this {
    this.config.description = description;
    return this;
  }

  systemPrompt(prompt: string): this {
    this.config.systemPrompt = prompt;
    this.promptBuilder.setBase(prompt);
    return this;
  }

  identity(content: string): this {
    this.promptBuilder.identity(content);
    return this;
  }

  capabilities(content: string): this {
    this.promptBuilder.capabilities(content);
    return this;
  }

  rules(content: string): this {
    this.promptBuilder.rules(content);
    return this;
  }

  tools(tools: ToolDefinition[]): this {
    this.config.tools = [...(this.config.tools ?? []), ...tools];
    return this;
  }

  tool(tool: ToolDefinition): this {
    this.config.tools = [...(this.config.tools ?? []), tool];
    return this;
  }

  policy(
    tool: string,
    action: PolicyOverride['action'],
    options?: { condition?: string; reason?: string }
  ): this {
    const override: PolicyOverride = { tool, action, ...options };
    this.config.policies = [...(this.config.policies ?? []), override];
    return this;
  }

  uiSpec(specs: UISpecTemplate[]): this {
    this.config.uiSpec = [...(this.config.uiSpec ?? []), ...specs];
    return this;
  }

  metadata(key: string, value: unknown): this {
    this.config.metadata = { ...(this.config.metadata ?? {}), [key]: value };
    return this;
  }

  buildConfig(): AppConfig {
    if (!this.config.name) throw new Error('App name is required');

    if (this.config.tools && this.config.tools.length > 0) {
      this.promptBuilder.toolsDoc(this.config.tools);
    }

    const systemPrompt = this.promptBuilder.build();

    const result: AppConfig = {
      name: this.config.name,
      systemPrompt: systemPrompt || this.config.systemPrompt || '',
      tools: this.config.tools ?? [],
    };

    if (this.config.version !== undefined) result.version = this.config.version;
    if (this.config.description !== undefined) result.description = this.config.description;
    if (this.config.policies !== undefined) result.policies = this.config.policies;
    if (this.config.uiSpec !== undefined) result.uiSpec = this.config.uiSpec;
    if (this.config.metadata !== undefined) result.metadata = this.config.metadata;

    return result;
  }
}

export function createApp(name: string): AppBuilder {
  return new AppBuilder(name);
}

export function validateAppConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (!config.name) errors.push('App name is required');
  if (!config.systemPrompt) errors.push('System prompt is required');

  const toolNames = new Set<string>();
  for (const tool of config.tools) {
    if (toolNames.has(tool.name)) errors.push(`Duplicate tool name: ${tool.name}`);
    toolNames.add(tool.name);
  }

  if (config.policies) {
    for (const policy of config.policies) {
      if (!toolNames.has(policy.tool)) {
        errors.push(`Policy references unknown tool: ${policy.tool}`);
      }
    }
  }

  return errors;
}
