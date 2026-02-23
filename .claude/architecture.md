# Arquitetura Técnica — Kuramei

> Resumo executivo para IA. Origem: fork adaptado do Dikta (B2B multi-tenant).

---

## Visão Geral

```
WhatsApp User
     │
     ▼
Meta Webhook ──► webhook-handler (Lambda)
                      │
                      ▼ InvocationType: Event
                 agent-processor (Lambda)  [a construir]
                      │
                      ├──► DynamoDB (session + events)
                      ├──► OpenRouter API (DeepSeek V3)
                      └──► Cloudflare KV (UI specs)
                                │
                                ▼
                      kuramei.app/ui/{token}
                      (Cloudflare Worker)
                                │
                                ▼
                         Browser do usuário
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| Mensageria | WhatsApp Business API (Meta) |
| Lambda runtime | Node.js 20 + ESM |
| LLM primary | DeepSeek V3 via OpenRouter |
| LLM fallback | Gemini Flash 1.5 via OpenRouter |
| LLM alternativo | Claude Sonnet (ClaudeProvider) |
| Database | DynamoDB (single-table design) |
| UI edge | Cloudflare Worker + KV |
| Auth | JWT (secret compartilhado Lambda ↔ Worker) |
| Build | Turborepo + pnpm workspaces |

## Estrutura de Packages

```
kuramei/
├── apps/
│   └── webhook-handler/     # Lambda entry point (recebe webhook Meta)
└── packages/
    ├── tools/               # ToolRegistry, LLMTool, decorators
    ├── events/              # Event sourcing — KurameiEvent, DynamoDB store
    ├── conversation/        # Session manager — estados, DynamoDB
    ├── whatsapp/            # Parser + sender + validação de assinatura
    ├── presence/            # IdentityResolver — ConversationalIdentity
    ├── agent/               # AgentClient + ClaudeProvider + OpenRouterProvider
    └── sdk/                 # AppConfig, BuiltApp, UISpecTemplate types
```

## Fluxo Principal (Fase 0)

```
1. Meta envia POST /webhook → webhook-handler
2. webhook-handler valida assinatura HMAC
3. Parseia payload → extrai mensagem + phone number
4. Invoca agent-processor assincronamente (InvocationType: Event)
5. agent-processor:
   a. Resolve identidade via PresenceService
   b. Carrega/cria sessão no DynamoDB
   c. Chama LLM com histórico + tools disponíveis
   d. LLM decide: resposta simples ou gerar UI spec
   e. Se UI spec: salva no KV, gera JWT, monta URL
   f. Envia resposta via WhatsApp Sender
```

## Fluxo UI (Sprint 2 — a construir)

```
LLM gera JSON spec → KV.put(token, spec, TTL=1h)
→ JWT assinado com token → URL = kuramei.app/ui/{jwt}
→ Cloudflare Worker recebe request
→ Valida JWT, extrai token, busca spec no KV
→ Renderer transforma spec em HTML → response
```

## Estados de Sessão (conversation)

```typescript
type SessionState =
  | 'idle'
  | 'processing'
  | 'waiting_user_input'
  | 'link_opened'      // usuário abriu link gerado
  | 'ui_interaction'   // usuário interagiu com UI
  | 'ended'
```

## Chave de Sessão DynamoDB

```
PK: SESSION#kuramei#<phoneNumber>
```
`kuramei` é hardcoded — não há multi-tenancy na Fase 0.

## Providers LLM

### OpenRouterProvider (primário)
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Modelo padrão: `deepseek/deepseek-chat`
- Headers: `HTTP-Referer`, `X-Title`
- Fallback: `google/gemini-flash-1.5`

### ClaudeProvider (alternativo)
- Anthropic SDK direto
- Modelo: `claude-sonnet-4-20250514`
- Suporta prompt caching

## Variáveis de Ambiente (ainda não provisionadas)

```env
# Lambda (AWS Secrets Manager)
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

## Notas Críticas

- Dikta é **referência de leitura** apenas — não é dependência do Kuramei
- `@kuramei/workflows` não existe na Fase 0 (cortado)
- LLM **nunca gera HTML/JS** — só gera JSON spec (segurança)
- Renderer é código TypeScript fixo, não gerado por IA
