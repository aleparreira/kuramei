/**
 * Session Manager Interface
 */

import type { Session, Message, SessionState, PendingApproval } from './types.js';

export class SessionNotFoundError extends Error {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string
  ) {
    super(`Session not found for tenant ${tenantId}, user ${userId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends Error {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string
  ) {
    super(`Session expired for tenant ${tenantId}, user ${userId}`);
    this.name = 'SessionExpiredError';
  }
}

export class ApprovalExpiredError extends Error {
  constructor(
    public readonly approvalId: string,
    public readonly tenantId: string,
    public readonly userId: string
  ) {
    super(`Approval ${approvalId} expired for tenant ${tenantId}, user ${userId}`);
    this.name = 'ApprovalExpiredError';
  }
}

export interface SessionManager {
  getOrCreate(tenantId: string, userId: string): Promise<Session>;
  get(tenantId: string, userId: string): Promise<Session | null>;
  update(session: Session): Promise<void>;
  setState(tenantId: string, userId: string, state: SessionState): Promise<void>;
  addMessage(tenantId: string, userId: string, message: Message): Promise<void>;
  setFact(tenantId: string, userId: string, key: string, value: unknown): Promise<void>;
  getFact(tenantId: string, userId: string, key: string): Promise<unknown>;
  deleteFact(tenantId: string, userId: string, key: string): Promise<void>;
  setPendingApproval(
    tenantId: string,
    userId: string,
    approval: Omit<PendingApproval, 'requestedAt' | 'expiresAt'>
  ): Promise<PendingApproval>;
  getPendingApproval(tenantId: string, userId: string): Promise<PendingApproval | null>;
  clearPendingApproval(tenantId: string, userId: string): Promise<void>;
  delete(tenantId: string, userId: string): Promise<void>;
}
