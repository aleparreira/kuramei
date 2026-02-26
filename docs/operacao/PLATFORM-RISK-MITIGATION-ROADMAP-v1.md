# Platform Risk Mitigation Roadmap v1 — Kuramei

> **Status:** Documento estratégico e operacional.  
> **Produzido em:** 2026-02-26  
> **Horizonte:** 180 dias (fev → ago 2026)  
> **Dependências:**  
>   - MULTI-CHANNEL-CAPABILITY-MATRIX-v1.md  
>   - CHANNEL-ABSTRACTION-ARCHITECTURE-v1.md  

---

## 1. Contexto: Por que Mitigar Agora

O Kuramei depende 100% do WhatsApp para operar. Esse não é um problema hipotético — é um risco vivo com precedentes documentados:

- **2022:** Meta duplicou preços de templates sem aviso adequado. Startups com modelo de negócio baseado em envio em massa tiveram custos explodidos.
- **2023:** Meta mudou categorias de templates, forçando revisão e reaprovação de toda a base de templates de centenas de empresas.
- **2024 (nov):** Meta tornou service conversations gratuitas — positivo, mas com 45 dias de antecedência de comunicação. Qualquer mudança pode ser negativa na próxima vez.
- **Recorrente:** Suspensão de contas por quality rating baixo sem aviso prévio. Recuperação leva dias a semanas.
- **Meta AI no WhatsApp:** Meta lançou assistente de IA diretamente no WhatsApp. O canal que o Kuramei usa é também o palco do seu concorrente mais poderoso.

**A pergunta não é "se" a Meta vai fazer algo que impacta o Kuramei. É "quando" e "com quanto impacto".**

---

## 2. Mapa de Riscos Atuais

### 2.1 Riscos Críticos (devem ser mitigados imediatamente)

| Risco | Probabilidade 12m | Impacto | Sem mitigação |
|-------|:-----------------:|:-------:|:------------:|
| Suspensão de número por quality rating baixo | Médio-Alto | Produto para completamente | Dias de downtime, perda de usuários |
| Mudança de pricing (templates proativos) | Alto | Custo sobe 2-5x | Inviabilidade econômica de notificações |
| Meta lança feature que compete diretamente | Já aconteceu | Pressão competitiva intensa | Produto fica em desvantagem na própria plataforma |
| Suspensão de WABA por violação de política | Baixo-Médio | Produto para, difícil recurso | Semanas sem operação, possível perda permanente |
| Conta Meta Business comprometida | Baixo | Produto para | Acesso a tudo da Meta é perdido |

### 2.2 Riscos Médios (mitigar em 90 dias)

| Risco | Probabilidade 12m | Impacto |
|-------|:-----------------:|:-------:|
| Template rejeitado em momento crítico | Alto | Feature bloqueada |
| Rate limit atingindo tier atual | Médio (escala) | Usuários sem resposta |
| BSP com problema de disponibilidade | Médio | Downtime parcial |
| Usuário pede canal alternativo (Telegram) | Alto | Churn por falta de opção |

### 2.3 Riscos de Lock-in (mitigar em 180 dias)

| Risco | Impacto a longo prazo |
|-------|:---------------------:|
| Arquitetura completamente acoplada ao WA | Migração custa 3-6 meses de engenharia |
| Dados de usuário vinculados ao número de telefone | Sem portabilidade de identidade |
| Templates como único mecanismo de proatividade | Flexibilidade de produto bloqueada |

---

## 3. Roadmap por Fase

---

### Fase 1: 0-30 dias — Quick Wins de Mitigação (mar 2026)

**Objetivo:** reduzir riscos operacionais imediatos sem mudar a arquitetura.  
**Princípio:** medidas que levam < 2 dias de engenharia cada.

#### Sprint paralelo ao desenvolvimento normal (não bloquear Sprint 5)

---

#### 1.1 Operação: Backup de Número WhatsApp

**O risco:** número banido = produto fora do ar.  
**A ação:** registrar um segundo número na mesma WABA como backup operacional.

- [ ] Registrar número 2 (+55 com DDD diferente ou mesmo DDD, diferente número) na WABA
- [ ] Configurar webhook idêntico para número 2
- [ ] Documentar procedimento de failover manual (5 min de trabalho = troca do webhook target)
- [ ] Testar failover manual antes de precisar dele

**Custo:** R$ 0 (só custo do chip ou número virtual) + 4h de eng.  
**Benefício:** elimina downtime total em caso de ban do número 1.

---

