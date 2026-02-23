/**
 * WhatsApp Message Sender
 */

import type {
  Tenant,
  SendMessageRequest,
  SendMessageResponse,
  SendResult,
  OutgoingInteractive,
  ListSection,
} from './types.js';
import { buildButtonMessage, buildListMessage, type ButtonDefinition } from './interactive.js';

export class SendMessageError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errorCode?: number
  ) {
    super(message);
    this.name = 'SendMessageError';
  }
}

export interface SecretsProvider {
  getSecret(secretId: string): Promise<string>;
}

export interface WhatsAppSenderConfig {
  apiVersion?: string;
  baseUrl?: string;
}

export interface WhatsAppSender {
  sendText(tenantId: string, to: string, text: string): Promise<SendResult>;
  sendButtons(
    tenantId: string,
    to: string,
    body: string,
    buttons: ButtonDefinition[]
  ): Promise<SendResult>;
  sendList(
    tenantId: string,
    to: string,
    body: string,
    buttonText: string,
    sections: ListSection[]
  ): Promise<SendResult>;
  sendInteractive(
    tenantId: string,
    to: string,
    interactive: OutgoingInteractive
  ): Promise<SendResult>;
}

export function createTenantAwareSender(
  tenant: Tenant,
  secretsProvider: SecretsProvider,
  config: WhatsAppSenderConfig = {}
): TenantBoundSender {
  return new TenantBoundSender(tenant, secretsProvider, config);
}

export class TenantBoundSender {
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;
  private readonly cacheExpirationMs = 5 * 60 * 1000;

  constructor(
    private readonly tenant: Tenant,
    private readonly secretsProvider: SecretsProvider,
    config: WhatsAppSenderConfig = {}
  ) {
    this.apiVersion = config.apiVersion ?? 'v21.0';
    this.baseUrl = config.baseUrl ?? 'https://graph.facebook.com';
  }

  async sendText(to: string, text: string): Promise<SendResult> {
    const request: SendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    };
    return this.send(request);
  }

  async sendButtons(to: string, body: string, buttons: ButtonDefinition[]): Promise<SendResult> {
    const interactive = buildButtonMessage(body, buttons);
    return this.sendInteractive(to, interactive);
  }

  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: ListSection[]
  ): Promise<SendResult> {
    const interactive = buildListMessage(body, buttonText, sections);
    return this.sendInteractive(to, interactive);
  }

  async sendInteractive(to: string, interactive: OutgoingInteractive): Promise<SendResult> {
    const request: SendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive,
    };
    return this.send(request);
  }

  private async send(request: SendMessageRequest): Promise<SendResult> {
    const accessToken = await this.getAccessToken();
    const url = `${this.baseUrl}/${this.apiVersion}/${this.tenant.whatsappPhoneId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          (errorBody as { error?: { message?: string } }).error?.message ||
          `HTTP ${response.status}`;
        throw new SendMessageError(
          errorMessage,
          response.status,
          (errorBody as { error?: { code?: number } }).error?.code
        );
      }

      const data = (await response.json()) as SendMessageResponse;
      const messageId = data.messages?.[0]?.id;

      if (!messageId) {
        return { success: false, error: 'No message ID returned from API' };
      }

      return { success: true, messageId };
    } catch (error) {
      if (error instanceof SendMessageError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const token = await this.secretsProvider.getSecret(this.tenant.whatsappTokenSecret);
    this.cachedToken = { token, expiresAt: Date.now() + this.cacheExpirationMs };
    return token;
  }
}
