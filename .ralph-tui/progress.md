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

## 2026-02-23 - US-002
- Created `infra/cdk/` CDK package with 4 stacks: DynamoStack, AgentStack, WebhookStack, SchedulerStack
- DynamoStack: `kuramei-main` table (TTL) + `kuramei-reminders` table with GSI `status-when-index`
- AgentStack: Lambda `kuramei-agent-processor` (arm64, Node 20, 60s timeout, 512MB), ESM bundle
- WebhookStack: Lambda `kuramei-webhook-handler` (arm64, Node 20, 30s timeout) + LambdaRestApi
- SchedulerStack: Lambda `kuramei-reminder-scheduler` (arm64, Node 20, 5m timeout) + EventBridge rate(1 min)
- Updated `apps/ui-worker/wrangler.toml`: name=kuramei-ui, route app.kuramei.app/*, updated compatibility_date
- Created `docs/runbook-deploy.md`: 8-step deploy guide (AWS prereqs → CDK bootstrap → deploy → Secrets Manager → Wrangler → DNS → Meta webhook → smoke test)
- Created `.env.production.example`: all required env var keys for Lambda
- Updated `pnpm-workspace.yaml`: added `infra/*` glob
- **Learnings:**
  - `NodejsFunction`'s `bundling.format` requires `OutputFormat.ESM` (enum), not the string `'esm'` — even with `as const`, it's not assignable to the enum type
  - CDK's strict types (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) can conflict with CDK's own API surface — override these two in infra/cdk's tsconfig
  - `infra/*` workspace glob is needed in `pnpm-workspace.yaml` (not covered by `packages/*`)
  - CDK tsconfig uses `rootDir: "."` (not `./src`) since CDK apps have both `bin/` and `lib/` as top-level dirs
---

## 2026-02-23 - US-004
- Updated `packages/tools/src/builtin/generate-ui.ts`: rich description covering all 3 types (navigation, message, list); full inputSchema with all fields for all types; switched handler validation from `NavigationSpecSchema` to `UISpecSchema`
- Updated `packages/experiences/navigation/src/index.ts`: systemPromptSection reduced to behavioral contract only — no more routing instructions
- Updated `packages/experiences/reminder/src/index.ts`: `create_reminder` description enriched with PT-BR linguistic variations; systemPromptSection reduced to behavioral contract only
- **Learnings:**
  - Experience packages (`packages/experiences/*`) do not have lint scripts — `pnpm lint` from root only covers packages with the script configured
  - Tool descriptions act as the LLM router: the richer and more explicit the description, the less work the systemPromptSection needs to do
  - systemPromptSections should be behavioral contracts (post-tool behavior, edge cases), not routing instructions — routing belongs in tool descriptions
---

## 2026-02-23 - US-003
- Added `list_reminders` tool to `packages/experiences/reminder/src/index.ts`
- DynamoDB `QueryCommand` with `PK = USER#<userId>` + `FilterExpression status = 'pending'`
- Client-side sort by `when` ascending (SK is `REMINDER#<ulid>`, not `when`)
- `formatWhenPtBr`: parses ISO dates with `Intl.DateTimeFormat`; returns "Hoje", "Amanhã", or `DD/MM` format; falls back to raw string if unparseable
- `getTodayPrefix`: uses `sv-SE` locale with São Paulo timezone to get `YYYY-MM-DD` string
- `filter='today'`: `when.startsWith(todayPrefix)`; `filter='upcoming'`: `when >= todayPrefix`
- Empty result → `MessageSpec`; non-empty → `ListSpec` with label + description
- `systemPromptSection` updated with explicit "Não listar reminders logo após criar..." contract
- `reminderExperience.tools` updated to `[createReminderTool, listRemindersTool]`
- `pnpm build` → 15/15, `pnpm typecheck` → clean
- **Learnings:**
  - `status` is a DynamoDB reserved word — must alias as `#status` in `ExpressionAttributeNames`
  - `sv-SE` locale produces `YYYY-MM-DD` format natively — handy for prefix comparisons without string manipulation
  - `upcoming` filter needs `when >= todayPrefix` to exclude past pending items (DynamoDB `FilterExpression` only filters by `status`, not by date)
---

## 2026-02-23 - US-006a
- Created `packages/experiences/weather/` with `package.json`, `tsconfig.json`, `src/index.ts`
- `get_weather` tool: fetches `https://wttr.in/{location}?format=j1`, extracts `current_condition[0]` (temp_C, FeelsLikeC, weatherDesc) and `weather[0]` (maxtempC, mintempC)
- Returns `MessageSpec` with `🌤️ Tempo em {location}` on success; friendly PT-BR error MessageSpec on fetch failure or missing data
- `weatherExperience.systemPromptSection`: instructs LLM to add contextual tip (e.g. "leve guarda-chuva!")
- Updated `apps/agent-processor`: `package.json` dependency + `tsconfig.json` reference + `import { weatherExperience }` + added to `experiences` array
- `pnpm build` → 16/16 packages, all checks passed (lint, typecheck, pre-commit hooks)
- **Learnings:**
  - wttr.in JSON field path is `current_condition[0]` (not `current`), `weather[0]` for today's forecast
  - `packages/experiences/*` glob already in `pnpm-workspace.yaml` — no update needed
  - Weather package has no DynamoDB dependency — lighter than reminder; `devDependencies` only needs `typescript`
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

## 2026-02-23 - US-006b
- Created `packages/experiences/currency/` with `package.json`, `tsconfig.json`, `src/index.ts`
- `convert_currency` tool: fetches `https://open.er-api.com/v6/latest/{from}`, extracts `rates[to]`
- Calculates `result = amount * rate`, formats to 2 decimal places; rate formatted to 4 decimal places
- On success: `MessageSpec` with `💱 {amount} {from} = {result} {to}` title + rate + update date
- On missing currency (rate undefined): `MessageSpec` listing 9 main supported currencies
- On fetch error: friendly PT-BR error `MessageSpec`
- `currencyExperience.systemPromptSection`: instructs LLM to add time context if relevant
- Updated `apps/agent-processor`: `package.json` dependency + `tsconfig.json` reference + `import { currencyExperience }` + added to `experiences` array
- `pnpm build` → 17/17 packages, `pnpm typecheck` → 30/30 clean
- **Learnings:**
  - `open.er-api.com` free tier requires no API key — response has `rates` object keyed by ISO code; missing key = invalid currency
  - Zod `.transform((v) => v.toUpperCase())` on string fields normalizes input before validation — clean pattern for ISO codes
  - `packages/experiences/*` glob already in `pnpm-workspace.yaml` — no update needed (same as weather)
---

