# Sprint 2 PRD — Generative UI Engine

**Status:** Aprovado pelo Arcos (2026-02-23)
**Critério de done:** Mandar "navegar para Campinas" → receber link que abre mapa no browser.

---

## Contexto

Sprint 1 entregou o plombing: monorepo funcional, 7 packages portados do Dikta, OpenRouterProvider. O pipeline WhatsApp → Intent Processor existe mas não devolve nada visual.

Sprint 2 fecha o loop: o LLM gera um JSON spec, esse spec vira uma página HTML hospedada no edge, e o usuário recebe um link no WhatsApp.

**Princípio central de segurança:** o LLM nunca gera HTML ou JavaScript. Só gera JSON spec. O Renderer é código nosso, auditável, não gerado por IA.

---

## Arquitetura do Sprint 2

```
WhatsApp → webhook-handler Lambda
             ↓
         agent-processor Lambda
             ↓ (tool call: generate_ui)
         generate_ui tool:
           1. Monta UISpecToken (spec + metadata)
           2. Gera JWT assinado com KURAMEI_JWT_SECRET
           3. PUT na Cloudflare KV REST API (TTL 3600s)
              └→ chave = hash do token
           4. Retorna URL: ${KURAMEI_BASE_URL}/ui/{token}
             ↓
         WhatsApp recebe URL
             ↓
         Usuário abre no browser
             ↓
         Cloudflare Worker (${KURAMEI_BASE_URL}/ui/:token)
           1. Extrai token da URL
           2. Valida JWT (secret em Wrangler)
           3. GET spec do KV pelo hash
           4. Renderer monta HTML
           5. Adiciona CSP header
           6. Retorna página
```

---

## User Stories

### US-001 — Spec Schema: Navegação

**Como** agent-processor,
**Quero** gerar um JSON spec válido para intenção de navegação,
**Para que** o Renderer saiba exatamente o que renderizar.

**Schema congelado (imutável durante Sprint 2):**

```typescript
// packages/ui-engine/src/spec/schema.ts

export type UISpecType = 'navigation';

export interface NavigationSpec {
  type: 'navigation';
  version: '1.0';
  destination: string;       // "Campinas, SP"
  departureTime?: string;    // ISO 8601 ou null
  avoidTolls?: boolean;
  preferredApp?: 'waze' | 'google-maps' | 'apple-maps';
}

export type UISpec = NavigationSpec;

export interface UISpecToken {
  spec: UISpec;
  userId: string;            // hash do número de telefone
  createdAt: number;         // Unix timestamp
  expiresAt: number;         // Unix timestamp
}
```

**Acceptance criteria:**
- [ ] Schema TypeScript exportado de `@kuramei/ui-engine`
- [ ] Zod validator para o schema (runtime validation no Worker)
- [ ] Schema NÃO muda após merge do PR de definição

---

### US-002 — Renderer: Navegação

**Como** Cloudflare Worker,
**Quero** transformar um `NavigationSpec` em HTML funcional,
**Para que** o usuário veja uma página com botões para abrir o mapa.

**Acceptance criteria:**
- [ ] Renderer é TypeScript puro, sem dependências de runtime pesadas
- [ ] Página renderizada contém:
  - Destino formatado
  - Botão "Abrir no Waze" → `waze://?q={destination}&navigate=yes`
  - Botão "Abrir no Google Maps" → `https://www.google.com/maps/search/?q={destination}`
  - Botão "Abrir no Apple Maps" → `maps://?q={destination}`
  - Aviso de expiração (tempo restante formatado)
  - Mensagem de link expirado quando `expiresAt` passou
- [ ] HTML é válido (sem erros no W3C validator)
- [ ] Responsivo para mobile (CSS inline, sem frameworks)

---

### US-003 — Cloudflare Worker: Roteamento e Segurança

**Como** usuário que recebe o link,
**Quero** abrir `${KURAMEI_BASE_URL}/ui/{token}` e ver a página correta,
**Para que** eu possa navegar para o destino.

**Acceptance criteria:**
- [ ] Worker responde a `GET /ui/:token`
- [ ] Extrai e valida JWT (`KURAMEI_JWT_SECRET` via Wrangler secret)
- [ ] JWT inválido ou expirado → página de erro elegante (não 500)
- [ ] GET spec do KV pelo hash do token
- [ ] Spec ausente no KV (TTL expirou) → página "Link expirado" com deep link WhatsApp
- [ ] Worker chama `Renderer.render(spec)` e retorna HTML
- [ ] **CSP header obrigatório na resposta:**
  ```
  Content-Security-Policy: default-src 'none'; frame-src https://www.openstreetmap.org; style-src 'unsafe-inline'
  ```
