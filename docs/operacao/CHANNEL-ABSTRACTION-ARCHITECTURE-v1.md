# Channel Abstraction Architecture v1 — Kuramei

> **Status:** Proposta arquitetural. v1 = baseline de discussão, não spec final.  
> **Produzido em:** 2026-02-26  
> **Dependências:** MULTI-CHANNEL-CAPABILITY-MATRIX-v1.md  
> **Objetivo:** propor camada de abstração de canais que permita ao Kuramei operar em múltiplos canais com risco de lock-in minimizado  

---

## 1. Contexto e Problema

O Kuramei atual tem o canal WhatsApp acoplado ao core de agente. A arquitetura existente é:

```
[Meta Webhook] → [AWS Lambda: agent-processor] → [processMessage em @kuramei/agent-core]
                                                          ↓
                                                  [sendWhatsAppMessage]
```

O Sprint 5 já fez o passo certo: extraiu a lógica de negócio para `@kuramei/agent-core` e manteve o Lambda como thin wrapper. Isso cria o fundamento para a abstração de canal.

**O problema:** `sendWhatsAppMessage` e a leitura do webhook WhatsApp são ainda específicos de canal. Se a Meta banir a conta ou repricing tornar inviável, o Kuramei para. Não há failover.

---

## 2. Princípios de Design

1. **Core agnóstico de canal** — `processMessage` nunca deve saber ou se importar com qual canal entregará a resposta
2. **Adapter pattern** — cada canal é um adapter isolado; troca de canal não exige mudança no core
3. **Mínimo comum denominador como garantia** — toda feature de produto deve funcionar no subset de capacidades compartilhado por todos os canais ativos
4. **Superpoderes são enriquecimento opcional** — features específicas de canal enriquecem a UX sem bloquear o fluxo
5. **Policy engine por canal** — regras de envio (janela de 24h, rate limits, templates) são responsabilidade do adapter, não do core
6. **Failover explícito e auditável** — a decisão de qual canal usar deve ser logada e rastreável

---

## 3. Arquitetura Proposta

### 3.1 Visão Geral de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    CANAIS DE ENTRADA                     │
└────────────┬────────────────┬──────────────┬────────────┘
             │                │              │
             ▼                ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              CHANNEL GATEWAY (novo componente)           │
│                                                          │
│  ┌───────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Adapter       │ │ Adapter      │ │ Adapter        │  │
│  │               │ │              │ │                │  │
│  │ - parseWebhk  │ │ - parseWebhk │ │ - parseGateway │  │
│  │ - sendMsg     │ │ - sendMsg    │ │ - sendMsg      │  │
│  │ - policyEngin │ │ - policyEngin│ │ - policyEngine │  │
│  └───────┬───────┘ └──────┬───────┘ └───────┬────────┘  │
│          │                │                  │           │
│          └────────────────┴──────────────────┘           │
│                           │                              │
│                    ┌──────▼──────┐                       │
│                    │ InboundEvent│  (tipo normalizado)    │
│                    └──────┬──────┘                       │
└───────────────────────────┼──────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              CORE ORCHESTRATOR (existente+)              │
│                                                          │
│  @kuramei/agent-core → processMessage(userId, message)  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ LLM Engine   │  │ Tool Registry│  │ Memory / DB  │  │
│  │ (OpenRouter) │  │ (tools)      │  │ (DynamoDB)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  Retorna: AgentResponse { text, richContent?, uiLink? }  │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│           CHANNEL ROUTER + FALLBACK ENGINE               │
│                                                          │
│  1. Determina canal preferido do usuário                 │
│  2. Verifica disponibilidade do canal                    │
│  3. Verifica policy do canal (janela 24h, template etc.) │
│  4. Enriquece resposta com superpoderes do canal         │
│  5. Fallback se canal primário indisponível              │
│  6. Loga decisão de roteamento                           │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                CHANNEL ADAPTERS (saída)                  │
│  Mesmos adapters do gateway — reutilizados para envio    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Tipos e Interfaces (TypeScript)

