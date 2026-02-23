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

### Sprint 2 — EM ANDAMENTO: Generative UI Engine

**Critério de done:** mandar "navegar para Campinas" → receber link que abre mapa no browser.

**📋 PRD completo:** `docs/sprint-2-prd.md` — leia antes de codar qualquer coisa.

Componentes a construir:

1. **`@kuramei/ui-engine`** — Spec Schema (congelado antes do Renderer) + Renderer
2. **`apps/ui-worker`** — Cloudflare Worker: valida JWT, busca spec no KV, renderiza HTML, CSP header
3. **Tool `generate_ui`** — Lambda escreve no KV via **Cloudflare REST API** (não binding direto)
4. Pipeline WhatsApp → URL completo + smoke test local

> ⚠️ **Correção crítica (Arcos):** Lambda (AWS) e Cloudflare KV são clouds diferentes.
> O tool `generate_ui` deve chamar a **Cloudflare KV REST API** para escrever o spec:
> ```
> PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}?expiration_ttl=3600
> Authorization: Bearer {CLOUDFLARE_API_TOKEN}
> ```
> Variáveis necessárias no Lambda: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_KV_NAMESPACE_ID`, `CLOUDFLARE_API_TOKEN`

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
