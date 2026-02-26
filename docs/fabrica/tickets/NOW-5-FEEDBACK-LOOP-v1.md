---
ticket_id: NOW-5
status: now
gate: G0
owner: forja
updated_at: 2026-02-26T10:30:00Z
forum_thread_id: "1476582850273874143"
---

# NOW-5 — Feedback Loop v1 (👍/👎)

## Objetivo
Implementar coleta de feedback leve e acionável no fluxo principal.

## Escopo
- thumbs em respostas relevantes
- fluxo de negativo com opções rápidas + texto opcional
- persistência mínima para métricas

## DoD
- evento de feedback registrado
- métricas básicas de feedback disponíveis
- doc de uso/consulta atualizado

## Risco
Coletar feedback sem pipeline de análise.

## Rollback
Ficar só com thumbs até maturar pipeline.
