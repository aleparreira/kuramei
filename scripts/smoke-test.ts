/**
 * smoke-test.ts
 *
 * Local end-to-end test for the UI Engine pipeline without Lambda.
 * Requires `wrangler dev` running in apps/ui-worker before executing.
 *
 * Usage:
 *   pnpm smoke-test              # happy path — navigation to Campinas, SP
 *   pnpm smoke-test expired      # expired token → elegant error page
 *   pnpm smoke-test invalid-jwt  # wrong JWT secret → elegant error page
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
// Main
// ---------------------------------------------------------------------------

const scenario = process.argv[2] ?? 'happy';
const validScenarios = ['happy', 'expired', 'invalid-jwt'];
if (!validScenarios.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Valid: ${validScenarios.join(', ')}`);
  process.exit(1);
}

const env = loadEnvLocal();
const jwtSecret = env['KURAMEI_JWT_SECRET'];
if (!jwtSecret) throw new Error('KURAMEI_JWT_SECRET not set in .env.local');

const tokenHash = randomUUID();
const now = Date.now();

let expiresAt: number;
let usedSecret: string;

if (scenario === 'expired') {
  expiresAt = now - 3_600_000; // 1 hour in the past
  usedSecret = jwtSecret;
  console.log('Scenario: expired token (expiresAt in the past)');
} else if (scenario === 'invalid-jwt') {
  expiresAt = now + 3_600_000;
  usedSecret = 'wrong-secret-intentionally-invalid';
  console.log('Scenario: invalid JWT (wrong secret)');
} else {
  expiresAt = now + 3_600_000;
  usedSecret = jwtSecret;
  console.log('Scenario: happy path');
}

const specToken = {
  spec: {
    type: 'navigation' as const,
    version: '1.0' as const,
    destination: 'Campinas, SP',
  },
  userId: 'smoke-test-user',
  createdAt: now,
  expiresAt,
};

const jwt = signJwt({ hash: tokenHash, exp: Math.floor(expiresAt / 1000) }, usedSecret);
const url = `http://localhost:8787/ui/${jwt}`;

console.log(`Token hash : ${tokenHash}`);
console.log(`URL        : ${url}`);

// ---------------------------------------------------------------------------
// Write spec to local KV via wrangler CLI
// ---------------------------------------------------------------------------

const workerDir = path.join(ROOT, 'apps', 'ui-worker');
const kvValue = JSON.stringify(specToken);

// Write JSON to a temp file to avoid any quoting issues with the value
const tmpFile = path.join(ROOT, '.smoke-test-tmp.json');
writeFileSync(tmpFile, kvValue, 'utf-8');

try {
  console.log('\nWriting spec to local KV...');
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

// ---------------------------------------------------------------------------
// Open in browser
// ---------------------------------------------------------------------------

console.log(`\nOpening browser: ${url}`);
const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
// Use spawnSync with args array (no shell) to avoid injection
spawnSync(openCmd, [url], { stdio: 'inherit' });

console.log('\nDone. Check the browser tab.');
if (scenario === 'expired') {
  console.log('Expected: elegant error page (token expired)');
} else if (scenario === 'invalid-jwt') {
  console.log('Expected: elegant error page (invalid token)');
} else {
  console.log('Expected: "Rota para Campinas, SP" with Waze, Google Maps, Apple Maps buttons');
}
