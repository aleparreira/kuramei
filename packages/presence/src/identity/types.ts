/**
 * Kuramei Presence - Identity Module
 *
 * Identidade conversacional independente de canal.
 */

export type IdentityId = string;

export type ChannelType = 'whatsapp' | 'telegram' | 'webchat';

export interface ChannelBinding {
  channel: ChannelType;
  channelIdentifier: string;
  boundAt: string;
  status: 'active' | 'suspended' | 'revoked';
  metadata?: Record<string, unknown>;
}

export interface ConversationalIdentity {
  id: IdentityId;
  type: 'human' | 'agent' | 'organization';
  displayName: string;
  /** Email address (optional) */
  email?: string;
  channels: ChannelBinding[];
  reputationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityResolutionContext {
  channel: ChannelType;
  channelIdentifier: string;
  metadata?: Record<string, unknown>;
}

export interface IdentityResolutionResult {
  identity: ConversationalIdentity;
  wasCreated: boolean;
}
