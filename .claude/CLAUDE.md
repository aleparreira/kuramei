# Kuramei — Instruções para Claude Code

## O Produto

**Kuramei** é um assistente pessoal de IA via WhatsApp para o mercado brasileiro.
Usuário manda mensagem em linguagem natural → sistema entende → age → gera página standalone entregue como link.

**Fase 0 (privada):** validação com 10–20 pessoas. Sem escala ainda.

---

## Regras de Trabalho

- **Package manager:** `pnpm` — nunca `npm install` direto
- **Build:** `pnpm build` no root roda tudo via Turborepo
- **TypeScript strict** — sem `any` sem comentário explicando o porquê
- **ESM:** extensões `.js` nos imports internos (mesmo sendo `.ts` no source)
- **Não instalar pacotes novos** sem justificar — preferir o que já está no `pnpm-lock.yaml`
- **Não mudar arquitetura** sem consultar (via #arcos ou #forja no Discord)
- **Nunca fazer push para `main`** sem review do Alexandre

---

## Status Atual

### Sprint 1 — CONCLUÍDO (`08c4c21`)

`pnpm build` → 8/8 packages compilando sem erros TypeScript.

### Sprint 2 — CONCLUÍDO (`cdbcf01`, PR #11)

`pnpm build` → 11/11 packages. `pnpm smoke-test` → página "Rota para Campinas, SP" abre no browser.

Entregues:
- **`@kuramei/ui-engine`** — NavigationSpec schema + Zod validators + Renderer HTML
- **`apps/ui-worker`** — Cloudflare Worker: JWT validation, KV lookup, CSP header
- **`@kuramei/tools`** — Tool `generate_ui`: JWT + Cloudflare KV REST API + URL
- **`apps/agent-processor`** — Lambda: identidade, sessão DynamoDB, AgentClient + generate_ui
- **`apps/webhook-handler`** — wired: invoca agent-processor (InvocationType: Event)
- **`scripts/smoke-test.ts`** — teste local end-to-end (`pnpm smoke-test`)

### Sprint 3 — CONCLUÍDO (`7acdf04`, PR #12)

`pnpm build` → 13/13. Smoke test: MessageSpec, ListSpec e fluxo de lembrete passando.

Entregues:
- **`@kuramei/ui-engine`** — UISpec expandido: `MessageSpec`, `ListSpec` + renderers
- **`@kuramei/sdk`** — helper `generateUI()` + `buildSystemPrompt(base, packages)`
- **`@kuramei/experience-navigation`** — `navigationExperience` (ExperiencePackage)
- **`@kuramei/experience-reminder`** — `reminderExperience` + tool `create_reminder` (DynamoDB)
- **`apps/agent-processor`** — system prompt composto dinamicamente
- Fix P1 (Codex): params do `generate_ui` no systemPromptSection corrigidos

### Sprint 4 — CONCLUÍDO (`9ab17ad`, PR #13)

`pnpm build` → 18/18. Scheduler dispara lembretes no horário.

Entregues: `@kuramei/kv-client`, CDK stacks (4), correção arquitetural (tool descriptions ricas), `list_reminders`, `experience-weather` (wttr.in), `experience-currency` (open.er-api.com), `reminder-scheduler` (EventBridge rate(1min) → WhatsApp).

### Sprint 5 — A DEFINIR

---

## Arquitetura em Resumo

Ver `.claude/architecture.md` para detalhes técnicos completos.

**Decisões fechadas** — não reabrir sem consultar o Arcos:

| Decisão | Escolha |
|---------|---------|
| Canal | WhatsApp (Meta Business API) |
| LLM | OpenRouter — DeepSeek V3 primary, Gemini Flash fallback |
| Infra | 2 Lambdas + API Gateway + DynamoDB — sem EventBridge na Fase 0 |
| Invocação entre Lambdas | `InvocationType: Event` (assíncrono direto) |
| UI Engine edge | Cloudflare Worker estático + KV |
| JWT | Secret compartilhado: AWS Secrets Manager + Wrangler |
| Multi-tenancy | Hardcoded `KURAMEI_TENANT_ID = 'kuramei'` |

---

## Quality Gate

- Antes de fechar sprint: `pnpm build` sem erros
- Revisor técnico: **Forja** (Discord #forja) — submeter diff + contexto
- Decisões de arquitetura: escalar para **Arcos** (via Akathom no #geral)
