# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Package Structure Pattern
All packages follow this structure:
- `package.json`: `"type": "module"`, `main`/`types` pointing to `./dist/index.js`, scripts: `build` (tsc --build), `typecheck` (tsc --noEmit), `lint` (eslint src)
- `tsconfig.json`: extends `../../tsconfig.base.json`, sets `outDir: ./dist` and `rootDir: ./src`
- ESM imports use `.js` extension even for `.ts` source files

### tsconfig.base.json Key Flags
`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `NodeNext` module resolution — these are strict and will cause unexpected TS errors if not accounted for.

### pnpm-workspace.yaml
Already covers `packages/*` and `apps/*` globs — no manual entry needed for new packages.

---

## 2026-02-23 - US-001
- **What was implemented:** Created `packages/ui-engine/` with `@kuramei/ui-engine` package
- **Files changed:**
  - `packages/ui-engine/package.json` — new package with zod dependency
  - `packages/ui-engine/tsconfig.json` — extends base config
  - `packages/ui-engine/src/spec/schema.ts` — TypeScript types (UISpecType, NavigationSpec, UISpec, UISpecToken) + Zod validators (NavigationSpecSchema, UISpecSchema, UISpecTokenSchema)
  - `packages/ui-engine/src/index.ts` — re-exports all types and validators
  - `pnpm-lock.yaml` — updated with zod@3.25.76
- **Learnings:**
  - Zod was not in the lockfile — needed `pnpm add zod --filter @kuramei/ui-engine`
  - `pnpm-workspace.yaml` already covers `packages/*` glob; no manual entry needed
  - `tsc --build` (composite mode) required `tsconfig.json` to match other packages exactly
  - `pnpm build` passed 9/9 packages (8 previous + ui-engine) on first attempt
---

## 2026-02-23 - US-003
- **What was implemented:** Created `apps/ui-worker/` — Cloudflare Worker with JWT validation, KV lookup, rendering, and CSP header
- **Files changed:**
  - `apps/ui-worker/package.json` — new app with `@cloudflare/workers-types` devDep
  - `apps/ui-worker/tsconfig.json` — overrides base: `module: ESNext`, `moduleResolution: Bundler`, `types: ["@cloudflare/workers-types"]`, `noEmit: true` (no dist needed; wrangler bundles)
  - `apps/ui-worker/wrangler.toml` — Cloudflare Worker config with KV namespace binding placeholder
  - `apps/ui-worker/src/validate.ts` — `verifyJWT()` using Web Crypto API (HMAC-SHA256), `parseUISpecToken()` using Zod
  - `apps/ui-worker/src/renderer.ts` — `render()` delegates to `@kuramei/ui-engine`; `renderInvalidToken()` and `renderExpired()` return inline-CSS error pages with WhatsApp deep link
  - `apps/ui-worker/src/index.ts` — Worker fetch handler: routes `GET /ui/:token`, validates JWT, reads from KV, renders HTML, adds CSP header on all responses
  - `pnpm-lock.yaml` — added `@cloudflare/workers-types@^4.0.0`
- **Learnings:**
  - **Cloudflare Worker tsconfig pattern:** override `module: ESNext`, `moduleResolution: Bundler`, `types: ["@cloudflare/workers-types"]`, `composite: false`, `noEmit: true` — no dist folder, wrangler bundles
  - **Turborepo warning "no output files":** expected when `build` uses `tsc --noEmit`. Not a failure; suppress later via turbo.json `outputs: []` for this task if needed
  - **exactOptionalPropertyTypes + Zod v3:** Zod's inferred type adds `| undefined` to optional fields, conflicting with `exactOptionalPropertyTypes`. Fix: `result.data as UISpecToken` after `safeParse` succeeds — safe since validation already ran
  - **noUncheckedIndexedAccess + RegExp.match():** `pathMatch[1]` is `string | undefined`; need explicit check even after `pathMatch !== null`
  - **Web Crypto JWT:** no external library needed for HS256 validation in Workers — `crypto.subtle.importKey` + `crypto.subtle.verify` handle HMAC-SHA256 natively
  - **pnpm build 10/10** passes (9 previous + ui-worker)
---

## 2026-02-23 - US-002
- **What was implemented:** Created `renderNavigation(spec, token)` function that returns a complete HTML page for navigation
- **Files changed:**
  - `packages/ui-engine/src/renderer/navigation.ts` — new renderer with `renderNavigation` function; inline CSS only; handles expired/valid states
  - `packages/ui-engine/src/index.ts` — added `renderNavigation` export
- **Learnings:**
  - `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` don't create friction for pure string generation functions — no gotchas here
  - Inline CSS approach works cleanly; no external dependencies needed
  - `Date.now()` for expiration check; `encodeURIComponent` for URL-safe destination param
  - Waze deep link: `waze://?q={dest}&navigate=yes` — Apple Maps: `maps://?q={dest}` — Google Maps: `https://www.google.com/maps/search/?q={dest}`
  - `pnpm build` 9/9 passes (8 cached + ui-engine rebuilt)
---

