# WhatsApp Business Playbook v1 — Kuramei

> Documento vivo. Revisão recomendada a cada 90 dias (a plataforma muda com frequência).
> Última atualização baseada em: documentação oficial Meta (web.archive.org/web/2024-2025), verificada em fev/2026.

---

## 0. Por que este documento existe

Kuramei é WhatsApp-first. Entender a fundo a plataforma não é opcional — é sobrevivência.
A Meta tem regras técnicas e de política que, se ignoradas, resultam em suspensão de conta, degradação de qualidade e bloqueio de escala. Este playbook mapeia o que é necessário saber para operar com segurança e crescer com consistência.

---

## 1. Capacidades Atuais da Plataforma

### 1.1 Tipos de mensagem disponíveis via Cloud API

- **Texto** — mensagem simples com ou sem preview de URL
- **Imagem** — com legenda opcional
- **Vídeo** — thumbnail com caption
- **Áudio** — ícone clicável que carrega o arquivo
- **Documento** — ícone de download (PDF, DOCX, etc.)
- **Localização** — envia coordenadas lat/lon
- **Contatos** — vCard rico (nome, telefone, email, endereço)
- **Stickers** — estáticos ou animados
- **Reação (emoji)** — aplicar em mensagem recebida do usuário
- **Botões de resposta interativa** — até 3 opções predefinidas
- **Lista interativa** — múltiplas opções agrupadas em seções
- **CTA URL button** — botão mapeado para URL (evita URLs longas no corpo)
- **Solicitação de endereço** — tela nativa de preenchimento de endereço de entrega
- **Solicitação de localização** — abre tela de compartilhamento de localização
- **Flow messages** — formulários/fluxos estruturados nativos (ver seção 1.3)
- **Template messages** — único tipo que pode ser enviado fora da janela de 24h (ver seção 1.4)

**Fato verificado.** Fonte: https://web.archive.org/web/20241217024707/https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

### 1.2 Customer Service Window (janela de 24h)

- Toda vez que um usuário envia mensagem, abre-se (ou renova-se) uma janela de 24h.
- Dentro dessa janela: qualquer tipo de mensagem pode ser enviada.
- Fora da janela: apenas template messages aprovados.
- **Implicação crítica para Kuramei:** se o usuário some por mais de 24h, toda resposta livre é bloqueada. A retomada de contato exige um template aprovado.
- Desde nov/2024: service conversations (abertas por qualquer mensagem não-template dentro da janela) são **gratuitas**.

**Fato verificado.** Fonte: https://web.archive.org/web/20241222163826/https://developers.facebook.com/docs/whatsapp/pricing/

### 1.3 WhatsApp Flows

Flows são formulários/interfaces nativas dentro do WhatsApp, sem precisar abrir browser.

**Casos de uso suportados (verificados):**
- Coleta de dados (leads, preferências, feedback)
- Configuração de serviços (planos de empréstimo, seguros)
- Agendamentos
- Onboarding de usuário
- Personalização de ofertas

**Características técnicas:**
- Definidos em JSON (Flow JSON)
- Podem ser estáticos (sem backend) ou dinâmicos (com endpoint do negócio)
- Disparados via template ou via mensagem interativa durante a janela de 24h
- Builder visual disponível no WhatsApp Manager (Flows Playground)
- Versioning de flows habilitado

**Hipótese (não confirmada em doc oficial):** flows complexos com muitas telas podem ter limitações de tamanho de payload. Validar na prática durante implementação.

**Fato verificado.** Fonte: https://web.archive.org/web/20250223183348/https://developers.facebook.com/docs/whatsapp/flows/

### 1.4 Templates

Templates são mensagens pré-aprovadas pela Meta, necessárias para:
- Iniciar conversa fora da janela de 24h (business-initiated)
- Retomar contato com usuário inativo
- Campanhas proativas (marketing, notificações, OTPs)

**Categorias de template:**
- **Marketing** — promoções, lançamentos, re-engajamento, carrinhos abandonados
- **Utility** — confirmações de ação, updates de pedido/entrega, alertas de conta, pesquisas de satisfação
- **Authentication** — OTP, verificação de conta, recuperação de acesso

**Processo de aprovação:**
- Submissão via WhatsApp Manager ou API
- Prazo: até 24h para decisão
- Status possíveis: In Review → Active (Quality Pending) → Active → Paused → Disabled
- Templates rejeitados podem ser editados e resubmetidos
- Recurso de rejeição disponível via Developer Support

