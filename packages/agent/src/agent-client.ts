/**
 * Agent Client - Main orchestration layer
 */

import type { Session, Message, PendingApproval } from '@kuramei/conversation';
import type {
  AgentClient,
  AgentContext,
  AgentResponse,
  AgentConfig,
  LLMProvider,
  ResponseCache,
  ChatMessage,
  Tool,
  ToolUse,
  ToolUseResult,
  UsageStats,
  CacheConfig,
} from './types.js';
import { DEFAULT_AGENT_CONFIG, DEFAULT_CACHE_CONFIG } from './types.js';
import { ToolExecutor } from './tool-executor.js';
import { ConfirmationHandler } from './confirmation.js';
import { DefaultWorkflowEngine, WorkflowEvents } from './workflow-engine.js';

export class AgentProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AgentProcessingError';
  }
}

function sessionContextToChatMessages(context: Message[]): ChatMessage[] {
  return context.map((m) => ({ role: m.role, content: m.content }));
}

function buildUsageStats(base: UsageStats, response: { usage: UsageStats }): UsageStats {
  const result: UsageStats = {
    inputTokens: base.inputTokens + response.usage.inputTokens,
    outputTokens: base.outputTokens + response.usage.outputTokens,
  };

  if (response.usage.cacheHit !== undefined) result.cacheHit = response.usage.cacheHit;

  const cacheRead = (base.cacheReadTokens ?? 0) + (response.usage.cacheReadTokens ?? 0);
  if (cacheRead > 0) result.cacheReadTokens = cacheRead;

  const cacheCreation = (base.cacheCreationTokens ?? 0) + (response.usage.cacheCreationTokens ?? 0);
  if (cacheCreation > 0) result.cacheCreationTokens = cacheCreation;

  return result;
}

export class DefaultAgentClient implements AgentClient {
  private readonly provider: LLMProvider;
  private readonly cache: ResponseCache | undefined;
  private readonly cacheConfig: CacheConfig;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly maxToolIterations: number;

  private readonly workflowEngine = new DefaultWorkflowEngine();
  private readonly confirmationHandler = new ConfirmationHandler();

  constructor(config: AgentConfig) {
    this.provider = config.provider;
    this.cache = config.cache;
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config.cacheConfig };
    this.maxTokens = config.defaultMaxTokens ?? DEFAULT_AGENT_CONFIG.defaultMaxTokens;
    this.temperature = config.defaultTemperature ?? DEFAULT_AGENT_CONFIG.defaultTemperature;
    this.maxToolIterations = config.maxToolIterations ?? DEFAULT_AGENT_CONFIG.maxToolIterations;
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const { session, message, tools, systemPrompt, correlationId } = context;

    if (this.confirmationHandler.hasPendingConfirmation(session)) {
      const confirmationResponse = this.confirmationHandler.parseConfirmationResponse(message);

      if (confirmationResponse) {
        return this.handleConfirmation(
          session,
          confirmationResponse === 'approved',
          correlationId,
          tools
        );
      }

      const pending = this.confirmationHandler.getPendingConfirmation(session);
      if (pending) {
        return {
          type: 'message',
          content: 'Por favor, confirme a acao com "sim" ou "nao".\n\n' + `Ação pendente: ${pending.action}`,
          session,
        };
      }
    }

    let currentSession = this.workflowEngine.transition(
      session,
      WorkflowEvents.messageReceived(correlationId)
    );

    const messages: ChatMessage[] = [
      ...sessionContextToChatMessages(currentSession.context),
      { role: 'user', content: message },
    ];

    const toolExecutor = new ToolExecutor(tools);

    if (this.cache !== undefined && this.cacheConfig.responseCaching) {
      const cachedResponse = await this.cache.get(systemPrompt, messages, tools);
      if (cachedResponse && cachedResponse.content !== undefined) {
        return { type: 'message', content: cachedResponse.content, session: currentSession, usage: cachedResponse.usage };
      }
    }

    let iteration = 0;
    let toolResults: ToolUseResult[] | undefined;
    let assistantToolUse: ToolUse[] | undefined;
    let totalUsage: UsageStats = { inputTokens: 0, outputTokens: 0 };

