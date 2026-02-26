---
ticket_id: NOW-2
status: done
gate: G3
owner: codex
branch: feat/factory-operationalization
updated_at: 2026-02-26T17:27:00Z
forum_thread_id: "1476528283653771377"
---

# NOW-2 — Primeiro Ciclo Completo da Fábrica (G0→G3)

## Objetivo
Provar a operação real da fábrica executando 1 ticket pequeno ponta-a-ponta com gates e governança.

## Escopo
- Executar 1 ticket real de baixo risco.
- Passar pelos gates G0, G1, G2, G3.
- Registrar decisão final (ship/ajustar/rollback).

## Fora de escopo
- Abrir novo escopo de produto.
- Executar múltiplos tickets em paralelo.

## DoR
- [x] Ticket escolhido e escopo fechado
- [x] Critério de pronto definido
- [x] Risco e rollback definidos

## Tarefas
- [x] Gate 0: preflight
- [x] Gate 1: qualidade (build/test/typecheck)
- [x] Gate 2: validação funcional
- [x] Gate 3: docs + decisão
- [x] Registro completo no canal oficial (#forja)

## DoD
- [x] G0→G3 com status registrado
- [x] Decisão final explícita
- [x] Risco + rollback documentados
- [x] Encerramento do ciclo sem abrir novo ticket antes

## Risco
Pular gate por pressa e perder confiabilidade.

## Mitigação
Nenhum avanço para próximo gate sem evidência mínima do anterior.

## Rollback
Se Gate 2 ou 3 falhar, volta para ajuste no mesmo ticket sem abrir novo trabalho.
