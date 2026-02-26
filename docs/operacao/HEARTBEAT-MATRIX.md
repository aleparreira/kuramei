# Kuramei — Heartbeat Matrix v0.1

## Objetivo
Definir uma malha de heartbeats previsível por contexto (Fábrica, Operação, Backoffice, GTM), com contrato claro de checagem, autoação e reporte.

---

## Contrato padrão de heartbeat (obrigatório)
Todo heartbeat deve emitir:
- `state`: OK | WARN | FAIL
- `changed_since_last`: yes | no
- `auto_action_taken`: texto curto
- `human_action_required`: none | descrição
- `next_run_at`: timestamp

Sem esse contrato, heartbeat não é confiável.

---

## Matrix por contexto

## 1) Operação (produção)
- Cadência: **15 min**
- Scope: webhook, agent-processor, scheduler, falhas recorrentes, latência
- Checks:
  - disponibilidade básica dos serviços críticos
  - erro consecutivo
  - anomalia de latência
- Autoações:
  - retry leve
  - restart controlado (quando aplicável)
- Saída:
  - alertas em `#logs` (`1475322424475258941`)
  - resumo apenas quando houver mudança

## 2) Fábrica (execução técnica)
- Cadência: **30 min**
- Scope: tickets NOW, gate status, sync md↔forum, build/typecheck/test
- Checks:
  - drift entre fonte markdown e fórum
  - status de gate por ticket
  - saúde do pipeline de qualidade
- Autoações:
  - sync automático em tópicos do fórum
  - consolidação de status
- Saída:
  - updates nos tópicos de ticket
  - erro de sync em `#logs`

## 3) Backoffice
- Cadência: **1h**
- Scope: pendências administrativas, decisões abertas, fila operacional
- Checks:
  - itens pendentes acima do limite
  - decisões sem owner
- Autoações:
  - consolidar pendências e priorização inicial
- Saída:
  - resumo em canal de gestão (definir)

## 4) GTM / Cliente
- Cadência: **2h** (inicial)
- Scope: sinais de uso, feedbacks, retenção inicial
- Checks:
  - variação abrupta de uso
  - feedback crítico novo
- Autoações:
  - consolidar insights e sugerir próximos experimentos
- Saída:
  - resumo em canal de estratégia (definir)

---

## Cadência consolidada (visão temporal)
- 15 min: Operação
- 30 min: Fábrica
- 1h: Backoffice
- 2h: GTM
- Diário (10–15 min): checkpoint humano

---

## Canais atuais
- Logs/alertas: `channel:1475322424475258941`
- Fórum de tickets: `channel:1475313677484822538`
- Report da fábrica: `channel:1476513995568582737`

---

## Regras de ruído
- Heartbeat sem mudança relevante: silencioso (NO_REPLY ou sem entrega)
- Heartbeat com WARN/FAIL: entrega obrigatória
- Repetição do mesmo erro >2 ciclos: escalar para decisão humana

---

## Próximo passo
- Mapear jobs atuais para esta matriz
- Identificar lacunas (Backoffice/GTM ainda sem jobs dedicados)
- Ajustar cron jobs para aderência total ao contrato
