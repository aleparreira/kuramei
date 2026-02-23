# Kuramei — Contexto do Projeto para Claude Code

## O Produto

**Kuramei** é um assistente pessoal de IA via WhatsApp para o mercado brasileiro.

O usuário manda uma mensagem em linguagem natural ("navegar para Campinas", "lembra de ligar para o João amanhã"), o sistema entende a intenção, age — e quando necessário gera uma **página standalone** entregue como link. Zero fricção de onboarding: não precisa instalar nada.

**Fase 0 (privada):** validação com 10–20 pessoas de confiança do Alexandre. Sem escala ainda.

---

## De onde viemos

Este monorepo é um **fork adaptado do projeto Dikta** (`~/dev/dikta`).

O Dikta é um sistema B2B multi-tenancy com ~65% do backend já construído. A estratégia foi: copiar os packages relevantes, renomear como `@kuramei/*`, e adaptar para single-tenant consumer.

**Dikta vira referência de leitura apenas — não é dependência do Kuramei.**

---

## Onde estamos

### Sprint 1 — CONCLUÍDO (`08c4c21`)

`pnpm build` → **8/8 packages compilando sem erros TypeScript.**

| Package | Origem (Dikta) | Adaptações feitas |
|---------|---------------|-------------------|
| `@kuramei/tools` | `packages/sdk/tools/` | `LLMTool` (era `ClaudeTool`), `ToolContext` sem `tenantId` |
| `@kuramei/events` | `packages/core/events/` | `KurameiEvent` (era `DiktaEvent`), prefix `kuramei-` |
| `@kuramei/conversation` | `packages/core/conversation/` | `link_opened`/`ui_interaction` no estado, chave `SESSION#kuramei#<userId>` |
| `@kuramei/whatsapp` | `packages/messaging/whatsapp/` | `parsePayload()` sem `TenantRouter` |
| `@kuramei/presence` | `packages/presence/` | `IdentityResolver` simplificado, sem `UserTenantBindingStore`, `email?` na identidade |
| `@kuramei/agent` | `packages/core/agent/` | `OpenRouterProvider` novo (deepseek/deepseek-chat), `ClaudeProvider` mantido |
| `@kuramei/sdk` | `packages/sdk/src/` | `llmTools` (era `claudeTools`), `uiSpec?: UISpecTemplate[]` |
| `apps/webhook-handler` | novo | Lambda stub funcional |

---

## Para onde vamos

### Sprint 2 — PRÓXIMO: Generative UI Engine

**Critério de done:** mandar "navegar para Campinas" → receber link que abre mapa no browser.

Componentes a construir:

1. **Spec Schema** — definir e congelar o JSON que o LLM gera (ex: `{ type: "map", query: "Campinas" }`)
   - Schema deve ser congelado **antes** de escrever qualquer linha do Renderer
   - LLM nunca gera HTML/JS. Só gera JSON spec. Garantia de segurança.

2. **Renderer** — código TypeScript/JS que transforma spec em HTML
   - Roda como código do Cloudflare Worker (não gerado por IA)

3. **Cloudflare Worker** — Worker estático que:
   - Recebe requisição em `kuramei.app/ui/{token}`
   - Valida JWT localmente (secret em Wrangler)
   - Busca spec no Cloudflare KV pelo token
   - Renderiza HTML via Renderer e retorna a página

4. **KV + Token** — agent-processor escreve spec no KV com TTL, gera JWT assinado, retorna URL via WhatsApp

### Sprint 3 — Experience Packages
DSL de workflows multi-step, capacidades empacotadas (navegação, lembrete, notas). Detalhes a definir com o Arcos antes de começar.

---

## Decisões Arquiteturais Fechadas

**Não reabrir sem consultar o Arcos:**

| Decisão | Escolha |
|---------|---------|
| Canal | WhatsApp (Meta Business API) |
| LLM | OpenRouter — DeepSeek V3 primary, Gemini Flash fallback |
| Infra | 2 Lambdas + API Gateway + DynamoDB — **sem EventBridge na Fase 0** |
| Invocação entre Lambdas | `InvocationType: Event` (assíncrono direto) — sem fila |
| UI Engine edge | Cloudflare Worker estático + KV |
| JWT | Secret compartilhado: AWS Secrets Manager (Lambda) + Wrangler secret (Worker) |
| Multi-tenancy | Hardcoded `KURAMEI_TENANT_ID = 'kuramei'` — não remover o código, só hardcodar |
| Workflows na Fase 0 | Cortado — `@kuramei/workflows` não existe ainda |

---

## Estrutura do Repositório

```
kuramei/
├── apps/
│   └── webhook-handler/     # Lambda que recebe webhook da Meta
├── packages/
│   ├── agent/               # Agent client + LLM providers (Claude + OpenRouter)
│   │   └── src/llm/
│   │       ├── openrouter-provider.ts  ← NOVO: DeepSeek via OpenRouter
│   │       └── claude-provider.ts      ← mantido como fallback
│   ├── conversation/        # Session manager + DynamoDB
│   ├── events/              # Event store + correlation IDs
│   ├── presence/            # Identity resolver + channel bindings
│   ├── sdk/                 # AppConfig, BuiltApp, LLMTool types
│   ├── tools/               # ToolRegistry, decorators, tipos
│   └── whatsapp/            # Parser, sender, signature validation
├── package.json             # root (private, Turborepo)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## Regras de Trabalho

- **Package manager:** `pnpm` — nunca `npm install` direto
- **Build:** `pnpm build` no root roda tudo via Turborepo
- **Commits:** em inglês, descritivos, por feature/fix
- **Não instalar pacotes novos** sem justificar — preferir o que já está no `pnpm-lock.yaml`
- **Não mudar arquitetura** sem consultar (via #arcos ou #forja no Discord)
- **TypeScript strict** — sem `any` sem comentário explicando o porquê
- **ESM:** extensões `.js` nos imports internos (mesmo sendo `.ts` no source)
- **Nunca fazer push para `main`** sem review do Alexandre

---

## Quality Gate

O agente **Forja** (no #forja do Discord) é o revisor técnico.

Antes de fechar qualquer sprint:
1. Rodar `pnpm build` — deve passar sem erros
2. Pedir revisão ao Forja com o diff + contexto do que foi feito

Para decisões de arquitetura: escalar para o **Arcos** (via **Akathom** no #geral).

---

## Variáveis de Ambiente Necessárias (Fase 0)

```env
# Lambda (AWS Secrets Manager / SSM)
OPENROUTER_API_KEY=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
DYNAMODB_TABLE=
KURAMEI_JWT_SECRET=

# Cloudflare Worker (Wrangler secrets)
KURAMEI_JWT_SECRET=    # mesmo secret do Lambda
KV_NAMESPACE=          # binding do KV no wrangler.toml
```

Nenhuma dessas variáveis existe ainda — serão configuradas quando infra for provisionada.