```typescript
// packages/channel-core/src/types.ts

/**
 * Evento normalizado de entrada, independente de canal
 */
export interface InboundEvent {
  /** ID único do usuário dentro do canal (ex: whatsapp:+5511999999999) */
  userId: string;
  /** Canal de origem */
  channel: ChannelId;
  /** ID da mensagem no canal de origem (para deduplicação) */
  messageId: string;
  /** Conteúdo da mensagem */
  content: MessageContent;
  /** Timestamp da mensagem original (epoch ms) */
  timestamp: number;
  /** Metadados específicos do canal (para audit log) */
  rawMeta?: Record<string, unknown>;
}

export type ChannelId = 'whatsapp' | 'telegram';

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'media'; mediaUrl: string; caption?: string; mimeType: string }
  | { type: 'location'; lat: number; lon: number }
  | { type: 'interactive_response'; buttonId: string; buttonText: string }
  | { type: 'unsupported'; rawType: string };

/**
 * Resposta do agente — agnóstica de canal
 */
export interface AgentResponse {
  /** Texto principal — sempre presente, é o mínimo comum denominador */
  text: string;
  /** Conteúdo rico opcional — renderizado se o canal suportar */
  richContent?: RichContent;
  /** Link externo opcional */
  uiLink?: string;
  /** Metadados para o channel router (ex: usar template específico) */
  routingHints?: RoutingHints;
}

export interface RichContent {
  buttons?: Button[];
  /** Lista de opções (ex: menu de contexto) */
  options?: SelectOption[];
  /** Formulário estruturado */
  form?: FormDefinition;
}

export interface Button {
  id: string;
  label: string;
  type: 'reply' | 'url';
  url?: string;
}

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
}

export interface FormDefinition {
  title: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

export interface RoutingHints {
  /** Se true, pode usar template WhatsApp (para envios fora da janela) */
  allowTemplate?: boolean;
  /** Template ID específico a usar (se allowTemplate=true) */
  templateId?: string;
  /** Prioridade: se true, tentar fallback em outro canal se o primário falhar */
  enableFallback?: boolean;
}

/**
 * Interface que cada adapter de canal deve implementar
 */
export interface ChannelAdapter {
  readonly channelId: ChannelId;

  /**
   * Parse do webhook/evento bruto do canal → InboundEvent normalizado
   */
  parseInbound(rawPayload: unknown): Promise<InboundEvent | null>;

  /**
   * Verifica se é possível enviar para este usuário agora
   * (ex: WhatsApp verifica a janela de 24h)
   */
  canSend(userId: string, response: AgentResponse): Promise<SendCapability>;

  /**
   * Envia a resposta ao usuário no canal
   */
  send(userId: string, response: AgentResponse): Promise<SendResult>;

  /**
   * Verifica saúde do canal (healthcheck)
   */
  healthCheck(): Promise<ChannelHealthStatus>;
}

export interface SendCapability {
  canSendFree: boolean;
  canSendWithTemplate: boolean;
  /** Razão se não puder enviar livremente */
  reason?: 'outside_window' | 'user_blocked' | 'account_suspended' | 'rate_limited';
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Se fallback deve ser acionado */
  triggerFallback?: boolean;
}

export interface ChannelHealthStatus {
  healthy: boolean;
  latencyMs?: number;
  details?: string;
}
```

### 3.3 Policy Engine por Canal

O Policy Engine encapsula as regras de negócio de cada plataforma. Não deve vazar para o core.

```typescript
// packages/channel-whatsapp/src/policy.ts

export class WhatsAppPolicyEngine {
  /**
   * WhatsApp tem janela de 24h.
   * Se fora da janela: apenas templates aprovados podem ser enviados.
   */
  async evaluateSendPolicy(userId: string, response: AgentResponse): Promise<SendPolicy> {
    const lastUserMessageAt = await this.getLastUserMessageTimestamp(userId);
    const windowOpen = lastUserMessageAt && 
      (Date.now() - lastUserMessageAt) < 24 * 60 * 60 * 1000;

    if (windowOpen) {
      return { mode: 'free_message' };
    }

    // Fora da janela: verificar se a resposta tem routing hint para template
    if (response.routingHints?.allowTemplate && response.routingHints?.templateId) {
      return { 
        mode: 'template', 
        templateId: response.routingHints.templateId 
      };
    }

    // Fora da janela e sem template: não enviar agora, enfileirar
    return { 
      mode: 'blocked',
      reason: 'outside_24h_window_no_template'
    };
  }
}

// packages/channel-telegram/src/policy.ts
export class TelegramPolicyEngine {
  /**
   * Telegram não tem janela de atendimento.
   * Pode enviar a qualquer momento se o usuário iniciou o bot.
   * Rate limit: ~1 msg/seg por usuário (soft limit).
   */
  async evaluateSendPolicy(userId: string, _response: AgentResponse): Promise<SendPolicy> {
    const userStartedBot = await this.userStartedBot(userId);
    if (!userStartedBot) {
      return { mode: 'blocked', reason: 'user_never_started_bot' };
    }
    return { mode: 'free_message' };
  }
}
```

