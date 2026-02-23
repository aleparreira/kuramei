# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### UISpec Discriminated Union Pattern
`UISpecSchema` usa `z.discriminatedUnion('type', [...])` — cada spec tem campo `type` como literal. Para adicionar novo tipo: (1) interface + Zod schema em `spec/schema.ts`, (2) renderer em `src/renderer/<type>.ts`, (3) export em `index.ts`, (4) case no switch em `apps/ui-worker/src/renderer.ts`.

### Renderer HTML Pattern
Todos os renderers retornam HTML completo com:
- CSS inline apenas (sem CDN/frameworks externos)
- `max-width:480px` centrado — mobile-first
- Banner de expiração: verde (`#f0fdf4`) se válido, vermelho (`#fee2e2`) se expirado
- Footer "Enviado via Kuramei" em `#9ca3af`
- `formatTimeRemaining(expiresAt)` — helper local em cada renderer

---

## [2026-02-23] - US-001
- Adicionados `MessageSpec` e `ListSpec` ao schema com Zod validators
- `UISpecSchema` atualizado para `z.discriminatedUnion('type', [...])`
- Criados `src/renderer/message.ts` e `src/renderer/list.ts`
- `index.ts` exporta todos os novos tipos, schemas e renderers
- `apps/ui-worker/src/renderer.ts` usa switch por `spec.type`
- Files: `packages/ui-engine/src/spec/schema.ts`, `packages/ui-engine/src/index.ts`, `packages/ui-engine/src/renderer/message.ts`, `packages/ui-engine/src/renderer/list.ts`, `apps/ui-worker/src/renderer.ts`
- **Learnings:**
  - `z.discriminatedUnion` é preferível a `z.union` quando há campo discriminador — melhor inferência de tipo e mensagens de erro
  - `formatTimeRemaining` é helper local duplicado em cada renderer — aceitável para manter renderers independentes sem shared util

---

## [2026-02-23] - US-002
- Adicionado `ExperiencePackage` interface a `@kuramei/sdk` (`packages/sdk/src/experience-package.ts`)
- Adicionado `packages/experiences/*` ao `pnpm-workspace.yaml`
- Criado `packages/experiences/navigation/` com `package.json`, `tsconfig.json` e `src/index.ts`
- `navigationExperience` exporta: `name`, `description`, `systemPromptSection` (PT-BR) e `tools: [generateUiTool]`
- Files: `packages/sdk/src/experience-package.ts`, `packages/sdk/src/index.ts`, `pnpm-workspace.yaml`, `packages/experiences/navigation/package.json`, `packages/experiences/navigation/tsconfig.json`, `packages/experiences/navigation/src/index.ts`
- **Learnings:**
  - `packages/experiences/*` é um glob de segundo nível — o pnpm-workspace.yaml original com `packages/*` NÃO cobre sub-diretórios automaticamente; precisa de entrada explícita
  - `ExperiencePackage` foi adicionado em US-002 (não US-004b como indicado no PRD) porque é prerequisito de build — US-004b pode complementar com `buildSystemPrompt`
  - tsconfig de sub-diretório usa `../../../tsconfig.base.json` (3 níveis acima para `packages/experiences/navigation/`)

---

## [2026-02-23] - US-003
- Criado `packages/experiences/reminder/src/index.ts` com `reminderExperience: ExperiencePackage`
- `create_reminder` tool: Zod validation, ulid ID, DynamoDB PutCommand (REMINDERS_TABLE), `generateUI()` do `@kuramei/sdk`, retorna `{ success: true, data: { url } }`
- `systemPromptSection` em PT-BR: instrui LLM a pedir "quando" antes de chamar a tool, confirmar com link, não usar para consultar
- Adicionado `REMINDERS_TABLE` ao `.env.example`
- Files: `packages/experiences/reminder/src/index.ts`, `.env.example`
- **Learnings:**
  - `defineTool<TInput>` com genérico explícito resulta em `ToolDefinition<TInput>[]` não assignable a `ToolDefinition<unknown>[]` (ExperiencePackage.tools) — usar `defineTool({...})` sem genérico; Zod faz o parse internamente no handler
  - Mesmo padrão do `navigationExperience` confirmado: handler recebe `unknown`, Zod valida, TypeScript satisfeito

---

## [2026-02-23] - US-004a
- Criado `packages/sdk/src/generate-ui-helper.ts` com função `generateUI(spec, { userId })` — lógica extraída do handler original (JWT HS256, Cloudflare KV REST, URL)
- Adicionado `@kuramei/ui-engine: workspace:*` em `packages/sdk/package.json` e `{ "path": "../ui-engine" }` nas tsconfig references do sdk
- Exportado `generateUI`, `GenerateUIContext`, `GenerateUIResult` de `packages/sdk/src/index.ts`
- `packages/tools/src/builtin/generate-ui.ts` MANTEVE implementação interna (não virou thin wrapper) — comentário adicionado explicando o motivo
- Files: `packages/sdk/src/generate-ui-helper.ts`, `packages/sdk/src/index.ts`, `packages/sdk/package.json`, `packages/sdk/tsconfig.json`, `packages/tools/src/builtin/generate-ui.ts`
- **Learnings:**
  - Dependência circular `@kuramei/sdk` → `@kuramei/tools` → `@kuramei/sdk` impede fazer o generate-ui tool um thin wrapper: Turborepo detecta ciclos no grafo de build e falha. A AC "becomes a thin wrapper" não foi satisfeita; o helper em sdk existe para uso por consumidores externos ao ToolRegistry (ex: futuro `create_reminder`)
  - Para evitar ciclos em monorepos Turborepo, nunca crie dependências que fechem um loop nas referências TypeScript project + npm
  - `pnpm install` (sem `--frozen-lockfile`) necessário ao adicionar dependência nova em workspace

---

