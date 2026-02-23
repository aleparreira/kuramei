/**
 * Kuramei Presence - Routing Module
 */

import type { ChannelType, IdentityId } from '../identity/types.js';

export interface RoutingContext {
  fromIdentityId: IdentityId;
  sourceChannel: ChannelType;
  sessionId?: string;
  entryPoint?: string;
}

export interface RoutingDecision {
  action: RoutingAction;
  context: RoutingContext;
  metadata?: Record<string, unknown>;
}

export type RoutingAction =
  | { type: 'route_to_agent'; agentId: string }
  | { type: 'request_identification'; prompt: string }
  | { type: 'reject'; reason: string };

export interface RoutingRule {
  id: string;
  name: string;
  condition: RoutingCondition;
  action: RoutingAction;
  priority: number;
  enabled: boolean;
}

export type RoutingCondition =
  | { type: 'entry_point_match'; pattern: string }
  | { type: 'channel_is'; channel: ChannelType }
  | { type: 'identity_has_reputation'; minLevel: string }
  | { type: 'always' };
