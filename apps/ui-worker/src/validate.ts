import { UISpecTokenSchema } from '@kuramei/ui-engine';
import type { UISpecToken } from '@kuramei/ui-engine';

export interface JWTPayload {
  hash: string;
  exp: number;
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64urlToString(base64url: string): string {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return atob(padded);
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  try {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify('HMAC', keyMaterial, signature, data);
    if (!isValid) return null;

    const payloadJson = base64urlToString(payloadB64);
    const payload = JSON.parse(payloadJson) as unknown;

    if (typeof payload !== 'object' || payload === null) return null;

    const p = payload as Record<string, unknown>;
    if (typeof p['hash'] !== 'string' || typeof p['exp'] !== 'number') return null;

    const now = Math.floor(Date.now() / 1000);
    if (p['exp'] < now) return null;

    return { hash: p['hash'], exp: p['exp'] };
  } catch {
    return null;
  }
}

export function parseUISpecToken(raw: string): UISpecToken | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = UISpecTokenSchema.safeParse(parsed);
    if (!result.success) return null;
    // Safe cast: Zod validation guarantees structural correctness.
    // exactOptionalPropertyTypes causes a mismatch with Zod v3's inferred type.
    return result.data as UISpecToken;
  } catch {
    return null;
  }
}
