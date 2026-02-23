/**
 * WhatsApp Webhook Handler
 *
 * Simplified single-tenant handler: validates signature and parses payload.
 * The consumer (Lambda) decides what to do with parsed messages.
 */

import type {
  WebhookVerifyParams,
  WebhookPayload,
  IncomingMessage,
  MessageStatus,
} from './types.js';
import { validateSignature } from './signature.js';

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * Parsed incoming message (no tenant context in single-tenant mode)
 */
export interface ParsedMessage {
  message: IncomingMessage;
  from: string;
  profileName: string | undefined;
  phoneNumberId: string;
  displayPhoneNumber: string;
}

export interface ParsedStatus {
  status: MessageStatus;
  phoneNumberId: string;
}

export interface WebhookProcessResult {
  messages: ParsedMessage[];
  statuses: ParsedStatus[];
}

export interface WebhookHandlerConfig {
  verifyToken: string;
  appSecret: string;
}

export class WebhookHandler {
  constructor(private readonly config: WebhookHandlerConfig) {}

  verifyWebhook(params: WebhookVerifyParams): string {
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode !== 'subscribe') {
      throw new WebhookVerificationError(`Invalid hub.mode: expected 'subscribe', got '${mode}'`);
    }

    if (token !== this.config.verifyToken) {
      throw new WebhookVerificationError('Invalid verify token');
    }

    if (!challenge) {
      throw new WebhookVerificationError('Missing hub.challenge');
    }

    return challenge;
  }

  validateRequest(rawBody: string | Buffer, signature: string | undefined): boolean {
    return validateSignature(rawBody, signature, this.config.appSecret);
  }

  parsePayload(payload: WebhookPayload): WebhookProcessResult {
    const result: WebhookProcessResult = {
      messages: [],
      statuses: [],
    };

    if (payload.object !== 'whatsapp_business_account') {
      return result;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (value.messaging_product !== 'whatsapp') continue;

        const phoneNumberId = value.metadata.phone_number_id;
        const displayPhoneNumber = value.metadata.display_phone_number;

        if (value.messages) {
          for (const message of value.messages) {
            const contact = value.contacts?.find((c) => c.wa_id === message.from);
            result.messages.push({
              message,
              from: message.from,
              profileName: contact?.profile?.name,
              phoneNumberId,
              displayPhoneNumber,
            });
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            result.statuses.push({ status, phoneNumberId });
          }
        }
      }
    }

    return result;
  }

  extractTextContent(message: IncomingMessage): string | null {
    if (message.type === 'text' && message.text) {
      return message.text.body;
    }

    if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.type === 'button_reply' && message.interactive.button_reply) {
        return message.interactive.button_reply.title;
      }
      if (message.interactive.type === 'list_reply' && message.interactive.list_reply) {
        return message.interactive.list_reply.title;
      }
    }

    if (message.type === 'button' && message.button) {
      return message.button.text;
    }

    return null;
  }

  extractReplyId(message: IncomingMessage): string | null {
    if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.type === 'button_reply' && message.interactive.button_reply) {
        return message.interactive.button_reply.id;
      }
      if (message.interactive.type === 'list_reply' && message.interactive.list_reply) {
        return message.interactive.list_reply.id;
      }
    }

    if (message.type === 'button' && message.button) {
      return message.button.payload;
    }

    return null;
  }
}

export function createWebhookHandler(config: WebhookHandlerConfig): WebhookHandler {
  return new WebhookHandler(config);
}