#### 1.2 Operação: Dashboard de Qualidade

**O risco:** quality rating cai sem que Alexandre perceba até o produto parar.  
**A ação:** monitoramento ativo de quality rating e alertas.

- [ ] Criar job semanal (ou webhook `account_alerts`) que lê quality rating via API
- [ ] Configurar alerta se messaging tier sofrer downgrade
- [ ] Configurar alerta se template status mudar para PAUSED ou DISABLED

```typescript
// Job semanal ou webhook handler
// GET https://graph.facebook.com/v19.0/{phone-number-id}?fields=quality_rating,messaging_limit_tier

// Exemplo de alert mínimo:
  channel: INTERNAL_OPS_CHANNEL_ID,
  message: `🔴 WhatsApp Quality Rating caiu para ${qualityRating} para o número ${phoneNumber}. 
            Ação requerida: pausar templates proativos e investigar causa.`
});
```

**Custo:** 4-8h de eng.  
**Benefício:** alerta 7+ dias antes de um ban (rating cai gradualmente).

---

#### 1.3 Compliance: Documentar Opt-in e Opt-out no Produto

**O risco:** usuário reclama ou faz report por não ter dado opt-in claro.  
**A ação:** garantir que o fluxo de onboarding atual documenta opt-in de forma audítável.

- [ ] Confirmar que o timestamp de opt-in é salvo em `kuramei-users` junto com o primeiro evento
- [ ] Confirmar que o mecanismo de opt-out ("PARAR") funciona e é logado
- [ ] Adicionar link para política de privacidade no display do bot (WhatsApp Manager → Profile)
- [ ] Revisar se o onboarding atual menciona explicitamente o nome "Kuramei" e o que será enviado

**Custo:** 2h de eng + 1h de produto.  
**Benefício:** compliance básico que protege contra relatórios de spam e violações de política.

---

#### 1.4 Engenharia: Preparar Base para Abstração de Canal

**O risco:** nenhum, mas a janela de oportunidade fecha se arquitetura entrar em debt.  
**A ação:** sem mudar comportamento, reorganizar o código para facilitar extração do adapter.

- [ ] Criar `packages/channel-core/` com interfaces (tipos apenas, sem implementação)
- [ ] Criar `packages/channel-whatsapp/` com a função `sendWhatsAppMessage` e `parseWebhook` extraídas do `agent-processor`
- [ ] Atualizar `apps/agent-processor` para importar de `channel-whatsapp`
- [ ] Validar que tudo passa (`pnpm build`, `pnpm typecheck`, `pnpm test`)

**Custo:** 8-12h de eng (refactor puro, sem mudança de comportamento).  
**Benefício:** desbloqueador para Fase 2 sem risco de regressão.

---

#### 1.5 Produto: Adicionar Campo de Canal Alternativo no Onboarding

**O risco:** usuários sem canal alternativo cadastrado = impossível fazer failover.  
**A ação:** no final do onboarding atual, perguntar (de forma suave) se o usuário tem Telegram.

```
[Kuramei → Usuário após onboarding completo]
"Boa notícia: você também pode me encontrar no Telegram (@KurameiBot).
Por lá, posso te avisar de lembretes mesmo se você ficar dias sem responder.
Quer adicionar o Telegram como canal alternativo? (Opcional)"
```

- [ ] Adicionar esse prompt ao final do onboarding (depois que status='active')
- [ ] Salvar resposta no perfil do usuário (`channels.telegram.chatId` se o usuário confirmar)
- [ ] Não bloquear o onboarding se o usuário ignorar

**Custo:** 4-6h de eng + 1h de produto.  
**Benefício:** inicia coleta de canais alternativos que viabiliza failover futuro.

---

#### Checkpoint Fase 1 (dia 30)

- [ ] Número backup WA registrado e testado
- [ ] Alertas de quality rating ativos e testados
- [ ] Opt-in documentado e audítável no código
- [ ] `channel-core` e `channel-whatsapp` extraídos (interfaces + implementação WA)
- [ ] % de usuários com Telegram cadastrado > 0% (baseline para medir adoção)

---

### Fase 2: 31-90 dias — Implementação da Abstração + Piloto Telegram (abr-mai 2026)

**Objetivo:** Telegram como canal 2 real e funcional. Abstração de canal implementada.  
**Princípio:** mínimo viável de multi-canal, não feature parity completo.

---

#### 2.1 Engenharia: Telegram Adapter Completo

