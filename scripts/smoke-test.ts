/**
 * smoke-test.ts
 *
 * Local end-to-end test for the UI Engine pipeline without Lambda.
 * Requires `wrangler dev` running in apps/ui-worker before executing.
 *
 * Usage:
 *   pnpm smoke-test                # map scenario (default, backward compat)
 *   pnpm smoke-test map            # navigation to Campinas, SP
 *   pnpm smoke-test message        # MessageSpec confirmation page
 *   pnpm smoke-test list           # ListSpec reminders list
 *   pnpm smoke-test reminder       # create_reminder handler (requires REMINDERS_TABLE)
 *   pnpm smoke-test all            # all non-DynamoDB scenarios (map + message + list)
 *   pnpm smoke-test expired        # expired token → elegant error page
 *   pnpm smoke-test invalid-jwt    # wrong JWT secret → elegant error page
 */

import { createHmac, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

function loadEnvLocal(): Record<string, string> {
  const envFile = path.join(ROOT, '.env.local');
  if (!existsSync(envFile)) {
    throw new Error(
      '.env.local not found. Copy .env.example to .env.local and set KURAMEI_JWT_SECRET.',
    );
  }
  const content = readFileSync(envFile, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

// ---------------------------------------------------------------------------
// JWT helpers (mirrors packages/tools/src/builtin/generate-ui.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// UISpec types (inline to avoid dist dependency)
// ---------------------------------------------------------------------------

type NavigationSpec = {
  type: 'navigation';
  version: '1.0';
  destination: string;
};

type MessageSpec = {
  type: 'message';
  title: string;
  body: string;
  actions?: Array<{ label: string; url: string }>;
};

type ListSpec = {
  type: 'list';
  title: string;
  items: Array<{ label: string; description?: string }>;
};

type UISpec = NavigationSpec | MessageSpec | ListSpec;

// ---------------------------------------------------------------------------
// KV scenario runner — writes spec to local KV and opens browser
// ---------------------------------------------------------------------------

const workerDir = path.join(ROOT, 'apps', 'ui-worker');

function runKvScenario(
  label: string,
  spec: UISpec,
  jwtSecret: string,
  options: { expired?: boolean } = {},
): void {
  const tokenHash = randomUUID();
  const now = Date.now();
  const expiresAt = options.expired ? now - 3_600_000 : now + 3_600_000;

  const specToken = {
    spec,
    userId: 'smoke-test-user',
    createdAt: now,
    expiresAt,
  };

  const jwt = signJwt({ hash: tokenHash, exp: Math.floor(expiresAt / 1000) }, jwtSecret);
  const url = `http://localhost:8787/ui/${jwt}`;

  console.log(`\n--- Scenario: ${label} ---`);
  console.log(`Token hash : ${tokenHash}`);
  console.log(`URL        : ${url}`);

  const tmpFile = path.join(ROOT, '.smoke-test-tmp.json');
  writeFileSync(tmpFile, JSON.stringify(specToken), 'utf-8');

  try {
    console.log('Writing spec to local KV...');
    const result = spawnSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', '--binding', 'KV', '--local', tokenHash, '--path', tmpFile],
      { cwd: workerDir, stdio: 'inherit' },
    );
    if (result.status !== 0) {
      throw new Error(`wrangler exited with status ${String(result.status)}`);
    }
  } finally {
    unlinkSync(tmpFile);
  }

  console.log(`Opening browser: ${url}`);
  const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawnSync(openCmd, [url], { stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Reminder scenario — calls create_reminder handler directly (no LLM)
// ---------------------------------------------------------------------------

async function runReminderScenario(env: Record<string, string>): Promise<void> {
  console.log('\n--- Scenario: reminder ---');

  const remindersTable = env['REMINDERS_TABLE'];
  if (!remindersTable) {
    console.log('Skipping: REMINDERS_TABLE not configured in .env.local');
    return;
  }

  // Set env vars for handler execution
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  const { reminderExperience } = await import(
    '../packages/experiences/reminder/src/index.js'
  );

  const handler = reminderExperience.tools[0]?.handler;
  if (!handler) throw new Error('create_reminder handler not found in reminderExperience');

  const input = { text: 'Tomar remédio', when: '2026-02-24T20:00:00-03:00' };
  const context = {
    sessionId: 'smoke-test-session',
    userId: 'smoke-test-user',
    correlationId: randomUUID(),
    facts: {},
  };

  console.log('Calling create_reminder handler...');
  const result = await handler(input, context);

  if (!result.success) {
    throw new Error(`Handler returned failure: ${String(result.error)}`);
  }

  const url = (result.data as { url?: string })?.url;
  if (typeof url !== 'string' || !url) {
    throw new Error(`Handler did not return a URL. Got: ${JSON.stringify(result)}`);
  }

  console.log(`Result     : { success: true, url: "${url}" }`);
  console.log(`Opening browser: ${url}`);
  const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawnSync(openCmd, [url], { stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Spec definitions for reuse
// ---------------------------------------------------------------------------

const navigationSpec: NavigationSpec = {
  type: 'navigation',
  version: '1.0',
  destination: 'Campinas, SP',
};

const messageSpec: MessageSpec = {
  type: 'message',
  title: 'Confirmação',
  body: 'Operação realizada com sucesso.',
  actions: [{ label: 'Ver detalhes', url: 'https://example.com' }],
};

const listSpec: ListSpec = {
  type: 'list',
  title: 'Seus lembretes',
  items: [
    { label: 'Tomar remédio', description: 'Hoje às 20h' },
    { label: 'Ligar para João' },
  ],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const scenario = process.argv[2] ?? 'map';
const validScenarios = ['map', 'happy', 'message', 'list', 'reminder', 'all', 'expired', 'invalid-jwt'];

if (!validScenarios.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Valid: ${validScenarios.join(', ')}`);
  process.exit(1);
}

const env = loadEnvLocal();
const jwtSecret = env['KURAMEI_JWT_SECRET'];
if (!jwtSecret) throw new Error('KURAMEI_JWT_SECRET not set in .env.local');

if (scenario === 'message') {
  runKvScenario('message', messageSpec, jwtSecret);
  console.log('\nDone. Expected: confirmation page with "Confirmação" title and "Ver detalhes" button');
} else if (scenario === 'list') {
  runKvScenario('list', listSpec, jwtSecret);
  console.log('\nDone. Expected: list page with "Seus lembretes" and 2 items');
} else if (scenario === 'reminder') {
  await runReminderScenario(env);
  console.log('\nDone. Expected: reminder confirmation page (if REMINDERS_TABLE was set)');
} else if (scenario === 'all') {
  runKvScenario('map', navigationSpec, jwtSecret);
  runKvScenario('message', messageSpec, jwtSecret);
  runKvScenario('list', listSpec, jwtSecret);
  console.log('\nDone. Opened 3 browser tabs (map, message, list).');
} else if (scenario === 'expired') {
  runKvScenario('expired', navigationSpec, jwtSecret, { expired: true });
  console.log('\nDone. Expected: elegant error page (token expired)');
} else if (scenario === 'invalid-jwt') {
  runKvScenario('invalid-jwt', navigationSpec, 'wrong-secret-intentionally-invalid');
  console.log('\nDone. Expected: elegant error page (invalid token)');
} else {
  // map / happy / default
  runKvScenario('map', navigationSpec, jwtSecret);
  console.log('\nDone. Expected: "Rota para Campinas, SP" with Waze, Google Maps, Apple Maps buttons');
}
