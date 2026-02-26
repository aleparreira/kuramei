---
ticket_id: NOW-3
status: done
gate: G3
owner: codex
branch: feat/factory-operationalization
updated_at: 2026-02-26T16:42:00Z
forum_thread_id: "1476528286514544750"
---

# NOW-3 — Baseline Operacional da Fábrica

## Objetivo
Estabelecer baseline semanal com dados objetivos para controlar saúde da fábrica.

## Escopo
- Consolidar status de build/typecheck/test
- Consolidar pendências git
- Consolidar alertas/erros
- Consolidar decisões pendentes
- Ativar e validar report periódico no Discord

## Fora de escopo
- Dashboard sofisticado
- BI avançado

## DoR
- [x] Canal de report criado (`1476513995568582737`)
- [x] Job de report periódico configurado

## Tarefas
- [x] Validar chegada de pelo menos 1 report automático no canal
- [x] Registrar baseline inicial em docs/fabrica
- [x] Confirmar checklist de intervenção humana em uso diário

## DoD
- [x] Report periódico confirmado no canal
- [x] Baseline documentada
- [x] Processo diário de intervenção humana ativo

## Risco
Report virar ruído sem decisão acionável.

## Mitigação
Formato curto com 4 blocos fixos (feito, alertas, decisões, próximo passo).

## Rollback
Se gerar ruído, reduzir frequência ou ajustar template do report.
