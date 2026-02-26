/**
 * feedback.ts — Feedback Loop v1 (NOW-5)
 *
 * Minimal 👍/👎 feedback collection in the main message flow.
 * No new tables — persists to DYNAMODB_TABLE (kuramei-main) with FEEDBACK# prefix.
 *
 * State management: a FEEDBACK_PENDING item (PK: USER#<id>, SK: FEEDBACK_PENDING)
 * is written when user sends 👎, and cleared after option is chosen.
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackType = 'positive' | 'negative';
export type FeedbackReason = 'nao_entendeu' | 'nao_resolveu' | 'resposta_lenta';

export interface ParsedFeedback {
  type: 'positive';
  turnId?: string;
}

export interface ParsedNegativePrompt {
  type: 'negative_prompt';
}

export interface ParsedNegativeDetail {
  type: 'negative_detail';
  reason: FeedbackReason;
  note?: string;
}

export type FeedbackSignal =
  | ParsedFeedback
  | ParsedNegativePrompt
  | ParsedNegativeDetail;

// ---------------------------------------------------------------------------
// Detection — purely emoji/text parsing, zero LLM tokens
// ---------------------------------------------------------------------------

const REASON_MAP: Record<string, FeedbackReason> = {
  '1': 'nao_entendeu',
  '2': 'nao_resolveu',
  '3': 'resposta_lenta',
};

/**
 * Detect if a user message is a feedback signal.
 * Returns null if the message is a regular conversation turn.
 */
export function detectFeedback(message: string): FeedbackSignal | null {
  const trimmed = message.trim();

  // Positive feedback
  if (trimmed === '👍' || /^👍/.test(trimmed)) {
    return { type: 'positive' };
  }

  // Negative prompt (bare 👎)
  if (trimmed === '👎' || /^👎\s*$/.test(trimmed)) {
    return { type: 'negative_prompt' };
  }

  // Negative detail: "1", "2", "3" or "1 <note>", "2 <note>", "3 <note>"
  const detailMatch = /^([123])(?:\s+(.+))?$/.exec(trimmed);
  if (detailMatch) {
    const reasonKey = detailMatch[1] as '1' | '2' | '3';
    const note = detailMatch[2]?.trim();
    return {
      type: 'negative_detail',
      reason: REASON_MAP[reasonKey]!,
      ...(note ? { note } : {}),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pending state — stored in kuramei-main as USER#<id>/FEEDBACK_PENDING
// ---------------------------------------------------------------------------

interface PendingFeedback {
  PK: string;
  SK: 'FEEDBACK_PENDING';
  turnId: string;
  ttl: number; // Unix timestamp — expires after 5 minutes
}

export async function setPendingFeedback(
  userId: string,
  turnId: string,
  table: string,
  ddb: DynamoDBDocumentClient,
): Promise<void> {
  const item: PendingFeedback = {
    PK: `USER#${userId}`,
    SK: 'FEEDBACK_PENDING',
    turnId,
    ttl: Math.floor(Date.now() / 1000) + 300, // 5 min TTL
  };
  await ddb.send(new PutCommand({ TableName: table, Item: item }));
}

export async function getPendingFeedback(
  userId: string,
  table: string,
  ddb: DynamoDBDocumentClient,
): Promise<string | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: table,
      Key: { PK: `USER#${userId}`, SK: 'FEEDBACK_PENDING' },
    }),
  );
  if (!result.Item) return null;
  const item = result.Item as PendingFeedback;
  // Respect TTL even if DynamoDB hasn't expired it yet
  if (item.ttl < Math.floor(Date.now() / 1000)) return null;
  return item.turnId;
}

export async function clearPendingFeedback(
  userId: string,
  table: string,
  ddb: DynamoDBDocumentClient,
): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: table,
      Key: { PK: `USER#${userId}`, SK: 'FEEDBACK_PENDING' },
    }),
  );
}

// ---------------------------------------------------------------------------
// Persistence — stored in kuramei-main as FEEDBACK#<userId>/<ts>
// ---------------------------------------------------------------------------

export async function persistFeedback(
  userId: string,
  turnId: string,
  type: FeedbackType,
  table: string,
  ddb: DynamoDBDocumentClient,
  reason?: FeedbackReason,
  note?: string,
): Promise<void> {
  const ts = new Date().toISOString();
  const ttlDays = 90;
  const ttl = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;

  await ddb.send(
    new PutCommand({
      TableName: table,
      Item: {
        PK: `FEEDBACK#${userId}`,
        SK: ts,
        turnId,
        type,
        ...(reason !== undefined && { reason }),
        ...(note !== undefined && { note }),
        ttl,
      },
    }),
  );
}

// ---------------------------------------------------------------------------
// Response text helpers
// ---------------------------------------------------------------------------

export const FEEDBACK_PROMPT_NEGATIVE = `Que pena 😕 O que houve?

*1* — Não entendi a pergunta
*2* — Não resolveu meu problema
*3* — Demorou demais

Responda com o número (e pode adicionar um texto se quiser).`;

export const FEEDBACK_ACK_POSITIVE = '😊 Ótimo! Fico feliz que ajudei.';

export const FEEDBACK_ACK_NEGATIVE = '🙏 Entendido! Vou usar isso pra melhorar.';