### 3.4 Channel Router com Failover

```typescript
// packages/channel-core/src/router.ts

export class ChannelRouter {
  constructor(
    private adapters: Map<ChannelId, ChannelAdapter>,
    private userChannelStore: UserChannelStore,
    private logger: Logger
  ) {}

  async route(userId: string, response: AgentResponse): Promise<void> {
    // 1. Determinar canal preferido do usuário
    const preferredChannel = await this.userChannelStore.getPreferredChannel(userId);
    const fallbackChain = await this.getFallbackChain(userId, preferredChannel);

    // 2. Tentar enviar em ordem
    for (const channelId of fallbackChain) {
      const adapter = this.adapters.get(channelId);
      if (!adapter) continue;

      // 3. Verificar capacidade de envio
      const capability = await adapter.canSend(userId, response);

      if (!capability.canSendFree && !capability.canSendWithTemplate) {
        this.logger.warn('channel_send_blocked', { 
          userId, channelId, reason: capability.reason 
        });
        continue; // tenta próximo canal no fallback chain
      }

      // 4. Enriquecer resposta com superpoderes do canal
      const enrichedResponse = await this.enrichForChannel(response, channelId, capability);

      // 5. Enviar
      const result = await adapter.send(userId, enrichedResponse);

      this.logger.info('channel_send', { 
        userId, channelId, 
        messageId: result.messageId, 
        success: result.success,
        wasFallback: channelId !== preferredChannel
      });

      if (result.success) return;

      if (!result.triggerFallback) {
        throw new Error(`Failed to send on ${channelId}: ${result.error}`);
      }

      // Se triggerFallback=true, continua para próximo canal
    }

    throw new Error(`All channels exhausted for userId=${userId}`);
  }

  /**
   * Enriquece a resposta com capacidades específicas do canal
   */
  private async enrichForChannel(
    response: AgentResponse,
    channelId: ChannelId,
    capability: SendCapability
  ): Promise<AgentResponse> {
    switch (channelId) {
      case 'whatsapp':
        return this.enrichForWhatsApp(response, capability);
      case 'telegram':
        return this.enrichForTelegram(response);
      default:
        return response;
    }
  }

  private enrichForWhatsApp(response: AgentResponse, capability: SendCapability): AgentResponse {
    if (capability.canSendFree) {
      // Converter richContent para formato WhatsApp nativo
      // Ex: buttons → interactive reply buttons (max 3)
      // Ex: options → interactive list
      return response;
    }
    // Fora da janela: usar template (stripped de rich content)
    return { text: response.text }; // template só tem texto + variáveis
  }

  private enrichForTelegram(response: AgentResponse): AgentResponse {
    // Telegram suporta inline keyboards completos
    // Ex: botões → InlineKeyboardMarkup
    // Ex: streaming → sendMessageDraft (se implementado no adapter)
    return response;
  }

    // Ex: text + richContent → embed com buttons
    return response;
  }

  /**
   * Fallback chain: canal preferido primeiro, depois alternativas
   */
  private async getFallbackChain(
    userId: string, 
    preferred: ChannelId
  ): Promise<ChannelId[]> {
    const allUserChannels = await this.userChannelStore.getAllChannels(userId);
    // Preferido primeiro, depois os demais em ordem de configuração
    return [preferred, ...allUserChannels.filter(c => c !== preferred)];
  }
}
```

---

## 4. Estrutura de Pacotes Proposta

