# Multi-Channel Capability Matrix v1 — Kuramei

> **Status:** Documento estratégico. Revisão recomendada a cada 90 dias.  
> **Produzido em:** 2026-02-26  
> **Escopo:** WhatsApp Business (baseline) × Telegram + análise de Signal/iMessage/RCS  
> **Objetivo:** subsidiar decisão de diversificação de canal e design de abstração técnica  

---

## Legenda de Confiança das Informações

| Símbolo | Significado |
|---------|-------------|
| ✅ Fato verificado | Confirmado em documentação oficial pública |
| ⚠️ Hipótese | Inferido de comportamento conhecido, não confirmado oficialmente |
| ❌ Não disponível | Feature inexistente ou explicitamente não suportada |

---

## 1. Resumo Executivo (12 Bullets)

1. **WhatsApp é insubstituível no Brasil a curto prazo** — 97% de penetração entre smartphones, sem rival direto em alcance de usuário consumer. Mas dependência exclusiva é risco existencial comprovado: uma decisão unilateral da Meta pode matar o produto.

2. **Telegram é o canal secundário óbvio** — API gratuita, sem janela de 24h, sem aprovação de template, sem burocracia de conta. Time-to-market para piloto Kuramei no Telegram é 2-4 semanas. **GO para Telegram como canal 2.**

4. **Signal não tem API de bot** — protocolo aberto, plataforma fechada para automação. Inviável para produto comercial. **NO-GO.**

5. **iMessage for Business (Apple Messages for Business)** — processo de aprovação opaco, foco em grandes marcas (varejo, companhias aéreas), sem presença relevante no Brasil. **NO-GO para 2026.**

6. **RCS Business Messages (Google)** — tecnicamente promissor, mas dependente de operadoras no Brasil. Implementação complexa. Horizonte 2027+. **NO-GO agora; watch list.**

7. **O custo de plataforma do WhatsApp é zero para conversas de serviço** (desde nov/2024) — o custo real é LGPD + risco de suspensão + BSP fees. Telegram é gratuito com custo zero de plataforma. O custo total de operação Telegram < WhatsApp.

8. **A janela de 24h do WhatsApp é a principal limitação para UX de assistente** — proatividade (lembretes, notificações) exige template pré-aprovado. Telegram não tem essa restrição. Isso é vantagem funcional significativa do Telegram.

12. **Lock-in real**: o maior lock-in não é técnico, é comportamental — o usuário brasileiro não vai mudar de WhatsApp para Telegram sem incentivo forte. A abstração de canal protege o Kuramei, mas não resolve a dependência comportamental do usuário. Esse é o risco que nenhuma arquitetura resolve sozinha.

---

## 2. Matriz de Capacidades de Mensagens

### 2.1 Tipos de Mensagem Suportados

| Capacidade | WhatsApp Business | Telegram |
| ------------ | :-----------------: | :--------: |
| Texto simples | ✅ (4096 chars) | ✅ (4096 chars) |
| Markdown/formatação | ✅ (bold, italic, code) | ✅ (completo: bold, italic, code, spoiler, strike) |
| Imagem com legenda | ✅ (até 5MB) | ✅ (até 10MB comprimido, 50MB original) |
| Vídeo | ✅ (até 16MB) | ✅ (até 50MB, streaming nativo) |
| Áudio/voice | ✅ (até 16MB) | ✅ (voz com waveform) |
| Documento/arquivo | ✅ (até 100MB) | ✅ (até 2GB) |
| Localização | ✅ (lat/lon) | ✅ (lat/lon + venue) |
| Contatos (vCard) | ✅ | ✅ |
| Stickers | ✅ (estático/animado) | ✅ (estático/animado/vídeo) |
| Reações emoji | ✅ (em msg recebida) | ✅ (múltiplas reações) |
| Polls/enquetes | ❌ nativo | ✅ nativo |
| Streaming de texto (typewriter) | ❌ | ✅ (sendMessageDraft, API 9.3+) |
| Editar mensagem enviada | ❌ | ✅ |
| Deletar mensagem | ❌ (apenas unsend-to-self) | ✅ (deleteMessage) |
| Thread/tópico | ❌ | ✅ (forum topics no grupo) |
| Grupos | ✅ (via WhatsApp Group) | ✅ (grupos + supergrupos) |

