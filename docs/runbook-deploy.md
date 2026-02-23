# Runbook — Primeiro Deploy em Produção

> **Executado por:** Alexandre
> **Gerado por:** Ralph (IaC automation)
> **Última atualização:** Sprint 4

Este runbook cobre o deploy completo do Kuramei: infraestrutura AWS (CDK) + Cloudflare Worker.

---

## Pré-requisitos

### 1. AWS CLI configurado

```bash
# Verificar credenciais
aws sts get-caller-identity

# Se não estiver configurado:
aws configure
# AWS Access Key ID: <sua-key>
# AWS Secret Access Key: <sua-secret>
# Default region: us-east-1
# Default output format: json
```

### 2. CDK Bootstrap (rodar uma vez por conta/região)

```bash
cd infra/cdk
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

Substitua `ACCOUNT_ID` pelo ID da sua conta AWS (obtido via `aws sts get-caller-identity`).

### 3. Node.js 20+ e pnpm instalados

```bash
node --version   # deve ser >= 20
pnpm --version   # deve ser >= 9
```

---

## Passo 1 — Instalar dependências do CDK

```bash
cd infra/cdk
pnpm install
```

---

## Passo 2 — Build e synth (validação local)

```bash
# No diretório infra/cdk:
pnpm build

# Verificar que o synth não tem erros:
npx cdk synth
```

O output deve mostrar os 4 stacks:
- `KurameiDynamo`
- `KurameiAgent`
- `KurameiWebhook`
- `KurameiScheduler`

---

## Passo 3 — Deploy da infraestrutura

```bash
# Deploy todos os stacks (ordem gerenciada pelo CDK via dependências)
npx cdk deploy --all
```

O CDK vai perguntar confirmação antes de criar IAM roles. Responda `y`.

**Outputs importantes** que o CDK vai exibir após o deploy:
- URL do API Gateway (endpoint do webhook Meta)
- ARNs das tabelas DynamoDB
- ARN das Lambdas

Guarde esses valores — você vai precisar deles nos passos seguintes.

---

## Passo 4 — Configurar secrets no AWS Secrets Manager

As Lambdas carregam segredos do Secrets Manager em runtime. Crie os segredos:

```bash
# WhatsApp
aws secretsmanager create-secret \
  --name kuramei/whatsapp-verify-token \
  --secret-string "SEU_VERIFY_TOKEN"

aws secretsmanager create-secret \
  --name kuramei/whatsapp-app-secret \
  --secret-string "SEU_APP_SECRET"

aws secretsmanager create-secret \
  --name kuramei/whatsapp-access-token \
  --secret-string "SEU_ACCESS_TOKEN"

# OpenRouter
aws secretsmanager create-secret \
  --name kuramei/openrouter-api-key \
  --secret-string "SEU_OPENROUTER_KEY"

# JWT Secret (compartilhado entre Lambda e Cloudflare Worker)
# IMPORTANTE: use o mesmo valor no passo 5 (wrangler secret put)
aws secretsmanager create-secret \
  --name kuramei/jwt-secret \
  --secret-string "$(openssl rand -hex 32)"
```

> **Nota:** Para atualizar um segredo existente, use `update-secret` em vez de `create-secret`.

---

## Passo 5 — Deploy do Cloudflare Worker

### 5a. Criar o KV Namespace em produção

```bash
cd apps/ui-worker

# Criar namespace (salve o ID gerado)
npx wrangler kv namespace create KV

# Atualizar wrangler.toml com o ID real:
# [[kv_namespaces]]
# binding = "KV"
# id = "ID_GERADO_ACIMA"
```

### 5b. Configurar secrets do Worker

```bash
# JWT Secret — use o MESMO valor criado no passo 4
npx wrangler secret put KURAMEI_JWT_SECRET

# Número do WhatsApp (opcional, para identificação)
npx wrangler secret put WHATSAPP_NUMBER
```

### 5c. Deploy

```bash
npx wrangler deploy
```

O Worker será publicado em `app.kuramei.ai/*` (após configurar o DNS — ver passo 6).

---

## Passo 6 — Configurar DNS na Cloudflare

No painel da Cloudflare (kuramei.ai):

1. Adicionar registro CNAME:
   - Nome: `app`
   - Destino: `workers.dev` (ou usar rota personalizada)
2. Garantir que a zona `kuramei.ai` está sob controle da Cloudflare

O wrangler.toml já tem a rota `app.kuramei.ai/*` configurada.

---

## Passo 7 — Configurar webhook no Meta

1. Acesse [Meta for Developers](https://developers.facebook.com) → seu app
2. Em **WhatsApp → Configuration**:
   - **Callback URL:** `https://<API_GW_URL>/prod/webhook`
     (use a URL do API Gateway do passo 3)
   - **Verify Token:** o mesmo valor de `kuramei/whatsapp-verify-token`
3. Subscribe aos campos: `messages`
4. Meta vai fazer uma requisição GET para verificar o endpoint — a Lambda deve responder com `200 OK`

---

## Passo 8 — Smoke test contra produção

```bash
# Enviar mensagem de teste via WhatsApp para o número configurado
# Aguardar resposta do agente

# Verificar logs da Lambda agent-processor:
aws logs tail /aws/lambda/kuramei-agent-processor --follow

# Verificar logs da Lambda webhook-handler:
aws logs tail /aws/lambda/kuramei-webhook-handler --follow
```

Fluxo esperado:
1. Mensagem chega → webhook-handler recebe → invoca agent-processor async → retorna 200
2. agent-processor → identidade → sessão DynamoDB → chama OpenRouter → resposta WhatsApp
3. Se tool `generate_ui` for acionada: salva spec no KV → gera link → envia link

---

## Troubleshooting

| Sintoma | Verificação |
|---------|-------------|
| API GW retorna 403 | Lambda execution role sem permissão |
| Lambda timeout | Verificar logs no CloudWatch |
| Mensagem não chega | Verificar webhook no Meta (assinatura HMAC) |
| UI Worker 500 | Verificar `KURAMEI_JWT_SECRET` (deve ser igual ao Lambda) |
| DynamoDB errors | Verificar se as tabelas foram criadas e nomes batem com env vars |

---

## Rollback

```bash
# Rollback de um stack específico
npx cdk destroy KurameiWebhook

# Rollback de todos (ATENÇÃO: vai deletar tabelas se RemovalPolicy.DESTROY)
# As tabelas têm RemovalPolicy.RETAIN — não serão deletadas automaticamente
npx cdk destroy --all
```

> As tabelas DynamoDB têm `RemovalPolicy.RETAIN` — não serão removidas mesmo com `cdk destroy`.