```
packages/
  agent-core/          ← já existe (processMessage, ToolRegistry, etc.)
  channel-core/        ← NOVO: interfaces, types, ChannelRouter
    src/
      types.ts         ← InboundEvent, AgentResponse, ChannelAdapter interface
      router.ts        ← ChannelRouter com fallback
      user-channel.ts  ← UserChannelStore (preferência de canal por usuário)
  channel-whatsapp/    ← NOVO: extrai lógica WhatsApp do agent-processor
    src/
      adapter.ts       ← WhatsAppAdapter implements ChannelAdapter
      policy.ts        ← WhatsAppPolicyEngine (janela 24h, template routing)
      send.ts          ← sendWhatsAppMessage (atual no agent-processor)
      parse.ts         ← parseWhatsAppWebhook
  channel-telegram/    ← NOVO: Telegram adapter
    src/
      adapter.ts
      policy.ts
      send.ts
      parse.ts
    src/
      adapter.ts
      policy.ts
      send.ts
      parse.ts

apps/
  agent-processor/     ← Lambda WhatsApp (thin wrapper, já existe)
    → vai usar: channel-whatsapp + agent-core + channel-core
  agent-telegram/      ← NOVO: Lambda/worker Telegram
    → vai usar: channel-telegram + agent-core + channel-core
  simulator-api/       ← já existe (dev tool)
    → vai usar: agent-core + channel-core (mock adapter)
  webhook-router/      ← NOVO (opcional): API Gateway único que roteia webhooks
                           de todos os canais para o worker correto
```

---

## 5. Modelo de Dados: Usuário Multi-Canal

```typescript
// Tabela DynamoDB: kuramei-users (já existe)
// Adicionar campos de canal

interface UserProfile {
  PK: `USER#${userId}`;
  SK: 'PROFILE';
  name: string | null;
  status: 'onboarding' | 'active';
  registeredAt: string; // ISO
  
  // NOVO: multi-canal
  channels: {
    whatsapp?: {
      phoneNumber: string;      // +5511999999999
      verified: boolean;
      lastMessageAt?: number;   // epoch ms (para calcular janela 24h)
      optIn: boolean;
    };
    telegram?: {
      chatId: number;           // Telegram chat ID único
      username?: string;
      lastMessageAt?: number;
      optIn: boolean;
    };
      lastMessageAt?: number;
      optIn: boolean;
    };
  };
  preferredChannel: 'whatsapp' | 'telegram';
  fallbackChannels: Array<'whatsapp' | 'telegram'>;
}
```

### 5.1 userId Normalizado

O `userId` no `processMessage` deve ser um ID global do usuário Kuramei (não o ID específico do canal).

```
userId format: `canal:identificador`
Exemplos:
  whatsapp:+5511999999999
  telegram:123456789

userId Kuramei canônico: hash UUID v5 do primeiro canal de entrada
(o usuário Telegram que nunca usou WhatsApp tem um UUID próprio)
```

Vantagem: se o mesmo usuário usar WhatsApp e Telegram, o histórico de conversa é compartilhado via o `kurameiUserId` (lookup por canal → UUID).

---

## 6. Mínimo Comum Denominador vs Superpoderes por Canal

### 6.1 Mínimo Comum Denominador (funciona em todos os canais)

Todo o produto Kuramei MVP deve funcionar com apenas estas primitivas:

|-----------|:----------------------:|:---------------------:|:---------------------:|
| Enviar texto | `sendMessage(text)` | `sendMessage(text)` | `sendMessage(text)` |
| Enviar link | `CTA URL button` ou texto | `texto com URL` | `texto com URL` |
| Receber texto do usuário | webhook messages | webhook/polling | gateway events |
| Onboarding conversacional | texto sequencial | texto sequencial | texto sequencial |
| Lembretes (proativo) | template aprovado | sendMessage livre | DM (se aberto) |

**Regra:** se uma feature do Kuramei não funciona com essas primitivas, ela não pode ser no MVP multi-canal. Só vai para fase 2 com enriquecimento por canal.

### 6.2 Superpoderes por Canal (enriquecimento opcional)

| Superpower | WhatsApp | Telegram |
| ------------ | :--------: | :--------: |
| Botões nativos | ✅ (até 3 quick reply) | ✅ (inline keyboard ilimitado) |
| Forms estruturados | ✅ (WhatsApp Flows) | ✅ (Mini Apps) |
| Streaming de texto | ❌ | ✅ (sendMessageDraft) |
| Delivery receipt | ✅ | ❌ |
| Rich embeds | ❌ | ⚠️ (via media group) |
| Editar mensagem | ❌ | ✅ |
| Reactions | ✅ (1 por msg) | ✅ (múltiplas) |

**Implementação:** o `AgentResponse.richContent` é renderizado pelo adapter de forma otimizada para o canal. Se o canal não suporta, degrada graciosamente para `text`.

---

## 7. Estratégia de Failover

### 7.1 Cenários de Failover

```
Cenário A: WhatsApp fora da janela de 24h (usuário inativo)
┌─────────────────────────────────────────────────────────┐
│ Trigger: lembrete proativo para usuário inativo 3 dias   │
│                                                          │
│ Policy WhatsApp: canSendFree=false, canSendWithTemplate  │
│                                                          │
│ Router decision:                                         │
│  1. Template disponível? → enviar template WhatsApp      │
│  2. Sem template aprovado? → enviar via Telegram (canal 2)│
│  3. Sem Telegram? → enfileirar para próxima janela WA    │
└─────────────────────────────────────────────────────────┘

