/**
 * Context Window Utilities
 */

import type { Message } from './types.js';

export function addToContextWindow(
  context: Message[],
  message: Message,
  maxSize: number
): Message[] {
  const newContext = [...context, message];

  if (newContext.length > maxSize) {
    return newContext.slice(newContext.length - maxSize);
  }

  return newContext;
}

export function formatContextForLLM(context: Message[]): string {
  return context
    .map((msg) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      return `${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');
}

export function getLastMessages(context: Message[], n: number): Message[] {
  if (n >= context.length) {
    return [...context];
  }
  return context.slice(-n);
}

export function estimateContextTokens(context: Message[]): number {
  const totalChars = context.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
}

export function truncateToTokenBudget(context: Message[], maxTokens: number): Message[] {
  const result: Message[] = [];
  let tokenCount = 0;

  for (let i = context.length - 1; i >= 0; i--) {
    const msg = context[i]!;
    const msgTokens = Math.ceil(msg.content.length / 4);

    if (tokenCount + msgTokens <= maxTokens) {
      result.unshift(msg);
      tokenCount += msgTokens;
    } else {
      break;
    }
  }

  return result;
}

export function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}