- [ ] Deep link WhatsApp para link expirado:
  `https://wa.me/{WHATSAPP_NUMBER}?text=Preciso+de+um+novo+link`

**Estrutura do Worker:**
```
apps/ui-worker/
├── src/
│   ├── index.ts         # entry point, roteamento
│   ├── renderer.ts      # transforma spec em HTML
│   └── validate.ts      # JWT validation + Zod
├── wrangler.toml
└── package.json
```

---

### US-004 — Tool `generate_ui`: Lambda → Cloudflare KV via REST API

**Como** agent-processor,
**Quero** executar a tool `generate_ui` para gerar e armazenar o spec,
**Para que** o Worker consiga recuperar e renderizar quando o usuário abrir o link.

> ⚠️ **Nota arquitetural (Arcos):** Lambda (AWS) não tem acesso direto ao Cloudflare KV — são dois clouds diferentes. A escrita no KV deve ser feita via **Cloudflare KV REST API**.

**Implementação da escrita no KV:**
```typescript
// Endpoint REST da Cloudflare KV
const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CLOUDFLARE_KV_NAMESPACE_ID}/values/${key}?expiration_ttl=3600`;

await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(uiSpecToken),
});
```

**Variáveis de ambiente obrigatórias no Lambda:**

| Variável | Origem | Descrição |
|----------|--------|-----------|
| `CLOUDFLARE_ACCOUNT_ID` | AWS SSM Parameter Store | ID da conta Cloudflare |
| `CLOUDFLARE_KV_NAMESPACE_ID` | AWS SSM Parameter Store | ID do namespace KV |
| `CLOUDFLARE_API_TOKEN` | AWS Secrets Manager | Token com permissão de escrita no KV |
| `KURAMEI_JWT_SECRET` | AWS Secrets Manager | Secret para assinar JWT (mesmo do Worker) |

**Acceptance criteria:**
- [ ] Tool `generate_ui` implementada em `@kuramei/tools`
- [ ] Assina JWT com `KURAMEI_JWT_SECRET` (HS256, `exp` = now + 3600s)
- [ ] Chama Cloudflare KV REST API para escrever spec (TTL 3600s)
- [ ] Retorna URL `${KURAMEI_BASE_URL}/ui/{token}`
- [ ] Falha na escrita no KV → lança erro que o agent-client captura e responde ao usuário
- [ ] Todas as 4 variáveis documentadas no `.env.example`
- [ ] `CLOUDFLARE_API_TOKEN` configurado no AWS Secrets Manager junto com `KURAMEI_JWT_SECRET`

---

### US-005 — Pipeline completo: WhatsApp → URL

**Como** usuário do Kuramei,
**Quero** mandar "navegar para Campinas" no WhatsApp,
**Para que** eu receba um link que abre uma página de navegação.

**Fluxo completo:**
1. Usuário manda "navegar para Campinas"
2. `webhook-handler` valida assinatura e invoca `agent-processor` (async)
3. `agent-processor` passa mensagem pro `AgentClient`
4. LLM (DeepSeek via OpenRouter) detecta intenção de navegação
5. LLM chama tool `generate_ui` com `NavigationSpec`
6. Tool escreve no KV e retorna URL
7. Agent responde no WhatsApp com a URL
8. Usuário abre no browser → vê a página

**Acceptance criteria:**
- [ ] Intenção "navegar para [cidade]" consistentemente detectada pelo LLM
- [ ] `generate_ui` tool configurada no AppConfig do agent-processor
- [ ] System prompt instrui o LLM a usar `generate_ui` para intenções de navegação
- [ ] URL válida retornada no WhatsApp (mensagem de texto simples)

---

### US-006 — Smoke Test local end-to-end

**Como** desenvolvedor,
**Quero** testar o Worker localmente sem precisar de Lambda,
**Para que** eu valide o pipeline UI Engine de forma isolada e determinística.

> ⚠️ **Nota do Arcos:** Lambda e `wrangler dev` rodam em processos separados e não compartilham memória. O smoke test deve ser independente do Lambda.

**Abordagem aprovada:**
1. `smoke-test.ts` gera JWT + `UISpecToken` diretamente (sem simular Lambda)
2. Usa `wrangler kv:key put` CLI para escrever spec no KV local do `wrangler dev`
3. Monta URL `http://localhost:8787/ui/{token}`
4. Abre no browser automaticamente

