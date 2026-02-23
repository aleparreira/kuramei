/**
 * WhatsApp Webhook Signature Validation
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export class InvalidSignatureError extends Error {
  constructor(message = 'Invalid webhook signature') {
    super(message);
    this.name = 'InvalidSignatureError';
  }
}

export function validateSignature(
  payload: string | Buffer,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature) {
    throw new InvalidSignatureError('Missing X-Hub-Signature-256 header');
  }

  if (!signature.startsWith('sha256=')) {
    throw new InvalidSignatureError('Invalid signature format: expected sha256=<hash>');
  }

  const providedHash = signature.slice(7);
  const expectedHash = computeSignature(payload, appSecret);

  const providedBuffer = Buffer.from(providedHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) {
    throw new InvalidSignatureError('Signature length mismatch');
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new InvalidSignatureError('Signature verification failed');
  }

  return true;
}

export function computeSignature(payload: string | Buffer, appSecret: string): string {
  return createHmac('sha256', appSecret).update(payload).digest('hex');
}

export function createSignatureHeader(payload: string | Buffer, appSecret: string): string {
  return `sha256=${computeSignature(payload, appSecret)}`;
}
