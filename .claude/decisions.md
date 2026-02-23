# Decisões Técnicas — Kuramei

> Registro de decisões importantes. Não reabrir sem consultar o Arcos.

---

## Decisões Ativas

### [2025-01] Canal de Comunicação

**Contexto:** Escolha do canal principal de interação com o usuário.

**Alternativas consideradas:**
1. WhatsApp — ubíquo no Brasil, zero onboarding
2. Telegram — API mais simples, mas menor penetração BR
3. App próprio — máximo controle, mas fricção alta

**Decisão:** WhatsApp (Meta Business API)

**Justificativa:** Penetração massiva no Brasil. Zero fricção: usuário já tem instalado.

---

### [2025-01] Provider LLM

**Contexto:** Qual LLM usar para o agent principal.

**Alternativas consideradas:**
1. OpenAI GPT-4 — caro, latência ok
2. Anthropic Claude direto — qualidade alta, custo médio
3. OpenRouter + DeepSeek — custo baixo, qualidade competitiva

**Decisão:** OpenRouter com DeepSeek V3 (primário) + Gemini Flash (fallback)

**Justificativa:** Custo drasticamente menor para Fase 0. ClaudeProvider mantido como alternativo.

---

### [2025-01] Infraestrutura AWS

**Contexto:** Arquitetura de execução para Fase 0.

**Alternativas consideradas:**
1. 2 Lambdas + API Gateway + DynamoDB (sem EventBridge)
2. EventBridge + múltiplos consumidores (mais escalável, mais complexo)
3. EC2/ECS com processo long-running

**Decisão:** 2 Lambdas + API Gateway + DynamoDB. Invocação direta `InvocationType: Event`.

**Justificativa:** Simplicidade máxima para Fase 0. EventBridge adicionado quando houver necessidade real de múltiplos consumidores.

---

### [2025-01] UI Engine

**Contexto:** Como gerar e servir interfaces dinâmicas sem app instalado.

**Alternativas consideradas:**
1. Cloudflare Worker + KV — edge, rápido, custo baixo
2. Lambda + S3 — mais controle, mais complexo
3. Vercel Functions — simples mas vendor lock

**Decisão:** Cloudflare Worker estático + KV. JWT com secret compartilhado.

**Justificativa:** Latência mínima no edge. KV ideal para TTL curto (1h). Worker não executa código gerado por IA.

---

### [2025-01] Multi-tenancy

**Contexto:** Dikta era multi-tenant; Kuramei é single-tenant na Fase 0.

**Decisão:** `KURAMEI_TENANT_ID = 'kuramei'` hardcoded. Código multi-tenant do Dikta mantido mas com valor fixo.

**Justificativa:** Não adicionar complexidade antes de precisar. Fácil de reverter quando escalar.

---

### [2025-01] Workflows

**Decisão:** `@kuramei/workflows` cortado na Fase 0.

**Justificativa:** Complexidade desnecessária para validação inicial. Revisitar no Sprint 3 com o Arcos.

---

## Decisões Pendentes

- [ ] Schema definitivo dos UI specs (Sprint 2 — precisa ser congelado antes do Renderer)
- [ ] Estratégia de retry para falhas do OpenRouter
- [ ] TTL dos tokens JWT e specs no KV
- [ ] Estrutura do DynamoDB single-table (GSIs, padrões de acesso)