**O risco:** Telegram piloto sem abstração = dois silos de código.  
**A ação:** implementar seguindo a arquitetura de adapter do documento de arquitetura.

- [ ] Criar `packages/channel-telegram/` com:
  - `adapter.ts` — TelegramAdapter implementando ChannelAdapter
  - `policy.ts` — TelegramPolicyEngine (sem janela, verificar se usuário iniciou bot)
  - `send.ts` — sendTelegramMessage (text, inline keyboard)
  - `parse.ts` — parseTelegramWebhook / parseTelegramUpdate
- [ ] Criar `apps/agent-telegram/`:
  - Lambda ou worker que recebe webhook do Telegram
  - Chama `TelegramAdapter.parseInbound()` → `processMessage()` → `ChannelRouter.route()`
- [ ] Configurar bot no BotFather:
  - Nome: Kuramei
  - Username: @KurameiBot (ou @KurameiAssistente — verificar disponibilidade)
  - Descrição: "Seu assistente pessoal — lembretes, clima, pesquisa e mais"
  - Comandos: /start, /ajuda, /cancelar
- [ ] Configurar webhook Telegram apontando para novo endpoint
- [ ] Implementar `ChannelRouter` com fallback (ver arquitetura)
- [ ] Implementar `UserChannelStore` no DynamoDB (campos de canal em `kuramei-users`)

**Custo:** 40-60h de eng (principal entrega da Fase 2).

---

#### 2.2 Produto: Piloto Fechado no Telegram (10-20 usuários)

**O risco:** lançar sem validar.  
**A ação:** convidar os mesmos beta users do WhatsApp para o Telegram.

- [ ] Script de migração: para cada user ativo no WhatsApp, enviar convite via WhatsApp para o Telegram
- [ ] Monitorar: % de users que aderem, qualidade das respostas no TG, taxa de fallback
- [ ] Identificar gaps de feature entre WA e TG (o que funciona no WA mas não no TG e vice-versa)
- [ ] Documentar issues encontrados para Sprint 7+

---

#### 2.3 Operação: Runbook de Failover WhatsApp → Telegram

**O risco:** conta WA suspensa sem plano de ação.  
**A ação:** criar runbook que Alexandre (ou qualquer pessoa técnica) pode executar em < 30 minutos.

```markdown
## Runbook: Failover WhatsApp → Telegram

### Quando acionar
- WhatsApp account_alerts com ACCOUNT_SUSPENDED
- Quality rating caiu para LOW e número não responde
- Meta Support confirmou ban permanente

### Passo 1: Ativar modo de emergência (5 min)
1. Acessar AWS Console → DynamoDB → kuramei-config
2. Setar item { PK: 'CONFIG', SK: 'CHANNEL_MODE', value: 'telegram_only' }
3. O ChannelRouter lerá este flag e forçará todos os envios pelo Telegram

### Passo 2: Comunicar usuários com Telegram cadastrado (10 min)
1. Rodar script: `pnpm run broadcast:telegram --msg "O Kuramei está temporariamente 
   no Telegram. Me adicione em @KurameiBot para continuar."`
2. Rate limit: enviar 1 msg/seg (Telegram recomendação oficial)

### Passo 3: Usuários sem Telegram (15 min)
1. Para usuários sem Telegram: inserir em fila de "comunicação pendente"
2. Quando WhatsApp voltar (ou via email se disponível): comunicar retorno

### Passo 4: Apelação Meta (paralelo)
1. Acessar Business Support Home
2. Submeter apelação com justificativa técnica
3. Prazo: Meta responde em 24-72h
```

---

#### 2.4 Operação: Templates de Retomada Aprovados

**O risco:** usuário some por > 24h e Kuramei não consegue reativar contato.  
**A ação:** ter templates de retomada aprovados para principais casos de uso proativo.

Templates prioritários para submeter (Utility category):

```
Template: kuramei_reminder_recall
Body: "Oi {{1}}! Você tem um lembrete agendado: {{2}} em {{3}}. 
       Quer mantê-lo? Responda Sim ou Não."
Buttons: [Sim ✅] [Não ❌]

Template: kuramei_checkin_weekly
Body: "Oi {{1}}! Sumiu da nossa conversa. 😊 Posso te ajudar com 
       alguma coisa hoje?"
Buttons: [Sim, me ajude!] [Depois]

