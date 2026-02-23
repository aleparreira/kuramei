/**
 * ExperiencePackage
 *
 * A self-contained capability bundle: system prompt section + tools.
 * The LLM is the only router — no triggerHints.
 */

import type { ToolDefinition } from '@kuramei/tools';

export interface ExperiencePackage {
  /** Unique identifier for this experience (e.g. 'navigation') */
  name: string;
  /** Short description of what this experience does */
  description: string;
  /** System prompt section in PT-BR instructing the LLM when/how to use the tools */
  systemPromptSection: string;
  /** Tools provided by this experience */
  tools: ToolDefinition[];
}