```typescript
// scripts/smoke-test.ts
import { sign } from 'jsonwebtoken';
import { execSync } from 'child_process';

const secret = process.env.KURAMEI_JWT_SECRET!;
const spec: NavigationSpec = {
  type: 'navigation',
  version: '1.0',
  destination: 'Campinas, SP',
};
const specToken: UISpecToken = {
  spec,
  userId: 'smoke-test-user',
  createdAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const token = sign({ hash: tokenHash, exp: specToken.expiresAt / 1000 }, secret);

// Escreve no KV local via wrangler CLI
execSync(`wrangler kv:key put --local ${tokenHash} '${JSON.stringify(specToken)}'`);

const url = `http://localhost:8787/ui/${token}`;
console.log(`Smoke test URL: ${url}`);
execSync(`open ${url}`); // macOS; linux: xdg-open
```

**Acceptance criteria:**
- [ ] `pnpm smoke-test` com `wrangler dev` rodando abre a página no browser
- [ ] Página exibe "Rota para Campinas, SP" com 3 botões de navegação
- [ ] Testar token expirado → página de erro elegante
- [ ] Testar token inválido → página de erro elegante

---

## Estrutura de Packages

```
packages/
└── ui-engine/          # NOVO — @kuramei/ui-engine
    ├── src/
    │   ├── spec/
    │   │   └── schema.ts     # UISpec types + Zod validators
    │   └── renderer/
    │       └── navigation.ts # NavigationSpec → HTML
    ├── package.json
    └── tsconfig.json

apps/
└── ui-worker/          # NOVO — Cloudflare Worker
    ├── src/
    │   ├── index.ts
    │   ├── renderer.ts
    │   └── validate.ts
    ├── wrangler.toml
    └── package.json
```

---

## Variáveis de Ambiente

### Lambda (AWS Secrets Manager / SSM)
```env
# Existentes (Sprint 1)
OPENROUTER_API_KEY=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
DYNAMODB_TABLE=

# Novas no Sprint 2
KURAMEI_BASE_URL=          # ex: https://kuramei.ai (prod) ou http://localhost:8787 (local)
KURAMEI_JWT_SECRET=        # openssl rand -hex 32 — salvar em .env.local
CLOUDFLARE_ACCOUNT_ID=     # SSM Parameter Store
CLOUDFLARE_KV_NAMESPACE_ID=# SSM Parameter Store
CLOUDFLARE_API_TOKEN=      # Secrets Manager (permissão escrita no KV)
```

### Cloudflare Worker (Wrangler secrets)
```env
KURAMEI_JWT_SECRET=        # mesmo valor do Lambda
```

### Setup inicial (rodar uma vez)
```bash
# Gerar o JWT secret
openssl rand -hex 32

# Salvar localmente (não commitado)
echo "KURAMEI_JWT_SECRET=<valor>" >> .env.local

# Adicionar ao Wrangler (fazer antes do deploy do Worker)
wrangler secret put KURAMEI_JWT_SECRET
```

**`.env.local` está no `.gitignore` — nunca commitar secrets.**

---

## Open Questions (resolvidas)

| Questão | Decisão |
|---------|---------|
| Domínio base | Domínio real é `kuramei.ai`. URL nunca hardcoded — sempre via `KURAMEI_BASE_URL` (prod: `https://kuramei.ai`, local: `http://localhost:8787`). |
| `KURAMEI_JWT_SECRET` | Gerar com `openssl rand -hex 32`. Salvar em `.env.local`. Adicionar ao AWS Secrets Manager e Wrangler secrets antes do deploy. |
| KV compartilhado Lambda↔Worker | **Não compartilha memória.** Lambda usa REST API da Cloudflare para escrever. Worker usa binding KV nativo. |

---

## Definition of Done

Sprint 2 está fechado quando:
- [ ] `pnpm build` passa 10/10 (8 anteriores + `@kuramei/ui-engine` + `ui-worker`)
- [ ] `pnpm smoke-test` abre página "Rota para Campinas, SP" no browser
- [ ] CSP header presente na resposta do Worker
- [ ] Token expirado → página de erro (não 500)
- [ ] Código revisado pelo Forja (via #forja no Discord)
- [ ] Commit descritivo na `main` com `git log --oneline` limpo
