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