Cenário B: WhatsApp conta suspensa / número banido
┌─────────────────────────────────────────────────────────┐
│ Trigger: healthCheck() retorna healthy=false             │
│                                                          │
│ Router decision (modo de emergência):                    │
│  1. Marcar WhatsApp como DEGRADED no circuit breaker     │
│  2. Todas as mensagens → canal 2 (Telegram)              │
│  3. Se usuário não tem Telegram: notificação de email    │
│     (⚠️ hipótese: requer integração email para fallback  │
│      final — fora do escopo atual)                       │
└─────────────────────────────────────────────────────────┘

Cenário C: Rate limit WhatsApp (429)
┌─────────────────────────────────────────────────────────┐
│ Trigger: SendResult.error = 'rate_limited'               │
│                                                          │
│ Router decision:                                         │
│  1. Retry com backoff exponencial no WhatsApp            │
│  2. Se retry_count > 3: tentativa no canal 2             │
│  3. Logar para análise de tier upgrade                   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Circuit Breaker por Canal

```typescript
// packages/channel-core/src/circuit-breaker.ts

export class ChannelCircuitBreaker {
  private state: Map<ChannelId, CircuitState> = new Map();

  async canAttempt(channelId: ChannelId): Promise<boolean> {
    const state = this.state.get(channelId) ?? { status: 'closed', failures: 0 };
    
    if (state.status === 'open') {
      // Verificar se tempo de cooldown passou
      if (Date.now() > state.reopenAt) {
        this.setState(channelId, { status: 'half-open', failures: state.failures });
        return true;
      }
      return false;
    }
    return true;
  }

  async recordSuccess(channelId: ChannelId): Promise<void> {
    this.setState(channelId, { status: 'closed', failures: 0 });
  }

  async recordFailure(channelId: ChannelId): Promise<void> {
    const state = this.state.get(channelId) ?? { status: 'closed', failures: 0 };
    const newFailures = state.failures + 1;
    
    if (newFailures >= FAILURE_THRESHOLD) {
      // Abrir o circuit breaker por COOLDOWN_MS
      this.setState(channelId, {
        status: 'open',
        failures: newFailures,
        reopenAt: Date.now() + COOLDOWN_MS
      });
      await this.alertOncall(channelId, newFailures);
    } else {
      this.setState(channelId, { status: 'closed', failures: newFailures });
    }
  }
}

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos
```

---

## 8. Experiência do Usuário na Migração de Canal

### 8.1 Migração Voluntária (usuário adiciona canal 2)

```
Fluxo no WhatsApp:
  Usuário: "Kuramei, você tem Telegram?"
  Kuramei: "Tenho! Me ache em @KurameiBot no Telegram. Quando você me mandar 
             mensagem de lá, seu histórico vem junto. 🔗"
```

```
Fluxo no Telegram (onboarding de canal 2):
  Usuário: /start (ou qualquer mensagem)
  Kuramei: "Oi! Você já me conhece no WhatsApp? Digite seu número (+55...) 
             para eu conectar sua conta e trazer seu histórico."
  Usuário: "+5511999999999"
  Kuramei: "Perfeito, Alexandre! Enviei um código de confirmação pro seu 
             WhatsApp. Me diga o código quando chegar."
  [WhatsApp] Kuramei → template: "Seu código de vinculação Kuramei é: 847291"
  Usuário (Telegram): "847291"
  Kuramei: "Contas vinculadas! Você pode continuar nossa conversa por aqui 
             ou pelo WhatsApp — é tudo a mesma história. ✅"
```

### 8.2 Failover Invisível (backend, sem intervenção do usuário)