**Razões comuns de rejeição (verificadas):**
- Variáveis com formatação errada (correto: `{{1}}`, `{{2}}`)
- Variáveis com caracteres especiais (#, $, %)
- Variáveis não sequenciais
- Ratio de variáveis muito alto em relação ao texto fixo
- Template terminando com variável
- Duplicata de template existente (exceto Auth)
- Conteúdo violando WhatsApp Commerce Policy ou Business Policy
- Conteúdo ameaçador ou abusivo
- Solicitação de dados sensíveis (números de cartão completos, CPF completo, etc.)

**Fato verificado.** Fonte: https://web.archive.org/web/20241226223005/https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/

### 1.5 Catálogo e Pagamentos

- **Catálogo:** WhatsApp suporta catálogos de produtos vinculados à conta business. Produtos podem ser compartilhados em conversa.
- **Pagamentos:** disponível em mercados selecionados. No Brasil, integração com WhatsApp Pay (Meta Pay) — mas adoção e disponibilidade variam. **Hipótese:** disponibilidade para WABA via Cloud API pode ser limitada; verificar com BSP/Meta diretamente antes de planejar feature de pagamento nativa.
- **Para Kuramei:** relevante na fase 2+ se o produto evoluir para transações.

---

## 2. Limitações Técnicas e de Política

### 2.1 Messaging Limits (Tiering)

Sistema de tiers para business-initiated conversations em janela de 24h corrida:

- **Tier inicial:** 250 conversas/dia
- **Tier 1:** 1.000 conversas/dia
- **Tier 2:** 10.000 conversas/dia
- **Tier 3:** 100.000 conversas/dia
- **Tier ilimitado:** sem limite numérico declarado

**Como subir de tier:**
1. Verificação da empresa no Meta Business Manager → sobe para Tier 1 se qualidade estiver boa
2. Identidade verificada + qualidade boa
3. Abrir 1.000 conversas em 30 dias com templates de alta qualidade
4. Scaling automático após atingir Tier 1: a cada conversa aberta, Meta avalia se deve escalar
5. Suporte manual: ticket de "Messaging Tier Upgrade" se as condições foram cumpridas mas limite não subiu

**Bloqueadores do scaling:**
- Número com baixo quality rating não sobe de tier
- Status do número deve ser "connected"

**Fato verificado.** Fonte: https://web.archive.org/web/20250107084438/https://developers.facebook.com/docs/whatsapp/messaging-limits

### 2.2 Quality Rating

- Cada número de telefone tem um quality rating: **High, Medium, Low**
- Calculado com base no feedback dos usuários: bloqueios, reports, unsubscribes
- Rating baixo → risco de limite reduzido ou número banido
- Templates individuais também têm quality rating; template com rating baixo vai para PAUSED ou DISABLED automaticamente
- **Regra de ouro:** usuário que bloqueou = sinal negativo que afeta todo o número

### 2.3 Opt-in (obrigatório)

- **Fato:** empresas são obrigadas a obter opt-in antes de enviar mensagens
- Desde nov/2024: opt-in pode ser genérico (não precisa ser específico para WhatsApp), mas deve cumprir leis locais
- Condições: usuário forneceu o número E deu permissão explícita para receber mensagens do negócio
- Métodos aceitos: SMS, website, telefone (IVR), presencial, papel
- **Para Kuramei:** o próprio ato de o usuário enviar a primeira mensagem ao Kuramei serve como opt-in implícito para service conversations. Para business-initiated (templates proativos), coletar opt-in explícito no onboarding é obrigatório.

**Fato verificado.** Fonte: https://web.archive.org/web/20250115022754/https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/

### 2.4 Políticas de Conteúdo

- Não solicitar dados financeiros sensíveis (número de cartão completo, conta bancária completa)
- Não enviar conteúdo ameaçador, abusivo, discriminatório ou enganoso
- Não usar WhatsApp para spam (envios em massa sem opt-in = banimento rápido)
- Commerce Policy: qualquer venda de produto/serviço deve cumprir regras da Meta
- Business Policy: proibido categorias como armas, drogas, serviços financeiros não regulamentados, apostas (sem aprovação específica), certos produtos de saúde

**Categorias de negócio restritas/proibidas:**
- Álcool (restrito, precisa de autorização)
- Tabaco/nicotina (restrito)
- Apostas/jogos de azar (restrito por mercado)
- Produtos de saúde/farmacêuticos (restrito)
- Conteúdo adulto (proibido)
- Armas (proibido)
- Serviços financeiros sem regulamentação (proibido)

**Para Kuramei como assistente pessoal:** risco baixo nessas categorias. Mas atenção com funcionalidades de agregação financeira ou recomendação de investimentos.

### 2.5 Limitações Técnicas

- Mensagens de texto: até 4.096 caracteres no body
- Templates: body até 1.024 caracteres; header (texto) até 60 caracteres; footer até 60 caracteres; botões até 3 por template (quick reply ou call-to-action)
- Interactive list: até 10 itens por seção, até 10 seções
- Reply buttons: máximo 3 botões
- Mídia: tamanho máximo por tipo varia (imagens: até 5MB, vídeos: até 16MB, áudio: até 16MB, documentos: até 100MB)
- Números de telefone: precisam de código de país + área, sem suporte a short codes
- Um número por WABA é suficiente para começar, mas escala pode exigir múltiplos números

---

## 3. Operação: Onboarding, Números e Infraestrutura

### 3.1 Onboarding de Conta

**Sequência obrigatória:**
1. Criar Meta Business Portfolio (antigo Business Manager)
2. Criar Meta App e habilitar WhatsApp
3. Criar WhatsApp Business Account (WABA)
4. Registrar número de telefone no WABA
   - Verificação por SMS ou chamada de voz
   - Número não pode estar ativo no app WhatsApp Messenger ou WhatsApp Business App (precisa deletar a conta primeiro)
5. Solicitar verificação da empresa (Business Verification)
   - Necessária para: nome exibido no cliente, templates de marketing/utility/auth, scaling de tier
   - Documentos exigidos: CNPJ, documentos legais, etc.
6. Configurar display name e solicitar aprovação
7. Configurar webhook endpoint para receber eventos

**Tipos de conta:**
- **Business Account (padrão):** sem badge. Nome exibido apenas em contatos pequenos, ou se empresa foi verificada.
- **Official Business Account (OBA):** badge verde (checkmark). Exige notoriedade pública documentada (veículos de mídia relevantes, Wikipedia, etc.). Muito difícil para startup early stage.

**Para Kuramei:** focar em Business Account verificado primeiro. OBA é aspiracional, não bloqueador.

**Fato verificado.** Fonte: https://web.archive.org/web/20250112165845/https://developers.facebook.com/docs/whatsapp/overview/business-accounts

### 3.2 Número de Telefone

- Pode ser número brasileiro (+55) com DDD e número completo
- Não pode ser short code nem número gratuito 0800 sem configuração especial
- Número 1-800 tem processo de registro específico
- Número já usado no WhatsApp Messenger/Business App: precisa excluir conta do app antes de registrar na API
- Recomendação para Kuramei: usar um número dedicado para a plataforma (não o pessoal do fundador)
- **Hipótese:** é possível usar número virtual (VoIP) para receber SMS/chamada de verificação, mas há relatos de instabilidade. Preferir número móvel real.

### 3.3 Webhooks

- Cloud API entrega 100% dos eventos via webhook: mensagens recebidas, status de entrega, atualizações de template, alertas de conta
- Endpoint deve ser HTTPS público
- Meta envia um GET de verificação na configuração (token de validação)
- Payload assinado com HMAC-SHA256 (X-Hub-Signature-256 no header)
- **Obrigação:** responder ao webhook com HTTP 200 em ≤ 5 segundos
- Se não responder: Meta tentará reenvio, mas pode descartar eventos após múltiplas falhas
- Kuramei já tem webhook stack (AWS Lambda + CDK) — verificar SLO de disponibilidade ≥ 99.5%

**Erros comuns:**
- Não validar assinatura HMAC → vulnerabilidade de segurança
- Processar síncronamente dentro dos 5s → timeout e falha de entrega
- Não idempotência → processar mesmo evento duas vezes por reenvio

### 3.4 Throughput

- Cloud API (hosted by Meta) é escalável — a Meta gerencia infraestrutura de envio
- Limite efetivo é o messaging tier (ver seção 2.1), não infraestrutura técnica
- Rate limit de API: sem número oficial publicado, mas Meta aplica throttling em bursts
- **Hipótese:** para volumes pequenos (< 1k msgs/dia), rate limit não é problema. Implementar retry com backoff exponencial para erros 429.

### 3.5 Monitoramento Recomendado

- Webhook delivery rate (% de eventos recebidos vs esperados)
- Message delivery rate por status: sent → delivered → read
- Template quality rating (monitorar via WhatsApp Manager ou API)
- Phone number quality rating
- Messaging tier atual vs limite
- Erros de API por categoria (4xx vs 5xx)
- Latência de resposta do Kuramei (primeira mensagem ao usuário)

**Webhooks de sistema para monitorar:**
- `messages` — mensagens e status de entrega
- `message_template_status_update` — mudança de status de template
- `phone_number_name_update` — aprovação/rejeição de display name
- `account_alerts` — alertas de conta (incluindo tier upgrades/downgrades)
- `business_capability_update` — mudança de limite de mensagens

### 3.6 Erros Comuns e Mitigações

| Erro | Causa | Mitigação |
|------|-------|-----------|
| 130429 — Rate limit hit | Muitas requisições | Backoff exponencial |
| 131047 — Re-engagement message not allowed | Fora da janela 24h sem template | Usar template aprovado |
| 131026 — Message undeliverable | Número inválido/não no WhatsApp | Validar número antes de enviar |
| 131051 — Unsupported message type | Tipo não suportado naquele contexto | Verificar window e tipo de msg |
| 132000 — Template not found | Template deletado ou nome errado | Validar template antes de usar |
| 132001 — Template hydration error | Variáveis com formato errado | Validar payload de template |

---

## 4. UX Conversacional de Alto Nível

### 4.1 Princípios de Design Conversacional

- **Expectativa clara:** usuário deve saber imediatamente o que o Kuramei faz e não faz. Primeira mensagem determina o contrato.
- **Resposta útil antes de resposta bonita:** conforme manifesto do Kuramei — "ação antes de explicação"
- **Confirmações explícitas:** antes de executar ações com consequências (enviar algo, criar evento, cobrar), confirmar com o usuário
- **Fallback gracioso:** quando o modelo falha ou não entende, reconhecer e oferecer alternativa clara
- **Personalização progressiva:** coletar preferências ao longo do uso, não em formulário inicial longo
- **Memória visível:** quando relevante, mostrar que o Kuramei lembra contexto anterior ("como você mencionou ontem...")

### 4.2 Padrão de Fluxo de Onboarding

```
Usuário → primeira mensagem qualquer
Kuramei → "Olá [Nome]! Sou o Kuramei, seu assistente pessoal aqui no WhatsApp.
          Posso ajudar com [2-3 casos de uso principais]. O que você precisa?"
```

- Não pedir cadastro longo na entrada
- Não enviar menu de opções gigante logo de cara
- Coletar dados essenciais conforme a necessidade surge
- Usar Flows para coletas estruturadas (ex: configurar lembretes, preferências)

### 4.3 Padrão de Retomada (usuário inativo > 24h)

- Requer template aprovado (Utility ou Marketing dependendo do contexto)
- Tom: útil, não invasivo. "Você tinha um lembrete para [X], quer que eu reagende?"
- Frequência: máximo 1 mensagem proativa por período relevante (não spam)
- Opt-out claro: sempre oferecer "responda PARAR para não receber mais mensagens deste tipo"

### 4.4 Padrão de Erro e Recuperação

- Nunca expor erros técnicos ao usuário
- "Não consegui completar isso agora. Tente novamente em alguns minutos ou me diga de outra forma."
- Logar o erro internamente com contexto completo
- Acompanhar taxa de fallback como métrica de qualidade

### 4.5 Uso de Botões e Flows

- **Botões:** usar para escolhas simples e frequentes (2-3 opções). Evitar em contextos onde a conversa livre funciona melhor.
- **Flows:** usar para coleta estruturada de dados (formulário de preferências, agendamento com múltiplos campos). Não usar para conversas simples — parece burocrático.
- **Listas interativas:** para menus com mais de 3 opções (ex: "qual categoria de lembrete?")
- **CTA URL button:** para links externos (abrir resultado numa mini-app, ver relatório)

---

## 5. Plano Prático para Kuramei — 3 Fases

### Fase 1: 0–30 dias — Fundação Operacional

**Objetivo:** infraestrutura sólida, conta limpa, primeiros usuários reais.

- [ ] WABA configurado com número dedicado
- [ ] Business Verification submetida (iniciar imediatamente, pode levar dias)
- [ ] Display name aprovado
- [ ] Webhook com validação HMAC, resposta < 5s, idempotência
- [ ] Templates de onboarding criados e aprovados (mínimo: boas-vindas, retomada de conversa)
- [ ] Monitoramento básico: delivery rate, webhook errors, latência de resposta
- [ ] Opt-in documentado no onboarding (usuário envia primeira mensagem = opt-in registrado)
- [ ] Fluxo de opt-out funcional ("PARAR" ou botão de cancelamento)
- [ ] Limite de 250 conversas/dia é suficiente para beta fechado
- [ ] Validar fluxo crítico ponta-a-ponta com 10-20 usuários reais

**Evitar na fase 1:**
- Templates de marketing antes de ter produto validado
- Qualquer automação de envio em massa
- Features complexas antes de estabilizar o core

### Fase 2: 31–90 dias — Escala Controlada e Conversão

**Objetivo:** subir para Tier 1 (1k conversas/dia), ativar loops de retenção.

- [ ] Business Verification aprovada → solicitar upgrade de tier
- [ ] Templates de Utility para re-engajamento de usuários inativos
- [ ] Implementar WhatsApp Flows para onboarding estruturado e coleta de preferências
- [ ] A/B test de templates (variar texto, CTA, horário de envio)
- [ ] Dashboard de métricas: ativação, retenção 7d/30d, conversas por usuário, taxa de resposta
- [ ] Segmentação básica: usuários ativos vs inativos vs nunca retornaram
- [ ] Automação de re-engajamento para usuários inativos há 3-7 dias
- [ ] Começar a coletar NPS via Flow (pesquisa de satisfação simples)

**Meta de tier:** atingir 1k conversas/dia em 30 dias corridos com quality rating High.

### Fase 3: 90–180 dias — Crescimento e Moat

**Objetivo:** crescimento orgânico, features diferenciadas, base para defensibilidade.

- [ ] Tier 2+ (10k conversas/dia) — scaling automático se qualidade mantida
- [ ] Personalização profunda baseada em histórico de uso
- [ ] WhatsApp Flows para casos de uso avançados (agendamento, configuração de serviços)
- [ ] Integrações externas surfaceadas via chat (calendário, clima, finanças, etc.)
- [ ] Programa de indicação (referral via WhatsApp — link de convite compartilhável)
- [ ] Templates de Marketing para campanhas pontuais em eventos relevantes (Copa, BBB, etc. — ver documento de Event Engagement)
- [ ] Avaliar Official Business Account (OBA) se notoriedade permitir

---

## 6. Métricas Recomendadas

### Ativação
- % de usuários que completam o onboarding (defina o milestone: primeira ação útil concluída)
- Tempo médio até primeira "vitória" (primeiro lembrete criado, primeira busca respondida, etc.)
- Taxa de conversão: recebeu boas-vindas → mandou segunda mensagem

### Retenção
- Retenção D1, D7, D30 (% de usuários que voltaram a conversar naquele dia)
- Média de conversas por usuário ativo por semana
- Churn rate: usuários que não mandaram mensagem em 30 dias

### Qualidade de Conversa
- Taxa de fallback (mensagens que o modelo não conseguiu responder adequadamente)
- CSAT / NPS coletado via Flow
- Taxa de bloqueio/report (sinal de alerta — monitorar pelo quality rating do número)
- Read rate de templates (% de templates enviados que foram lidos)

### Conversão (quando aplicável)
- Taxa de opt-in para templates proativos
- Taxa de click em CTA URL buttons
- Taxa de conclusão de Flows
- % de usuários que completam o fluxo de upgrade/pagamento (se/quando houver plano pago)

### Operação
- Webhook delivery rate (meta: > 99.9%)
- Latência de resposta p95 (meta: ≤ 12s conforme SLO existente)
- API error rate (meta: < 1%)
- Template quality rating (manter High)

---

## 7. Visão Ambiciosa: Moat e M&A

### Tese de Defensibilidade

O Kuramei não compete com chatbots genéricos — compete com o comportamento estabelecido do usuário brasileiro de resolver tudo pelo WhatsApp. O moat real não é a tecnologia de IA (commoditizada), mas sim:

1. **Dados de comportamento conversacional:** o que usuários pedem, como pedem, em que contexto, com qual frequência. Esses dados treinados em produto criam personalização que novos entrantes não têm.
2. **Trust on WhatsApp:** o usuário já confia no WhatsApp. O Kuramei herda essa confiança. Migrar para outro canal tem custo alto para o usuário.
3. **Memória longitudinal:** um assistente que lembra de você por meses é inerentemente mais valioso que um novo. Switching cost aumenta com o tempo.
4. **Integrações profundas:** cada integração (calendário, finanças, saúde) que o Kuramei faz aumenta o valor e o custo de saída.

### Cenário de M&A pela Meta

A Meta tem interesse em empresas que constroem experiências excepcionais sobre a plataforma WhatsApp, especialmente se:
- Demonstram retenção excepcional (D30 > 40% é alto para assistentes conversacionais)
- Criam modelos de engajamento que aumentam o tempo no WhatsApp
- Resolvem problemas que a Meta não quer resolver sozinha (personalização de AI para usuário final)
- Têm base de usuários engajados no Brasil (mercado estratégico para WhatsApp)

**Sinais que atraem M&A:**
- Base de 500k+ usuários ativos mensais com NPS > 50
- Crescimento orgânico (CAC < $1 via WhatsApp share/referral)
- Receita recorrente demonstrada (mesmo que pequena)
- Tecnologia proprietária em personalização conversacional

**Riscos reais:**
- **Platform risk:** Meta pode lançar produto nativo concorrente a qualquer momento (já tem Meta AI no WhatsApp)
- **Dependência de API:** mudanças de política, aumento de preços, suspensão de conta podem matar o produto do dia para a noite
- **Quality rating como arma:** se qualidade cair, Meta limita ou bane sem aviso suficiente
- **Aquisição não é garantia:** Meta compra para capacidade/talent ou para matar concorrência, não necessariamente para manter o produto

**Milestones para posição de M&A:**
- 12 meses: 100k usuários ativos, NPS > 40, crescimento 20%/mês
- 18 meses: 500k usuários, unit economics claros, retenção D30 > 35%
- 24 meses: 1M+ usuários, receita validada, M&A ou fundraise viáveis

**Realismo:** M&A com Meta é altamente improvável para a maioria das startups. A estratégia primária deve ser construir produto rentável e independente. M&A é upside, não plano.

---

## 8. Lacunas e Informações Não Verificadas

As seguintes informações não foram confirmadas em documentação oficial pública e devem ser validadas diretamente com Meta/BSP antes de decisões de produto:

1. **WhatsApp Pay / pagamentos nativos via Cloud API:** disponibilidade real no Brasil via WABA, limites de transação, integração técnica.
2. **Limites exatos de rate limit da Graph API:** Meta não publica o número oficial; na prática, precisa de teste empírico.
3. **Tamanho máximo de Flow JSON:** intuído como limitado, mas não confirmado em número exato.
4. **Comportamento de números VoIP no registro:** relatado como instável por comunidade, não documentado oficialmente.
5. **Official Business Account para startups:** critérios de "notoriedade" são subjetivos; processo é opaco.
6. **Preços para Brasil (nov/2024+):** pricing page não estava acessível diretamente; valores exatos por categoria de conversa no Brasil precisam ser confirmados via pricing atual.

---

## Referências

- Cloud API Overview: https://web.archive.org/web/20241217195645/https://developers.facebook.com/docs/whatsapp/cloud-api/overview
- Message Types: https://web.archive.org/web/20241217024707/https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
- Template Guidelines: https://web.archive.org/web/20241226223005/https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/
- Pricing (Conversation-Based): https://web.archive.org/web/20241222163826/https://developers.facebook.com/docs/whatsapp/pricing/
- Messaging Limits & Quality Rating: https://web.archive.org/web/20250107084438/https://developers.facebook.com/docs/whatsapp/messaging-limits
- Opt-in Requirements: https://web.archive.org/web/20250115022754/https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/
- Business Accounts & OBA: https://web.archive.org/web/20250112165845/https://developers.facebook.com/docs/whatsapp/overview/business-accounts
- Phone Numbers: https://web.archive.org/web/20250112165845/https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers
- WhatsApp Flows: https://web.archive.org/web/20250223183348/https://developers.facebook.com/docs/whatsapp/flows/
- WhatsApp Business Policy: https://business.whatsapp.com/policy
- WhatsApp Commerce Policy: https://www.whatsapp.com/legal/commerce-policy/