**Fonte WhatsApp:** [Meta Cloud API - Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)  
**Fonte Telegram:** [Telegram Bot API](https://core.telegram.org/bots/api) + [Bot Features](https://core.telegram.org/bots/features)  

---

### 2.2 Mensagens Interativas (Botões, Forms, Templates)

| Capacidade | WhatsApp Business | Telegram |
| ------------ | :-----------------: | :--------: |
| Botões de resposta rápida | ✅ (até 3 quick reply) | ✅ (inline keyboard, ilimitado) |
| Botão URL | ✅ (CTA URL button) | ✅ (URL button) |
| Lista interativa | ✅ (até 10 seções × 10 itens) | ⚠️ via inline keyboard simulado |
| Forms nativos | ✅ WhatsApp Flows (JSON) | ✅ via Mini Apps (Web App) |
| Teclado customizado (reply keyboard) | ❌ | ✅ ReplyKeyboardMarkup |
| Inline mode (cross-chat) | ❌ | ✅ (inline queries em qualquer chat) |
| Slash commands | ❌ | ✅ (/comandos com autocomplete) |
| Templates pré-aprovados | ✅ (obrigatório fora da janela 24h) | ❌ (não existe conceito de template) |
| Carrossel de cards | ⚠️ (suportado em alguns contextos) | ⚠️ via media group |
| Pagamentos integrados | ✅ (WhatsApp Pay, mercados selecionados) | ✅ (Telegram Stars/Payments nativo) |

---

### 2.3 Proatividade e Notificações

| Capacidade | WhatsApp Business | Telegram |
| ------------ | :-----------------: | :--------: |
| Mensagem sem interação prévia do usuário | ✅ via template aprovado + opt-in | ✅ se o usuário já iniciou o bot |
| Janela de conversa | ✅ 24h após última mensagem do usuário | ❌ sem janela (pode enviar a qualquer hora) |
| Notificações proativas sem template | ❌ (fora da janela = apenas template) | ✅ |
| Broadcast para todos os usuários | ✅ via template (cuidado com quality) | ✅ (mas Telegram detecta spam agressivo) |
| Scheduled messages | ⚠️ via orchestração externa | ✅ nativo no TG Premium / externo para bot |

**Impacto crítico para Kuramei:** a janela de 24h do WhatsApp é a limitação mais importante para um assistente de lembretes. O Kuramei precisa enviar lembretes proativamente — fora da janela, isso exige templates pré-aprovados para cada tipo de lembrete. No Telegram, isso é trivial: bot manda a mensagem de lembrete sem qualquer aprovação.

---

### 2.4 Webhooks e Integração Técnica

| Capacidade | WhatsApp Business | Telegram |
| ------------ | :-----------------: | :--------: |
| Webhook (HTTP push) | ✅ (HTTPS obrigatório, validação HMAC) | ✅ (setWebhook, HTTPS) |
| Long polling | ❌ (apenas webhook) | ✅ (getUpdates) |
| WebSocket/Gateway | ❌ | ❌ (apenas webhook ou polling) |
| Validação de assinatura | ✅ (HMAC-SHA256 obrigatório) | ✅ (secret_token opcional mas recomendado) |
| Eventos de delivery/read | ✅ (sent → delivered → read) | ❌ (sem receipts para bots) |
| Retry automático | ✅ (Meta reenvia em falha) | ✅ (Telegram reenvia por 24h) |
| Teste local (dev) | ⚠️ (ngrok ou similar, processo chato) | ✅ (polling facilita dev local) |

---

### 2.5 Rate Limits

| Dimensão | WhatsApp Business | Telegram |
| ---------- | :-----------------: | :--------: |
| Limite de conversas | 250/dia (Tier 0) → escalável | Sem tier; 30 msgs/seg global por bot |
| Limite por usuário | Sem limite explícito dentro da janela | 1 msg/seg por usuário (⚠️ soft limit) |
| Burst permitido | ⚠️ Baixo (backoff recomendado) | ⚠️ Limitado (429 com Retry-After) |
| Rate limit de API (envio) | ❌ Não publicado oficialmente | ~30 msgs/seg global (documentado em FAQ) |
| Escalabilidade | Manual (tier upgrade via suporte/volume) | Automático (técnico, sem aprovação) |

**Fonte Telegram Rate Limits:** [Telegram Bot FAQ - Broadcasting](https://core.telegram.org/bots/faq#broadcasting-to-users)  

---

## 3. Janela de Atendimento e Regras de Envio

| Dimensão | WhatsApp Business | Telegram |
| ---------- | :-----------------: | :--------: |
| Janela de serviço | 24h após última msg do usuário | Sem janela (ilimitado) |
| Envio fora da janela | Apenas templates aprovados | Livre (se usuário iniciou bot) |
| Opt-in obrigatório | ✅ (documentado + LGPD) | ✅ implícito (usuário inicia bot) |
| Opt-out | ✅ obrigatório ("PARAR") | ✅ via /stop ou bloquear bot |
| Envio em lote / broadcast | ✅ (via templates com qualidade) | ⚠️ (permitido, mas respeitar 30 msgs/seg) |
| Mensagens do sistema bloqueadas | ✅ se usuário bloquear número | ✅ se usuário bloquear bot |

---

## 4. Identidade do Sender e Trust

| Dimensão | WhatsApp Business | Telegram |
| ---------- | :-----------------: | :--------: |
| Tipo de identificador | Número de telefone (+55) | @username do bot |
| Nome exibido | Display name aprovado pela Meta | @botname configurado no BotFather |
| Badge de verificação | ✅ OBA (checkmark verde) — difícil para startup | ✅ Verificado para grandes bots |
| Trust percebido pelo usuário BR | 🔴 Alto (número = identidade real) | 🟡 Médio (username anônimo) |
| Processo de verificação | Meta Biz Verification (OBA difícil) | Via @BotSupport (grandes bots) |
| Risco de impersonação | ✅ Baixo (número único) | ⚠️ Médio (usernames similares) |
| Perfil do bot | Foto + descrição no WhatsApp | Foto + bio + comandos |

---

## 5. Custos e Previsibilidade

### 5.1 WhatsApp Business

- **Service conversations (janela 24h):** gratuitas desde nov/2024 ✅
- **Marketing conversations:** pagas por conversa (valor varia por país; Brasil ~R$ 0,15-0,40/conversa estimado — ⚠️ hipótese, confirmar via BSP atual)
- **Authentication conversations:** pagas por conversa (menor que marketing)
- **Utility conversations:** pagas por conversa (menor que marketing)
- **BSP fees:** adicionais ao custo Meta. Depende do BSP (Twilio, 360Dialog, Gupshup, etc.)
- **Previsibilidade:** média. Pricing mudou várias vezes (2022, 2023, 2024). Risco de novo repricing.

**Fonte:** [Meta WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing/)

### 5.2 Telegram

- **API de bots:** gratuita, sem custo por mensagem ✅
- **Infra do bot:** custo da sua própria infra (AWS Lambda, etc.)
- **Telegram Premium:** usuários pagam diretamente ao Telegram; não impacta o bot diretamente
- **Telegram Stars (pagamentos):** 30% de comissão do Telegram em transações
- **Previsibilidade:** alta. Sem repricing histórico da API de bots.

- **API de bots:** gratuita ✅
- **Previsibilidade:** alta. API estável, sem historico de cobrança por uso.

### 5.4 Comparativo de Custo Total de Operação (estimado, 1000 usuários ativos/mês)

| Item | WhatsApp | Telegram |
| ------ | ---------- | ---------- |
| Plataforma (mensagens) | R$ 0 (service) + custo proactive | R$ 0 |
| Infra (Lambda/DB) | ~R$ 50-200/mês | ~R$ 50-200/mês |
| BSP | R$ 50-200/mês (Twilio/360Dialog) | Não necessário |
| Templates (proactive 10% base/mês) | ~R$ 150-400/mês | R$ 0 |
| **Total estimado** | **R$ 250-800/mês** | **R$ 50-200/mês** |

⚠️ Estimativas hipotéticas baseadas em pricing público e estimativas de mercado. Validar com BSP real.

---

## 6. Riscos de Bloqueio, Suspensão e Lock-in

### 6.1 WhatsApp Business

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-------------:|:-------:|-----------|
| Suspensão de número por quality rating | Médio | Alto | Monitoramento semanal, não enviar spam |
| Mudança unilateral de política | Alto histórico | Crítico | Multi-canal (este documento) |
| Repricing de conversas | Alto histórico | Alto | Modelo de negócio resiliente a custo variável |
| Bloqueio de categoria de produto | Baixo (assistente pessoal) | Crítico | Manter dentro de uso permitido |
| Dependência de BSP | Médio | Alto | Usar Cloud API direta (sem BSP quando possível) |
| Meta lança concorrente nativo (Meta AI) | Já aconteceu | Alto | Diferenciar em personalização e memória longitudinal |
| Lock-in técnico | Alto | Alto | Abstrair desde dia 1 (ver Arquitetura) |

### 6.2 Telegram

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-------------:|:-------:|-----------|
| Bloqueio por governo (precedente: Rússia 2018, Iran) | Baixo no Brasil | Alto | Diversificar canais |
| Detecção de spam e ban de bot | Médio | Alto | Não enviar em massa sem opt-in claro |
| Mudança de API (breaking changes) | Baixo (histórico estável) | Médio | Seguir changelog @BotNews |
| Monetização da API no futuro | Baixo | Alto | Contrato implícito gratuito histórico |
| Lock-in técnico | Baixo | Baixo | API simples, fácil de trocar |

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-------------:|:-------:|-----------|
| Complexidade de onboarding (server join) | Alto para consumer | Alto | Não usar como canal primário |
| Lock-in técnico | Baixo | Baixo | |

---

## 7. Instrumentação e Observabilidade

| Capacidade | WhatsApp Business | Telegram |
| ------------ | :-----------------: | :--------: |
| Delivery status (sent/delivered/read) | ✅ (via webhook events) | ❌ (sem receipts para bots) |
| Webhook de sistema (alertas de conta) | ✅ (account_alerts, tier updates) | ❌ |
| Métricas de template (quality rating) | ✅ (WhatsApp Manager) | N/A |
| Eventos de erro via API | ✅ (error codes ricos) | ✅ (error codes) |
| Auditoria de mensagens | ✅ (webhook log) | ✅ (log próprio) |
| Rate limit observável | ⚠️ (erro 429 após fato) | ✅ (429 com Retry-After) |
| Healthcheck de bot | ⚠️ (via getPhoneNumberById) | ✅ (getMe) |

---

## 8. Limitações Críticas para UX de Assistente Pessoal Consumer

### 8.1 WhatsApp

- ❌ **Janela de 24h é o problema central** — proatividade (lembretes, alertas) exige template aprovado fora da janela
- ❌ **Processo burocrático de templates** — latência de aprovação (até 24h), rejeições, ciclo de manutenção
- ❌ **Sem streaming de texto** — usuário vê a resposta completa de uma vez, sem typewriter effect
- ❌ **Sem edição de mensagem** — erros no output ficam permanentes
- ❌ **Sem polls nativos**
- ✅ **Maior base de usuários no Brasil** — não precisa convencer ninguém a instalar nada
- ✅ **Trust via número de telefone** — identidade forte

### 8.2 Telegram

- ✅ **Sem janela de atendimento** — proatividade total (ideal para lembretes e notificações)
- ✅ **Rich text e Markdown** — mensagens mais expressivas que WhatsApp
- ✅ **Streaming de texto nativo** (sendMessageDraft, API 9.3, dez/2025) — typewriter effect real
- ✅ **Editar mensagem** — correções pós-envio
- ✅ **Mini Apps** — UIs web customizadas dentro do Telegram (formulários ricos)
- ⚠️ **Base menor no Brasil** — penetração estimada 30-40% dos usuários de smartphone (⚠️ hipótese, sem dado oficial)
- ⚠️ **Trust menor** — usuário pode não saber que está falando com o Kuramei vs qualquer bot aleatório

- ❌ **Onboarding fracionado** — usuário precisa entrar em servidor, é UX ruim para assistente pessoal
- ❌ **DM proativo impossível sem servidor compartilhado** — bloqueia o modelo de assistente pessoal
- ✅ **Excelente para developer tools e suporte técnico**
- ✅ **Threads e canais** — organização de contexto melhor que qualquer outro canal

---

## 9. Análise de Plataformas Adicionais

### 9.1 Signal

- ❌ **Sem API oficial de bots** — Signal Protocol é open source, mas a plataforma não expõe API para automação
- ❌ **Signal CLI existe** (terceiro, não oficial) — mas viola ToS para uso comercial
- ❌ **Inviável para produto comercial**
- **Veredicto: NO-GO.** Fonte: [Signal Privacy Policy](https://signal.org/legal/) — não prevê bots comerciais.

### 9.2 Apple Messages for Business (iMessage Business)

- ✅ **Integração com iPhone nativa** — usuário não precisa instalar nada
- ❌ **Aprovação da Apple obrigatória** — processo opaco, sem prazo, focado em grandes marcas
- ❌ **Sem suporte a chatbot de IA conversacional fora de categorias aprovadas** 
- ❌ **Cobertura no Brasil muito limitada** — depende de implementação de operadoras e Mensagens integradas
- ❌ **Android não suportado** — exclui ~85% do mercado BR
- **Veredicto: NO-GO para 2026.** Fonte: [Apple Messages for Business](https://register.apple.com/resources/messages/messaging-documentation/)

### 9.3 RCS Business Messages (Google)

- ✅ **Protocolo rico**: botões, cards, carrosséis, quick replies nativos no app de Mensagens
- ✅ **Sem instalação** para usuário Android (>85% do mercado BR)
- ⚠️ **Disponibilidade no Brasil**: depende de acordos com operadoras (Vivo, Claro, TIM, Oi) — parcialmente disponível (⚠️ hipótese, verificar com Google RCS partner)
- ❌ **Processo de registro** via parceiros certificados do Google — complexo
- ❌ **Sem webhook em tempo real** — modelo de polling ou via parceiros
- ❌ **iOS suporte chegou em 2024** mas adoção lenta
- **Veredicto: WATCH LIST. Horizonte 2027.** Fonte: [Google RCS Business Messaging](https://developers.google.com/business-communications/rcs-business-messaging/guides/get-started/how-it-works)

---

## 10. Capability Parity para Features Kuramei

### 10.1 MVP (Features Atuais)

| Feature Kuramei | WhatsApp | Telegram |
| ----------------- | :--------: | :--------: |
| Onboarding conversacional | ✅ | ✅ |
| Lembretes proativos | ⚠️ (template req.) | ✅ |
| Resposta em linguagem natural | ✅ | ✅ |
| Histórico de conversa (context) | ✅ | ✅ |
| Respostas com links | ✅ (CTA button) | ✅ (inline URL) |
| Typing indicator | ✅ | ✅ |
| Retry em falha de envio | ✅ | ✅ |
| Webhook de entrada | ✅ | ✅ |
| Cancelar lembrete | ✅ | ✅ |

### 10.2 Fase 2 (Features Planejadas)

| Feature Kuramei | WhatsApp | Telegram |
| ----------------- | :--------: | :--------: |
| Formulários estruturados (coleta dados) | ✅ (Flows) | ✅ (Mini Apps) |
| Respostas com rich cards | ⚠️ (limitado) | ✅ (inline keyboard + media) |
| Notificações de eventos (clima, agenda) | ⚠️ (template) | ✅ |
| Streaming de resposta (typewriter) | ❌ | ✅ (API 9.3+) |
| Pagamentos | ⚠️ (WhatsApp Pay BR limitado) | ✅ (Stars) |
| Grupos/comunidades | ⚠️ | ✅ |
| Suporte multi-mídia rico | ⚠️ (limitado) | ✅ |

---

## 11. Complexidade de Implementação e Time-to-Market

| Canal | Complexidade (infra) | Complexidade (compliance) | Time-to-Market |
|-------|:--------------------:|:-------------------------:|:--------------:|
| WhatsApp (já existente) | Médio | Alto (Meta policies, LGPD) | Já disponível |
| Telegram (piloto) | Baixo | Baixo | 2-4 semanas |
| RCS Business | Alto | Alto | 6-12 meses |
| iMessage Business | Alto | Alto | 12+ meses (se aprovado) |
| Signal | N/A | N/A | Inviável |

---

## 12. Scorecard de Risco por Dimensão

| Dimensão | WhatsApp | Telegram |
| ---------- | :--------: | :--------: |
| Risco operacional (suspensão/bloqueio) | 🔴 Alto | 🟡 Médio |
| Risco de compliance (política plataforma) | 🔴 Alto | 🟡 Médio |
| Risco de custo (repricing) | 🔴 Alto (histórico) | 🟢 Baixo |
| Risco de lock-in técnico | 🔴 Alto (sem abstração) | 🟡 Médio |
| Risco de distribuição (alcance) | 🟢 Baixo (dominante no BR) | 🟡 Médio |
| Risco de feature freeze | 🟡 Médio | 🟢 Baixo (ativo) |

---

## Referências

- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- WhatsApp Pricing: https://developers.facebook.com/docs/whatsapp/pricing/
- WhatsApp Messaging Limits: https://developers.facebook.com/docs/whatsapp/messaging-limits
- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Bot Features: https://core.telegram.org/bots/features
- Telegram Bot FAQ: https://core.telegram.org/bots/faq
- Apple Messages for Business: https://register.apple.com/resources/messages/messaging-documentation/
- Google RCS Business Messaging: https://developers.google.com/business-communications/rcs-business-messaging/
- Signal Legal: https://signal.org/legal/
