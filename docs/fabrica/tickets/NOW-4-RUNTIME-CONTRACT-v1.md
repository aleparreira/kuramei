---
ticket_id: NOW-4
status: done
gate: G3
owner: codex
updated_at: 2026-02-26T14:35:00Z
forum_thread_id: "1476582846830477462"
---

# NOW-4 — Runtime Contract v1 (sem if/else de intenção)

## Objetivo
Formalizar o contrato de runtime orientado a capacidades com políticas de confiança e fallback.

## Escopo
- `in_scope / edge_of_scope / out_of_scope`
- confiança high/medium/low
- policy de ação por confiança

## DoD
- doc `docs/operacao/KURAMEI-RUNTIME-CONTRACT-v1.md`
- exemplos reais por cenário
- parecer do Product Challenger

## Risco
Deslizar para regras implícitas de intenção e comportamento inconsistente.

## Rollback
Congelar novas features até contrato aprovado.