Template: kuramei_task_reminder
Body: "Lembrete do Kuramei: {{1}}. 📌\n{{2}}"
```

- [ ] Submeter templates via WhatsApp Manager
- [ ] Aguardar aprovação (até 24h)
- [ ] Implementar lógica de disparo no agente (quando usar cada template)

---

#### 2.5 Engenharia: Streaming de Texto no Telegram

**O risco:** UX inferior no Telegram vs potencial.  
**A ação:** implementar `sendMessageDraft` (streaming nativo, API 9.3+) para respostas longas.

- [ ] Implementar no `TelegramAdapter.send()`: para respostas > 200 chars, usar `sendMessageDraft` e completar com `editMessageText`
- [ ] Testar visualmente no Telegram
- [ ] Feature flag: ativar apenas para respostas do LLM (não para mensagens curtas de sistema)

---

#### Checkpoint Fase 2 (dia 90)

- [ ] Telegram adapter operacional (prod ou staging)
- [ ] ChannelRouter com fallback funcional
- [ ] Piloto com 10+ usuários reais no Telegram
- [ ] Runbook de failover testado em staging
- [ ] Templates de retomada aprovados e integrados
- [ ] % usuários com Telegram > 20% (meta aspiracional para beta)
- [ ] Zero regressões no WhatsApp

---

### Fase 3: 90-180 dias — Maturidade Multi-Canal (jun-ago 2026)

**Objetivo:** multi-canal estável, failover automático, experiência otimizada por canal.

---

#### 3.1 Produto: Lançamento Público do Telegram

- [ ] Remover flag de piloto fechado
- [ ] Adicionar @KurameiBot ao perfil do WhatsApp e ao site
- [ ] Campanha de incentivo ao canal 2: "No Telegram, o Kuramei pode te lembrar a qualquer hora, sem limites." 
- [ ] Medir adoção: % de usuários ativos em ambos os canais

---

#### 3.2 Engenharia: Failover Automático Completo

- [ ] Circuit breaker por canal ativo em produção (ver arquitetura)
- [ ] Failover automático quando WhatsApp retorna erro 5xx persistente
- [ ] Failover automático quando quality rating cai para LOW
- [ ] Teste de failover mensal: simular indisponibilidade do WhatsApp em staging

---

#### 3.3 Produto: Preferência de Canal Explícita

- [ ] Usuário pode escolher canal preferido: "Me mande lembretes pelo Telegram" 
- [ ] Salvar em `userProfile.preferredChannel`
- [ ] Implementar no ChannelRouter: resposta vai para o canal preferido quando possível

---

#### 3.4 Operação: Upgrade de Tier WhatsApp

- [ ] Se ainda no Tier 0: submeter Business Verification (se não feito)
- [ ] Se Business Verified: garantir 1k conversas/30d para upgradear para Tier 1
- [ ] Monitorar escalada automática para Tier 2 conforme produto cresce

---

- [ ] Canal #announcements para comunicar mudanças de plataforma

---

#### 3.6 Engenharia: Identidade Unificada Cross-Canal

- [ ] Implementar vinculação de contas (código de verificação WA ↔ TG)
- [ ] Histórico de conversa é compartilhado entre canais pelo `kurameiUserId`
- [ ] Um lembrete criado no WhatsApp é entregue no Telegram se preferência assim definida
- [ ] Deletar dados do usuário remove de todos os canais (LGPD)

---

#### 3.7 Análise: Decisão sobre RCS (para 2027)

- [ ] Em Q4 2026: verificar disponibilidade de RCS Business Messages no Brasil
- [ ] Verificar se Google tem programa de parceiros para startups
- [ ] Avaliar cobertura de operadoras (Vivo, Claro, TIM)
- [ ] GO/NO-GO para roadmap 2027

---

#### Checkpoint Fase 3 (dia 180)

- [ ] ≥ 30% dos usuários ativos com Telegram como canal alternativo registrado
- [ ] Failover automático testado e confiável (≤ 60s de switching)
- [ ] Zero downtime por motivo de plataforma WhatsApp (mesmo que WA tenha problema, Telegram manteve serviço)
- [ ] Circuit breaker com histórico de 90 dias de operação
- [ ] Decisão documentada sobre RCS para 2027

---

## 4. Métricas de Sucesso do Roadmap

### 4.1 Métricas de Diversificação

| Métrica | Baseline (hoje) | Meta 30d | Meta 90d | Meta 180d |
|---------|:--------------:|:--------:|:--------:|:---------:|
| % usuários com 2+ canais | 0% | >5% | >20% | >35% |
| Telegram como canal 2 ativo | 0 users | Piloto (10-20) | Beta aberto | Produção estável |
| Tempo de failover (manual) | N/A | <30 min | <10 min | <2 min (auto) |
| Horas de downtime/mês por causa WA | Não medido | Baseline | Baseline | <0.5h/mês |

### 4.2 Métricas de Risco WhatsApp

| Métrica | Alvo | Ação se violado |
|---------|:----:|:---------------:|
| Quality rating | GREEN constante | Pausar proativos, investigar |
| Templates ativos aprovados | ≥ 3 (onboarding, recall, weekly) | Submeter novos imediatamente |
| Tier atual | Tier 1 (1k conv/dia) até dia 90 | Ticket de suporte Meta |
| Webhook delivery rate | > 99.5% | Investigar infra Lambda |
| Template read rate | > 40% | Revisar segmentação e horário |

---

## 5. Orçamento Estimado de Implementação

| Item | Fase 1 | Fase 2 | Fase 3 | Total |
|------|:------:|:------:|:------:|:-----:|
| Eng horas internas | 30h | 70h | 50h | 150h |
| Infra adicional (Lambda, DynamoDB) | ~R$ 5/mês | ~R$ 20/mês | ~R$ 50/mês | — |
| BSP (se mantido) | já existente | já existente | já existente | — |
| Telegram API | R$ 0 | R$ 0 | R$ 0 | R$ 0 |
| Número backup WA | ~R$ 30 (chip) | — | — | R$ 30 |
| **Total engenharia** | **30h** | **70h** | **50h** | **150h** |

⚠️ Estimativa hipotética de horas de engineering solo (Alexandre). Com time adicional, reduz proporcionalmente.

---

## 6. Go/No-Go por Canal — Decisão Final

| Canal | Decisão | Prazo | Justificativa |
|-------|:-------:|:-----:|:--------------|
| WhatsApp Business | **MANTER** | Contínuo | Distribuição insubstituível no BR a curto prazo |
| Telegram | **GO** | Sprint 6-7 (abr 2026) | Custo zero, API livre, melhor UX para proatividade |
| Signal | **NO-GO** | — | Sem API comercial; inviável |
| iMessage Business | **NO-GO** | — | Aprovação Apple inviável, sem cobertura BR |
| RCS Business | **WATCH** | Avaliar Q4 2026 | Potencial no futuro, complexo agora |

---

## 7. Recomendações Executivas

### Posição clara (não neutra):

**1. Implementar abstração de canal agora, não depois.**  
Cada sprint sem abstrair aprofunda o lock-in técnico. O custo de abstrair hoje (8-12h) é uma fração do custo de migrar em emergência (semanas). Sem discussão: fazer na Fase 1.

**2. Telegram como canal 2 em 60 dias, não 90.**  
A janela de 24h do WhatsApp já está limitando features de assistente (lembretes proativos para usuários inativos). Telegram resolve isso de graça. Esse é o ganho de produto mais direto, não apenas mitigação de risco.

**3. Não pagar BSP se puder usar Cloud API direta.**  
BSPs adicionam custo, latência e um ponto extra de falha. Se o volume atual justifica Cloud API direta (verificar limite de tier), eliminar BSP reduz custo e complexidade. Validar com Meta.

**4. Backup de número WhatsApp é o quick win mais importante da Fase 1.**  
Custo de 4h de eng e um chip. Benefício: elimina downtime total em caso de ban. ROI incalculável. Fazer primeiro.

**6. Comunicar risco de plataforma como feature, não fraqueza.**  
"O Kuramei está disponível no WhatsApp e no Telegram" é diferenciação de produto, não sinal de fraqueza. Users que conhecem o risco de depender de um único canal vão valorizar isso.

---

## Referências

- Meta WhatsApp Pricing: https://developers.facebook.com/docs/whatsapp/pricing/
- WhatsApp Business Policy: https://business.whatsapp.com/policy
- Telegram Bot API Changelog: https://core.telegram.org/bots/api#recent-changes
- Telegram Rate Limits (FAQ): https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
- Google RCS Business Messaging: https://developers.google.com/business-communications/rcs-business-messaging/
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Kuramei Architecture: `/docs/operacao/CHANNEL-ABSTRACTION-ARCHITECTURE-v1.md`
- Kuramei Capability Matrix: `/docs/operacao/MULTI-CHANNEL-CAPABILITY-MATRIX-v1.md`
- Kuramei WhatsApp Risks Checklist: `/docs/operacao/WHATSAPP-RISKS-COMPLIANCE-CHECKLIST.md`
