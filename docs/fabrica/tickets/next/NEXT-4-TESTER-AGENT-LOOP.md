---
ticket_id: NEXT-4
status: arq-go
gate: G1
owner: arcos
branch: feat/factory-operationalization
updated_at: 2026-02-27T21:43:00Z
forum_thread_id: ""
arq_go_at: 2026-02-27T21:43:00Z
arq_go_by: arcos
---

# NEXT-4 — Tester Agent + UOW Regression Loop

## Objetivo
Criar loop automático de testes conversacionais E2E no simulador para validar qualidade antes de promover mudanças.

## DoD
- especificação do loop aprovada ✅ (ver docs/qa/TESTER-AGENT-LOOP-v0.1.md)
- runner executa 15 cenários iniciais
- relatório automático por rodada
- gate de bloqueio por score mínimo

## ARQ-GO — 2026-02-27

Arquitetura v0.1 aprovada. Spec completa em `docs/qa/TESTER-AGENT-LOOP-v0.1.md`.

**Decisões fechadas:**
- Implementação: `apps/tester/` — dev-only, 6 arquivos (scenarios, assertions, runner, scorer, reporter, index)
- Alvo de execução: `apps/simulator-api` local em `http://localhost:3001`
- Isolamento de estado: `userId: tester-{scenarioId}-{runId}` por cenário — sem fixtures, sem mocks
- Cenários de 2 turnos (CTX-001): mesmo userId, DynamoDB persiste histórico naturalmente
- Assertions: heurísticas (9 tipos) — sem LLM-as-judge em v0.1
- Thresholds: task success ≥ 60%, policy compliance 100% (5/5), p95 ≤ 15s
- Trigger: manual (`npx tsx apps/tester/src/index.ts`) — CI integration é Sprint N

**Cortes conscientes:** LLM-as-judge, CI integration, fixtures de DynamoDB, paralelismo — todos Sprint N.

**NEXT-5 desbloqueado** após implementação confirmada (runner executando todos os 15 cenários).

## Risco
virar framework pesado sem valor imediato.

## Mitigação
entregar v0.1 enxuto com 15 cenários e métricas mínimas. Spec mantém esse contrato.

## Rollback
manter validação manual + checklist UOW até estabilizar runner.
