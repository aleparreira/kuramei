# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Package structure (shared library)
New packages follow this pattern:
- `package.json`: `"type": "module"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, scripts: `build/clean/typecheck/lint`
- `tsconfig.json`: extends `../../tsconfig.base.json`, `"composite": true` inherited from base, list `references` to workspace deps
- Add to dependents: both `package.json` dependencies AND `tsconfig.json` references must be updated

### pnpm-workspace.yaml glob
`packages/*` covers all direct children of `packages/`. Nested packages (e.g. `packages/experiences/*`) need a separate entry.

---

## 2026-02-23 - US-001
- Created `packages/kv-client/` with `put`, `get`, `del` functions wrapping Cloudflare KV REST API
- Removed inline `fetch` KV logic from `packages/tools/src/builtin/generate-ui.ts` and `packages/sdk/src/generate-ui-helper.ts`
- Updated `package.json` + `tsconfig.json` for both `@kuramei/tools` and `@kuramei/sdk` to add `@kuramei/kv-client` dependency
- `apps/ui-worker` unchanged — reads KV via native Wrangler binding (`env.KV.get`), not REST
- **Learnings:**
  - pnpm workspace glob `packages/*` already covers `packages/kv-client` — no change to `pnpm-workspace.yaml` needed
  - Both `package.json` dependencies AND `tsconfig.json` project references must be updated when adding a workspace dep; missing either causes build or type-resolution failures
  - `tsc --build` with project references requires `"composite": true` in depended-on packages — already set in `tsconfig.base.json`
---

