/**
 * Kuramei Presence - Reputation Module
 */

import type { IdentityId } from '../identity/types.js';

export type ReputationScore = number;

export interface ReputationDimensions {
  conversationQuality: ReputationScore;
  reliability: ReputationScore;
  compliance: ReputationScore;
  engagement: ReputationScore;
}

export interface ReputationRecord {
  id: string;
  identityId: IdentityId;
  dimensions: ReputationDimensions;
  aggregateScore: ReputationScore;
  level: ReputationLevel;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ReputationLevel =
  | 'new'
  | 'probation'
  | 'standard'
  | 'trusted'
  | 'verified';

export interface ReputationEvent {
  type: ReputationEventType;
  dimension: keyof ReputationDimensions;
  delta: number;
  reason: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export type ReputationEventType =
  | 'conversation_completed'
  | 'positive_feedback'
  | 'negative_feedback'
  | 'spam_detected'
  | 'abuse_reported'
  | 'verification_passed'
  | 'policy_violation'
  | 'inactivity_decay'
  | 'manual_adjustment';

export interface ReputationCapabilities {
  canInitiateConversations: boolean;
  messagesPerHourLimit: number;
  canUsePremiumChannels: boolean;
  canRequestVerification: boolean;
  requiresMessageApproval: boolean;
}
