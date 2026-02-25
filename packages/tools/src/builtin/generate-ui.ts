/**
 * generate_ui tool
 *
 * Builds a UISpecToken, signs a JWT, writes the spec to DynamoDB
 * via @kuramei/kv-client (UI_SPEC# prefix in kuramei-main table), and returns a shareable link.
 *
 * Note: the same logic is exposed as generateUI() in @kuramei/sdk for
 * consumers outside @kuramei/tools (e.g. create_reminder). A circular
 * dependency prevents @kuramei/tools from importing @kuramei/sdk directly
 * since @kuramei/sdk already depends on @kuramei/tools.
 */

import { createHmac, createHash, randomUUID } from 'node:crypto';
import { UISpecSchema } from '@kuramei/ui-engine';
import type { UISpec, UISpecToken } from '@kuramei/ui-engine';
import * as kv from '@kuramei/kv-client';
import { defineTool } from '../registry.js';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${base64url(sig)}`;
}

export const generateUiTool = defineTool({
  name: 'generate_ui',
  description:
    'Generate a rich UI page for the user and return a shareable link. ' +
    'Use this tool for ANY of the following use cases:\n' +
    '1. NAVIGATION / MAP / LOCATION / ROUTE: when the user asks to go somewhere, needs a map, ' +
    'wants directions, or mentions any location or route. ' +
    'Example: "me leva para o shopping", "como chego em Campinas", "rota para o aeroporto". ' +
    'Call with: { "type": "navigation", "version": "1.0", "destination": "<place or address>", ' +
    '"departureTime": "<ISO 8601, optional>", "avoidTolls": <boolean, optional>, ' +
    '"preferredApp": "waze"|"google-maps"|"apple-maps" (optional) }\n' +
    '2. CONFIRMATION / MESSAGE / SUMMARY: when you need to show a confirmation screen, ' +
    'summary, or informational message to the user. ' +
    'Call with: { "type": "message", "title": "<title>", "body": "<body text>", ' +
    '"actions": [{ "label": "<label>", "url": "<url>" }] (optional) }\n' +
    '3. STRUCTURED LIST: when the user needs to see a list of items, options, or results. ' +
    'Call with: { "type": "list", "title": "<title>", ' +
    '"items": [{ "label": "<label>", "description": "<optional description>" }] }',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['navigation', 'message', 'list'],
        description: 'Spec type: "navigation" for maps/routes, "message" for confirmations/summaries, "list" for structured lists',
      },
      // navigation fields
      version: { type: 'string', description: 'Required when type is "navigation" — always "1.0"' },
      destination: { type: 'string', description: 'Navigation destination (place name or address) — required when type is "navigation"' },
      departureTime: { type: 'string', description: 'Optional ISO 8601 departure time — only for type "navigation"' },
      avoidTolls: { type: 'boolean', description: 'Whether to avoid tolls — only for type "navigation"' },
      preferredApp: {
        type: 'string',
        enum: ['waze', 'google-maps', 'apple-maps'],
        description: 'Preferred maps app — only for type "navigation"',
      },
      // message fields
      title: { type: 'string', description: 'Page title — required when type is "message" or "list"' },
      body: { type: 'string', description: 'Message body text — required when type is "message"' },
      actions: {
        type: 'array',
        description: 'Optional action buttons — only for type "message"',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['label', 'url'],
        },
      },
      // list fields
      items: {
        type: 'array',
        description: 'List items — required when type is "list"',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['label'],
        },
      },
    },
    required: ['type'],
  },
  handler: async (input, context) => {
    const parsed = UISpecSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid UI spec: ${parsed.error.message}` };
    }

    // Cast: Zod v3 inferred type conflicts with exactOptionalPropertyTypes — validation already ran.
    const spec = parsed.data as UISpec;

    const now = Date.now();
    const expiresAt = now + 3_600_000; // +1 hour in ms
    const userId = createHash('sha256').update(context.userId).digest('hex');

    const token: UISpecToken = { spec, userId, createdAt: now, expiresAt };

    const tokenHash = randomUUID();
    const jwtSecret = getEnv('KURAMEI_JWT_SECRET');
    const jwt = signJwt({ hash: tokenHash, exp: Math.floor(expiresAt / 1000) }, jwtSecret);

    await kv.put(tokenHash, JSON.stringify(token), 3600);

    const baseUrl = getEnv('KURAMEI_BASE_URL');
    return { success: true, data: { url: `${baseUrl}/ui/${jwt}` } };
  },
});
