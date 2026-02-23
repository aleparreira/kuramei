/**
 * Kuramei Presence - Channels Module
 */

import type { ChannelType, IdentityId } from '../identity/types.js';

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  config: ChannelSpecificConfig;
  priority: number;
  health: ChannelHealth;
}

export type ChannelSpecificConfig =
  | WhatsAppChannelConfig
  | TelegramChannelConfig
  | WebchatChannelConfig;

export interface WhatsAppChannelConfig {
  type: 'whatsapp';
  phoneNumberId: string;
  displayNumber: string;
  tokenSecretArn: string;
  wabaId: string;
}

export interface TelegramChannelConfig {
  type: 'telegram';
  botTokenSecretArn: string;
  botUsername: string;
}

export interface WebchatChannelConfig {
  type: 'webchat';
  allowedDomains: string[];
  theme?: Record<string, unknown>;
}

export interface ChannelHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  reason?: string;
  metrics?: {
    latencyMs: number;
    successRate: number;
    lastError?: string;
  };
}

export interface NormalizedMessage {
  id: string;
  fromIdentityId: IdentityId;
  toIdentityId: IdentityId;
  sourceChannel: ChannelType;
  contentType: 'text' | 'image' | 'audio' | 'document' | 'location' | 'interactive';
  text?: string;
  mediaRef?: {
    type: string;
    url?: string;
    mimeType?: string;
  };
  channelMetadata?: Record<string, unknown>;
  timestamp: string;
}

export interface SendResult {
  success: boolean;
  channelMessageId?: string;
  channel: ChannelType;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ChannelAdapter {
  readonly type: ChannelType;
  send(message: NormalizedMessage): Promise<SendResult>;
  healthCheck(): Promise<ChannelHealth>;
  normalize(rawMessage: unknown): NormalizedMessage;
}
