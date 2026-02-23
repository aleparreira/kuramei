/**
 * Workflow Engine - Session state machine
 */

import type { Session, SessionState } from '@kuramei/conversation';
import type { WorkflowEngine, WorkflowEvent, WorkflowStep, WorkflowEventType } from './types.js';

interface StateTransition {
  from: SessionState | SessionState[];
  event: WorkflowEventType;
  to: SessionState;
  guard?: (session: Session, event: WorkflowEvent) => boolean;
}

const STATE_TRANSITIONS: StateTransition[] = [
  { from: 'idle', event: 'message_received', to: 'processing' },
  { from: 'processing', event: 'tool_called', to: 'executing' },
  { from: 'executing', event: 'tool_completed', to: 'processing' },
  { from: 'processing', event: 'approval_requested', to: 'awaiting_approval' },
  { from: 'awaiting_approval', event: 'approval_granted', to: 'executing' },
  { from: 'awaiting_approval', event: 'approval_denied', to: 'idle' },
  {
    from: ['processing', 'executing', 'awaiting_approval', 'awaiting_input'],
    event: 'error',
    to: 'error',
  },
  { from: 'idle', event: 'error', to: 'error' },
];

const STATE_ACTIONS: Record<SessionState, string[]> = {
  idle: ['send_message'],
  processing: ['call_tool', 'request_approval', 'respond'],
  awaiting_input: ['respond', 'timeout'],
  awaiting_approval: ['approve', 'deny', 'timeout'],
  executing: ['complete', 'fail'],
  completed: ['respond', 'reset'],
  error: ['respond', 'reset'],
  link_opened: ['send_message'],
  ui_interaction: ['send_message'],
};

function findTransition(
  state: SessionState,
  eventType: WorkflowEventType
): StateTransition | undefined {
  return STATE_TRANSITIONS.find((t) => {
    const fromStates = Array.isArray(t.from) ? t.from : [t.from];
    return fromStates.includes(state) && t.event === eventType;
  });
}

export class DefaultWorkflowEngine implements WorkflowEngine {
  transition(session: Session, event: WorkflowEvent): Session {
    const transition = findTransition(session.state, event.type);

    if (!transition) {
      console.warn(`No valid transition from state '${session.state}' for event '${event.type}'`);
      return session;
    }

    if (transition.guard && !transition.guard(session, event)) {
      console.warn(`Guard condition failed for transition from '${session.state}' on '${event.type}'`);
      return session;
    }

    return { ...session, state: transition.to, updatedAt: new Date().toISOString() };
  }

  getCurrentStep(session: Session): WorkflowStep | undefined {
    const currentWorkflow = session.facts['workflow'] as string | undefined;
    if (!currentWorkflow) return undefined;

    const currentStepId = session.facts['workflow_step'] as string | undefined;
    return {
      id: currentStepId ?? 'start',
      name: currentStepId ?? 'Start',
      complete: session.state === 'completed',
    };
  }

  getAvailableActions(session: Session): string[] {
    return STATE_ACTIONS[session.state] ?? [];
  }
}

export function createWorkflowEvent(
  type: WorkflowEventType,
  payload: Record<string, unknown> = {}
): WorkflowEvent {
  return { type, payload };
}

export const WorkflowEvents = {
  messageReceived: (messageId: string): WorkflowEvent =>
    createWorkflowEvent('message_received', { messageId }),

  toolCalled: (toolName: string, toolInput: Record<string, unknown>): WorkflowEvent =>
    createWorkflowEvent('tool_called', { toolName, toolInput }),

  toolCompleted: (toolName: string, success: boolean): WorkflowEvent =>
    createWorkflowEvent('tool_completed', { toolName, success }),

  approvalRequested: (approvalId: string, action: string): WorkflowEvent =>
    createWorkflowEvent('approval_requested', { approvalId, action }),

  approvalGranted: (approvalId: string): WorkflowEvent =>
    createWorkflowEvent('approval_granted', { approvalId }),

  approvalDenied: (approvalId: string, reason?: string): WorkflowEvent =>
    createWorkflowEvent('approval_denied', { approvalId, reason }),

  error: (message: string, code?: string): WorkflowEvent =>
    createWorkflowEvent('error', { message, code }),
};
