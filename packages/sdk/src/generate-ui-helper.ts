/**
 * generateUI() — shared helper for building UISpec pages and returning a URL.
 *
 * Extracted from @kuramei/tools generate_ui handler so other tools can call
 * it directly without going through the ToolRegistry.
 */

import { createHmac, createHash, randomUUID } from 'node:crypto';
import type { UISpec, UISpecToken } from '@kuramei/ui-engine';

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

export interface GenerateUIContext {
  userId: string;
}

export interface GenerateUIResult {
  url: string;
}

/**
 * Signs a UISpec as a JWT, writes it to Cloudflare KV, and returns
 * a shareable link. Reads env vars directly:
 *   KURAMEI_JWT_SECRET, CLOUDFLARE_ACCOUNT_ID,
 *   CLOUDFLARE_KV_NAMESPACE_ID, CLOUDFLARE_API_TOKEN, KURAMEI_BASE_URL
 */
export async function generateUI(
  spec: UISpec,
  context: GenerateUIContext,
): Promise<GenerateUIResult> {
  const now = Date.now();
  const expiresAt = now + 3_600_000; // +1 hour in ms
  const userId = createHash('sha256').update(context.userId).digest('hex');

  const token: UISpecToken = { spec, userId, createdAt: now, expiresAt };

  const tokenHash = randomUUID();
  const jwtSecret = getEnv('KURAMEI_JWT_SECRET');
  const jwt = signJwt({ hash: tokenHash, exp: Math.floor(expiresAt / 1000) }, jwtSecret);

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
  return { url: `${baseUrl}/ui/${jwt}` };
}