    while (iteration < this.maxToolIterations) {
      iteration++;

      const chatRequest = toolResults !== undefined && assistantToolUse !== undefined
        ? { systemPrompt, messages, tools, maxTokens: this.maxTokens, temperature: this.temperature, toolResults, assistantToolUse }
        : { systemPrompt, messages, tools, maxTokens: this.maxTokens, temperature: this.temperature };

      const response = await this.provider.chat(chatRequest);
      totalUsage = buildUsageStats(totalUsage, response);

      if (response.type === 'message') {
        if (this.cache !== undefined && this.cacheConfig.responseCaching) {
          await this.cache.set(systemPrompt, messages, tools, response);
        }

        // [Fix P2] Transition back to idle so subsequent turns start from a valid state
        const completedSession = this.workflowEngine.transition(
          currentSession,
          WorkflowEvents.messageCompleted(correlationId)
        );

        const agentResponse: AgentResponse = { type: 'message', session: completedSession, usage: totalUsage };
        if (response.content !== undefined) agentResponse.content = response.content;
        return agentResponse;
      }

      if (response.type === 'tool_use' && response.toolUse) {
        const confirmationCheck = this.confirmationHandler.checkConfirmationRequired(response.toolUse, tools);

        if (confirmationCheck.requiresConfirmation && confirmationCheck.confirmationRequest) {
          currentSession = this.workflowEngine.transition(
            currentSession,
            WorkflowEvents.approvalRequested(
              confirmationCheck.confirmationRequest.confirmationId,
              confirmationCheck.confirmationRequest.toolName
            )
          );

          // [Fix P1] Persist pendingApproval so hasPendingConfirmation() gates correctly on next turn
          const now = new Date();
          const pendingApproval: PendingApproval = {
            ...this.confirmationHandler.toPendingApproval(confirmationCheck.confirmationRequest),
            requestedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + this.confirmationHandler.timeoutSeconds * 1000).toISOString(),
          };

          const updatedSession: Session = {
            ...currentSession,
            facts: { ...currentSession.facts, pendingToolUse: confirmationCheck.toolUse },
            pendingApproval,
          };

          return {
            type: 'confirmation_request',
            confirmationRequest: confirmationCheck.confirmationRequest,
            content: this.confirmationHandler.formatConfirmationMessage(confirmationCheck.confirmationRequest),
            session: updatedSession,
            usage: totalUsage,
          };
        }

        currentSession = this.workflowEngine.transition(
          currentSession,
          WorkflowEvents.toolCalled(response.toolUse[0]?.name ?? 'unknown', {})
        );

        const executionResults = await toolExecutor.executeMany(response.toolUse, currentSession, correlationId);

        // [Fix P1] Accumulate across iterations — overwriting drops prior tool context from LLM request
        assistantToolUse = [...(assistantToolUse ?? []), ...response.toolUse];
        toolResults = [
          ...(toolResults ?? []),
          ...executionResults.map((result) => ({
            toolUseId: result.toolUseId,
            content: result.result.success ? JSON.stringify(result.result.data) : `Error: ${result.result.error}`,
            isError: !result.result.success,
          })),
        ];

        currentSession = this.workflowEngine.transition(
          currentSession,
          WorkflowEvents.toolCompleted(
            executionResults[0]?.toolName ?? 'unknown',
            executionResults.every((r) => r.result.success)
          )
        );

        if (response.content) {
          messages.push({ role: 'assistant', content: response.content });
        }

        continue;
      }

      throw new AgentProcessingError('Unexpected response type from LLM', 'UNEXPECTED_RESPONSE_TYPE');
    }

    throw new AgentProcessingError(
      `Exceeded maximum tool iterations (${this.maxToolIterations})`,
      'MAX_ITERATIONS_EXCEEDED'
    );
  }

  async handleConfirmation(
    session: Session,
    approved: boolean,
    correlationId: string,
    tools: Tool[]
  ): Promise<AgentResponse> {
    const pending = session.pendingApproval;

    if (!pending) {
      return { type: 'message' as const, content: 'Não há ação pendente para confirmar.', session };
    }

    const pendingToolUse = session.facts['pendingToolUse'] as {
      id: string;
      name: string;
      input: Record<string, unknown>;
    } | undefined;

    if (!pendingToolUse) {
      const { pendingApproval: _ignored, ...sessionWithoutApproval } = session;
      const clearedSession: Session = { ...sessionWithoutApproval, state: 'idle' };
      return { type: 'message' as const, content: 'Erro ao recuperar ação pendente.', session: clearedSession };
    }

    if (!approved) {
      const deniedSession = this.workflowEngine.transition(session, WorkflowEvents.approvalDenied(pending.approvalId));
      const { pendingApproval: _ignored, ...sessionWithoutApproval } = deniedSession;
      const clearedSession: Session = { ...sessionWithoutApproval, facts: { ...deniedSession.facts } };
      delete clearedSession.facts['pendingToolUse'];
      return { type: 'message' as const, content: 'Ação cancelada.', session: clearedSession };
    }

    const approvedSession = this.workflowEngine.transition(session, WorkflowEvents.approvalGranted(pending.approvalId));
    const toolExecutor = new ToolExecutor(tools);
    const executionResult = await toolExecutor.execute(pendingToolUse, approvedSession, correlationId);

    const { pendingApproval: _ignored, ...sessionWithoutApproval } = approvedSession;
    const executedSession: Session = {
      ...sessionWithoutApproval,
      facts: { ...approvedSession.facts, lastApprovedAction: pending.action },
    };
    delete executedSession.facts['pendingToolUse'];

    return {
      type: 'tool_executed' as const,
      content: executionResult.result.success
        ? `Ação "${pending.action}" executada com sucesso.`
        : `Erro ao executar "${pending.action}": ${executionResult.result.error}`,
      toolResult: { toolName: executionResult.toolName, result: executionResult.result },
      session: executedSession,
    };
  }
}

export function createAgentClient(config: AgentConfig): AgentClient {
  return new DefaultAgentClient(config);
}
