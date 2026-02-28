---
ticket_id: NEXT-5
status: next
gate: G0
owner: forja
branch: feat/factory-operationalization
updated_at: 2026-02-27T21:42:00Z
forum_thread_id: ""
---

# NEXT-5 — UOW Gate integrado ao pipeline

## Objetivo
Integrar o resultado do tester loop ao pipeline para bloquear promoção quando qualidade cair.

## DoD
- comando de validação UOW no pipeline
- threshold configurável
- output claro de falhas

## Risco
false negative bloquear entrega útil.

## Mitigação
modo warning na primeira semana, depois enforce.

## Rollback
desativar gate em enforce e voltar para warning-only temporariamente.

---

## Governança (2026-02-27)

**BLOQUEADO** — aguarda NEXT-4 (Arcos) em done/G3 com ARQ-GO explícito antes de qualquer implementação.

Contrato de interface proposto (sujeito a validação do Arcos):
```json
{
  "score": 0.87,
  "threshold": 0.80,
  "total": 15,
  "passed": 13,
  "failed": 2,
  "failures": [{ "scenario": "string", "reason": "string" }]
}
```

Modo de entrada: **warning-only** (exit 0 mesmo abaixo do threshold na primeira semana).
Nenhuma linha de código de execução criada até ARQ-GO.
