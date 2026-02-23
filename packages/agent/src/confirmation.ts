/**
 * Confirmation Flow Handler
 */

import type { Session, PendingApproval } from '@kuramei/conversation';
import type { ConfirmationRequest, Tool, ToolUse } from './types.js';
import { ulid } from 'ulid';

export interface ConfirmationConfig {
  timeoutSeconds?: number;
}

const DEFAULT_CONFIRMATION_CONFIG: Required<ConfirmationConfig> = {
  timeoutSeconds: 300,
};

export interface ConfirmationCheckResult {
  requiresConfirmation: boolean;
  confirmationRequest?: ConfirmationRequest;
  tool?: Tool;
  toolUse?: ToolUse;
}

export class ConfirmationHandler {
  private readonly _config: Required<ConfirmationConfig>;

  constructor(config?: ConfirmationConfig) {
    this._config = { ...DEFAULT_CONFIRMATION_CONFIG, ...config };
  }

  get timeoutSeconds(): number {
    return this._config.timeoutSeconds;
  }

  checkConfirmationRequired(toolUses: ToolUse[], tools: Tool[]): ConfirmationCheckResult {
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    for (const toolUse of toolUses) {
      const tool = toolMap.get(toolUse.name);

      if (tool?.requiresApproval) {
        const confirmationRequest = this.createConfirmationRequest(toolUse, tool);
        return { requiresConfirmation: true, confirmationRequest, tool, toolUse };
      }
    }

    return { requiresConfirmation: false };
  }

  createConfirmationRequest(toolUse: ToolUse, tool: Tool): ConfirmationRequest {
    return {
      confirmationId: ulid(),
      toolName: toolUse.name,
      toolInput: toolUse.input,
      description: this.buildDescription(tool, toolUse.input),
    };
  }

  toPendingApproval(request: ConfirmationRequest): Omit<PendingApproval, 'requestedAt' | 'expiresAt'> {
    return {
      approvalId: request.confirmationId,
      action: request.toolName,
      context: request.toolInput,
    };
  }

  hasPendingConfirmation(session: Session): boolean {
    if (!session.pendingApproval) return false;
    const expiresAt = new Date(session.pendingApproval.expiresAt);
    return expiresAt > new Date();
  }

  getPendingConfirmation(session: Session): PendingApproval | null {
    if (!this.hasPendingConfirmation(session)) return null;
    return session.pendingApproval ?? null;
  }

  parseConfirmationResponse(input: string): 'approved' | 'denied' | null {
    const normalized = input.toLowerCase().trim();

    const positivePatterns = [
      /^(yes|sim|s|y|ok|okay|confirmar?|confirm|aprovar?|approve|go|prosseguir?|proceed)$/i,
      /^(sim,?\s*)?confirma(r|do)?$/i,
      /^(yes,?\s*)?approved?$/i,
    ];

    for (const pattern of positivePatterns) {
      if (pattern.test(normalized)) return 'approved';
    }

    const negativePatterns = [
      /^(no|n(a|ã)o|n|cancel(ar)?|cancelar?|deny|negar?|reject|rejeitar?)$/i,
      /^(n(a|ã)o,?\s*)?(cancelar?|cancel)$/i,
      /^(no,?\s*)?(deny|reject)$/i,
    ];

    for (const pattern of negativePatterns) {
      if (pattern.test(normalized)) return 'denied';
    }

    return null;
  }

  formatConfirmationMessage(request: ConfirmationRequest): string {
    return (
      `Preciso da sua confirmacao para continuar:\n\n` +
      `${request.description}\n\n` +
      `Responda "sim" para confirmar ou "nao" para cancelar.`
    );
  }

  private buildDescription(tool: Tool, input: Record<string, unknown>): string {
    const inputSummary = Object.entries(input)
      .map(([key, value]) => {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        const truncated = valueStr.length > 100 ? valueStr.slice(0, 97) + '...' : valueStr;
        return `- ${key}: ${truncated}`;
      })
      .join('\n');

    return `**Ação:** ${tool.description}\n\n**Parâmetros:**\n${inputSummary}`;
  }
}

export function createConfirmationHandler(config?: ConfirmationConfig): ConfirmationHandler {
  return new ConfirmationHandler(config);
}
