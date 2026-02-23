/**
 * Correlation ID utilities for distributed tracing
 */

import { randomUUID } from 'node:crypto';

export interface CorrelationContext {
  correlationId: string;
  causationId?: string;
  actor: string;
  tenantId: string;
}

export function generateCorrelationId(): string {
  return `kuramei-${randomUUID()}`;
}

export function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomUUID().slice(0, 8);
  return `evt-${timestamp}-${random}`;
}

export function createChildContext(
  parent: CorrelationContext,
  parentEventId: string
): CorrelationContext {
  return {
    correlationId: parent.correlationId,
    causationId: parentEventId,
    actor: parent.actor,
    tenantId: parent.tenantId,
  };
}

export function createRootContext(tenantId: string, actor: string): CorrelationContext {
  return {
    correlationId: generateCorrelationId(),
    actor,
    tenantId,
  };
}

import { AsyncLocalStorage } from 'node:async_hooks';

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function withCorrelation<T>(context: CorrelationContext, fn: () => T): T {
  return correlationStorage.run(context, fn);
}

export function getCurrentCorrelation(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

export function requireCorrelation(): CorrelationContext {
  const ctx = correlationStorage.getStore();
  if (!ctx) {
    throw new Error('Correlation context not found. Wrap operation in withCorrelation()');
  }
  return ctx;
}

export function extractCorrelationFromHeaders(
  headers: Record<string, string | undefined>
): string | undefined {
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      normalizedHeaders[key.toLowerCase()] = value;
    }
  }

  return (
    normalizedHeaders['x-correlation-id'] ??
    normalizedHeaders['x-request-id'] ??
    parseTraceparent(normalizedHeaders['traceparent'])
  );
}

function parseTraceparent(traceparent: string | undefined): string | undefined {
  if (!traceparent) {
    return undefined;
  }

  const parts = traceparent.split('-');
  if (parts.length >= 2 && parts[0] === '00' && parts[1] && parts[1].length === 32) {
    return `kuramei-${parts[1]}`;
  }

  return undefined;
}