Quando o Telegram é usado por failover automático:
- O usuário recebe a mensagem sem perceber que veio de canal diferente
- Apenas um log interno registra `wasFallback: true`
- ⚠️ **Exceção:** se o usuário não tem Telegram cadastrado, impossível fazer failover silencioso. Neste caso, encaminhar para fila e tentar no próximo ciclo de retomada.

---

## 9. Impacto no Stack Atual do Kuramei

### 9.1 O que não muda

- `@kuramei/agent-core` / `processMessage` — não muda
- DynamoDB tables existentes (kuramei-conversations, kuramei-reminders, kuramei-users) — apenas adição de campos de canal
- AWS CDK infra — adicionar apenas novos Lambdas/workers
- OpenRouter / LLM layer — não muda

### 9.2 O que muda / é adicionado

| Componente | Ação | Prioridade |
|------------|------|:----------:|
| `@kuramei/channel-core` | Criar (interfaces, router, circuit breaker) | Alta |
| `@kuramei/channel-whatsapp` | Extrair de `agent-processor` | Alta |
| `@kuramei/channel-telegram` | Criar do zero | Alta |
| `apps/agent-processor` | Refatorar para usar `channel-whatsapp` | Alta |
| `apps/agent-telegram` | Criar (thin Lambda/worker) | Alta |
| `kuramei-users` DynamoDB | Adicionar campos de canal | Média |

### 9.3 Compatibilidade com Sprint 5

A arquitetura proposta é 100% compatível com o Sprint 5:
- `processMessage` já é agnóstico de canal (retorna `{ text, uiLink? }`)
- O Sprint 5 precisa adicionar `richContent?` ao tipo `AgentResponse` (mínimo impacto)
- O `simulator-api` pode usar um `MockChannelAdapter` para testes

---

## 10. Observabilidade da Abstração

### 10.1 Métricas a Coletar

| Métrica | Tipo | Alerta |
|---------|------|--------|
| `channel.send.success` por canal | Counter | — |
| `channel.send.failure` por canal | Counter | > 5 em 5min |
| `channel.fallback.triggered` | Counter | > 10/hora |
| `channel.circuit_breaker.open` | Gauge | Qualquer abertura |
| `channel.send.latency_ms` p95 por canal | Histogram | > 5000ms |
| `channel.whatsapp.window_blocked` | Counter | > 100/hora |
| `channel.routing.preferred_vs_actual` | Counter/dimension | — |

### 10.2 Structured Logging

Cada send deve logar:
```json
{
  "event": "channel.send",
  "kurameiUserId": "uuid-v4",
  "channelId": "telegram",
  "preferredChannel": "whatsapp",
  "wasFallback": true,
  "fallbackReason": "outside_24h_window_no_template",
  "messageId": "123456789",
  "success": true,
  "latencyMs": 342,
  "timestamp": "2026-03-01T14:23:45.123Z"
}
```

---

## 11. Recomendações Executivas

1. **Implementar `@kuramei/channel-core` antes de qualquer adapter** — as interfaces são o contrato. Errar aqui depois de ter 3 adapters = retrabalho em 3 lugares.

2. **WhatsApp adapter primeiro** — refatorar `agent-processor` para usar o padrão de adapter é pré-requisito para qualquer adição de canal. Tem zero risco funcional (o comportamento não muda, só a estrutura).

3. **Telegram adapter em Sprint 6/7** — time-to-market de 2-4 semanas após o adapter core. É o canal 2 com melhor ROI.

5. **Channel Router é o coração do sistema** — investir em testes unitários robustos do Router, especialmente nos cenários de fallback. Uma falha aqui = usuários sem resposta.

6. **User channel store no DynamoDB** — adicionar campos de canal ao `kuramei-users` é low-risk e desbloqueador. Fazer em Sprint 6 independente de quando o Telegram for lançado.

---

## Referências

- Padrão Adapter (Gang of Four): aplicado a canais de mensagem
- Kuramei Sprint 5 PRD: `/tasks/prd-sprint5.json` — contexto de `agent-core`
- WhatsApp Playbook v1: `/docs/operacao/WHATSAPP-BUSINESS-PLAYBOOK-v1.md`
- Multi-Channel Capability Matrix: `/docs/operacao/MULTI-CHANNEL-CAPABILITY-MATRIX-v1.md`
- Telegram Bot API setWebhook: https://core.telegram.org/bots/api#setwebhook
