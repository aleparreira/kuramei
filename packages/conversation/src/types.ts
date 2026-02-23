/**
 * Conversation domain types
 *
 * Single-tenant: session key uses hardcoded 'kuramei' tenant.
 */

/**
 * Session state machine states
 * Kuramei additions: 'link_opened', 'ui_interaction'
 */
export type SessionState =
  | 'idle'
  | 'processing'
  | 'awaiting_input'
  | 'awaiting_approval'
  | 'executing'
  | 'completed'
  | 'error'
  | 'link_opened'
  | 'ui_interaction';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface PendingApproval {
  approvalId: string;
  action: string;
  context: Record<string, unknown>;
  requestedAt: string;
  expiresAt: string;
}

export interface Session {
  /** Tenant identifier - always 'kuramei' for this product */
  tenantId: string;
  /** User identifier (phone number) */
  userId: string;
  state: SessionState;
  facts: Record<string, unknown>;
  context: Message[];
  pendingApproval?: PendingApproval;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
}

export interface SessionConfig {
  contextWindowSize: number;
  sessionTtlSeconds: number;
  approvalTimeoutSeconds: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  contextWindowSize: 20,
  sessionTtlSeconds: 86400,
  approvalTimeoutSeconds: 300,
};
