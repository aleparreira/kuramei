# Kuramei — Contexto Operação (Spec v0.1)

## Objetivo
Garantir que o Kuramei rode com confiabilidade para usuários reais, com diagnóstico rápido e recuperação previsível.

---

## 1) Escopo da Operação
Inclui:
- Webhook de entrada (WhatsApp)
- Processamento de mensagens (agent-processor)
- Geração/entrega de links de UI
- Scheduler de lembretes
- Persistência (DynamoDB + KV)
- Observabilidade e incidentes

Não inclui:
- Desenvolvimento de features (Fábrica)
- Estratégia comercial/aquisição (GTM)

---

## 2) SLOs (alvos operacionais)
- Disponibilidade webhook: **>= 99.5%**
- Tempo de primeira resposta (p95): **<= 12s**
- Falha de processamento por mensagem: **< 2%**
- Entrega de lembrete no horário (janela ±2 min): **>= 98%**

> Adversarial note: sem métrica e sem SLO, “está funcionando” é ilusão.

---

## 3) Fluxos críticos em produção
1. Usuário envia mensagem no WhatsApp
2. Webhook valida assinatura e aceita evento
3. agent-processor processa contexto + tools
4. Kuramei envia resposta (texto e/ou link de UI)
5. Se houver lembrete, scheduler dispara no horário e atualiza status

---

## 4) Erros críticos e resposta obrigatória
### P0 — indisponibilidade total
Ex.: webhook fora, agent sem resposta, falha geral de auth
- Ação: rollback/config fix imediato
- Tempo alvo de mitigação: **15 min**

### P1 — degradação relevante
Ex.: latência alta, falha parcial em reminders/UI links
- Ação: mitigação + monitoramento reforçado
- Tempo alvo: **60 min**

### P2 — falhas não bloqueantes
Ex.: erros intermitentes, ruído de UX
- Ação: ticket priorizado no próximo ciclo

---

## 5) Runbook mínimo de incidente
1. Detectar (alerta/log/sintoma do usuário)
2. Classificar severidade (P0/P1/P2)
3. Mitigar primeiro, investigar depois
4. Validar recuperação em fluxo real
5. Registrar causa raiz + prevenção

---

## 6) Checklist diário de operação (5 min)
- [ ] Webhook recebendo eventos
- [ ] agent-processor respondendo sem erro anômalo
- [ ] Scheduler rodando no último ciclo
- [ ] Taxa de erro e latência dentro da faixa
- [ ] Nenhum segredo/config expirado

---

## 7) Guardrails operacionais
- Sem alteração de config em produção sem registro
- Sem deploy sem rollback claro
- Sem “hotfix invisível” (toda correção documentada)
- Incidente repetido 2x = ação estrutural obrigatória

---

## 8) Definition of Operational Ready
Kuramei está operacionalmente pronto quando:
- Fluxo crítico ponta-a-ponta validado
- Alertas de falha ativos
- Runbook testado
- Responsável on-call definido
- Últimos incidentes com lição aprendida registrada
