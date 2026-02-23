/**
 * Kuramei WhatsApp Webhook Handler - AWS Lambda entry point
 *
 * Receives WhatsApp webhooks from API Gateway, validates signature,
 * parses messages, and dispatches to the agent.
 *
 * TODO: Wire up full agent pipeline (presence, session, agent)
 */

import { WebhookHandler, type WebhookPayload } from '@kuramei/whatsapp';

// ============================================================================
// Lambda event types (API Gateway Proxy)
// ============================================================================

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  queryStringParameters?: Record<string, string> | null;
  headers: Record<string, string>;
  body: string | null;
  isBase64Encoded: boolean;
}

interface APIGatewayResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

// ============================================================================
// Environment variables
// ============================================================================

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// ============================================================================
// Handler
// ============================================================================

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayResponse> => {
  const webhookHandler = new WebhookHandler({
    verifyToken: getEnv('WHATSAPP_VERIFY_TOKEN'),
    appSecret: getEnv('WHATSAPP_APP_SECRET'),
  });

  // Webhook verification (GET)
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters ?? {};

    try {
      const challenge = webhookHandler.verifyWebhook({
        'hub.mode': params['hub.mode'] ?? '',
        'hub.verify_token': params['hub.verify_token'] ?? '',
        'hub.challenge': params['hub.challenge'] ?? '',
      });

      return { statusCode: 200, body: challenge };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      return { statusCode: 403, body: message };
    }
  }

  // Webhook payload (POST)
  if (event.httpMethod === 'POST') {
    const rawBody = event.body ?? '';
    const signature = event.headers['x-hub-signature-256'] ?? event.headers['X-Hub-Signature-256'];

    // Validate signature
    try {
      webhookHandler.validateRequest(rawBody, signature);
    } catch (error) {
      return { statusCode: 401, body: 'Invalid signature' };
    }

    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return { statusCode: 400, body: 'Invalid JSON' };
    }

    const result = webhookHandler.parsePayload(payload);

    // TODO: Process messages through agent pipeline
    for (const parsedMessage of result.messages) {
      console.log('Received message', {
        from: parsedMessage.from,
        phoneNumberId: parsedMessage.phoneNumberId,
        type: parsedMessage.message.type,
      });
    }

    // WhatsApp requires 200 OK response within 20 seconds
    return { statusCode: 200, body: 'OK' };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
