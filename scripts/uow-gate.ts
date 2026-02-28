#!/usr/bin/env tsx
/**
 * uow-gate.ts — UOW Quality Gate (NEXT-5)
 *
 * Reads uow-report.json, validates against NEXT-4 thresholds, prints a clear
 * pass/warn/block summary.
 *
 * Modes:
 *   warning-only (default)  always exits 0; prints WARNING on violations
 *   --enforce               exits 1 on violations (activate after warning week)
 *
 * Usage:
 *   npx tsx scripts/uow-gate.ts [--report <path>] [--enforce]
 *   pnpm uow-gate
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const enforceMode = args.includes('--enforce');
const ri = args.indexOf('--report');
const reportPath =
  ri >= 0 && args[ri + 1] != null
    ? resolve(args[ri + 1] as string)
    : resolve(process.cwd(), 'uow-report.json');

// ── Thresholds (NEXT-4 ARQ-GO) ───────────────────────────────────────────────
const THRESHOLDS = {
  taskSuccessRate: 0.6,   // >= 60 %  (9/15)
  policyCompliance: 1.0,  // 100 %    (5/5)
  p95LatencyMs: 15_000,   // <=15 000 ms
} as const;

// ── Report types (mirrors NEXT-4 spec) ───────────────────────────────────────
interface AssertionResult { assertion: string; passed: boolean; detail?: string }
interface ScenarioResult  { scenarioId: string; passed: boolean; latencyMs: number; response: string; assertionResults: AssertionResult[]; error?: string }
interface UowReport       { runId: string; timestamp: string; totalScenarios: number; passed: number; failed: number; taskSuccessRate: number; policyCompliance: number; p95LatencyMs: number; blocked: boolean; results: ScenarioResult[] }

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(r: number): string { return `${(r * 100).toFixed(1)}%`; }

function checkThreshold(
  label: string,
  actual: number,
  required: number,
  unit: 'pct' | 'ms',
  lowerIsBetter = false,
): { passed: boolean; line: string } {
  const passed = lowerIsBetter ? actual <= required : actual >= required;
  const icon   = passed ? '✅' : enforceMode ? '❌' : '⚠️ ';
  const req    = unit === 'ms' ? `<= ${required}ms` : `>= ${pct(required)}`;
  const act    = unit === 'ms' ? `${actual}ms`      : pct(actual);
  return { passed, line: `  ${icon} ${label.padEnd(20)} ${act.padStart(8)}  (required: ${req})` };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const mode = enforceMode ? 'ENFORCE     ' : 'WARNING-ONLY';
  console.log(`\n+------------------------------------------+`);
  console.log(`|  Kuramei UOW Gate  [${mode}]  |`);
  console.log(`+------------------------------------------+\n`);

  // No report → skip (no block in either mode)
  if (!existsSync(reportPath)) {
    console.log(`SKIP  no report at: ${reportPath}`);
    console.log(`      Run: pnpm --filter @kuramei/tester start`);
    console.log(`      No report = no block.\n`);
    process.exit(0);
  }

  // Parse
  let report: UowReport;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf-8')) as UowReport;
  } catch (err) {
    console.error(`PARSE ERROR: ${reportPath}`);
    console.error(err);
    if (enforceMode) process.exit(1);
    process.exit(0);
  }

  console.log(`Run    ${report.runId}`);
  console.log(`Time   ${report.timestamp}`);
  console.log(`Score  ${report.passed}/${report.totalScenarios} scenarios passed\n`);

  // Thresholds
  const checks = [
    checkThreshold('Task Success Rate', report.taskSuccessRate, THRESHOLDS.taskSuccessRate, 'pct'),
    checkThreshold('Policy Compliance', report.policyCompliance, THRESHOLDS.policyCompliance, 'pct'),
    checkThreshold('Latency p95',       report.p95LatencyMs,    THRESHOLDS.p95LatencyMs,    'ms', true),
  ];

  console.log('Thresholds:');
  for (const c of checks) console.log(c.line);

  // Failed scenarios detail
  const failedScenarios = report.results.filter((r) => !r.passed);
  if (failedScenarios.length > 0) {
    console.log(`\nFailed scenarios (${failedScenarios.length}):`);
    for (const r of failedScenarios) {
      const errSuffix = r.error != null ? `  [${r.error}]` : '';
      console.log(`  > ${r.scenarioId}${errSuffix}`);
      for (const a of r.assertionResults.filter((a) => !a.passed)) {
        const detail = a.detail != null ? `: ${a.detail}` : '';
        console.log(`      x ${a.assertion}${detail}`);
      }
    }
  }

  // Verdict
  const allPassed = checks.every((c) => c.passed);
  console.log('');

  if (allPassed) {
    console.log('RESULT  PASSED — all thresholds met.\n');
    process.exit(0);
  }

  if (enforceMode) {
    console.log('RESULT  BLOCKED — quality below threshold. Fix before merging.\n');
    process.exit(1);
  }

  console.log('RESULT  WARNING — below threshold (warning-only mode, not blocking).');
  console.log('        Activate enforcement: pnpm uow-gate --enforce\n');
  process.exit(0);
}

main();
