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

