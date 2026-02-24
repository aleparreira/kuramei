import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JWTPayload {
  hash: string;
  exp: number;
}

function base64urlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function verifyJWT(token: string, secret: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const signingInput = `${headerB64}.${payloadB64}`;
  const expected = createHmac('sha256', secret).update(signingInput).digest('base64url');

  // Constant-time comparison
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as unknown;
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
