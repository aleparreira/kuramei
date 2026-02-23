/**
 * Domain event types for the Kuramei platform
 */

export interface EventMetadata {
  eventId: string;
  eventType: string;
  timestamp: string;
  actor: string;
  correlationId: string;
  causationId?: string;
  tenantId: string;
  streamId: string;
  version: number;
}

export interface DomainEvent<TPayload = unknown> extends EventMetadata {
  payload: TPayload;
}

export interface MessageReceivedPayload {
  messageId: string;
  from: string;
  text: string;
  timestamp: string;
  phoneNumberId: string;
}

export interface MessageSentPayload {
  messageId: string;
  to: string;
  text: string;
  timestamp: string;
  phoneNumberId: string;
}

export interface SessionStartedPayload {
  sessionId: string;
  userPhone: string;
  startedAt: string;
  expiresAt: string;
}

export interface SessionUpdatedPayload {
  sessionId: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changedFields: string[];
}

export interface IntentRecognizedPayload {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  rawInput: string;
}

export interface ToolCalledPayload {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

export interface ApprovalRequestedPayload {
  approvalId: string;
  action: string;
  reason: string;
  parameters: Record<string, unknown>;
  expiresAt: string;
}

export interface ApprovalGrantedPayload {
  approvalId: string;
  action: string;
  approvedAt: string;
}

export interface ApprovalDeniedPayload {
  approvalId: string;
  action: string;
  deniedAt: string;
  reason?: string;
}

export interface ActionExecutedPayload {
  action: string;
  parameters: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}

export const EventTypes = {
  MESSAGE_RECEIVED: 'MessageReceived',
  MESSAGE_SENT: 'MessageSent',
  SESSION_STARTED: 'SessionStarted',
  SESSION_UPDATED: 'SessionUpdated',
  INTENT_RECOGNIZED: 'IntentRecognized',
  TOOL_CALLED: 'ToolCalled',
  APPROVAL_REQUESTED: 'ApprovalRequested',
  APPROVAL_GRANTED: 'ApprovalGranted',
  APPROVAL_DENIED: 'ApprovalDenied',
  ACTION_EXECUTED: 'ActionExecuted',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export type MessageReceivedEvent = DomainEvent<MessageReceivedPayload>;
export type MessageSentEvent = DomainEvent<MessageSentPayload>;
export type SessionStartedEvent = DomainEvent<SessionStartedPayload>;
export type SessionUpdatedEvent = DomainEvent<SessionUpdatedPayload>;
export type IntentRecognizedEvent = DomainEvent<IntentRecognizedPayload>;
export type ToolCalledEvent = DomainEvent<ToolCalledPayload>;
export type ApprovalRequestedEvent = DomainEvent<ApprovalRequestedPayload>;
export type ApprovalGrantedEvent = DomainEvent<ApprovalGrantedPayload>;
export type ApprovalDeniedEvent = DomainEvent<ApprovalDeniedPayload>;
export type ActionExecutedEvent = DomainEvent<ActionExecutedPayload>;

export type KurameiEvent =
  | MessageReceivedEvent
  | MessageSentEvent
  | SessionStartedEvent
  | SessionUpdatedEvent
  | IntentRecognizedEvent
  | ToolCalledEvent
  | ApprovalRequestedEvent
  | ApprovalGrantedEvent
  | ApprovalDeniedEvent
  | ActionExecutedEvent;

export interface EventFilter {
  tenantId?: string;
  streamId?: string;
  eventTypes?: EventType[];
  fromTimestamp?: string;
  toTimestamp?: string;
  correlationId?: string;
  actor?: string;
  limit?: number;
}
