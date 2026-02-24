/**
 * Kuramei Simulator API
 *
 * Local Express server that wraps @kuramei/agent-core for browser-based
 * testing. Never deployed to production.
 */

import express from 'express';
import cors from 'cors';
import { processMessage } from '@kuramei/agent-core';
import type { AgentCoreConfig } from '@kuramei/agent-core';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function buildConfig(): AgentCoreConfig {
  return {
    openRouterApiKey: getEnv('OPENROUTER_API_KEY'),
    dynamoDbTable: getEnv('DYNAMODB_TABLE'),
    remindersTable: getEnv('REMINDERS_TABLE'),
    cloudflareAccountId: getEnv('CLOUDFLARE_ACCOUNT_ID'),
    cloudflareKvNamespaceId: getEnv('CLOUDFLARE_KV_NAMESPACE_ID'),
    cloudflareApiToken: getEnv('CLOUDFLARE_API_TOKEN'),
    kurameiJwtSecret: getEnv('KURAMEI_JWT_SECRET'),
    kurameiBaseUrl: getEnv('KURAMEI_BASE_URL'),
  };
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/chat', async (req, res) => {
  const { userId, message } = req.body as { userId?: unknown; message?: unknown };

  if (typeof userId !== 'string' || typeof message !== 'string') {
    res.status(400).json({ error: 'userId and message must be strings' });
    return;
  }

  try {
    const config = buildConfig();
    const response = await processMessage(userId, message, config);
    res.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('processMessage error', { userId, error: msg });
    res.status(500).json({ error: msg });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Kuramei Simulator API running on http://localhost:${PORT}`);
});
