/**
 * generate_ui tool
 *
 * Builds a UISpecToken, signs a JWT, writes the spec to Cloudflare KV
 * via the REST API, and returns a shareable link.
 */

import { createHmac, createHash, randomUUID } from 'node:crypto';
import { NavigationSpecSchema } from '@kuramei/ui-engine';
import type { UISpec, UISpecToken } from '@kuramei/ui-engine';
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
    'Generate a navigation page for the user and return a shareable link. ' +
    'Use when the user asks to navigate somewhere or needs a map link.',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Spec type — must be "navigation"' },
      version: { type: 'string', description: 'Spec version — must be "1.0"' },
      destination: { type: 'string', description: 'Navigation destination (city, address, or place name)' },
      departureTime: { type: 'string', description: 'Optional ISO 8601 departure time' },
      avoidTolls: { type: 'boolean', description: 'Whether to avoid tolls' },
      preferredApp: {
        type: 'string',
        description: 'Preferred maps app: waze | google-maps | apple-maps',
      },
    },
    required: ['type', 'version', 'destination'],
  },
  handler: async (input, context) => {
    const parsed = NavigationSpecSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid navigation spec: ${parsed.error.message}` };
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

    // Write spec to Cloudflare KV via REST API (Lambda and Cloudflare are separate clouds)
    const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
    const namespaceId = getEnv('CLOUDFLARE_KV_NAMESPACE_ID');
    const apiToken = getEnv('CLOUDFLARE_API_TOKEN');

    const kvUrl =
      `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/storage/kv/namespaces/${namespaceId}/values/${tokenHash}?expiration_ttl=3600`;

    const response = await fetch(kvUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(token),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloudflare KV write failed (${response.status}): ${text}`);
    }

    const baseUrl = getEnv('KURAMEI_BASE_URL');
    return { success: true, data: { url: `${baseUrl}/ui/${jwt}` } };
  },
});
